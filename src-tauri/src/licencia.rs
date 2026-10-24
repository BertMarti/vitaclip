//! Licencias Pro: `VITA1.<datos base64url>.<firma base64url>` firmadas con Ed25519.
//! Se comprueban sin conexión con la clave pública incrustada; la privada nunca está en el repositorio.

use base64::engine::general_purpose::URL_SAFE_NO_PAD;
use base64::Engine;
use ed25519_dalek::{Signature, VerifyingKey};
use serde::{Deserialize, Serialize};
use std::time::{SystemTime, UNIX_EPOCH};

const PREFIJO: &str = "VITA1";

/// Clave pública de las licencias oficiales de Vitaclip.
const CLAVE_PUBLICA: [u8; 32] = [
    0x43, 0x64, 0xf2, 0x71, 0x89, 0x79, 0xc1, 0xac, 0x39, 0x92, 0xac, 0x9a, 0x20, 0x82, 0xe5, 0xc4,
    0x64, 0x22, 0xc8, 0x94, 0x63, 0x6f, 0x33, 0xd0, 0xa7, 0x4f, 0x3e, 0x63, 0x2e, 0xb0, 0x91, 0xa0,
];

/// Lo que va firmado dentro de la licencia (nombres cortos para que la clave sea breve).
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct Datos {
    /// Nombre del titular.
    pub n: String,
    /// Email del titular.
    pub e: String,
    /// Plan; hoy solo existe "pro".
    pub p: String,
    /// Fecha de emisión (AAAA-MM-DD).
    pub i: String,
    /// Caducidad (AAAA-MM-DD) o `None` si es perpetua.
    #[serde(default)]
    pub x: Option<String>,
}

#[derive(Debug, Clone, Default, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct EstadoLicencia {
    pub pro: bool,
    pub nombre: Option<String>,
    pub email: Option<String>,
    pub emitida: Option<String>,
    pub caduca: Option<String>,
    /// Por qué no es Pro, listo para enseñar (`None` si no hay licencia o es válida).
    pub motivo: Option<String>,
}

/// Comprueba una licencia con la clave oficial. `hoy` es AAAA-MM-DD.
pub fn verificar(clave: &str, hoy: &str) -> Result<Datos, String> {
    let pk = VerifyingKey::from_bytes(&CLAVE_PUBLICA)
        .map_err(|_| "Clave pública interna no válida".to_string())?;
    verificar_con(clave, hoy, &pk)
}

pub fn verificar_con(clave: &str, hoy: &str, pk: &VerifyingKey) -> Result<Datos, String> {
    let invalida = || "La licencia no es válida. Cópiala entera, sin espacios.".to_string();
    let limpia: String = clave.chars().filter(|c| !c.is_whitespace()).collect();
    let mut partes = limpia.split('.');
    let (Some(prefijo), Some(datos_b64), Some(firma_b64), None) =
        (partes.next(), partes.next(), partes.next(), partes.next())
    else {
        return Err(invalida());
    };
    if prefijo != PREFIJO {
        return Err(invalida());
    }
    let datos = URL_SAFE_NO_PAD.decode(datos_b64).map_err(|_| invalida())?;
    let firma = URL_SAFE_NO_PAD.decode(firma_b64).map_err(|_| invalida())?;
    let firma = Signature::from_slice(&firma).map_err(|_| invalida())?;
    // Se firma «VITA1.<datos base64url>» para atar el formato a la firma.
    let mensaje = format!("{PREFIJO}.{datos_b64}");
    pk.verify_strict(mensaje.as_bytes(), &firma)
        .map_err(|_| invalida())?;
    let datos: Datos = serde_json::from_slice(&datos).map_err(|_| invalida())?;
    if datos.p != "pro" {
        return Err("Esta licencia no es de Vitaclip Pro.".into());
    }
    if let Some(caduca) = &datos.x {
        if hoy > caduca.as_str() {
            return Err(format!("La licencia caducó el {caduca}."));
        }
    }
    Ok(datos)
}

/// Estado para la interfaz a partir de la licencia guardada (si hay).
pub fn estado(clave: Option<&str>, hoy: &str) -> EstadoLicencia {
    match clave.filter(|c| !c.trim().is_empty()) {
        None => EstadoLicencia::default(),
        Some(c) => match verificar(c, hoy) {
            Ok(d) => desde_datos(d),
            Err(motivo) => EstadoLicencia {
                motivo: Some(motivo),
                ..Default::default()
            },
        },
    }
}

fn desde_datos(d: Datos) -> EstadoLicencia {
    EstadoLicencia {
        pro: true,
        nombre: Some(d.n),
        email: Some(d.e),
        emitida: Some(d.i),
        caduca: d.x,
        motivo: None,
    }
}

