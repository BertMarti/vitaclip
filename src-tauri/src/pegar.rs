use crate::{db, estado::Estado};
use enigo::{Enigo, Key, Keyboard, Settings};
use std::time::Duration;
use tauri::{AppHandle, Manager};

pub enum Contenido {
    Texto(String),
    Imagen(Vec<u8>),
}

pub fn escribir_texto(estado: &Estado, texto: &str) -> Result<(), String> {
    let huella = db::huella(texto.as_bytes());
    *estado
        .huella_propia
        .lock()
        .map_err(|_| "Estado no disponible".to_string())? = Some(huella);
    let mut portapapeles = estado
        .portapapeles
        .lock()
        .map_err(|_| "Portapapeles no disponible".to_string())?;
    portapapeles
        .as_mut()
        .ok_or("Portapapeles no disponible")?
        .set_text(texto)
        .map_err(|e| e.to_string())
}

pub fn escribir_imagen(estado: &Estado, png: &[u8]) -> Result<(), String> {
    let imagen = image::load_from_memory(png)
        .map_err(|_| "Imagen no válida".to_string())?
        .to_rgba8();
    let (ancho, alto) = imagen.dimensions();
    *estado
        .huella_propia
        .lock()
        .map_err(|_| "Estado no disponible".to_string())? = Some(db::huella(png));
    let mut portapapeles = estado
        .portapapeles
        .lock()
        .map_err(|_| "Portapapeles no disponible".to_string())?;
    portapapeles
        .as_mut()
        .ok_or("Portapapeles no disponible")?
        .set_image(arboard::ImageData {
            width: ancho as usize,
            height: alto as usize,
            bytes: std::borrow::Cow::Owned(imagen.into_raw()),
        })
        .map_err(|e| e.to_string())
}

pub async fn pegar(app: AppHandle, estado: &Estado, contenido: Contenido) -> Result<bool, String> {
    match contenido {
        Contenido::Texto(texto) => escribir_texto(estado, &texto)?,
        Contenido::Imagen(png) => escribir_imagen(estado, &png)?,
    }
    if let Some(ventana) = app.get_webview_window("popup") {
        let _ = ventana.hide();
    }
    #[cfg(target_os = "macos")]
    {
        let _ = app.hide();
    }
    let ajustes = {
        let db = estado
            .db
            .lock()
            .map_err(|_| "Base de datos no disponible".to_string())?;
        db::ajuste_leer(&db, "ajustes")?
            .and_then(|x| serde_json::from_str::<db::Ajustes>(&x).ok())
            .unwrap_or_default()
    };
    if !ajustes.pegar_auto {
        return Ok(false);
    }
    tokio::time::sleep(Duration::from_millis(120)).await;
    let resultado = tokio::task::spawn_blocking(|| {
        let mut enigo = Enigo::new(&Settings::default()).map_err(|e| e.to_string())?;
        #[cfg(target_os = "macos")]
        let tecla = Key::Meta;
        #[cfg(not(target_os = "macos"))]
        let tecla = Key::Control;
        enigo
            .key(tecla, enigo::Direction::Press)
            .map_err(|e| e.to_string())?;
        enigo
            .key(Key::Unicode('v'), enigo::Direction::Click)
            .map_err(|e| e.to_string())?;
        enigo
            .key(tecla, enigo::Direction::Release)
            .map_err(|e| e.to_string())
    })
    .await
    .map_err(|e| e.to_string())?;
    Ok(resultado.is_ok())
}
