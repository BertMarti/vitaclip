//! Respeto a las marcas «no guardar» que ponen los gestores de contraseñas (KeePassXC, 1Password, Bitwarden…) al copiar un
//! secreto. Si lo copiado lleva una de estas marcas, el vigía no lo guarda en el historial.
//!
//! - Windows: formatos `ExcludeClipboardContentFromMonitorProcessing` o `Clipboard Viewer Ignore`, o
//!   `CanIncludeInClipboardHistory` / `CanUploadToCloudClipboard` con valor 0.
//! - macOS: tipos `org.nspasteboard.ConcealedType` u `org.nspasteboard.TransientType` (nspasteboard.org).
//! - Linux: tipo MIME `x-kde-passwordManagerHint` (Wayland y X11).

/// Tipos que, solo con estar presentes, marcan el contenido como secreto o efímero.
const TIPOS_SECRETOS: &[&str] = &[
    "x-kde-passwordManagerHint",
    "org.nspasteboard.ConcealedType",
    "org.nspasteboard.TransientType",
    "ExcludeClipboardContentFromMonitorProcessing",
    "Clipboard Viewer Ignore",
];

// En Windows se pregunta por cada formato directamente; esta comparación la usan Linux, macOS y las pruebas.
#[cfg_attr(windows, allow(dead_code))]
pub fn es_tipo_secreto(tipo: &str) -> bool {
    TIPOS_SECRETOS.iter().any(|t| t.eq_ignore_ascii_case(tipo))
}

/// ¿El contenido actual del portapapeles viene marcado como secreto? Ante cualquier error responde `false`.
pub fn marcado_como_secreto() -> bool {
    plataforma::marcado()
}

#[cfg(target_os = "linux")]
mod plataforma {
    use super::es_tipo_secreto;

    pub fn marcado() -> bool {
        tipos().iter().any(|t| es_tipo_secreto(t))
    }

    fn tipos() -> Vec<String> {
        // En Wayland con data-control (wlroots, KDE…) se preguntan los tipos MIME; si no se puede (GNOME), por X11/XWayland.
        if std::env::var_os("WAYLAND_DISPLAY").is_some() {
            use wl_clipboard_rs::paste::{get_mime_types, ClipboardType, Seat};
            if let Ok(tipos) = get_mime_types(ClipboardType::Regular, Seat::Unspecified) {
                return tipos.into_iter().collect();
            }
        }
        x11::tipos().unwrap_or_default()
    }

    mod x11 {
        use std::time::{Duration, Instant};
        use x11rb::connection::Connection;
        use x11rb::protocol::xproto::{AtomEnum, ConnectionExt, CreateWindowAux, WindowClass};
        use x11rb::protocol::Event;

        type Resultado<T> = Result<T, Box<dyn std::error::Error>>;

        /// Pide al dueño del portapapeles la lista de formatos (TARGETS) y devuelve sus nombres.
        pub fn tipos() -> Resultado<Vec<String>> {
            let (c, pantalla) = x11rb::connect(None)?;
            let raiz = c.setup().roots[pantalla].root;
            let ventana = c.generate_id()?;
            c.create_window(
                x11rb::COPY_DEPTH_FROM_PARENT,
                ventana,
                raiz,
                0,
                0,
                1,
                1,
                0,
                WindowClass::INPUT_OUTPUT,
                x11rb::COPY_FROM_PARENT,
                &CreateWindowAux::new(),
            )?;
            let atomo = |nombre: &str| -> Resultado<u32> {
                Ok(c.intern_atom(false, nombre.as_bytes())?.reply()?.atom)
            };
            let (clipboard, targets, propiedad) = (
                atomo("CLIPBOARD")?,
                atomo("TARGETS")?,
                atomo("VITACLIP_TIPOS")?,
            );
            c.convert_selection(ventana, clipboard, targets, propiedad, x11rb::CURRENT_TIME)?;
            c.flush()?;
            let limite = Instant::now() + Duration::from_millis(300);
            let respondio = loop {
                match c.poll_for_event()? {
                    Some(Event::SelectionNotify(aviso)) => break aviso.property != x11rb::NONE,
                    Some(_) => {}
                    None if Instant::now() > limite => break false,
                    None => std::thread::sleep(Duration::from_millis(5)),
                }
            };
            let mut nombres = Vec::new();
            if respondio {
                let valor = c
                    .get_property(true, ventana, propiedad, AtomEnum::ATOM, 0, 1024)?
                    .reply()?;
                for atomo in valor.value32().into_iter().flatten() {
                    if let Ok(nombre) = c.get_atom_name(atomo)?.reply() {
                        nombres.push(String::from_utf8_lossy(&nombre.name).into_owned());
                    }
                }
            }
            let _ = c.destroy_window(ventana);
            let _ = c.flush();
            Ok(nombres)
        }
    }
}

