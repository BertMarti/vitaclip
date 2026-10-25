use crate::{
    atajo, boveda, db,
    estado::Estado,
    ia,
    pegar::{self, Contenido},
    qr,
};
use base64::Engine;
use std::time::{SystemTime, UNIX_EPOCH};
use tauri::{AppHandle, Manager, State};

fn ahora() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|x| x.as_millis() as i64)
        .unwrap_or(0)
}
fn ajustes_desde(e: &Estado) -> Result<db::Ajustes, String> {
    let c =
        e.db.lock()
            .map_err(|_| "Base de datos no disponible".to_string())?;
    Ok(db::ajuste_leer(&c, "ajustes")?
        .and_then(|x| serde_json::from_str(&x).ok())
        .unwrap_or_default())
}
fn enmascarar(mut a: db::Ajustes) -> db::Ajustes {
    // Por caracteres (no bytes) para no partir caracteres multibyte; una clave corta se enmascara entera.
    let caracteres: Vec<char> = a.ia.clave.chars().collect();
    if !caracteres.is_empty() {
        let fin: String = caracteres[caracteres.len().saturating_sub(4)..]
            .iter()
            .collect();
        a.ia.clave = if caracteres.len() > 4 {
            format!("••••{fin}")
        } else {
            "••••".into()
        };
    }
    a
}

#[tauri::command]
pub fn historial_listar(
    e: State<'_, Estado>,
    consulta: String,
    limite: u32,
) -> Result<Vec<db::Clip>, String> {
    db::listar(
        &*e.db
            .lock()
            .map_err(|_| "Base de datos no disponible".to_string())?,
        &consulta,
        limite,
    )
}
#[tauri::command]
pub fn clip_imagen(e: State<'_, Estado>, id: i64) -> Result<String, String> {
    let b = db::imagen_png(
        &*e.db
            .lock()
            .map_err(|_| "Base de datos no disponible".to_string())?,
        id,
    )?
    .ok_or("Imagen no encontrada")?;
    Ok(format!(
        "data:image/png;base64,{}",
        base64::engine::general_purpose::STANDARD.encode(b)
    ))
}
#[tauri::command]
pub async fn clip_pegar(app: AppHandle, e: State<'_, Estado>, id: i64) -> Result<bool, String> {
    let contenido = {
        let c =
            e.db.lock()
                .map_err(|_| "Base de datos no disponible".to_string())?;
        let clip = db::listar(&c, "", u32::MAX)?
            .into_iter()
            .find(|x| x.id == id)
            .ok_or("Clip no encontrado")?;
        db::marcar_usado(&c, id, ahora())?;
        if clip.tipo == "imagen" {
            Contenido::Imagen(db::imagen_png(&c, id)?.ok_or("Imagen no encontrada")?)
        } else {
            Contenido::Texto(clip.texto)
        }
    };
    pegar::pegar(app, &e, contenido).await
}
#[tauri::command]
pub async fn texto_pegar(
    app: AppHandle,
    e: State<'_, Estado>,
    texto: String,
) -> Result<bool, String> {
    pegar::pegar(app, &e, Contenido::Texto(texto)).await
}
#[tauri::command]
pub fn clip_fijar(e: State<'_, Estado>, id: i64, fijado: bool) -> Result<(), String> {
    db::fijar(
        &*e.db
            .lock()
            .map_err(|_| "Base de datos no disponible".to_string())?,
        id,
        fijado,
    )
}
#[tauri::command]
pub fn clip_borrar(e: State<'_, Estado>, id: i64) -> Result<(), String> {
    db::borrar(
        &*e.db
            .lock()
            .map_err(|_| "Base de datos no disponible".to_string())?,
        id,
    )
}
#[tauri::command]
pub fn historial_vaciar(e: State<'_, Estado>, incluir_fijados: bool) -> Result<(), String> {
    db::vaciar(
        &*e.db
            .lock()
            .map_err(|_| "Base de datos no disponible".to_string())?,
        incluir_fijados,
    )
}
#[tauri::command]
pub fn fragmentos_listar(e: State<'_, Estado>) -> Result<Vec<db::Fragmento>, String> {
    db::fragmentos(
        &*e.db
            .lock()
            .map_err(|_| "Base de datos no disponible".to_string())?,
    )
}
#[tauri::command]
pub fn fragmento_guardar(
    e: State<'_, Estado>,
    fragmento: db::Fragmento,
) -> Result<db::Fragmento, String> {
    db::fragmento_guardar(
        &*e.db
            .lock()
            .map_err(|_| "Base de datos no disponible".to_string())?,
        &fragmento,
    )
}
#[tauri::command]
pub fn fragmento_borrar(e: State<'_, Estado>, id: i64) -> Result<(), String> {
    db::fragmento_borrar(
        &*e.db
            .lock()
            .map_err(|_| "Base de datos no disponible".to_string())?,
        id,
    )
}
#[tauri::command]
pub fn qr_svg(texto: String) -> Result<String, String> {
    qr::svg(&texto)
}
#[tauri::command]
pub async fn ia_ejecutar(
    e: State<'_, Estado>,
    accion: String,
    texto: String,
    extra: Option<String>,
) -> Result<String, String> {
    ia::ejecutar(&ajustes_desde(&e)?.ia, &accion, &texto, extra.as_deref()).await
}
#[tauri::command]
pub async fn ia_probar(e: State<'_, Estado>) -> Result<String, String> {
    ia::probar(&ajustes_desde(&e)?.ia).await
}

