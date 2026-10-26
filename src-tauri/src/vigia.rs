use crate::{db, estado::Estado, util};
use arboard::ImageData;
use image::ImageEncoder;
use regex::Regex;
use std::{thread, time::Duration};
use tauri::{AppHandle, Emitter, Manager};

/// Tamaño máximo en crudo (RGBA) de una imagen para guardarla: 64 MiB ≈ 4096×4096.
const MAX_BYTES_IMAGEN_CRUDA: u64 = 64 * 1024 * 1024;

/// Contador de cambios del portapapeles que da el sistema (Windows y macOS): si no ha cambiado, no hace falta leerlo.
#[cfg(windows)]
fn contador_cambios() -> Option<u64> {
    // SAFETY: función de Win32 sin argumentos.
    Some(u64::from(unsafe {
        windows_sys::Win32::System::DataExchange::GetClipboardSequenceNumber()
    }))
}

#[cfg(target_os = "macos")]
fn contador_cambios() -> Option<u64> {
    Some(objc2_app_kit::NSPasteboard::generalPasteboard().changeCount() as u64)
}

#[cfg(not(any(windows, target_os = "macos")))]
fn contador_cambios() -> Option<u64> {
    None
}

/// Retención por días: al arrancar (tras un minuto) y luego cada hora, borra lo no fijado que lleve demasiado sin usarse.
pub fn iniciar_retencion(app: AppHandle) {
    thread::spawn(move || {
        thread::sleep(Duration::from_secs(60));
        loop {
            if let Some(estado) = app.try_state::<Estado>() {
                if let Ok(c) = estado.db.lock() {
                    let dias = db::ajustes(&c).retencion_dias;
                    if matches!(db::purgar_antiguos(&c, dias, util::ahora()), Ok(n) if n > 0) {
                        let _ = app.emit("historial-cambiado", ());
                    }
                }
            }
            thread::sleep(Duration::from_secs(3600));
        }
    });
}

pub fn iniciar(app: AppHandle) {
    thread::spawn(move || {
        let mut ultima: Option<String> = None;
        // Huella de los píxeles crudos de la última imagen vista: evita recodificar a PNG cada 400 ms.
        let mut ultima_cruda: Option<String> = None;
        let mut ultimo_contador: Option<u64> = None;
        let mut espera = Duration::from_millis(400);
        let mut patrones_fuente: Vec<String> = Vec::new();
        let mut patrones: Vec<Regex> = Vec::new();
        loop {
            thread::sleep(espera);
            // Si el sistema dice que el portapapeles no ha cambiado, no se lee (ahorra CPU en Windows y macOS).
            // Se da por leído solo cuando la lectura sale bien (si otra app tenía el portapapeles abierto, se reintenta).
            let contador = contador_cambios();
            if contador.is_some() && contador == ultimo_contador {
                continue;
            }
            let Some(estado) = app.try_state::<Estado>() else {
                continue;
            };
            let mut portapapeles = match estado.portapapeles.lock() {
                Ok(x) => x,
                Err(_) => continue,
            };
            if portapapeles.is_none() {
                *portapapeles = arboard::Clipboard::new().ok();
                if portapapeles.is_none() {
                    espera = (espera * 2).min(Duration::from_secs(5));
                    continue;
                }
            }
            let Some(cb) = portapapeles.as_mut() else {
                continue;
            };
            let (bytes, imagen, ancho, alto) = if let Ok(texto) = cb.get_text() {
                ultima_cruda = None;
                if texto.is_empty() || texto.len() > 1_000_000 {
                    continue;
                }
                (texto.into_bytes(), false, 0, 0)
            } else if let Ok(ImageData {
                width,
                height,
                bytes,
            }) = cb.get_image()
            {
                let cruda = db::huella(&bytes);
                if ultima_cruda.as_ref() == Some(&cruda) {
                    continue;
                }
                ultima_cruda = Some(cruda);
                // Una imagen gigantesca se salta antes de codificarla (codificar 16k×16k pediría ~1 GB de memoria).
                if (width as u64) * (height as u64) * 4 > MAX_BYTES_IMAGEN_CRUDA {
                    continue;
                }
                let mut png = Vec::new();
                if image::codecs::png::PngEncoder::new(&mut png)
                    .write_image(
                        &bytes,
                        width as u32,
                        height as u32,
                        image::ExtendedColorType::Rgba8,
                    )
                    .is_err()
                {
                    continue;
                }
                (png, true, width, height)
            } else {
                continue;
            };
            espera = Duration::from_millis(400);
            ultimo_contador = contador;
            let huella = db::huella(&bytes);
            if ultima.as_ref() == Some(&huella) {
                continue;
            }
            ultima = Some(huella.clone());
            if let Ok(mut secreta) = estado.huella_secreta.lock() {
                if secreta.as_ref() == Some(&huella) {
                    *secreta = None;
                    continue;
                }
            }
            if let Ok(propia) = estado.huella_propia.lock() {
                if propia.as_ref() == Some(&huella) {
                    if let Ok(db) = estado.db.lock() {
                        if let Ok(Some(id)) = db::id_por_huella(&db, &huella) {
                            let _ = db::marcar_usado(&db, id, util::ahora());
                        }
                    }
                    continue;
                }
            }
            // Lo copiado desde un gestor de contraseñas viene marcado como secreto: nunca se guarda.
            if crate::sensible::marcado_como_secreto() {
                continue;
            }
            if estado.esta_pausado() {
                continue;
            }
            let ajustes = estado
                .db
                .lock()
                .ok()
                .and_then(|c| db::ajuste_leer(&c, "ajustes").ok().flatten())
                .and_then(|x| serde_json::from_str::<db::Ajustes>(&x).ok())
                .unwrap_or_default();
            if ajustes.ignorar != patrones_fuente {
                patrones_fuente = ajustes.ignorar.clone();
                patrones = patrones_fuente
                    .iter()
                    .filter_map(|x| Regex::new(x).ok())
                    .collect();
            }
            if !imagen
                && patrones
                    .iter()
                    .any(|r| r.is_match(std::str::from_utf8(&bytes).unwrap_or_default()))
            {
                continue;
            }
            let limite = ajustes.limite_historial.clamp(10, 10_000);
            if imagen && bytes.len() > 20 * 1024 * 1024 {
                continue;
            }
            let Ok(c) = estado.db.lock() else { continue };
            let nuevo = if imagen {
                db::guardar_imagen(&c, &bytes, ancho as u32, alto as u32, util::ahora(), limite)
            } else {
                db::guardar_texto(
                    &c,
                    std::str::from_utf8(&bytes).unwrap_or_default(),
                    util::ahora(),
                    limite,
                )
            };
            if nuevo.ok() == Some(true) {
                let _ = app.emit("historial-cambiado", ());
            }
        }
    });
}
