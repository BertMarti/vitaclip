//! Atajos por tecla física en cualquier distribución de teclado.
//!
//! La interfaz guarda los atajos por tecla física (`event.code`: «Semicolon» es la tecla que en un teclado español lleva la Ñ).
//! `global-hotkey` registra en Windows la tecla virtual que esa posición tendría en un teclado ESTADOUNIDENSE (Semicolon →
//! `VK_OEM_1`), pero con teclado español la tecla Ñ envía `VK_OEM_3`, así que el atajo nunca saltaba. Aquí se traduce la tecla
//! física a la tecla virtual de la distribución activa y se elige el `Code` que `global-hotkey` convierte en esa tecla virtual.

use tauri_plugin_global_shortcut::{Code, Shortcut};

/// (tecla física, código de exploración, tecla virtual que le da `global-hotkey`).
#[cfg_attr(not(windows), allow(dead_code))]
const TECLAS: &[(Code, u32, u32)] = &[
    (Code::Digit1, 0x02, 0x31),
    (Code::Digit2, 0x03, 0x32),
    (Code::Digit3, 0x04, 0x33),
    (Code::Digit4, 0x05, 0x34),
    (Code::Digit5, 0x06, 0x35),
    (Code::Digit6, 0x07, 0x36),
    (Code::Digit7, 0x08, 0x37),
    (Code::Digit8, 0x09, 0x38),
    (Code::Digit9, 0x0A, 0x39),
    (Code::Digit0, 0x0B, 0x30),
    (Code::Minus, 0x0C, 0xBD),
    (Code::Equal, 0x0D, 0xBB),
    (Code::KeyQ, 0x10, 0x51),
    (Code::KeyW, 0x11, 0x57),
    (Code::KeyE, 0x12, 0x45),
    (Code::KeyR, 0x13, 0x52),
    (Code::KeyT, 0x14, 0x54),
    (Code::KeyY, 0x15, 0x59),
    (Code::KeyU, 0x16, 0x55),
    (Code::KeyI, 0x17, 0x49),
    (Code::KeyO, 0x18, 0x4F),
    (Code::KeyP, 0x19, 0x50),
    (Code::BracketLeft, 0x1A, 0xDB),
    (Code::BracketRight, 0x1B, 0xDD),
    (Code::KeyA, 0x1E, 0x41),
    (Code::KeyS, 0x1F, 0x53),
    (Code::KeyD, 0x20, 0x44),
    (Code::KeyF, 0x21, 0x46),
    (Code::KeyG, 0x22, 0x47),
    (Code::KeyH, 0x23, 0x48),
    (Code::KeyJ, 0x24, 0x4A),
    (Code::KeyK, 0x25, 0x4B),
    (Code::KeyL, 0x26, 0x4C),
    (Code::Semicolon, 0x27, 0xBA),
    (Code::Quote, 0x28, 0xDE),
    (Code::Backquote, 0x29, 0xC0),
    (Code::Backslash, 0x2B, 0xDC),
    (Code::KeyZ, 0x2C, 0x5A),
    (Code::KeyX, 0x2D, 0x58),
    (Code::KeyC, 0x2E, 0x43),
    (Code::KeyV, 0x2F, 0x56),
    (Code::KeyB, 0x30, 0x42),
    (Code::KeyN, 0x31, 0x4E),
    (Code::KeyM, 0x32, 0x4D),
    (Code::Comma, 0x33, 0xBC),
    (Code::Period, 0x34, 0xBE),
    (Code::Slash, 0x35, 0xBF),
    (Code::IntlBackslash, 0x56, 0xE2),
];

/// Devuelve el `Code` que hay que registrar para que salte la tecla FÍSICA `code`, dada una función que traduce un código de
/// exploración a la tecla virtual de la distribución activa. Si no se sabe traducir, deja la tecla como estaba.
#[cfg_attr(not(windows), allow(dead_code))]
fn adaptar_con(code: Code, vk_de: impl Fn(u32) -> Option<u32>) -> Code {
    let Some(&(_, exploracion, _)) = TECLAS.iter().find(|(c, _, _)| *c == code) else {
        return code;
    };
    let Some(vk) = vk_de(exploracion) else {
        return code;
    };
    TECLAS
        .iter()
        .find(|(_, _, vk_estadounidense)| *vk_estadounidense == vk)
        .map(|(c, _, _)| *c)
        .unwrap_or(code)
}

/// Adapta un atajo a la distribución de teclado activa (solo hace falta en Windows; en el resto no cambia nada).
pub fn adaptar(atajo: Shortcut) -> Shortcut {
    #[cfg(windows)]
    {
        let code = adaptar_con(atajo.key, vk_windows);
        if code != atajo.key {
            return Shortcut::new(Some(atajo.mods), code);
        }
    }
    atajo
}

#[cfg(windows)]
fn vk_windows(exploracion: u32) -> Option<u32> {
    use windows_sys::Win32::UI::Input::KeyboardAndMouse::{MapVirtualKeyW, MAPVK_VSC_TO_VK};
    // SAFETY: función de Win32 sin punteros; devuelve 0 si no hay traducción.
    let vk = unsafe { MapVirtualKeyW(exploracion, MAPVK_VSC_TO_VK) };
    (vk != 0).then_some(vk)
}

#[cfg(test)]
mod pruebas {
    use super::*;
    use std::collections::HashMap;

    fn espanol(exploracion: u32) -> Option<u32> {
        // Teclas que cambian en el teclado español respecto al estadounidense (las letras y números no cambian).
        let cambios = HashMap::from([
            (0x0C, 0xDB), // '  ?
            (0x0D, 0xDD), // ¡  ¿
            (0x1A, 0xBA), // `  ^
            (0x1B, 0xBB), // +  *
            (0x27, 0xC0), // ñ
            (0x28, 0xDE), // ´  ¨
            (0x29, 0xDC), // º  ª
            (0x2B, 0xBF), // ç
            (0x35, 0xBD), // -  _
        ]);
        cambios.get(&exploracion).copied().or_else(|| {
            TECLAS
                .iter()
                .find(|(_, e, _)| *e == exploracion)
                .map(|(_, _, vk)| *vk)
        })
    }

    #[test]
    fn la_tecla_n_tilde_salta_con_teclado_espanol() {
        // La Ñ (posición «Semicolon») envía VK_OEM_3, que global-hotkey asocia a «Backquote».
        assert_eq!(adaptar_con(Code::Semicolon, espanol), Code::Backquote);
        assert_eq!(adaptar_con(Code::Backquote, espanol), Code::Backslash);
        assert_eq!(adaptar_con(Code::Slash, espanol), Code::Minus);
    }

    #[test]
    fn letras_y_teclas_sin_traduccion_no_cambian() {
        assert_eq!(adaptar_con(Code::KeyV, espanol), Code::KeyV);
        assert_eq!(adaptar_con(Code::F5, espanol), Code::F5);
        assert_eq!(adaptar_con(Code::KeyV, |_| None), Code::KeyV);
    }

    #[test]
    fn azerty_cambia_letras() {
        // En AZERTY la tecla física «KeyQ» escribe A.
        let azerty = |e: u32| if e == 0x10 { Some(0x41) } else { espanol(e) };
        assert_eq!(adaptar_con(Code::KeyQ, azerty), Code::KeyA);
    }
}