/// Fecha UTC de hoy en AAAA-MM-DD (sin depender de chrono).
pub fn hoy() -> String {
    let segundos = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_secs())
        .unwrap_or(0);
    fecha_desde_dias((segundos / 86_400) as i64)
}

/// Días desde 1970-01-01 a fecha civil (algoritmo de Howard Hinnant).
fn fecha_desde_dias(dias: i64) -> String {
    let z = dias + 719_468;
    let era = z.div_euclid(146_097);
    let doe = z - era * 146_097;
    let yoe = (doe - doe / 1_460 + doe / 36_524 - doe / 146_096) / 365;
    let doy = doe - (365 * yoe + yoe / 4 - yoe / 100);
    let mp = (5 * doy + 2) / 153;
    let d = doy - (153 * mp + 2) / 5 + 1;
    let m = if mp < 10 { mp + 3 } else { mp - 9 };
    let y = yoe + era * 400 + i64::from(m <= 2);
    format!("{y:04}-{m:02}-{d:02}")
}

#[cfg(test)]
mod pruebas {
    use super::*;
    use ed25519_dalek::{Signer, SigningKey};

    fn firmante() -> SigningKey {
        SigningKey::from_bytes(&[7u8; 32])
    }

    fn emitir(sk: &SigningKey, datos: &Datos) -> String {
        let b64 = URL_SAFE_NO_PAD.encode(serde_json::to_vec(datos).unwrap());
        let firma = sk.sign(format!("{PREFIJO}.{b64}").as_bytes());
        format!(
            "{PREFIJO}.{b64}.{}",
            URL_SAFE_NO_PAD.encode(firma.to_bytes())
        )
    }

    fn datos(x: Option<&str>) -> Datos {
        Datos {
            n: "Ana".into(),
            e: "ana@example.com".into(),
            p: "pro".into(),
            i: "2026-10-24".into(),
            x: x.map(Into::into),
        }
    }

    #[test]
    fn acepta_licencia_valida_aunque_tenga_espacios() {
        let sk = firmante();
        let clave = emitir(&sk, &datos(None));
        let con_saltos = format!("  {}\n{}  ", &clave[..20], &clave[20..]);
        assert_eq!(
            verificar_con(&con_saltos, "2030-01-01", &sk.verifying_key()).unwrap(),
            datos(None)
        );
    }

    #[test]
    fn rechaza_datos_manipulados() {
        let sk = firmante();
        let clave = emitir(&sk, &datos(None));
        let otra = URL_SAFE_NO_PAD.encode(
            serde_json::to_vec(&Datos {
                n: "Pirata".into(),
                ..datos(None)
            })
            .unwrap(),
        );
        let partes: Vec<&str> = clave.split('.').collect();
        let falsa = format!("{}.{}.{}", partes[0], otra, partes[2]);
        assert!(verificar_con(&falsa, "2030-01-01", &sk.verifying_key()).is_err());
    }

    #[test]
    fn rechaza_otra_clave_y_formatos_raros() {
        let clave = emitir(&SigningKey::from_bytes(&[9u8; 32]), &datos(None));
        assert!(verificar_con(&clave, "2030-01-01", &firmante().verifying_key()).is_err());
        for rara in ["", "VITA1", "VITA1.a.b.c", "OTRA.a.b", "VITA1.%%.%%"] {
            assert!(
                verificar_con(rara, "2030-01-01", &firmante().verifying_key()).is_err(),
                "{rara}"
            );
        }
        // La clave oficial no acepta licencias firmadas con otra.
        assert!(verificar(&clave, "2030-01-01").is_err());
    }

    #[test]
    fn respeta_la_caducidad() {
        let sk = firmante();
        let clave = emitir(&sk, &datos(Some("2027-01-31")));
        assert!(verificar_con(&clave, "2027-01-31", &sk.verifying_key()).is_ok());
        let err = verificar_con(&clave, "2027-02-01", &sk.verifying_key()).unwrap_err();
        assert!(err.contains("caducó"));
    }

    #[test]
    fn estado_sin_licencia_no_es_pro() {
        assert_eq!(estado(None, "2030-01-01"), EstadoLicencia::default());
        assert_eq!(estado(Some("  "), "2030-01-01"), EstadoLicencia::default());
        let e = estado(Some("basura"), "2030-01-01");
        assert!(!e.pro && e.motivo.is_some());
    }

    #[test]
    fn calcula_fechas() {
        assert_eq!(fecha_desde_dias(0), "1970-01-01");
        assert_eq!(fecha_desde_dias(20_752), "2026-10-26");
        assert_eq!(fecha_desde_dias(11_016), "2000-02-29");
        assert_eq!(hoy().len(), 10);
    }
}