#[cfg(windows)]
mod plataforma {
    use windows_sys::Win32::System::DataExchange::{
        CloseClipboard, GetClipboardData, IsClipboardFormatAvailable, OpenClipboard,
        RegisterClipboardFormatW,
    };
    use windows_sys::Win32::System::Memory::{GlobalLock, GlobalSize, GlobalUnlock};

    fn formato(nombre: &str) -> u32 {
        let ancho: Vec<u16> = nombre.encode_utf16().chain(std::iter::once(0)).collect();
        // SAFETY: cadena UTF-16 terminada en 0 que vive durante la llamada.
        unsafe { RegisterClipboardFormatW(ancho.as_ptr()) }
    }

    fn disponible(formato: u32) -> bool {
        // SAFETY: no necesita abrir el portapapeles.
        formato != 0 && unsafe { IsClipboardFormatAvailable(formato) } != 0
    }

    /// Valor DWORD de un formato (p. ej. CanIncludeInClipboardHistory = 0 significa «no guardar»).
    fn dword(formato: u32) -> Option<u32> {
        // SAFETY: se abre y se cierra el portapapeles en el mismo hilo; el bloque se lee solo si mide al menos 4 bytes.
        unsafe {
            if OpenClipboard(std::ptr::null_mut()) == 0 {
                return None;
            }
            let mut valor = None;
            let datos = GetClipboardData(formato);
            if !datos.is_null() && GlobalSize(datos) >= 4 {
                let puntero = GlobalLock(datos) as *const u32;
                if !puntero.is_null() {
                    valor = Some(puntero.read_unaligned());
                    GlobalUnlock(datos);
                }
            }
            CloseClipboard();
            valor
        }
    }

    pub fn marcado() -> bool {
        if super::TIPOS_SECRETOS.iter().any(|t| disponible(formato(t))) {
            return true;
        }
        ["CanIncludeInClipboardHistory", "CanUploadToCloudClipboard"]
            .iter()
            .any(|nombre| {
                let f = formato(nombre);
                disponible(f) && dword(f) == Some(0)
            })
    }
}

#[cfg(target_os = "macos")]
mod plataforma {
    use super::es_tipo_secreto;
    use objc2_app_kit::NSPasteboard;

    #[allow(unused_unsafe)]
    pub fn marcado() -> bool {
        let tablero = NSPasteboard::generalPasteboard();
        let Some(tipos) = tablero.types() else {
            return false;
        };
        // SAFETY: índices dentro de 0..count.
        (0..tipos.count()).any(|i| es_tipo_secreto(&unsafe { tipos.objectAtIndex(i) }.to_string()))
    }
}

#[cfg(not(any(target_os = "linux", windows, target_os = "macos")))]
mod plataforma {
    pub fn marcado() -> bool {
        false
    }
}

#[cfg(test)]
mod pruebas {
    use super::*;

    #[test]
    fn reconoce_las_marcas_de_los_gestores_de_contrasenas() {
        for tipo in [
            "x-kde-passwordManagerHint",
            "org.nspasteboard.ConcealedType",
            "org.nspasteboard.TransientType",
            "ExcludeClipboardContentFromMonitorProcessing",
            "clipboard viewer ignore",
        ] {
            assert!(es_tipo_secreto(tipo), "{tipo}");
        }
        for tipo in [
            "text/plain",
            "UTF8_STRING",
            "TARGETS",
            "public.utf8-plain-text",
            "image/png",
        ] {
            assert!(!es_tipo_secreto(tipo), "{tipo}");
        }
    }
}