#[tauri::command]
pub fn ajustes_leer(e: State<'_, Estado>) -> Result<db::Ajustes, String> {
    Ok(enmascarar(ajustes_desde(&e)?))
}
#[tauri::command]
pub fn ajustes_guardar(
    app: AppHandle,
    e: State<'_, Estado>,
    mut ajustes: db::Ajustes,
) -> Result<db::Ajustes, String> {
    let anterior = ajustes_desde(&e)?;
    if ajustes.ia.clave.starts_with("••••") {
        ajustes.ia.clave = anterior.ia.clave;
    }
    if ajustes.atajos.popup != anterior.atajos.popup
        || ajustes.atajos.captura != anterior.atajos.captura
        || ajustes.atajos.video != anterior.atajos.video
    {
        atajo::registrar(&app, &ajustes.atajos)?;
    }
    if ajustes.arrancar_con_sistema != anterior.arrancar_con_sistema {
        use tauri_plugin_autostart::ManagerExt;
        if ajustes.arrancar_con_sistema {
            app.autolaunch()
                .enable()
                .map_err(|x| format!("No se pudo activar el arranque automático: {x}"))?;
        } else {
            app.autolaunch()
                .disable()
                .map_err(|x| format!("No se pudo desactivar el arranque automático: {x}"))?;
        }
    }
    let c =
        e.db.lock()
            .map_err(|_| "Base de datos no disponible".to_string())?;
    db::ajuste_guardar(
        &c,
        "ajustes",
        &serde_json::to_string(&ajustes).map_err(|x| x.to_string())?,
    )?;
    e.pausar(ajustes.pausado);
    Ok(enmascarar(ajustes))
}
#[tauri::command]
pub fn boveda_estado(e: State<'_, Estado>) -> Result<serde_json::Value, String> {
    let existe = !db::ajuste_leer(
        &*e.db
            .lock()
            .map_err(|_| "Base de datos no disponible".to_string())?,
        "boveda",
    )?
    .unwrap_or_default()
    .is_empty();
    let abierta = e
        .boveda
        .lock()
        .map_err(|_| "Estado no disponible".to_string())?
        .abierta();
    Ok(serde_json::json!({"existe":existe,"abierta":abierta}))
}
#[tauri::command]
pub fn boveda_crear(e: State<'_, Estado>, contrasena: String) -> Result<(), String> {
    let c =
        e.db.lock()
            .map_err(|_| "Base de datos no disponible".to_string())?;
    if db::ajuste_leer(&c, "boveda")?.is_some() {
        return Err("La bóveda ya existe.".into());
    }
    let (cab, clave) = boveda::crear(&contrasena)?;
    db::ajuste_guardar(
        &c,
        "boveda",
        &serde_json::to_string(&cab).map_err(|x| x.to_string())?,
    )?;
    e.boveda
        .lock()
        .map_err(|_| "Estado no disponible".to_string())?
        .abrir_con(clave);
    Ok(())
}
#[tauri::command]
pub fn boveda_desbloquear(e: State<'_, Estado>, contrasena: String) -> Result<(), String> {
    let c =
        e.db.lock()
            .map_err(|_| "Base de datos no disponible".to_string())?;
    let cab: boveda::Cabecera =
        serde_json::from_str(&db::ajuste_leer(&c, "boveda")?.ok_or("La bóveda no existe.")?)
            .map_err(|_| "La bóveda está dañada.".to_string())?;
    let clave = boveda::abrir(&cab, &contrasena)?;
    e.boveda
        .lock()
        .map_err(|_| "Estado no disponible".to_string())?
        .abrir_con(clave);
    Ok(())
}
#[tauri::command]
pub fn boveda_bloquear(e: State<'_, Estado>) -> Result<(), String> {
    e.boveda
        .lock()
        .map_err(|_| "Estado no disponible".to_string())?
        .bloquear();
    Ok(())
}
#[tauri::command]
pub fn boveda_listar(e: State<'_, Estado>) -> Result<Vec<db::EntradaBoveda>, String> {
    // Ni los títulos se enseñan con la bóveda bloqueada.
    if !e
        .boveda
        .lock()
        .map_err(|_| "Estado no disponible".to_string())?
        .abierta()
    {
        return Err("Desbloquea la bóveda primero.".into());
    }
    db::bovedas(
        &*e.db
            .lock()
            .map_err(|_| "Base de datos no disponible".to_string())?,
    )
}
#[tauri::command]
pub fn boveda_guardar(
    e: State<'_, Estado>,
    titulo: String,
    secreto: String,
) -> Result<db::EntradaBoveda, String> {
    let mut b = e
        .boveda
        .lock()
        .map_err(|_| "Estado no disponible".to_string())?;
    let clave = b.clave().ok_or("Desbloquea la bóveda primero.")?;
    let cifrado = boveda::cifrar(clave, secreto.as_bytes())?;
    db::boveda_guardar(
        &*e.db
            .lock()
            .map_err(|_| "Base de datos no disponible".to_string())?,
        &titulo,
        &cifrado,
        ahora(),
    )
}
#[tauri::command]
pub fn boveda_borrar(e: State<'_, Estado>, id: i64) -> Result<(), String> {
    db::boveda_borrar(
        &*e.db
            .lock()
            .map_err(|_| "Base de datos no disponible".to_string())?,
        id,
    )
}
#[tauri::command]
pub async fn boveda_pegar(app: AppHandle, e: State<'_, Estado>, id: i64) -> Result<bool, String> {
    let secreto = db::boveda_secreto(
        &*e.db
            .lock()
            .map_err(|_| "Base de datos no disponible".to_string())?,
        id,
    )?
    .ok_or("Secreto no encontrado.")?;
    let texto = {
        let mut b = e
            .boveda
            .lock()
            .map_err(|_| "Estado no disponible".to_string())?;
        let clave = b.clave().ok_or("Desbloquea la bóveda primero.")?;
        boveda::descifrar(clave, &secreto)?
    };
    *e.huella_secreta
        .lock()
        .map_err(|_| "Estado no disponible".to_string())? = Some(db::huella(&texto));
    pegar::pegar(
        app,
        &e,
        Contenido::Texto(String::from_utf8_lossy(&texto).into_owned()),
    )
    .await
}

