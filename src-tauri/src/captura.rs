use crate::{db, estado::Estado, pegar, util};
use base64::Engine;
use image::ImageEncoder;
use serde::Serialize;
use std::path::{Path, PathBuf};
use tauri::{AppHandle, Emitter, Manager, WebviewUrl, WebviewWindowBuilder};
use xcap::Monitor;

pub struct Captura {
    pub png: Vec<u8>,
    pub ancho: u32,
    pub alto: u32,
    pub escala: f64,
    pub modo: String,
    /// Esquina del monitor capturado (para grabar luego ese mismo monitor).
    pub monitor_x: i32,
    pub monitor_y: i32,
}
#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Info {
    pub modo: String,
    pub ancho: u32,
    pub alto: u32,
    pub escala: f64,
}

fn carpeta(app: &AppHandle) -> PathBuf {
    app.path()
        .picture_dir()
        .unwrap_or_else(|_| app.path().home_dir().unwrap_or_else(|_| PathBuf::from(".")))
        .join("Vitaclip")
}
/// Lanza la captura en otro hilo (nunca en el principal: espera, captura y crea una ventana) y avisa si falla.
pub fn iniciar_en_hilo(app: AppHandle, modo: &str) {
    let modo = modo.to_string();
    std::thread::spawn(move || {
        if let Err(mensaje) = iniciar(app.clone(), modo) {
            use tauri_plugin_notification::NotificationExt;
            let _ = app
                .notification()
                .builder()
                .title("No se pudo capturar la pantalla")
                .body(mensaje)
                .show();
        }
    });
}

