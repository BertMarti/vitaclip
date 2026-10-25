//! Estado compartido de la aplicación (se registra con `app.manage(...)`).

use crate::boveda::Boveda;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use std::sync::Mutex;

pub struct Estado {
    pub db: Mutex<rusqlite::Connection>,
    /// Un único portapapeles para toda la app: en Linux (X11) lo copiado solo vive mientras exista el objeto.
    pub portapapeles: Mutex<Option<arboard::Clipboard>>,
    pub boveda: Mutex<Boveda>,
    /// Huella (SHA-256 hex) de lo último que escribió la propia app; el vigía no lo cuenta como copia nueva.
    pub huella_propia: Mutex<Option<String>>,
    /// Huella de un secreto pegado desde la bóveda: el vigía no debe guardarlo nunca en el historial.
    pub huella_secreta: Mutex<Option<String>>,
    pub pausado: AtomicBool,
    pub captura: Mutex<Option<crate::captura::Captura>>,
    pub grabacion: Mutex<Option<Arc<crate::video::Grabacion>>>,
}

impl Estado {
    pub fn new(db: rusqlite::Connection, pausado: bool) -> Self {
        Self {
            db: Mutex::new(db),
            portapapeles: Mutex::new(arboard::Clipboard::new().ok()),
            boveda: Mutex::new(Boveda::default()),
            huella_propia: Mutex::new(None),
            huella_secreta: Mutex::new(None),
            pausado: AtomicBool::new(pausado),
            captura: Mutex::new(None),
            grabacion: Mutex::new(None),
        }
    }

    pub fn esta_pausado(&self) -> bool {
        self.pausado.load(Ordering::Relaxed)
    }

    pub fn pausar(&self, si: bool) {
        self.pausado.store(si, Ordering::Relaxed);
    }
}
