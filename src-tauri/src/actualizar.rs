//! Actualizaciones firmadas desde GitHub (tauri-plugin-updater, solo desde Rust), comprobadas en segundo plano una vez al día
//! y bajo demanda desde Ajustes. Solo se instala una descarga con firma válida de la clave del actualizador.

use std::sync::Mutex;
use std::time::{Duration, SystemTime, UNIX_EPOCH};

use serde::Serialize;
use tauri::{AppHandle, Emitter, Manager, Wry};
use tauri_plugin_opener::OpenerExt;
use tauri_plugin_updater::{Update, UpdaterExt};

pub struct Estado {
    pub actualizacion: Mutex<Option<Update>>,
    pub version: Mutex<Option<String>>,
    pub notas: Mutex<Option<String>>,
    pub fecha: Mutex<Option<String>>,
    pub comprobado: Mutex<Option<i64>>,
    pub buscando: Mutex<bool>,
    pub menu: Mutex<Option<tauri::menu::Menu<Wry>>>,
}

impl Default for Estado {
    fn default() -> Self {
        Self {
            actualizacion: Mutex::new(None),
            version: Mutex::new(None),
            notas: Mutex::new(None),
            fecha: Mutex::new(None),
            comprobado: Mutex::new(None),
            buscando: Mutex::new(false),
            menu: Mutex::new(None),
        }
    }
}

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Disponible {
    pub version: String,
    pub notas: Option<String>,
    pub fecha: Option<String>,
}

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct EstadoActualizacion {
    pub actual: String,
    pub disponible: Option<Disponible>,
    pub comprobado: Option<i64>,
    pub instalable: bool,
    pub buscando: bool,
}

pub fn instalable() -> bool {
    if cfg!(target_os = "linux") {
        std::env::var_os("APPIMAGE").is_some()
    } else {
        true
    }
}

fn ahora() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|x| x.as_millis() as i64)
        .unwrap_or(0)
}

fn estado(app: &AppHandle) -> EstadoActualizacion {
    let e = app.state::<Estado>();
    let version = e.version.lock().ok().and_then(|x| x.clone());
    let disponible = version.map(|version| Disponible {
        notas: e.notas.lock().ok().and_then(|x| x.clone()),
        fecha: e.fecha.lock().ok().and_then(|x| x.clone()),
        version,
    });
    EstadoActualizacion {
        actual: app.package_info().version.to_string(),
        disponible,
        comprobado: e.comprobado.lock().ok().and_then(|x| *x),
        instalable: instalable(),
        buscando: e.buscando.lock().map(|x| *x).unwrap_or(false),
    }
}

/// Sin versión nueva. `comprobada` = la consulta fue bien (si falló la red, no se apunta como comprobado).
fn guardar_sin_disponible(app: &AppHandle, comprobada: bool) {
    if let Some(e) = app.try_state::<Estado>() {
        if let Ok(mut x) = e.actualizacion.lock() {
            *x = None;
        }
        if let Ok(mut x) = e.version.lock() {
            *x = None;
        }
        if let Ok(mut x) = e.notas.lock() {
            *x = None;
        }
        if let Ok(mut x) = e.fecha.lock() {
            *x = None;
        }
        if comprobada {
            if let Ok(mut x) = e.comprobado.lock() {
                *x = Some(ahora());
            }
        }
        if let Ok(mut x) = e.buscando.lock() {
            *x = false;
        }
    }
}

fn añadir_menu(app: &AppHandle, version: &str) {
    let Some(e) = app.try_state::<Estado>() else {
        return;
    };
    let Ok(menu) = e.menu.lock() else { return };
    let Some(menu) = menu.as_ref() else { return };
    if menu.get("actualizar").is_some() {
        return;
    }
    if let Ok(item) = tauri::menu::MenuItem::with_id(
        app,
        "actualizar",
        format!("Actualizar a {version}"),
        true,
        None::<&str>,
    ) {
        let _ = menu.insert_items(&[&item], 3);
    }
}