pub fn iniciar(app: AppHandle, modo: String) -> Result<(), String> {
    if modo != "imagen" && modo != "video" {
        return Err("Modo de captura no válido".into());
    }
    let (x, y) = app
        .get_webview_window("popup")
        .and_then(|w| w.cursor_position().ok())
        .map(|p| (p.x as i32, p.y as i32))
        .unwrap_or((0, 0));
    let monitor = Monitor::from_point(x, y)
        .or_else(|_| Monitor::all().map(|mut x| x.remove(0)))
        .map_err(|e| e.to_string())?;
    if let Some(w) = app.get_webview_window("popup") {
        let _ = w.hide();
    }
    std::thread::sleep(std::time::Duration::from_millis(150));
    let imagen = monitor
        .capture_image()
        .map_err(|e| format!("No se pudo capturar la pantalla: {e}"))?;
    let (ancho, alto) = imagen.dimensions();
    let escala = monitor.scale_factor().unwrap_or(1.0);
    let mut png = Vec::new();
    image::codecs::png::PngEncoder::new(&mut png)
        .write_image(
            imagen.as_raw(),
            ancho,
            alto,
            image::ExtendedColorType::Rgba8,
        )
        .map_err(|e| e.to_string())?;
    *app.state::<Estado>()
        .captura
        .lock()
        .map_err(|_| "Estado no disponible".to_string())? = Some(Captura {
        png,
        ancho,
        alto,
        escala: escala.into(),
        modo: modo.clone(),
        monitor_x: monitor.x().unwrap_or(0),
        monitor_y: monitor.y().unwrap_or(0),
    });
    let w = if let Some(w) = app.get_webview_window("captura") {
        w
    } else {
        WebviewWindowBuilder::new(&app, "captura", WebviewUrl::App("captura.html".into()))
            .decorations(false)
            .always_on_top(true)
            .skip_taskbar(true)
            .build()
            .map_err(|e| e.to_string())?
    };
    let _ = w.set_position(tauri::PhysicalPosition::new(
        monitor.x().unwrap_or(0),
        monitor.y().unwrap_or(0),
    ));
    let _ = w.set_size(tauri::PhysicalSize::new(ancho, alto));
    let _ = w.set_fullscreen(true);
    w.show().map_err(|e| e.to_string())?;
    let _ = w.emit(
        "captura-lista",
        Info {
            modo,
            ancho,
            alto,
            escala: escala.into(),
        },
    );
    Ok(())
}
pub fn info(e: &Estado) -> Result<Info, String> {
    let c = e
        .captura
        .lock()
        .map_err(|_| "Estado no disponible".to_string())?;
    let x = c.as_ref().ok_or("No hay captura")?;
    Ok(Info {
        modo: x.modo.clone(),
        ancho: x.ancho,
        alto: x.alto,
        escala: x.escala,
    })
}
pub fn imagen(e: &Estado) -> Result<String, String> {
    let c = e
        .captura
        .lock()
        .map_err(|_| "Estado no disponible".to_string())?;
    Ok(format!(
        "data:image/png;base64,{}",
        base64::engine::general_purpose::STANDARD.encode(&c.as_ref().ok_or("No hay captura")?.png)
    ))
}
pub fn copiar(app: AppHandle, e: &Estado, png: String) -> Result<(), String> {
    let bytes = base64::engine::general_purpose::STANDARD
        .decode(png)
        .map_err(|_| "Imagen no válida".to_string())?;
    if bytes.len() > 20 * 1024 * 1024 {
        return Err("La imagen supera el límite de 20 MB".into());
    }
    let img = image::load_from_memory(&bytes)
        .map_err(|_| "Imagen no válida".to_string())?
        .to_rgba8();
    // Se recodifica igual que lo hace el vigía: así su huella coincide, el vigía solo la sube y no sale repetida.
    let mut normalizado = Vec::new();
    image::codecs::png::PngEncoder::new(&mut normalizado)
        .write_image(
            img.as_raw(),
            img.width(),
            img.height(),
            image::ExtendedColorType::Rgba8,
        )
        .map_err(|e| e.to_string())?;
    pegar::escribir_imagen(e, &normalizado)?;
    let a = ajustes(e)?;
    let c =
        e.db.lock()
            .map_err(|_| "Base de datos no disponible".to_string())?;
    db::guardar_imagen(
        &c,
        &normalizado,
        img.width(),
        img.height(),
        util::ahora(),
        a.limite_historial.clamp(10, 10000),
    )?;
    let _ = app.emit("historial-cambiado", ());
    cerrar(&app, e);
    Ok(())
}
pub fn guardar(app: AppHandle, e: &Estado, png: String) -> Result<String, String> {
    let bytes = base64::engine::general_purpose::STANDARD
        .decode(png)
        .map_err(|_| "Imagen no válida".to_string())?;
    if bytes.len() > 20 * 1024 * 1024 {
        return Err("La imagen supera el límite de 20 MB".into());
    }
    let img = image::load_from_memory(&bytes).map_err(|_| "Imagen no válida".to_string())?;
    let d = {
        let a = ajustes(e)?;
        if a.capturas.carpeta.is_empty() {
            carpeta(&app)
        } else {
            PathBuf::from(a.capturas.carpeta)
        }
    };
    std::fs::create_dir_all(&d).map_err(|e| e.to_string())?;
    let p = util::nombre_unico(&d, "png");
    std::fs::write(&p, &bytes).map_err(|e| e.to_string())?;
    cerrar(&app, e);
    let _ = img;
    {
        // La ventana de captura se cierra al guardar: el aviso del sistema dice dónde quedó.
        use tauri_plugin_notification::NotificationExt;
        let _ = app
            .notification()
            .builder()
            .title("Captura guardada")
            .body(
                p.file_name()
                    .and_then(|n| n.to_str())
                    .unwrap_or("captura.png"),
            )
            .show();
    }
    Ok(p.to_string_lossy().into_owned())
}
pub fn cerrar(app: &AppHandle, e: &Estado) {
    if let Ok(mut x) = e.captura.lock() {
        *x = None;
    }
    if let Some(w) = app.get_webview_window("captura") {
        let _ = w.close();
    }
}
fn ajustes(e: &Estado) -> Result<db::Ajustes, String> {
    let c =
        e.db.lock()
            .map_err(|_| "Base de datos no disponible".to_string())?;
    Ok(db::ajuste_leer(&c, "ajustes")?
        .and_then(|x| serde_json::from_str(&x).ok())
        .unwrap_or_default())
}
pub fn valida_ruta(ruta: &Path, dirs: &[PathBuf]) -> Result<PathBuf, String> {
    let r = ruta
        .canonicalize()
        .map_err(|_| "Ruta no permitida".to_string())?;
    if dirs
        .iter()
        .any(|d| d.canonicalize().map(|x| r.starts_with(x)).unwrap_or(false))
    {
        Ok(r)
    } else {
        Err("Ruta no permitida".into())
    }
}
