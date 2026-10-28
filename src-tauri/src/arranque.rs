//! Arranque con el sistema: clave `Run` del registro en Windows, LaunchAgent en macOS y `~/.config/autostart` en Linux.
//! La app se lanza con `--oculto`: solo se queda en la bandeja, sin abrir ninguna ventana.
//!
//! Viene activado. Después manda lo que diga el sistema: si el usuario lo quita desde el Administrador de tareas de Windows
//! (o borra la entrada a mano), el ajuste se apaga solo y Vitaclip no lo vuelve a poner por su cuenta.
//!
//! Se usa `auto-launch` directamente y no `tauri-plugin-autostart`, porque el plugin no deja elegir «solo este usuario» (si la
//! app corre como administrador, se registraba para todo el equipo) y escribe la ruta sin comillas (con espacios en la ruta,
//! como `C:\Users\Ana María\…` o `C:\Program Files\…`, Windows no la encontraba al encender el equipo).

use auto_launch::{AutoLaunch, AutoLaunchBuilder};
use tauri::AppHandle;

fn gestor(app: &AppHandle) -> Result<AutoLaunch, String> {
    let exe = std::env::current_exe().map_err(|x| x.to_string())?;
    let mut b = AutoLaunchBuilder::new();
    b.set_app_name(&app.package_info().name).set_args(&["--oculto"]);
    #[cfg(windows)]
    b.set_app_path(&format!("\"{}\"", exe.display()))
        .set_windows_enable_mode(auto_launch::WindowsEnableMode::CurrentUser);
    #[cfg(target_os = "macos")]
    b.set_app_path(&exe.canonicalize().unwrap_or(exe).display().to_string())
        .set_macos_launch_mode(auto_launch::MacOSLaunchMode::LaunchAgent);
    #[cfg(target_os = "linux")]
    {
        use tauri::Manager;
        // En un AppImage, `current_exe` apunta al montaje temporal: hay que registrar el propio archivo .AppImage.
        let ruta = app.env().appimage.map(Into::into).unwrap_or(exe);
        b.set_app_path(&format!("\"{}\"", ruta.display()));
    }
    b.build().map_err(|x| x.to_string())
}

pub fn aplicar(app: &AppHandle, activar: bool) -> Result<(), String> {
    let g = gestor(app)?;
    if activar {
        g.enable()
            .map_err(|x| format!("No se pudo activar el arranque automático: {x}"))
    } else {
        g.disable()
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
    let activo = primera_vez || gestor(app).ok()?.is_enabled().ok()?;
    if activo {
        // Quita la entrada «para todo el equipo» que pudo dejar una versión anterior y escribe la de este usuario.
        #[cfg(windows)]
        let _ = aplicar(app, false);
        aplicar(app, true).ok()?;
    }
    Some(activo)
}
