use crate::video::Paquete;
use cpal::traits::{DeviceTrait, HostTrait, StreamTrait};
use cpal::Sample;
use fdk_aac::enc::{AudioObjectType, BitRate, ChannelMode, Encoder, EncoderParams, Transport};
use std::{
    collections::VecDeque,
    sync::{
        atomic::{AtomicBool, Ordering},
        mpsc::{sync_channel, SyncSender},
        Arc, Mutex,
    },
    thread::{self, JoinHandle},
    time::{Duration, Instant},
};

const HZ: u32 = 48_000;
const MUESTRAS_BLOQUE: usize = 1024 * 2;
/// Más de 0,25 s esperando en una cola: se tira lo más antiguo para no desfasarse del vídeo.
const RETRASO_MAXIMO: usize = HZ as usize / 4 * 2;

pub struct Fuentes {
    pub equipo: bool,
    pub microfono: bool,
}

pub struct Arranque {
    pub hilo: Option<JoinHandle<()>>,
    pub con_audio: bool,
    pub avisos: Vec<String>,
}

pub fn a_estereo(muestras: &[f32], canales: u16) -> Vec<f32> {
    let canales = usize::from(canales.max(1));
    let cuadros = muestras.len() / canales;
    let mut salida = Vec::with_capacity(cuadros * 2);
    for cuadro in muestras.chunks_exact(canales) {
        if canales == 1 {
            salida.extend_from_slice(&[cuadro[0], cuadro[0]]);
        } else if canales == 2 {
            salida.extend_from_slice(&cuadro[..2]);
        } else {
            let mitad = canales / 2;
            let izquierda = cuadro[..mitad].iter().copied().sum::<f32>() / mitad as f32;
            let derecha = cuadro[mitad..].iter().copied().sum::<f32>() / (canales - mitad) as f32;
            salida.extend_from_slice(&[izquierda, derecha]);
        }
    }
    salida
}

pub struct Remuestreador {
    paso: f64,
    pendiente: Vec<f32>,
    posicion: f64,
}

impl Remuestreador {
    pub fn new(de_hz: u32) -> Self {
        Self {
            paso: f64::from(de_hz.max(1)) / f64::from(HZ),
            pendiente: Vec::new(),
            posicion: 0.0,
        }
    }

    /// Interpola entre cada cuadro y el siguiente; el último del bloque espera al próximo para tener vecino.
    pub fn procesar(&mut self, muestras: &[f32]) -> Vec<f32> {
        self.pendiente.extend_from_slice(muestras);
        let cuadros = self.pendiente.len() / 2;
        let mut salida = Vec::new();
        while (self.posicion.floor() as usize) + 1 < cuadros {
            let actual = self.posicion.floor() as usize * 2;
            let fraccion = self.posicion.fract() as f32;
            for canal in 0..2 {
                salida.push(
                    self.pendiente[actual + canal] * (1.0 - fraccion)
                        + self.pendiente[actual + 2 + canal] * fraccion,
                );
            }
            self.posicion += self.paso;
        }
        let consumidos = (self.posicion.floor() as usize).min(cuadros);
        self.pendiente.drain(..consumidos * 2);
        self.posicion -= consumidos as f64;
        salida
    }
}

pub fn mezclar(a: &[f32], b: &[f32]) -> Vec<f32> {
    let mut salida = Vec::with_capacity(a.len().max(b.len()));
    for i in 0..a.len().max(b.len()) {
        salida.push(
            (a.get(i).copied().unwrap_or(0.0) + b.get(i).copied().unwrap_or(0.0)).clamp(-1.0, 1.0),
        );
    }
    salida
}

pub fn bloques_pendientes(transcurrido_s: f64, escritas: u64) -> u64 {
    let corresponden = (transcurrido_s.max(0.0) * f64::from(HZ)).floor() as u64 / 1024;
    corresponden.saturating_sub(escritas)
}

type Cola = Arc<Mutex<VecDeque<f32>>>;

