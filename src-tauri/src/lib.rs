mod atajo;
mod boveda;
mod captura;
mod comandos;
mod db;
mod estado;
mod ia;
mod llavero;
mod pegar;
mod qr;
mod sensible;
mod teclado;
mod util;
mod video;
mod vigia;

use tauri::Manager;
use tauri_plugin_global_shortcut::ShortcutState;

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_single_instance::init(|app, args, _cwd| {
            if args.iter().any(|x| x == "--captura") {
                captura::iniciar_en_hilo(app.clone(), "imagen");
            } else if args.iter().any(|x| x == "--video") {
                video::alternar(app.clone());
            } else {
                atajo::mostrar_popup(app);
            }
        }))
        .plugin(
            tauri_plugin_global_shortcut::Builder::new()
                .with_handler(|app, shortcut, event| {
                    if event.state == ShortcutState::Pressed {
                        atajo::ejecutar(app, shortcut);
                    }
                })
                .build(),
        )
        .plugin(
            tauri_plugin_autostart::Builder::new()
                .args(["--oculto"])
                .build(),
        )
        .setup(|app| {
            let dir = carpeta_datos(app.handle())?;
            let conexion = db::abrir(&dir.join("vitaclip.db"))?;
            let ajustes = db::ajuste_leer(&conexion, "ajustes")?
                .and_then(|x| serde_json::from_str::<db::Ajustes>(&x).ok())
                .unwrap_or_default();
            // Migración: una clave de IA guardada en la base de datos por una versión anterior pasa al llavero del sistema.
            if !ajustes.ia.clave.is_empty() {
                let mut sin_clave = ajustes.clone();
                llavero::sacar_clave(&mut sin_clave);
                if sin_clave.ia.clave.is_empty() {
                    if let Ok(json) = serde_json::to_string(&sin_clave) {
                        let _ = db::ajuste_guardar(&conexion, "ajustes", &json);
                    }
                }
            }
            app.manage(estado::Estado::new(conexion, ajustes.pausado));
            if atajo::registrar(app.handle(), &ajustes.atajos).is_err() {
                let _ = atajo::abrir_ajustes(app.handle(), true);
            }
            if db::ajuste_leer(
                &*app
                    .state::<estado::Estado>()
                    .db
                    .lock()
                    .map_err(|_| "Base de datos no disponible".to_string())?,
                "bienvenida",
            )?
            .is_none()
            {
                let _ = atajo::abrir_ajustes(app.handle(), true);
                let estado_app = app.state::<estado::Estado>();
                let c = estado_app
                    .db
                    .lock()
                    .map_err(|_| "Base de datos no disponible".to_string())?;
                db::ajuste_guardar(&c, "bienvenida", "1")?;
            }
            if let Some(w) = app.get_webview_window("popup") {
                let ventana = w.clone();
                let app_handle = app.handle().clone();
                w.on_window_event(move |e| {
                    if let tauri::WindowEvent::Focused(false) = e {
                        if !atajo::foco_permitido() {
                            return;
                        }
                        let _ = ventana.hide();
                    }
                    if let tauri::WindowEvent::CloseRequested { api, .. } = e {
                        api.prevent_close();
                        let _ = ventana.hide();
                    }
                    if matches!(
                        e,
                        tauri::WindowEvent::Moved(_) | tauri::WindowEvent::Resized(_)
                    ) {
                        atajo::guardar_geometria(&app_handle, &ventana);
                    }
                });
            }
            vigia::iniciar(app.handle().clone());
            vigia::iniciar_retencion(app.handle().clone());
            construir_bandeja(app)?;
            if std::env::args().any(|x| x == "--captura") {
                captura::iniciar_en_hilo(app.handle().clone(), "imagen");
            } else if std::env::args().any(|x| x == "--video") {
                video::alternar(app.handle().clone());
            } else if std::env::args().any(|x| x == "--mostrar") {
                atajo::mostrar_popup(app.handle());
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            comandos::historial_listar,
            comandos::clip_imagen,
            comandos::clip_pegar,
            comandos::texto_pegar,
            comandos::clip_fijar,
            comandos::clip_borrar,
            comandos::historial_vaciar,
            comandos::historial_exportar,
            comandos::historial_importar,
            comandos::fragmentos_listar,
            comandos::fragmento_guardar,
            comandos::fragmento_borrar,
            comandos::ajustes_leer,
            comandos::ajustes_guardar,
            comandos::captura_iniciar,
            comandos::captura_info,
            comandos::captura_imagen,
            comandos::captura_copiar,
            comandos::captura_guardar,
            comandos::captura_cancelar,
            comandos::video_iniciar,
            comandos::video_parar,
            comandos::video_estado,
            comandos::capturas_recientes,
            comandos::carpeta_abrir,
            comandos::carpeta_elegir,
            comandos::archivo_mostrar,
            comandos::archivo_copiar_imagen,
            comandos::qr_svg,
            comandos::ia_ejecutar,
            comandos::ia_probar,
            comandos::boveda_estado,
            comandos::boveda_crear,
            comandos::boveda_desbloquear,
            comandos::boveda_bloquear,
            comandos::boveda_listar,
            comandos::boveda_guardar,
            comandos::boveda_borrar,
            comandos::boveda_pegar,
            comandos::ventana_ocultar,
            comandos::ajustes_abrir,
            comandos::pausa_cambiar,
            comandos::ventana_arrastrar,
            comandos::abrir_repositorio
        ])
        .run(tauri::generate_context!())
        .unwrap_or_else(|e| eprintln!("Error al arrancar Vitaclip: {e}"));
}