#[tauri::command]
pub fn historial_exportar(app: AppHandle, e: State<'_, Estado>) -> Result<String, String> {
    let json = db::exportar(
        &*e.db
            .lock()
            .map_err(|_| "Base de datos no disponible".to_string())?,
    )?;
    let dir = app
        .path()
        .download_dir()
        .or_else(|_| app.path().document_dir())
        .map_err(|x| x.to_string())?;
    std::fs::create_dir_all(&dir).map_err(|x| x.to_string())?;
    let ruta = dir.join(format!("vitaclip-{}.json", crate::util::fecha_hora_local()));
    std::fs::write(&ruta, json).map_err(|x| x.to_string())?;
    Ok(ruta.to_string_lossy().into_owned())
}
#[tauri::command]
pub fn historial_importar(e: State<'_, Estado>, json: String) -> Result<u32, String> {
    db::importar(
        &*e.db
            .lock()
            .map_err(|_| "Base de datos no disponible".to_string())?,
        &json,
    )
}
#[tauri::command]
pub fn pausa_cambiar(e: State<'_, Estado>, pausado: bool) -> Result<(), String> {
    e.pausar(pausado);
    let mut a = ajustes_desde(&e)?;
    a.pausado = pausado;
    let c =
        e.db.lock()
            .map_err(|_| "Base de datos no disponible".to_string())?;
    db::ajuste_guardar(
        &c,
        "ajustes",
        &serde_json::to_string(&a).map_err(|x| x.to_string())?,
    )
}
#[tauri::command]
pub fn ventana_ocultar(app: AppHandle) -> Result<(), String> {
    if let Some(w) = app.get_webview_window("popup") {
        w.hide().map_err(|x| x.to_string())?;
    }
    Ok(())
}
#[tauri::command]
// async: crear ventanas desde un comando síncrono bloquea Tauri en Windows.
pub async fn ajustes_abrir(app: AppHandle, bienvenida: Option<bool>) -> Result<(), String> {
    atajo::abrir_ajustes(&app, bienvenida.unwrap_or(false))
}