async fn buscar(app: AppHandle) {
    if let Some(e) = app.try_state::<Estado>() {
        if let Ok(mut x) = e.buscando.lock() {
            *x = true;
        }
    }
    let resultado = match app.updater() {
        Ok(updater) => updater.check().await,
        Err(error) => {
            eprintln!("Error al preparar la comprobación de actualizaciones: {error}");
            guardar_sin_disponible(&app, false);
            return;
        }
    };
    match resultado {
        Ok(Some(update)) => {
            let version = update.version.clone();
            let notas = update.body.clone();
            let fecha = update.date.map(|x| x.to_string());
            if let Some(e) = app.try_state::<Estado>() {
                if let Ok(mut x) = e.actualizacion.lock() {
                    *x = Some(update);
                }
                if let Ok(mut x) = e.version.lock() {
                    *x = Some(version.clone());
                }
                if let Ok(mut x) = e.notas.lock() {
                    *x = notas.clone();
                }
                if let Ok(mut x) = e.fecha.lock() {
                    *x = fecha.clone();
                }
                if let Ok(mut x) = e.comprobado.lock() {
                    *x = Some(ahora());
                }
                if let Ok(mut x) = e.buscando.lock() {
                    *x = false;
                }
            }
            let _ = app.emit(
                "actualizacion-disponible",
                Disponible {
                    version: version.clone(),
                    notas,
                    fecha,
                },
            );
            añadir_menu(&app, &version);
            let avisada = app.try_state::<crate::estado::Estado>().and_then(|e| {
                e.db.lock().ok().and_then(|c| {
                    crate::db::ajuste_leer(&c, "actualizacion_avisada")
                        .ok()
                        .flatten()
                })
            });
            if avisada.as_deref() != Some(&version) {
                if let Some(e) = app.try_state::<crate::estado::Estado>() {
                    if let Ok(c) = e.db.lock() {
                        let _ = crate::db::ajuste_guardar(&c, "actualizacion_avisada", &version);
                    }
                }
                use tauri_plugin_notification::NotificationExt;
                let _ = app
                    .notification()
                    .builder()
                    .title(format!("Vitaclip {version} disponible"))
                    .body(format!("Para instalarla, elige «Actualizar a {version}» en el icono de la bandeja."))
                    .show();
            }
        }
        Ok(None) => {
            guardar_sin_disponible(&app, true);
        }
        Err(error) => {
            eprintln!("Error al comprobar actualizaciones: {error}");
            guardar_sin_disponible(&app, false);
        }
    }
}

pub fn iniciar(app: AppHandle) {
    if cfg!(debug_assertions) {
        return;
    }
    std::thread::spawn(move || {
        std::thread::sleep(Duration::from_secs(30));
        loop {
            let activa = app
                .try_state::<crate::estado::Estado>()
                .map(|e| {
                    e.db.lock()
                        .ok()
                        .map(|c| crate::db::ajustes(&c).buscar_actualizaciones)
                        .unwrap_or(true)
                })
                .unwrap_or(true);
            if activa {
                tauri::async_runtime::block_on(buscar(app.clone()));
            }
            std::thread::sleep(Duration::from_secs(24 * 60 * 60));
        }
    });
}

pub fn guardar_menu(app: &AppHandle, menu: tauri::menu::Menu<Wry>) {
    if let Some(e) = app.try_state::<Estado>() {
        if let Ok(mut x) = e.menu.lock() {
            *x = Some(menu);
        }
    }
}

#[tauri::command]
pub fn actualizacion_estado(app: AppHandle) -> EstadoActualizacion {
    estado(&app)
}

#[tauri::command]
pub async fn actualizacion_buscar(app: AppHandle) -> EstadoActualizacion {
    buscar(app.clone()).await;
    estado(&app)
}

#[tauri::command]
pub async fn actualizacion_instalar(app: AppHandle) -> Result<(), String> {
    if !instalable() {
        return Err(
            "Esta instalación no se puede actualizar sola: descarga la versión nueva.".into(),
        );
    }
    let update = {
        let e = app.state::<Estado>();
        let resultado = e
            .actualizacion
            .lock()
            .map_err(|_| "No se pudo preparar la actualización".to_string())?
            .take();
        resultado
    };
    let update = match update {
        Some(x) => x,
        None => {
            buscar(app.clone()).await;
            let e = app.state::<Estado>();
            let resultado = e
                .actualizacion
                .lock()
                .map_err(|_| "No se pudo preparar la actualización".to_string())?
                .take();
            resultado.ok_or_else(|| "No hay ninguna actualización disponible.".to_string())?
        }
    };
    let app_progreso = app.clone();
    let mut descargado: u64 = 0;
    update
        .download_and_install(
            move |trozo, total| {
                descargado += trozo as u64;
                let _ = app_progreso.emit(
                    "actualizacion-progreso",
                    serde_json::json!({"descargado": descargado, "total": total}),
                );
            },
            || {},
        )
        .await
        .map_err(|e| {
            let texto = e.to_string();
            if texto.to_lowercase().contains("signature") || texto.to_lowercase().contains("firma")
            {
                "La descarga no es auténtica (firma no válida).".into()
            } else {
                format!("No se pudo descargar la actualización: {texto}")
            }
        })?;
    app.restart();
}

#[tauri::command]
pub fn actualizacion_pagina(app: AppHandle) -> Result<(), String> {
    app.opener()
        .open_url(
            "https://github.com/BertMarti/vitaclip/releases/latest",
            None::<&str>,
        )
        .map_err(|e| e.to_string())
}
