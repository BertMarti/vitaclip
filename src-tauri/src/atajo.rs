use std::str::FromStr;
use std::sync::{Mutex, OnceLock};
use tauri::{AppHandle, Emitter, Manager, WebviewUrl, WebviewWindowBuilder};
use tauri_plugin_global_shortcut::{GlobalShortcutExt, Shortcut};

static REGISTRADO: OnceLock<Mutex<Option<Shortcut>>> = OnceLock::new();

pub fn registrar(app: &AppHandle, clave: &str) -> Result<(), String> {
    let shortcut = Shortcut::from_str(clave)
        .map_err(|_| "Ese atajo no es válido o ya lo usa otra aplicación.".to_string())?;
    app.global_shortcut()
        .register(shortcut)
        .map_err(|_| "Ese atajo no es válido o ya lo usa otra aplicación.".to_string())?;
    let registro = REGISTRADO.get_or_init(|| Mutex::new(None));
    if let Ok(mut anterior) = registro.lock() {
        if let Some(viejo) = anterior.replace(shortcut) {
            let _ = app.global_shortcut().unregister(viejo);
        }
    }
    Ok(())
}
pub fn mostrar_popup(app: &AppHandle) {
    if let Some(w) = app.get_webview_window("popup") {
        let _ = w.show();
        let _ = w.set_focus();
        let _ = w.emit("popup-mostrado", ());
    }
}
pub fn alternar_popup(app: &AppHandle) {
    if let Some(w) = app.get_webview_window("popup") {
        if w.is_visible().unwrap_or(false) && w.is_focused().unwrap_or(false) {
            let _ = w.hide();
        } else {
            mostrar_popup(app);
        }
    }
}
pub fn abrir_ajustes(app: &AppHandle, bienvenida: bool) -> Result<(), String> {
    if let Some(w) = app.get_webview_window("ajustes") {
        return w.set_focus().map_err(|e| e.to_string());
    }
    let pagina = if bienvenida {
        "ajustes.html#bienvenida"
    } else {
        "ajustes.html"
    };
    WebviewWindowBuilder::new(app, "ajustes", WebviewUrl::App(pagina.into()))
        .title("Vitaclip · Ajustes")
        .inner_size(760., 600.)
        .center()
        .build()
        .map(|_| ())
        .map_err(|e| e.to_string())
}
