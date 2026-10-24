use crate::{
    atajo, boveda, db,
    estado::Estado,
    ia, licencia,
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
    if a.ia.clave.len() > 4 {
        a.ia.clave = format!("••••{}", &a.ia.clave[a.ia.clave.len() - 4..]);
    } else {
        a.ia.clave.clear();
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
pub fn acciones_listar(e: State<'_, Estado>) -> Result<Vec<db::Accion>, String> {
    db::acciones(
        &*e.db
            .lock()
            .map_err(|_| "Base de datos no disponible".to_string())?,
    )
}
#[tauri::command]
pub fn accion_guardar(e: State<'_, Estado>, accion: db::Accion) -> Result<db::Accion, String> {
    e.exigir_pro()?;
    db::accion_guardar(
        &*e.db
            .lock()
            .map_err(|_| "Base de datos no disponible".to_string())?,
        &accion,
    )
}
#[tauri::command]
pub fn accion_borrar(e: State<'_, Estado>, id: i64) -> Result<(), String> {
    db::accion_borrar(
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
    e.exigir_pro()?;
    ia::ejecutar(&ajustes_desde(&e)?.ia, &accion, &texto, extra.as_deref()).await
}
#[tauri::command]
pub async fn ia_probar(e: State<'_, Estado>) -> Result<String, String> {
    e.exigir_pro()?;
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
    if ajustes.atajo != anterior.atajo {
        atajo::registrar(&app, &ajustes.atajo)?;
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
pub fn licencia_estado(e: State<'_, Estado>) -> Result<licencia::EstadoLicencia, String> {
    e.licencia
        .lock()
        .map(|x| x.clone())
        .map_err(|_| "Estado no disponible".into())
}
#[tauri::command]
pub fn licencia_activar(
    e: State<'_, Estado>,
    clave: String,
) -> Result<licencia::EstadoLicencia, String> {
    let estado = licencia::estado(Some(&clave), &licencia::hoy());
    if !estado.pro {
        return Err(estado
            .motivo
            .clone()
            .unwrap_or("La licencia no es válida.".into()));
    }
    let c =
        e.db.lock()
            .map_err(|_| "Base de datos no disponible".to_string())?;
    db::ajuste_guardar(&c, "licencia", &clave)?;
    *e.licencia
        .lock()
        .map_err(|_| "Estado no disponible".to_string())? = estado.clone();
    Ok(estado)
}
#[tauri::command]
pub fn licencia_quitar(e: State<'_, Estado>) -> Result<licencia::EstadoLicencia, String> {
    let c =
        e.db.lock()
            .map_err(|_| "Base de datos no disponible".to_string())?;
    db::ajuste_guardar(&c, "licencia", "")?;
    let estado = licencia::EstadoLicencia::default();
    *e.licencia
        .lock()
        .map_err(|_| "Estado no disponible".to_string())? = estado.clone();
    Ok(estado)
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
    e.exigir_pro()?;
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
    e.exigir_pro()?;
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
    e.exigir_pro()?;
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
    e.exigir_pro()?;
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
    e.exigir_pro()?;
    db::boveda_borrar(
        &*e.db
            .lock()
            .map_err(|_| "Base de datos no disponible".to_string())?,
        id,
    )
}
#[tauri::command]
pub async fn boveda_pegar(app: AppHandle, e: State<'_, Estado>, id: i64) -> Result<bool, String> {
    e.exigir_pro()?;
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
    let ruta = dir.join(format!("vitaclip-{}.json", licencia::hoy()));
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
pub fn ajustes_abrir(app: AppHandle, bienvenida: bool) -> Result<(), String> {
    atajo::abrir_ajustes(&app, bienvenida)
}
