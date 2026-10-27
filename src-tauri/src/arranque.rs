//! Arranque con el sistema: clave `Run` del registro en Windows, LaunchAgent en macOS y `~/.config/autostart` en Linux.
//! La app se lanza con `--oculto`: solo se queda en la bandeja, sin abrir ninguna ventana.
//!
//! Viene activado. Después manda lo que diga el sistema: si el usuario lo quita desde el Administrador de tareas de Windows
//! (o borra la entrada a mano), el ajuste se apaga solo y Vitaclip no lo vuelve a poner por su cuenta.

use tauri::AppHandle;
use tauri_plugin_autostart::ManagerExt;

pub fn aplicar(app: &AppHandle, activar: bool) -> Result<(), String> {
    let gestor = app.autolaunch();
    if activar {
        gestor
            .enable()
            .map_err(|x| format!("No se pudo activar el arranque automático: {x}"))
    } else {
        gestor
            .disable()
            .map_err(|x| format!("No se pudo desactivar el arranque automático: {x}"))
    }
}

/// Al abrir la app. La primera vez (también al venir de una versión anterior, que lo traía apagado) lo activa. Las demás
/// copia el estado real del sistema y, si está activo, rehace la entrada con la ruta actual del ejecutable (por si la app
/// cambió de carpeta al actualizar o se movió el AppImage). Devuelve el valor que debe tener el ajuste, o `None` si no se
/// pudo saber (y entonces no se toca nada).
pub fn sincronizar(app: &AppHandle, primera_vez: bool) -> Option<bool> {
    // En desarrollo no se registra el binario de `target/debug`.
    if cfg!(debug_assertions) {
        return None;
    }
    let activo = primera_vez || app.autolaunch().is_enabled().ok()?;
    if activo {
        aplicar(app, true).ok()?;
    }
    Some(activo)
}
