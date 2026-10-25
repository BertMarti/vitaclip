// Evita la consola extra en Windows en las versiones de publicación.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    // WebKitGTK pinta basura con el renderizado DMABUF en algunas GPU (p. ej. Raspberry Pi y ciertas NVIDIA).
    // Se desactiva salvo que el usuario haya decidido otra cosa.
    #[cfg(target_os = "linux")]
    if std::env::var_os("WEBKIT_DISABLE_DMABUF_RENDERER").is_none() {
        std::env::set_var("WEBKIT_DISABLE_DMABUF_RENDERER", "1");
    }
    vitaclip_lib::run()
}
