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
