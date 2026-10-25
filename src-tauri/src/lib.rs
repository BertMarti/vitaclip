mod atajo;
mod boveda;
mod captura;
mod comandos;
mod db;
mod estado;
mod ia;
mod pegar;
mod qr;
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
                let _ = captura::iniciar(app.clone(), "imagen".into());
            } else if args.iter().any(|x| x == "--video") {
                let _ = captura::iniciar(app.clone(), "video".into());
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
            let dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
            std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
            let conexion = db::abrir(&dir.join("vitaclip.db"))?;
            let ajustes = db::ajuste_leer(&conexion, "ajustes")?
                .and_then(|x| serde_json::from_str::<db::Ajustes>(&x).ok())
                .unwrap_or_default();
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
            construir_bandeja(app)?;
            if std::env::args().any(|x| x == "--captura") {
                let _ = captura::iniciar(app.handle().clone(), "imagen".into());
            } else if std::env::args().any(|x| x == "--video") {
                let _ = captura::iniciar(app.handle().clone(), "video".into());
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
            comandos::pausa_cambiar
        ])
        .run(tauri::generate_context!())
        .unwrap_or_else(|e| eprintln!("Error al arrancar Vitaclip: {e}"));
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
    if let Some(icon) = app.default_window_icon() {
        tray = tray.icon(icon.clone());
    }
    tray.on_menu_event(move |app, event| match event.id().as_ref() {
        "abrir" => atajo::mostrar_popup(app),
        "captura" => {
            let _ = captura::iniciar(app.clone(), "imagen".into());
        }
        "video" => {
            if video::grabando(app) {
                let _ = video::parar(app.clone());
            } else {
                let _ = captura::iniciar(app.clone(), "video".into());
            }
        }
        "ajustes" => {
            let _ = atajo::abrir_ajustes(app, false);
        }
        "pausar" => {
            if let Some(e) = app.try_state::<estado::Estado>() {
                let nuevo = !e.esta_pausado();
                e.pausar(nuevo);
                if let Ok(c) = e.db.lock() {
                    if let Ok(Some(valor)) = db::ajuste_leer(&c, "ajustes") {
                        if let Ok(mut ajustes) = serde_json::from_str::<db::Ajustes>(&valor) {
                            ajustes.pausado = nuevo;
                            if let Ok(serializado) = serde_json::to_string(&ajustes) {
                                let _ = db::ajuste_guardar(&c, "ajustes", &serializado);
                            }
                        }
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
