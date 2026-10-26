//! La clave de IA vive en el llavero del sistema (Llavero de macOS, Administrador de credenciales de Windows, Secret
//! Service en Linux) y no en la base de datos. Si no hay llavero (algunos Linux sin escritorio), se queda en la base de
//! datos como en versiones anteriores.

use crate::db::Ajustes;

const SERVICIO: &str = "com.bertmarti.vitaclip";
const CUENTA: &str = "clave-ia";

fn entrada() -> Option<keyring::Entry> {
    keyring::Entry::new(SERVICIO, CUENTA).ok()
}

/// Guarda la clave en el llavero (vacía = la borra). `true` si quedó en el llavero.
pub fn guardar(clave: &str) -> bool {
    let Some(e) = entrada() else {
        return false;
    };
    if clave.is_empty() {
        let _ = e.delete_credential();
        return true;
    }
    e.set_password(clave).is_ok()
}

pub fn leer() -> Option<String> {
    entrada()?.get_password().ok().filter(|c| !c.is_empty())
}

/// Clave de IA real: la de la base de datos (instalaciones sin llavero o anteriores) o, si está vacía, la del llavero.
pub fn clave_efectiva(a: &Ajustes) -> String {
    if a.ia.clave.is_empty() {
        leer().unwrap_or_default()
    } else {
        a.ia.clave.clone()
    }
}

/// Antes de guardar los ajustes: pasa la clave al llavero y la quita de lo que va a la base de datos (si se puede).
pub fn sacar_clave(a: &mut Ajustes) {
    if guardar(&a.ia.clave) {
        a.ia.clave.clear();
    }
}

#[cfg(test)]
mod pruebas {
    use super::*;

    #[test]
    fn la_clave_va_al_llavero_y_no_a_la_base_de_datos() {
        keyring::set_default_credential_builder(keyring::mock::default_credential_builder());
        // El llavero de prueba no guarda entre entradas: aquí solo se comprueba que sacar_clave vacía el campo cuando el
        // llavero acepta la clave y que una clave en la base de datos (sin llavero) sigue siendo la efectiva.
        let mut a = Ajustes::default();
        a.ia.clave = "sk-prueba".into();
        assert_eq!(clave_efectiva(&a), "sk-prueba");
        sacar_clave(&mut a);
        assert!(a.ia.clave.is_empty());
    }
}