#[tauri::command]
pub fn captura_iniciar(app: AppHandle, modo: String) -> Result<(), String> {
    if modo != "imagen" && modo != "video" {
        return Err("Modo de captura no válido".into());
    }
    crate::captura::iniciar_en_hilo(app, &modo);
    Ok(())
}
#[tauri::command]
pub fn captura_info(e: State<'_, Estado>) -> Result<crate::captura::Info, String> {
    crate::captura::info(&e)
}
#[tauri::command]
pub fn captura_imagen(e: State<'_, Estado>) -> Result<String, String> {
    crate::captura::imagen(&e)
}
#[tauri::command]
pub fn captura_copiar(app: AppHandle, e: State<'_, Estado>, png: String) -> Result<(), String> {
    crate::captura::copiar(app, &e, png)
}
#[tauri::command]
pub fn captura_guardar(
    app: AppHandle,
    e: State<'_, Estado>,
    png: String,
) -> Result<String, String> {
    crate::captura::guardar(app, &e, png)
}
#[tauri::command]
pub fn captura_cancelar(app: AppHandle, e: State<'_, Estado>) -> Result<(), String> {
    crate::captura::cerrar(&app, &e);
    Ok(())
}
#[tauri::command]
pub async fn video_iniciar(
    app: AppHandle,
    region: Option<crate::video::Region>,
) -> Result<(), String> {
    tauri::async_runtime::spawn_blocking(move || crate::video::iniciar(app, region))
        .await
        .map_err(|e| e.to_string())?
}
#[tauri::command]
pub async fn video_parar(app: AppHandle) -> Result<String, String> {
    tauri::async_runtime::spawn_blocking(move || crate::video::parar(app))
        .await
        .map_err(|e| e.to_string())?
}
#[tauri::command]
pub fn video_estado(app: AppHandle) -> Result<crate::video::EstadoVideo, String> {
    crate::video::estado(&app)
}

