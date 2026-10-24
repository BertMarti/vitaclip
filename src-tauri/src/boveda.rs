//! Bóveda cifrada (Pro): Argon2id para derivar la clave de la contraseña maestra y XChaCha20-Poly1305 para cada secreto.
//! La clave solo vive en memoria mientras la bóveda está abierta y se borra al bloquear (o tras 5 minutos sin uso).

use argon2::{Algorithm, Argon2, Params, Version};
use chacha20poly1305::aead::{Aead, KeyInit};
use chacha20poly1305::{XChaCha20Poly1305, XNonce};
use rand::rngs::OsRng;
use rand::RngCore;
use serde::{Deserialize, Serialize};
use std::time::{Duration, Instant};
use zeroize::Zeroizing;

pub const MINIMO_CONTRASENA: usize = 8;
const AUTOBLOQUEO: Duration = Duration::from_secs(5 * 60);
const TESTIGO: &[u8] = b"vitaclip-boveda-v1";

/// Lo que se guarda en disco para poder comprobar la contraseña (nunca la clave).
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Cabecera {
    pub sal: Vec<u8>,
    pub testigo: Vec<u8>,
}

type Clave = Zeroizing<[u8; 32]>;

fn derivar(contrasena: &str, sal: &[u8]) -> Result<Clave, String> {
    // Parámetros mínimos recomendados por OWASP para Argon2id (19 MiB, 2 pasadas).
    let params = Params::new(19 * 1024, 2, 1, Some(32)).map_err(|e| e.to_string())?;
    let mut clave = Zeroizing::new([0u8; 32]);
    Argon2::new(Algorithm::Argon2id, Version::V0x13, params)
        .hash_password_into(contrasena.as_bytes(), sal, clave.as_mut())
        .map_err(|e| e.to_string())?;
    Ok(clave)
}

pub fn cifrar(clave: &[u8; 32], texto: &[u8]) -> Result<Vec<u8>, String> {
    let mut nonce = [0u8; 24];
    OsRng.fill_bytes(&mut nonce);
    let cifrado = XChaCha20Poly1305::new(clave.into())
        .encrypt(XNonce::from_slice(&nonce), texto)
        .map_err(|_| "No se pudo cifrar".to_string())?;
    Ok([nonce.as_slice(), &cifrado].concat())
}

pub fn descifrar(clave: &[u8; 32], datos: &[u8]) -> Result<Zeroizing<Vec<u8>>, String> {
    if datos.len() < 24 + 16 {
        return Err("Dato de la bóveda dañado".into());
    }
    let (nonce, cifrado) = datos.split_at(24);
    XChaCha20Poly1305::new(clave.into())
        .decrypt(XNonce::from_slice(nonce), cifrado)
        .map(Zeroizing::new)
        .map_err(|_| "Contraseña incorrecta o dato dañado".to_string())
}

/// Crea una bóveda nueva: devuelve la cabecera a guardar y la clave ya abierta.
pub fn crear(contrasena: &str) -> Result<(Cabecera, Clave), String> {
    if contrasena.chars().count() < MINIMO_CONTRASENA {
        return Err(format!("La contraseña maestra debe tener al menos {MINIMO_CONTRASENA} caracteres."));
    }
    let mut sal = vec![0u8; 16];
    OsRng.fill_bytes(&mut sal);
    let clave = derivar(contrasena, &sal)?;
    let testigo = cifrar(&clave, TESTIGO)?;
    Ok((Cabecera { sal, testigo }, clave))
}

/// Comprueba la contraseña contra la cabecera y devuelve la clave.
pub fn abrir(cabecera: &Cabecera, contrasena: &str) -> Result<Clave, String> {
    let clave = derivar(contrasena, &cabecera.sal)?;
    match descifrar(&clave, &cabecera.testigo) {
        Ok(t) if t.as_slice() == TESTIGO => Ok(clave),
        _ => Err("Contraseña incorrecta.".into()),
    }
}

/// Estado en memoria de la bóveda abierta.
#[derive(Default)]
pub struct Boveda {
    clave: Option<Clave>,
    ultimo_uso: Option<Instant>,
}

impl Boveda {
    pub fn abrir_con(&mut self, clave: Clave) {
        self.clave = Some(clave);
        self.ultimo_uso = Some(Instant::now());
    }

    pub fn bloquear(&mut self) {
        // Zeroizing borra la clave al soltarla.
        self.clave = None;
        self.ultimo_uso = None;
    }

    /// La clave si está abierta y no ha pasado el tiempo de autobloqueo; renueva el plazo.
    pub fn clave(&mut self) -> Option<&[u8; 32]> {
        self.clave_en(Instant::now())
    }

    fn clave_en(&mut self, ahora: Instant) -> Option<&[u8; 32]> {
        match self.ultimo_uso {
            Some(t) if ahora.saturating_duration_since(t) < AUTOBLOQUEO => {
                self.ultimo_uso = Some(ahora);
                self.clave.as_deref()
            }
            _ => {
                self.bloquear();
                None
            }
        }
    }

    pub fn abierta(&mut self) -> bool {
        self.clave().is_some()
    }
}

#[cfg(test)]
mod pruebas {
    use super::*;

    #[test]
    fn ida_y_vuelta() {
        let (cab, clave) = crear("correcto-caballo").unwrap();
        let datos = cifrar(&clave, "mi secreto 🔐".as_bytes()).unwrap();
        let reabierta = abrir(&cab, "correcto-caballo").unwrap();
        assert_eq!(descifrar(&reabierta, &datos).unwrap().as_slice(), "mi secreto 🔐".as_bytes());
    }

    #[test]
    fn contrasena_erronea_y_datos_danados() {
        let (cab, clave) = crear("correcto-caballo").unwrap();
        assert!(abrir(&cab, "otra-cosa-larga").is_err());
        let mut datos = cifrar(&clave, b"hola").unwrap();
        let ultimo = datos.len() - 1;
        datos[ultimo] ^= 1;
        assert!(descifrar(&clave, &datos).is_err());
        assert!(descifrar(&clave, b"corto").is_err());
    }

    #[test]
    fn exige_contrasena_larga_y_nonce_distinto() {
        assert!(crear("corta").is_err());
        let (_, clave) = crear("correcto-caballo").unwrap();
        assert_ne!(cifrar(&clave, b"x").unwrap(), cifrar(&clave, b"x").unwrap());
    }

    #[test]
    fn se_bloquea_sola() {
        let (_, clave) = crear("correcto-caballo").unwrap();
        let mut b = Boveda::default();
        assert!(!b.abierta());
        b.abrir_con(clave);
        let inicio = b.ultimo_uso.unwrap();
        assert!(b.clave_en(inicio + Duration::from_secs(60)).is_some());
        // El uso renueva el plazo: 4 min después del último uso sigue abierta.
        assert!(b.clave_en(inicio + Duration::from_secs(60 + 240)).is_some());
        assert!(b.clave_en(inicio + Duration::from_secs(60 + 240 + 301)).is_none());
        assert!(!b.abierta());
    }
}