pub fn iniciar(
    fuentes: Fuentes,
    calidad_maxima: bool,
    inicio: Instant,
    tx: SyncSender<Paquete>,
    detener: Arc<AtomicBool>,
) -> Arranque {
    let (respuesta_tx, respuesta_rx) = sync_channel(1);
    let hilo = thread::spawn(move || {
        let mut avisos = Vec::new();
        let mut flujos = Vec::new();
        let equipo = Arc::new(Mutex::new(VecDeque::new()));
        let microfono = Arc::new(Mutex::new(VecDeque::new()));

        if fuentes.equipo {
            match abrir_flujo(true, equipo.clone()) {
                Ok(flujo) => flujos.push(flujo),
                Err(e) => avisos.push(format!("El vídeo se graba sin sonido del equipo: {e}")),
            }
        }
        if fuentes.microfono {
            match abrir_flujo(false, microfono.clone()) {
                Ok(flujo) => flujos.push(flujo),
                Err(e) => avisos.push(format!("El vídeo se graba sin micrófono: {e}")),
            }
        }
        let con_audio = !flujos.is_empty();
        let _ = respuesta_tx.send((con_audio, avisos));
        if !con_audio {
            return;
        }
        let bitrate = if calidad_maxima { 256_000 } else { 160_000 };
        let Ok(codificador) = Encoder::new(EncoderParams {
            bit_rate: BitRate::Cbr(bitrate),
            sample_rate: HZ,
            transport: Transport::Adts,
            channels: ChannelMode::Stereo,
            audio_object_type: AudioObjectType::Mpeg4LowComplexity,
        }) else {
            return;
        };
        let mut codificador = codificador;
        let mut escritas = 0u64;
        let mut paquetes = 0u64;
        while !detener.load(Ordering::Relaxed) {
            thread::sleep(Duration::from_millis(20));
            producir(
                &equipo,
                &microfono,
                &mut codificador,
                &tx,
                inicio,
                &mut escritas,
                &mut paquetes,
            );
        }
        producir(
            &equipo,
            &microfono,
            &mut codificador,
            &tx,
            inicio,
            &mut escritas,
            &mut paquetes,
        );
        drop(flujos);
    });
    let (con_audio, avisos) = respuesta_rx
        .recv_timeout(Duration::from_secs(3))
        .unwrap_or_else(|_| {
            (
                false,
                vec!["No se pudo iniciar el audio a tiempo".to_string()],
            )
        });
    Arranque {
        hilo: Some(hilo),
        con_audio,
        avisos,
    }
}

fn host() -> Result<cpal::Host, String> {
    #[cfg(target_os = "linux")]
    {
        cpal::host_from_id(cpal::HostId::PipeWire)
            .map_err(|e| format!("no se pudo iniciar PipeWire: {e}"))
    }
    #[cfg(not(target_os = "linux"))]
    {
        Ok(cpal::default_host())
    }
}

fn abrir_flujo(equipo: bool, cola: Cola) -> Result<cpal::Stream, String> {
    let host = host()?;
    let dispositivo = if equipo {
        host.default_output_device()
            .ok_or("no hay dispositivo de salida predeterminado".to_string())?
    } else {
        host.default_input_device()
            .ok_or("no hay micrófono predeterminado".to_string())?
    };
    // Para el sonido del equipo se usa el formato de la salida (en macOS los altavoces no tienen configuración de entrada).
    let configuracion = if equipo {
        dispositivo
            .default_output_config()
            .or_else(|_| dispositivo.default_input_config())
    } else {
        dispositivo.default_input_config()
    }
    .map_err(|e| e.to_string())?;
    let canales = configuracion.channels();
    let frecuencia = configuracion.sample_rate();
    let formato = configuracion.sample_format();
    let mut remuestreador = Remuestreador::new(frecuencia);
    let error = |e| eprintln!("Error del flujo de audio: {e}");
    let stream = dispositivo.build_input_stream_raw(
        configuracion.config(),
        formato,
        move |datos, _| {
            if let Some(datos) = datos_a_f32(datos) {
                empujar(&cola, &mut remuestreador, &datos, canales);
            }
        },
        error,
        None,
    );
    let stream = stream.map_err(|e| e.to_string())?;
    stream.play().map_err(|e| e.to_string())?;
    Ok(stream)
}

