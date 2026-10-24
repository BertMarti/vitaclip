//! Estado compartido de la aplicación (se registra con `app.manage(...)`).

use crate::boveda::Boveda;
use crate::licencia::EstadoLicencia;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Mutex;

pub struct Estado {
    pub db: Mutex<rusqlite::Connection>,
    /// Un único portapapeles para toda la app: en Linux (X11) lo copiado solo vive mientras exista el objeto.
    pub portapapeles: Mutex<Option<arboard::Clipboard>>,
    pub licencia: Mutex<EstadoLicencia>,
    pub boveda: Mutex<Boveda>,
    /// Huella (SHA-256 hex) de lo último que escribió la propia app; el vigía no lo cuenta como copia nueva.
    pub huella_propia: Mutex<Option<String>>,
    /// Huella de un secreto pegado desde la bóveda: el vigía no debe guardarlo nunca en el historial.
    pub huella_secreta: Mutex<Option<String>>,
    pub pausado: AtomicBool,
}

impl Estado {
    pub fn new(db: rusqlite::Connection, licencia: EstadoLicencia, pausado: bool) -> Self {
        Self {
            db: Mutex::new(db),
            portapapeles: Mutex::new(arboard::Clipboard::new().ok()),
            licencia: Mutex::new(licencia),
            boveda: Mutex::new(Boveda::default()),
            huella_propia: Mutex::new(None),
            huella_secreta: Mutex::new(None),
            pausado: AtomicBool::new(pausado),
        }
    }

    pub fn es_pro(&self) -> bool {
        self.licencia.lock().map(|l| l.pro).unwrap_or(false)
    }

    /// Llamar al principio de todo comando Pro.
    pub fn exigir_pro(&self) -> Result<(), String> {
        if self.es_pro() {
            Ok(())
        } else {
            Err("Esta función es de Vitaclip Pro. Actívala en Ajustes → Licencia.".into())
        }
    }

    pub fn esta_pausado(&self) -> bool {
        self.pausado.load(Ordering::Relaxed)
    }

    pub fn pausar(&self, si: bool) {
        self.pausado.store(si, Ordering::Relaxed);
    }
}
