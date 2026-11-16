//! Detecta si Vitaclip se está ejecutando dentro de un paquete MSIX.

use std::sync::OnceLock;

static EMPAQUETADA: OnceLock<bool> = OnceLock::new();

pub fn empaquetada() -> bool {
    *EMPAQUETADA.get_or_init(|| {
        #[cfg(windows)]
        {
            let mut largo: u32 = 0;
            // Con búfer nulo solo pregunta el tamaño: 15700 (APPMODEL_ERROR_NO_PACKAGE) significa que no hay identidad de paquete.
            // SAFETY: búfer nulo con largo 0 es el uso documentado para consultar; no escribe nada en el puntero.
            unsafe {
                windows_sys::Win32::Storage::Packaging::Appx::GetCurrentPackageFullName(
                    &mut largo,
                    std::ptr::null_mut(),
                ) != 15700
            }
        }
        #[cfg(not(windows))]
        {
            false
        }
    })
}

#[cfg(test)]
mod pruebas {
    #[cfg(not(windows))]
    #[test]
    fn fuera_de_windows_no_esta_empaquetada() {
        assert!(!super::empaquetada());
    }
}