fn datos_a_f32(datos: &cpal::Data) -> Option<Vec<f32>> {
    macro_rules! convertir {
        ($tipo:ty) => {
            datos
                .as_slice::<$tipo>()
                .map(|muestras| muestras.iter().map(|x| x.to_sample::<f32>()).collect())
        };
    }
    match datos.sample_format() {
        cpal::SampleFormat::F32 => convertir!(f32),
        cpal::SampleFormat::F64 => convertir!(f64),
        cpal::SampleFormat::I8 => convertir!(i8),
        cpal::SampleFormat::I16 => convertir!(i16),
        cpal::SampleFormat::I24 => convertir!(cpal::I24),
        cpal::SampleFormat::I32 => convertir!(i32),
        cpal::SampleFormat::I64 => convertir!(i64),
        cpal::SampleFormat::U8 => convertir!(u8),
        cpal::SampleFormat::U16 => convertir!(u16),
        cpal::SampleFormat::U24 => convertir!(cpal::U24),
        cpal::SampleFormat::U32 => convertir!(u32),
        cpal::SampleFormat::U64 => convertir!(u64),
        cpal::SampleFormat::DsdU8 => convertir!(u8),
        cpal::SampleFormat::DsdU16 => convertir!(u16),
        cpal::SampleFormat::DsdU32 => convertir!(u32),
        _ => None,
    }
}

fn empujar(cola: &Cola, remuestreador: &mut Remuestreador, datos: &[f32], canales: u16) {
    let datos = remuestreador.procesar(&a_estereo(datos, canales));
    if let Ok(mut cola) = cola.lock() {
        cola.extend(datos);
        while cola.len() > HZ as usize * 2 {
            cola.pop_front();
        }
    }
}

fn producir(
    equipo: &Cola,
    microfono: &Cola,
    codificador: &mut Encoder,
    tx: &SyncSender<Paquete>,
    inicio: Instant,
    escritas: &mut u64,
    paquetes: &mut u64,
) {
    let bloques = bloques_pendientes(inicio.elapsed().as_secs_f64(), *escritas);
    for _ in 0..bloques {
        let a = sacar(equipo);
        let b = sacar(microfono);
        let mezcla = mezclar(&a, &b);
        // Cada paquete AAC son 1024 muestras: su hora sale de cuántos van, no de cuántos bloques entraron (el codificador
        // tarda un par de bloques en dar el primero).
        if let Some(bytes) = codificar(codificador, &mezcla) {
            let _ = tx.send(Paquete::Audio(
                *paquetes as f64 * 1024.0 / f64::from(HZ),
                bytes,
            ));
            *paquetes += 1;
        }
        *escritas += 1;
    }
}

fn sacar(cola: &Cola) -> Vec<f32> {
    cola.lock()
        .map(|mut x| {
            let sobra = x.len().saturating_sub(RETRASO_MAXIMO + MUESTRAS_BLOQUE);
            x.drain(..sobra - sobra % 2);
            (0..MUESTRAS_BLOQUE)
                .map(|_| x.pop_front().unwrap_or(0.0))
                .collect()
        })
        .unwrap_or_else(|_| vec![0.0; MUESTRAS_BLOQUE])
}

