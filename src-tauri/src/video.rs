use crate::{db, estado::Estado, util};
use openh264::{
    encoder::{
        BitRate, Encoder, EncoderConfig, FrameRate, IntraFramePeriod, QpRange, RateControlMode,
        UsageType,
    },
    formats::{RgbaSliceU8, YUVBuffer},
    OpenH264API,
};
use serde::{Deserialize, Serialize};
use std::{
    path::PathBuf,
    sync::{
        atomic::{AtomicBool, Ordering},
        mpsc::{sync_channel, Receiver},
        Arc,
    },
    thread::{self, JoinHandle},
    time::{Duration, Instant},
};
use tauri::{AppHandle, Emitter, Manager, WebviewUrl, WebviewWindowBuilder};

#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Region {
    pub x: i32,
    pub y: i32,
    pub ancho: u32,
    pub alto: u32,
}

pub struct Grabacion {
    pub inicio: Instant,
    pub ruta: PathBuf,
    detener: Arc<AtomicBool>,
    captura: Option<JoinHandle<()>>,
    codificacion: Option<JoinHandle<Result<(), String>>>,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct EstadoVideo {
    pub grabando: bool,
    pub segundos: f64,
}

pub fn grabando(app: &AppHandle) -> bool {
    app.try_state::<Estado>()
        .and_then(|e| e.grabacion.lock().ok().map(|x| x.is_some()))
        .unwrap_or(false)
}

fn carpetas(app: &AppHandle) -> Result<(PathBuf, db::Video), String> {
    let ajustes = app.try_state::<Estado>().ok_or("Estado no disponible")?;
    let a = ajustes
        .db
        .lock()
        .map_err(|_| "Base de datos no disponible".to_string())?;
    let cfg = db::ajuste_leer(&a, "ajustes")?
        .and_then(|x| serde_json::from_str::<db::Ajustes>(&x).ok())
        .unwrap_or_default();
    let dir = if cfg.video.carpeta.is_empty() {
        app.path()
            .video_dir()
            .or_else(|_| app.path().home_dir())
            .map_err(|e| e.to_string())?
            .join("Vitaclip")
    } else {
        PathBuf::from(&cfg.video.carpeta)
    };
    Ok((dir, cfg.video))
}

/// Atajo y bandeja: si graba, para; si no, abre el selector de zona en modo vídeo. Siempre fuera del hilo principal.
pub fn alternar(app: AppHandle) {
    if grabando(&app) {
        thread::spawn(move || {
            if let Err(mensaje) = parar(app.clone()) {
                let _ = app.emit("video-error", serde_json::json!({ "mensaje": mensaje }));
            }
        });
    } else {
        crate::captura::iniciar_en_hilo(app, "video");
    }
}

pub fn iniciar(app: AppHandle, region: Option<Region>) -> Result<(), String> {
    // Monitor de la pantalla congelada donde se eligió la zona (si no hay, el del ratón).
    let monitor_elegido = app.try_state::<Estado>().and_then(|e| {
        e.captura
            .lock()
            .ok()
            .and_then(|c| c.as_ref().map(|c| (c.monitor_x, c.monitor_y)))
    });
    if let Some(e) = app.try_state::<Estado>() {
        crate::captura::cerrar(&app, &e);
    }
    let estado = app.state::<Estado>();
    let mut guard = estado
        .grabacion
        .lock()
        .map_err(|_| "Estado no disponible".to_string())?;
    if guard.is_some() {
        return Err("Ya hay una grabación en curso".into());
    }
    let (dir, cfg) = carpetas(&app)?;
    std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    let ruta = util::nombre_unico(&dir, "mp4");
    let (mx, my, monitor) = {
        let popup = app.get_webview_window("popup");
        let p = monitor_elegido
            .map(|(x, y)| (x + 1, y + 1))
            .unwrap_or_else(|| {
                popup
                    .as_ref()
                    .and_then(|w| w.cursor_position().ok())
                    .map(|p| (p.x as i32, p.y as i32))
                    .unwrap_or((0, 0))
            });
        let m = xcap::Monitor::from_point(p.0, p.1)
            .or_else(|_| {
                xcap::Monitor::all()
                    .map_err(|e| e.to_string())
                    .and_then(|mut x| x.pop().ok_or_else(|| "No hay monitores".to_string()))
            })
            .map_err(|e| e.to_string())?;
        (m.x().unwrap_or(0), m.y().unwrap_or(0), m)
    };
    let (rw, rh, region_x, region_y) = if let Some(r) = region {
        let (x, y, w, h) = recorte(r.x, r.y, r.ancho, r.alto);
        (w, h, x, y)
    } else {
        (
            monitor.width().map_err(|e| e.to_string())? & !1,
            monitor.height().map_err(|e| e.to_string())? & !1,
            0,
            0,
        )
    };
    if rw < 2 || rh < 2 {
        return Err("La región de grabación es demasiado pequeña".into());
    }
    let fps = if cfg.fps == 60 { 60 } else { 30 };
    let indicador_x = mx
        + (monitor
            .width()
            .map_err(|e| e.to_string())?
            .saturating_sub(220)
            / 2) as i32;
    let calidad_maxima = cfg.calidad == "maxima";
    let detener = Arc::new(AtomicBool::new(false));
    let ruta_hilo = ruta.clone();
    let (tx, rxq) = sync_channel::<(f64, xcap::Frame)>(8);
    let captura_detener = detener.clone();
    let app_hilo = app.clone();
    // En Windows el monitor de xcap no se puede mover a otro hilo: se pasa su esquina y se vuelve a buscar allí.
    let (esquina_x, esquina_y) = (mx + 1, my + 1);
    let captura = thread::spawn(move || {
        let grabador = xcap::Monitor::from_point(esquina_x, esquina_y)
            .map_err(|e| e.to_string())
            .and_then(|m| m.video_recorder().map_err(|e| e.to_string()))
            .and_then(|(g, rx)| g.start().map(|_| (g, rx)).map_err(|e| e.to_string()));
        let (grabador, rx_frames) = match grabador {
            Ok(x) => x,
            Err(e) => {
                // Permiso denegado (macOS), diálogo cancelado (Wayland)…: se avisa ya, sin esperar a «Detener».
                let app = app_hilo.clone();
                thread::spawn(move || {
                    abortar(&app, &format!("No se pudo grabar la pantalla: {e}"))
                });
                return;
            }
        };
        let inicio = Instant::now();
        let mut ultimo = None;
        while !captura_detener.load(Ordering::Relaxed) {
            if let Ok(frame) = rx_frames.recv_timeout(Duration::from_millis(100)) {
                let t = inicio.elapsed().as_secs_f64();
                if !acepta_pts(ultimo, t, fps) {
                    continue;
                }
                ultimo = Some(t);
                match recortar_frame(frame, region_x, region_y, rw, rh) {
                    // El codificador espera siempre el mismo tamaño.
                    Some(f) if f.width == rw && f.height == rh => {
                        let _ = tx.try_send((t, f));
                    }
                    _ => {
                        let app = app_hilo.clone();
                        thread::spawn(move || {
                            abortar(
                                &app,
                                "La zona elegida no cabe en la pantalla que se está grabando.",
                            )
                        });
                        break;
                    }
                }
            }
        }
        let _ = grabador.stop();
    });
    let codificacion =
        thread::spawn(move || codificar_cola(rxq, ruta_hilo, rw, rh, fps, calidad_maxima));
    *guard = Some(Arc::new(Grabacion {
        inicio: Instant::now(),
        ruta: ruta.clone(),
        detener,
        captura: Some(captura),
        codificacion: Some(codificacion),
    }));
    let _ = (mx, my);
    abrir_indicador(&app, indicador_x, my)?;
    emitir_estado(&app, true, 0.0);
    let emisor = app.clone();
    thread::spawn(move || {
        while grabando(&emisor) {
            thread::sleep(Duration::from_secs(1));
            if let Ok(s) = estado_video(&emisor) {
                emitir_estado(&emisor, s.grabando, s.segundos);
            }
        }
    });
    Ok(())
}

/// Recorta la zona del fotograma; `None` si no cabe (p. ej. en Wayland se eligió otra pantalla en el diálogo del sistema).
fn recortar_frame(mut f: xcap::Frame, x: i32, y: i32, w: u32, h: u32) -> Option<xcap::Frame> {
    let x = x.max(0) as u32;
    let y = y.max(0) as u32;
    let w = w.min(f.width.saturating_sub(x)) & !1;
    let h = h.min(f.height.saturating_sub(y)) & !1;
    let necesarios = (y as usize + h as usize) * f.width as usize * 4;
    if w < 2 || h < 2 || f.raw.len() < necesarios {
        return None;
    }
    if x == 0 && y == 0 && f.width == w && f.height == h {
        return Some(f);
    }
    let mut raw = Vec::with_capacity(w as usize * h as usize * 4);
    for fila in 0..h as usize {
        let ini = ((y as usize + fila) * f.width as usize + x as usize) * 4;
        raw.extend_from_slice(&f.raw[ini..ini + w as usize * 4]);
    }
    f.width = w;
    f.height = h;
    f.raw = raw;
    Some(f)
}

fn codificar_cola(
    rx: Receiver<(f64, xcap::Frame)>,
    ruta: PathBuf,
    w: u32,
    h: u32,
    fps: u32,
    maxima: bool,
) -> Result<(), String> {
    let primero = rx
        .recv()
        .map_err(|_| "No se capturó ningún fotograma".to_string())?;
    let archivo = std::fs::File::create(&ruta).map_err(|e| e.to_string())?;
    let cfg = configuracion(w, h, fps, maxima);
    let mut enc =
        Encoder::with_api_config(OpenH264API::from_source(), cfg).map_err(|e| e.to_string())?;
    let mut mux = muxide::api::MuxerBuilder::new(archivo)
        .video(muxide::api::VideoCodec::H264, w, h, fps as f64)
        .build()
        .map_err(|e| e.to_string())?;
    escribir_frame(&mut enc, &mut mux, primero.0, &primero.1)?;
    while let Ok((pts, frame)) = rx.recv() {
        escribir_frame(&mut enc, &mut mux, pts, &frame)?;
    }
    mux.finish().map_err(|e| e.to_string())
}

fn configuracion(w: u32, h: u32, fps: u32, maxima: bool) -> EncoderConfig {
    let factor = if maxima { 0.25 } else { 0.12 };
    EncoderConfig::new()
        .usage_type(UsageType::ScreenContentRealTime)
        .rate_control_mode(RateControlMode::Quality)
        .bitrate(BitRate::from_bps(
            (w as f64 * h as f64 * fps as f64 * factor) as u32,
        ))
        .max_frame_rate(FrameRate::from_hz(fps as f32))
        .qp(if maxima {
            QpRange::new(8, 24)
        } else {
            QpRange::new(14, 30)
        })
        .intra_frame_period(IntraFramePeriod::from_num_frames(fps * 2))
        .num_threads(
            std::thread::available_parallelism()
                .map(|x| x.get().saturating_sub(1).min(4) as u16)
                .unwrap_or(1),
        )
}

fn escribir_frame(
    enc: &mut Encoder,
    mux: &mut muxide::api::Muxer<std::fs::File>,
    pts: f64,
    f: &xcap::Frame,
) -> Result<(), String> {
    let yuv = YUVBuffer::from_rgb_source(RgbaSliceU8::new(
        &f.raw,
        (f.width as usize, f.height as usize),
    ));
    let bs = enc.encode(&yuv).map_err(|e| e.to_string())?;
    let datos = bs.to_vec();
    if !datos.is_empty() {
        let clave = matches!(
            bs.frame_type(),
            openh264::encoder::FrameType::IDR | openh264::encoder::FrameType::I
        );
        mux.write_video(pts, &datos, clave)
            .map_err(|e| e.to_string())?;
    }
    Ok(())
}

fn abrir_indicador(app: &AppHandle, x: i32, y: i32) -> Result<(), String> {
    let w = if let Some(w) = app.get_webview_window("grabacion") {
        w
    } else {
        WebviewWindowBuilder::new(app, "grabacion", WebviewUrl::App("grabacion.html".into()))
            .decorations(false)
            .always_on_top(true)
            .skip_taskbar(true)
            .inner_size(220., 44.)
            // En Windows y macOS el indicador no sale en el propio vídeo.
            .content_protected(true)
            .build()
            .map_err(|e| e.to_string())?
    };
    w.set_position(tauri::PhysicalPosition::new(x, y))
        .map_err(|e| e.to_string())?;
    w.show().map_err(|e| e.to_string())
}
fn emitir_estado(app: &AppHandle, grabando: bool, segundos: f64) {
    let _ = app.emit("video-estado", EstadoVideo { grabando, segundos });
}

/// Para la grabación por un error, avisa a la interfaz y cierra el indicador.
fn abortar(app: &AppHandle, mensaje: &str) {
    let _ = parar_sin_aviso(app);
    if let Some(w) = app.get_webview_window("grabacion") {
        let _ = w.close();
    }
    emitir_estado(app, false, 0.0);
    let _ = app.emit("video-error", serde_json::json!({ "mensaje": mensaje }));
}

/// Saca la grabación del estado (soltando el bloqueo antes de esperar a los hilos) y la termina.
fn parar_sin_aviso(app: &AppHandle) -> Result<Grabacion, String> {
    let g = {
        let estado = app.state::<Estado>();
        let mut guard = estado
            .grabacion
            .lock()
            .map_err(|_| "Estado no disponible".to_string())?;
        guard.take().ok_or("No hay una grabación en curso")?
    };
    let mut g = Arc::try_unwrap(g).map_err(|_| "La grabación sigue en uso".to_string())?;
    g.detener.store(true, Ordering::Relaxed);
    if let Some(h) = g.captura.take() {
        let _ = h.join();
    }
    let resultado = g
        .codificacion
        .take()
        .ok_or("No se pudo finalizar la grabación")?
        .join()
        .map_err(|_| "Falló el codificador".to_string())?;
    resultado?;
    Ok(g)
}

pub fn parar(app: AppHandle) -> Result<String, String> {
    let g = match parar_sin_aviso(&app) {
        Ok(g) => g,
        Err(e) => {
            if let Some(w) = app.get_webview_window("grabacion") {
                let _ = w.close();
            }
            emitir_estado(&app, false, 0.0);
            return Err(e);
        }
    };
    let ruta = g.ruta.to_string_lossy().into_owned();
    if let Some(w) = app.get_webview_window("grabacion") {
        let _ = w.close();
    }
    emitir_estado(&app, false, g.inicio.elapsed().as_secs_f64());
    let _ = app.emit("video-guardado", serde_json::json!({"ruta": ruta}));
    use tauri_plugin_notification::NotificationExt;
    let _ = app
        .notification()
        .builder()
        .title("Vídeo guardado")
        .body(
            std::path::Path::new(&ruta)
                .file_name()
                .and_then(|x| x.to_str())
                .unwrap_or("Vídeo"),
        )
        .show();
    Ok(ruta)
}

pub fn estado(app: &AppHandle) -> Result<EstadoVideo, String> {
    estado_video(app)
}
fn estado_video(app: &AppHandle) -> Result<EstadoVideo, String> {
    let e = app.state::<Estado>();
    let g = e
        .grabacion
        .lock()
        .map_err(|_| "Estado no disponible".to_string())?;
    Ok(g.as_ref()
        .map(|x| EstadoVideo {
            grabando: true,
            segundos: x.inicio.elapsed().as_secs_f64(),
        })
        .unwrap_or(EstadoVideo {
            grabando: false,
            segundos: 0.0,
        }))
}

pub fn recorte(x: i32, y: i32, w: u32, h: u32) -> (i32, i32, u32, u32) {
    (x, y, w & !1, h & !1)
}
pub fn acepta_pts(ultimo: Option<f64>, actual: f64, fps: u32) -> bool {
    fps > 0
        && ultimo
            .map(|x| actual - x >= 1.0 / fps as f64 - 1e-9)
            .unwrap_or(true)
}

#[cfg(test)]
fn codificar_sinteticos(ruta: &std::path::Path) -> Result<(), String> {
    let w = 64u32;
    let h = 48u32;
    let archivo = std::fs::File::create(ruta).map_err(|e| e.to_string())?;
    let mut enc =
        Encoder::with_api_config(OpenH264API::from_source(), configuracion(w, h, 30, false))
            .map_err(|e| e.to_string())?;
    let mut mux = muxide::api::MuxerBuilder::new(archivo)
        .video(muxide::api::VideoCodec::H264, w, h, 30.)
        .build()
        .map_err(|e| e.to_string())?;
    for i in 0..10 {
        let rgba = vec![(i * 20) as u8; (w * h * 4) as usize];
        let yuv = YUVBuffer::from_rgb_source(RgbaSliceU8::new(&rgba, (w as usize, h as usize)));
        let bs = enc.encode(&yuv).map_err(|e| e.to_string())?;
        let datos = bs.to_vec();
        if !datos.is_empty() {
            mux.write_video(i as f64 / 30., &datos, i == 0)
                .map_err(|e| e.to_string())?;
        }
    }
    mux.finish().map_err(|e| e.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn recorte_que_no_cabe_no_rompe_la_app() {
        let f = || xcap::Frame::new(8, 6, vec![0; 8 * 6 * 4]);
        assert!(recortar_frame(f(), 10, 0, 4, 4).is_none());
        assert!(recortar_frame(f(), 0, 6, 4, 4).is_none());
        assert!(recortar_frame(xcap::Frame::new(8, 6, vec![0; 10]), 0, 0, 8, 6).is_none());
        let r = recortar_frame(f(), 2, 2, 4, 4).expect("cabe");
        assert_eq!((r.width, r.height, r.raw.len()), (4, 4, 4 * 4 * 4));
        // Se recorta a lo que cabe: 4 columnas desde x = 6 en un fotograma de 8 dejan 2.
        assert_eq!(recortar_frame(f(), 6, 0, 4, 4).map(|r| r.width), Some(2));
    }

    #[test]
    fn pares() {
        assert_eq!(recorte(1, 2, 5, 7), (1, 2, 4, 6));
    }
    #[test]
    fn ritmo() {
        assert!(acepta_pts(None, 0., 30));
        assert!(!acepta_pts(Some(0.), 0.01, 30));
    }
    #[test]
    fn mp4_sintetico() {
        let p = std::env::temp_dir().join(format!("vitaclip-prueba-{}.mp4", std::process::id()));
        codificar_sinteticos(&p).expect("codificación");
        let b = std::fs::read(&p).expect("mp4");
        assert_eq!(&b[4..8], b"ftyp");
        let _ = std::fs::remove_file(p);
    }
}