/// Carpeta de datos: solo para el usuario (0700 en Unix). En Windows va en Local y no en Roaming, para que el historial no
/// viaje con los perfiles móviles; si hay datos de una versión anterior en Roaming, se mueven.
fn carpeta_datos(app: &tauri::AppHandle) -> Result<std::path::PathBuf, String> {
    #[cfg(windows)]
    let dir = {
        let local = app.path().app_local_data_dir().map_err(|e| e.to_string())?;
        let roaming = app.path().app_data_dir().map_err(|e| e.to_string())?;
        if local != roaming
            && !local.join("vitaclip.db").exists()
            && roaming.join("vitaclip.db").exists()
        {
            std::fs::create_dir_all(&local).map_err(|e| util::error_es(&e))?;
            for nombre in ["vitaclip.db", "vitaclip.db-wal", "vitaclip.db-shm"] {
                let (origen, destino) = (roaming.join(nombre), local.join(nombre));
                if origen.exists() && std::fs::rename(&origen, &destino).is_err() {
                    std::fs::copy(&origen, &destino).map_err(|e| util::error_es(&e))?;
                    let _ = std::fs::remove_file(&origen);
                }
            }
        }
        local
    };
    #[cfg(not(windows))]
    let dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    std::fs::create_dir_all(&dir).map_err(|e| util::error_es(&e))?;
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        let _ = std::fs::set_permissions(&dir, std::fs::Permissions::from_mode(0o700));
    }
    Ok(dir)
}

fn construir_bandeja(app: &mut tauri::App) -> Result<(), Box<dyn std::error::Error>> {
    use tauri::menu::{CheckMenuItem, MenuBuilder, MenuItem};
    use tauri::tray::TrayIconBuilder;
    let abrir = MenuItem::with_id(app, "abrir", "Abrir Vitaclip", true, None::<&str>)?;
    let captura = MenuItem::with_id(app, "captura", "Capturar zona", true, None::<&str>)?;
    let video = MenuItem::with_id(app, "video", "Grabar vídeo", true, None::<&str>)?;
    let ajustes = MenuItem::with_id(app, "ajustes", "Ajustes", true, None::<&str>)?;
    let estado = app.state::<estado::Estado>().esta_pausado();
    let pausar =
        CheckMenuItem::with_id(app, "pausar", "Pausar captura", true, estado, None::<&str>)?;
    let salir = MenuItem::with_id(app, "salir", "Salir", true, None::<&str>)?;
    let menu = MenuBuilder::new(app)
        .items(&[&abrir, &captura, &video, &ajustes])
        .separator()
        .item(&pausar)
        .separator()
        .item(&salir)
        .build()?;
    let mut tray = TrayIconBuilder::with_id("vitaclip")
        .menu(&menu)
        .tooltip("Vitaclip");
    // Icono propio de la bandeja: en macOS, plantilla monocroma que el sistema tiñe según el modo claro u oscuro.
    #[cfg(target_os = "macos")]
    let icono_bandeja =
        tauri::image::Image::from_bytes(include_bytes!("../icons/bandeja-plantilla.png"));
    #[cfg(not(target_os = "macos"))]
    let icono_bandeja = tauri::image::Image::from_bytes(include_bytes!("../icons/bandeja.png"));
    match icono_bandeja {
        Ok(icono) => tray = tray.icon(icono).icon_as_template(cfg!(target_os = "macos")),
        Err(_) => {
            if let Some(icon) = app.default_window_icon() {
                tray = tray.icon(icon.clone());
            }
        }
    }
    tray.on_menu_event(move |app, event| match event.id().as_ref() {
        "abrir" => atajo::mostrar_popup(app),
        "captura" => {
            captura::iniciar_en_hilo(app.clone(), "imagen");
        }
        "video" => video::alternar(app.clone()),
        "ajustes" => {
            let _ = atajo::abrir_ajustes(app, false);
        }
        "pausar" => {
            if let Some(e) = app.try_state::<estado::Estado>() {
                let nuevo = !e.esta_pausado();
                e.pausar(nuevo);
                if let Ok(c) = e.db.lock() {
                    let mut ajustes = db::ajustes(&c);
                    ajustes.pausado = nuevo;
                    if let Ok(serializado) = serde_json::to_string(&ajustes) {
                        let _ = db::ajuste_guardar(&c, "ajustes", &serializado);
                    }
                }
                let _ = pausar.set_checked(nuevo);
            }
        }
        "salir" => app.exit(0),
        _ => {}
    })
    .on_tray_icon_event(|app, event| {
        if let tauri::tray::TrayIconEvent::Click {
            button: tauri::tray::MouseButton::Left,
            button_state: tauri::tray::MouseButtonState::Up,
            ..
        } = event
        {
            atajo::alternar_popup(app.app_handle());
        }
    })
    .build(app)?;
    let _ = tray;
    Ok(())
}