fn codificar(codificador: &Encoder, muestras: &[f32]) -> Option<Vec<u8>> {
    let entrada: Vec<i16> = muestras
        .iter()
        .map(|x| (x.clamp(-1.0, 1.0) * 32767.0) as i16)
        .collect();
    let mut salida = vec![0u8; 4096];
    let info = codificador.encode(&entrada, &mut salida).ok()?;
    Some(salida[..info.output_size].to_vec()).filter(|x| !x.is_empty())
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn convierte_a_estereo() {
        assert_eq!(a_estereo(&[1.0, 0.5], 1), vec![1.0, 1.0, 0.5, 0.5]);
        assert_eq!(a_estereo(&[1.0, 2.0, 3.0], 3), vec![1.0, 2.5]);
    }
    #[test]
    fn mezcla_y_bloques() {
        assert_eq!(mezclar(&[0.8, -0.8], &[0.5]), vec![1.0, -0.8]);
        assert_eq!(bloques_pendientes(1.0, 45), 1);
    }
    #[test]
    fn remuestrea_44_1() {
        let entrada = vec![0.0f32; 44_100 * 2];
        let mut r = Remuestreador::new(44_100);
        assert!((r.procesar(&entrada).len() as i32 - 48_000 * 2).abs() <= 4);
    }
    #[test]
    fn remuestrear_por_bloques_conserva_la_senoide() {
        // 1 kHz a 44,1 kHz en bloques de 441 cuadros (como los de una tarjeta): sin saltos entre bloques.
        let senoide: Vec<f32> = (0..44_100)
            .flat_map(|n| {
                let x = (2.0 * std::f32::consts::PI * 1000.0 * n as f32 / 44_100.0).sin();
                [x, x]
            })
            .collect();
        let mut r = Remuestreador::new(44_100);
        let salida: Vec<f32> = senoide.chunks(882).flat_map(|b| r.procesar(b)).collect();
        assert!((salida.len() as i32 - 96_000).abs() <= 4);
        for (n, par) in salida.chunks(2).enumerate().take(47_000) {
            let esperado = (2.0 * std::f32::consts::PI * 1000.0 * n as f32 / 48_000.0).sin();
            assert!(
                (par[0] - esperado).abs() < 0.02,
                "cuadro {n}: {} frente a {esperado}",
                par[0]
            );
        }
    }
    #[test]
    fn misma_frecuencia_no_cambia_nada() {
        let mut r = Remuestreador::new(48_000);
        let a = r.procesar(&[0.1, 0.2, 0.3, 0.4]);
        let b = r.procesar(&[0.5, 0.6]);
        assert_eq!([a, b].concat(), vec![0.1, 0.2, 0.3, 0.4]);
    }
    /// Prueba a mano con el sistema de sonido de verdad: graba 4 s del sonido del equipo y guarda el AAC en `VITACLIP_AAC`.
    /// `VITACLIP_AAC=/tmp/x.aac cargo test --lib audio_real -- --ignored` mientras suena algo (p. ej. `pw-play tono.wav`).
    #[test]
    #[ignore]
    fn audio_real() {
        let (tx, rx) = sync_channel(4096);
        let detener = Arc::new(AtomicBool::new(false));
        let arranque = iniciar(
            Fuentes {
                equipo: true,
                microfono: false,
            },
            false,
            Instant::now(),
            tx,
            detener.clone(),
        );
        assert!(arranque.con_audio, "sin audio: {:?}", arranque.avisos);
        thread::sleep(Duration::from_secs(4));
        detener.store(true, Ordering::Relaxed);
        arranque.hilo.unwrap().join().unwrap();
        let mut aac = Vec::new();
        let mut ultimo = -1.0;
        for paquete in rx.try_iter() {
            if let Paquete::Audio(pts, datos) = paquete {
                assert!(pts > ultimo);
                ultimo = pts;
                aac.extend(datos);
            }
        }
        assert!(ultimo > 3.5, "solo {ultimo} s de audio");
        std::fs::write(std::env::var("VITACLIP_AAC").unwrap(), aac).unwrap();
    }
    #[test]
    fn la_cola_no_acumula_retraso() {
        let cola: Cola = Arc::new(Mutex::new((0..HZ as usize).map(|x| x as f32).collect()));
        let bloque = sacar(&cola);
        assert_eq!(bloque.len(), MUESTRAS_BLOQUE);
        assert_eq!(cola.lock().unwrap().len(), RETRASO_MAXIMO);
    }
}
