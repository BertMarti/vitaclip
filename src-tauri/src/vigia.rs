use crate::{db, estado::Estado};
use arboard::ImageData;
use image::ImageEncoder;
use regex::Regex;
use std::{thread, time::Duration};
use tauri::{AppHandle, Emitter, Manager};

pub fn iniciar(app: AppHandle) {
    thread::spawn(move || {
        let mut ultima: Option<String> = None;
        // Huella de los píxeles crudos de la última imagen vista: evita recodificar a PNG cada 400 ms.
        let mut ultima_cruda: Option<String> = None;
        let mut espera = Duration::from_millis(400);
        let mut patrones_fuente: Vec<String> = Vec::new();
        let mut patrones: Vec<Regex> = Vec::new();
        loop {
            thread::sleep(espera);
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
                            let _ = db::marcar_usado(&db, id, ahora());
                        }
                    }
                    continue;
                }
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
            let limite = if estado.es_pro() {
                ajustes.limite_historial.clamp(10, 10_000)
            } else {
                ajustes.limite_historial.min(300)
            };
            if imagen
                && bytes.len()
                    > if estado.es_pro() {
                        20 * 1024 * 1024
                    } else {
                        3 * 1024 * 1024
                    }
            {
                continue;
            }
            let Ok(c) = estado.db.lock() else { continue };
            let nuevo = if imagen {
                db::guardar_imagen(&c, &bytes, ancho as u32, alto as u32, ahora(), limite)
            } else {
                db::guardar_texto(
                    &c,
                    std::str::from_utf8(&bytes).unwrap_or_default(),
                    ahora(),
                    limite,
                )
            };
            if nuevo.ok() == Some(true) {
                let _ = app.emit("historial-cambiado", ());
            }
        }
    });
}
fn ahora() -> i64 {
    use std::time::{SystemTime, UNIX_EPOCH};
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|x| x.as_millis() as i64)
        .unwrap_or(0)
}