#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CapturaReciente {
    pub ruta: String,
    pub nombre: String,
    pub tipo: String,
    pub tamano: u64,
    pub creado: i64,
}
fn carpetas(
    app: &AppHandle,
    e: &Estado,
) -> Result<(std::path::PathBuf, std::path::PathBuf), String> {
    let a = ajustes_desde(e)?;
    let p = if a.capturas.carpeta.is_empty() {
        app.path()
            .picture_dir()
            .map_err(|x| x.to_string())?
            .join("Vitaclip")
    } else {
        std::path::PathBuf::from(a.capturas.carpeta)
    };
    let v = if a.video.carpeta.is_empty() {
        app.path()
            .video_dir()
            .map_err(|x| x.to_string())?
            .join("Vitaclip")
    } else {
        std::path::PathBuf::from(a.video.carpeta)
    };
    Ok((p, v))
}
#[tauri::command]
pub fn capturas_recientes(
    app: AppHandle,
    e: State<'_, Estado>,
    limite: u32,
) -> Result<Vec<CapturaReciente>, String> {
    let (a, b) = carpetas(&app, &e)?;
    let mut out = Vec::new();
    for (d, tipo) in [(a, "imagen"), (b, "video")] {
        if let Ok(rd) = std::fs::read_dir(d) {
            for x in rd.flatten() {
                if let Ok(m) = x.metadata() {
                    let path = x.path();
                    let extension = path.extension().and_then(|z| z.to_str()).unwrap_or("");
                    let válido = (tipo == "imagen" && extension.eq_ignore_ascii_case("png"))
                        || (tipo == "video" && extension.eq_ignore_ascii_case("mp4"));
                    if m.is_file() && válido {
                        out.push(CapturaReciente {
                            ruta: x.path().to_string_lossy().into_owned(),
                            nombre: x.file_name().to_string_lossy().into_owned(),
                            tipo: tipo.into(),
                            tamano: m.len(),
                            creado: m
                                .modified()
                                .ok()
                                .and_then(|z| z.duration_since(std::time::UNIX_EPOCH).ok())
                                .map(|z| z.as_millis() as i64)
                                .unwrap_or(0),
                        });
                    }
                }
            }
        }
    }
    out.sort_by_key(|x| std::cmp::Reverse(x.creado));
    out.truncate(limite as usize);
    Ok(out)
}
#[tauri::command]
pub fn carpeta_abrir(app: AppHandle, e: State<'_, Estado>, tipo: String) -> Result<(), String> {
    let (a, b) = carpetas(&app, &e)?;
    let d = if tipo == "capturas" {
        a
    } else if tipo == "videos" {
        b
    } else {
        return Err("Tipo de carpeta no válido".into());
    };
    std::fs::create_dir_all(&d).map_err(|x| x.to_string())?;
    use tauri_plugin_opener::OpenerExt;
    app.opener()
        .open_path(d.to_string_lossy(), None::<&str>)
        .map_err(|x| x.to_string())
}
#[tauri::command]
pub async fn carpeta_elegir(
    app: AppHandle,
    e: State<'_, Estado>,
    tipo: String,
) -> Result<Option<String>, String> {
    if tipo != "capturas" && tipo != "videos" {
        return Err("Tipo de carpeta no válido".into());
    }
    use tauri_plugin_dialog::DialogExt;
    let Some(d) = app.dialog().file().blocking_pick_folder() else {
        return Ok(None);
    };
    let p = d.to_string();
    let mut a = ajustes_desde(&e)?;
    if tipo == "capturas" {
        a.capturas.carpeta = p.clone()
    } else {
        a.video.carpeta = p.clone()
    }
    let c =
        e.db.lock()
            .map_err(|_| "Base de datos no disponible".to_string())?;
    db::ajuste_guardar(
        &c,
        "ajustes",
        &serde_json::to_string(&a).map_err(|x| x.to_string())?,
    )?;
    Ok(Some(p))
}
#[tauri::command]
pub fn archivo_mostrar(app: AppHandle, e: State<'_, Estado>, ruta: String) -> Result<(), String> {
    let (a, b) = carpetas(&app, &e)?;
    let p = crate::captura::valida_ruta(std::path::Path::new(&ruta), &[a, b])?;
    use tauri_plugin_opener::OpenerExt;
    app.opener()
        .reveal_item_in_dir(p)
        .map_err(|x| x.to_string())
}
#[tauri::command]
pub fn archivo_copiar_imagen(
    app: AppHandle,
    e: State<'_, Estado>,
    ruta: String,
) -> Result<(), String> {
    let a = ajustes_desde(&e)?;
    let d = if a.capturas.carpeta.is_empty() {
        app.path()
            .picture_dir()
            .map_err(|x| x.to_string())?
            .join("Vitaclip")
    } else {
        std::path::PathBuf::from(a.capturas.carpeta)
    };
    let p = crate::captura::valida_ruta(std::path::Path::new(&ruta), &[d])?;
    if p.extension()
        .and_then(|x| x.to_str())
        .map(|x| x.eq_ignore_ascii_case("png"))
        != Some(true)
    {
        return Err("Ruta no permitida".into());
    }
    let b = std::fs::read(p).map_err(|x| x.to_string())?;
    pegar::escribir_imagen(&e, &b)
}
