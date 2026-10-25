use crate::db::ConfigIa;
use serde_json::json;
use std::time::Duration;

pub async fn ejecutar(
    cfg: &ConfigIa,
    accion: &str,
    texto: &str,
    extra: Option<&str>,
) -> Result<String, String> {
    let entrada: String = texto.chars().take(20_000).collect();
    let orden = match accion {
        "traducir" => match extra {
            Some(idioma) => format!("Traduce al idioma {idioma}."),
            None => {
                "Traduce al inglés si el texto está en español y al español en otro caso.".into()
            }
        },
        "resumir" => "Resume el texto.".into(),
        "corregir" => "Corrige la ortografía y la gramática.".into(),
        "formal" => "Reescribe el texto de manera más formal.".into(),
        "cercano" => "Reescribe el texto con un tono más cercano.".into(),
        "explicar_codigo" => "Explica este código de forma clara.".into(),
        "libre" => extra
            .unwrap_or("Transforma el texto según convenga.")
            .to_string(),
        _ => return Err("Acción de IA desconocida.".into()),
    };
    let url = format!("{}/chat/completions", cfg.url.trim_end_matches('/'));
    let cliente = reqwest::Client::new();
    let mut solicitud = cliente.post(&url).timeout(Duration::from_secs(60)).json(&json!({
        "model": cfg.modelo,
        "messages": [{"role":"system", "content": format!("Eres un asistente en español. {orden} Devuelve SOLO el resultado.")}, {"role":"user", "content": entrada}],
        "temperature": 0.3
    }));
    if !cfg.clave.is_empty() {
        solicitud = solicitud.bearer_auth(&cfg.clave);
    }
    let respuesta = solicitud
        .send()
        .await
        .map_err(|_| format!("No se pudo conectar con {}.", cfg.url))?;
    let codigo = respuesta.status().as_u16();
    if codigo == 401 || codigo == 403 {
        return Err("La clave de IA no es válida.".into());
    }
    if codigo == 429 {
        return Err("El proveedor de IA está saturado; prueba en un minuto.".into());
    }
    if !respuesta.status().is_success() {
        return Err(format!("Error de IA ({codigo})."));
    }
    let json: serde_json::Value = respuesta
        .json()
        .await
        .map_err(|_| "Respuesta de IA no válida.".to_string())?;
    json["choices"][0]["message"]["content"]
        .as_str()
        .map(str::to_owned)
        .ok_or_else(|| "Respuesta de IA no válida.".into())
}

pub async fn probar(cfg: &ConfigIa) -> Result<String, String> {
    ejecutar(cfg, "libre", "Responde solo: ok", Some("Responde solo: ok"))
        .await
        .map(|_| cfg.modelo.clone())
}

#[cfg(test)]
mod pruebas {
    use super::*;
    use std::io::{Read, Write};
    use std::net::TcpListener;

    /// Servidor HTTP de una sola petición que responde `estado` y `cuerpo`; devuelve la URL base y la petición recibida.
    fn servidor(
        estado: &'static str,
        cuerpo: &'static str,
    ) -> (String, std::sync::mpsc::Receiver<String>) {
        let oyente = TcpListener::bind("127.0.0.1:0").unwrap();
        let url = format!("http://{}/v1/", oyente.local_addr().unwrap());
        let (tx, rx) = std::sync::mpsc::channel();
        std::thread::spawn(move || {
            let (mut s, _) = oyente.accept().unwrap();
            let mut leido = Vec::new();
            let mut trozo = [0u8; 4096];
            // Lee cabeceras y cuerpo completos antes de responder.
            loop {
                let n = s.read(&mut trozo).unwrap_or(0);
                if n == 0 {
                    break;
                }
                leido.extend_from_slice(&trozo[..n]);
                let texto = String::from_utf8_lossy(&leido).to_string();
                if let Some(fin) = texto.find("\r\n\r\n") {
                    let largo = texto
                        .lines()
                        .find_map(|l| {
                            l.to_ascii_lowercase()
                                .strip_prefix("content-length:")
                                .map(|v| v.trim().parse::<usize>().unwrap_or(0))
                        })
                        .unwrap_or(0);
                    if leido.len() >= fin + 4 + largo {
                        break;
                    }
                }
            }
            let _ = tx.send(String::from_utf8_lossy(&leido).to_string());
            let r = format!(
                "HTTP/1.1 {estado}\r\nContent-Type: application/json\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{cuerpo}",
                cuerpo.len()
            );
            let _ = s.write_all(r.as_bytes());
        });
        (url, rx)
    }

    fn cfg(url: String, clave: &str) -> ConfigIa {
        ConfigIa {
            proveedor: "personalizado".into(),
            url,
            modelo: "modelo-prueba".into(),
            clave: clave.into(),
        }
    }

    #[test]
    fn devuelve_el_texto_y_envia_la_clave() {
        let (url, rx) = servidor("200 OK", r#"{"choices":[{"message":{"content":"Hello"}}]}"#);
        let r = tauri::async_runtime::block_on(ejecutar(
            &cfg(url, "sk-prueba"),
            "traducir",
            "Hola",
            None,
        ));
        assert_eq!(r.unwrap(), "Hello");
        let peticion = rx.recv().unwrap();
        assert!(peticion.starts_with("POST /v1/chat/completions"));
        assert!(peticion
            .to_ascii_lowercase()
            .contains("authorization: bearer sk-prueba"));
        assert!(peticion.contains("modelo-prueba"));
    }

    #[test]
    fn sin_clave_no_manda_cabecera_y_traduce_errores() {
        let (url, rx) = servidor("401 Unauthorized", "{}");
        let r = tauri::async_runtime::block_on(ejecutar(&cfg(url, ""), "resumir", "texto", None));
        assert_eq!(r.unwrap_err(), "La clave de IA no es válida.");
        assert!(!rx
            .recv()
            .unwrap()
            .to_ascii_lowercase()
            .contains("authorization"));
        let (url, _rx) = servidor("429 Too Many Requests", "{}");
        let r = tauri::async_runtime::block_on(ejecutar(&cfg(url, ""), "resumir", "texto", None));
        assert!(r.unwrap_err().contains("saturado"));
        let r = tauri::async_runtime::block_on(ejecutar(
            &cfg("http://127.0.0.1:1".into(), ""),
            "resumir",
            "x",
            None,
        ));
        assert!(r.unwrap_err().starts_with("No se pudo conectar"));
        let r = tauri::async_runtime::block_on(ejecutar(
            &cfg("http://127.0.0.1:1".into(), ""),
            "otra",
            "x",
            None,
        ));
        assert_eq!(r.unwrap_err(), "Acción de IA desconocida.");
    }
}
