use crate::{captura, db, video};
use std::{
    collections::HashMap,
    str::FromStr,
    sync::{Mutex, OnceLock},
    time::{Duration, Instant},
};
use tauri::{
    AppHandle, Emitter, Manager, PhysicalPosition, WebviewUrl, WebviewWindow, WebviewWindowBuilder,
};
use tauri_plugin_global_shortcut::{GlobalShortcutExt, Shortcut};

static REGISTRADOS: OnceLock<Mutex<HashMap<Shortcut, &'static str>>> = OnceLock::new();
static ULTIMO_MOSTRADO: OnceLock<Mutex<Option<Instant>>> = OnceLock::new();
static ULTIMO_GUARDADO: OnceLock<Mutex<Option<Instant>>> = OnceLock::new();

pub fn registrar(app: &AppHandle, ajustes: &db::Atajos) -> Result<(), String> {
    let definiciones = [
        ("popup", &ajustes.popup, "Abrir Vitaclip"),
        ("captura", &ajustes.captura, "Captura"),
        ("video", &ajustes.video, "Vídeo"),
    ];
    let mut nuevos = HashMap::new();
    for (accion, texto, nombre) in definiciones {
        if texto.is_empty() {
            continue;
        }
        // Por tecla física en cualquier distribución de teclado (ver teclado.rs).
        let s = Shortcut::from_str(texto)
            .map(crate::teclado::adaptar)
            .map_err(|_| {
                format!("El atajo de {nombre} no es válido o ya lo usa otra aplicación.")
            })?;
        if nuevos.insert(s, accion).is_some() {
            return Err("Dos acciones no pueden usar el mismo atajo.".into());
        }
    }
    let registro = REGISTRADOS.get_or_init(|| Mutex::new(HashMap::new()));
    let mut actual = registro
        .lock()
        .map_err(|_| "Atajos no disponibles".to_string())?;
    let mut registrados = Vec::new();
    for shortcut in nuevos.keys() {
        if actual.contains_key(shortcut) {
            continue;
        }
        app.global_shortcut().register(*shortcut).map_err(|_| {
            for nuevo in registrados.drain(..) {
                let _ = app.global_shortcut().unregister(nuevo);
            }
            let nombre = nuevos.get(shortcut).copied().unwrap_or("Abrir Vitaclip");
            let texto = match nombre {
                "captura" => "Captura",
                "video" => "Vídeo",
                _ => "Abrir Vitaclip",
            };
            format!("El atajo de {texto} no es válido o ya lo usa otra aplicación.")
        })?;
        registrados.push(*shortcut);
    }
    for shortcut in actual.keys() {
        if !nuevos.contains_key(shortcut) {
            let _ = app.global_shortcut().unregister(*shortcut);
        }
    }
    *actual = nuevos;
    Ok(())
}

pub fn accion_para(shortcut: &Shortcut) -> Option<&'static str> {
    REGISTRADOS.get()?.lock().ok()?.get(shortcut).copied()
}

pub fn ejecutar(app: &AppHandle, shortcut: &Shortcut) {
    match accion_para(shortcut) {
        Some("popup") => alternar_popup(app),
        // Fuera del hilo principal: capturar y parar un vídeo tardan y no deben congelar la app.
        Some("captura") => captura::iniciar_en_hilo(app.clone(), "imagen"),
        Some("video") => video::alternar(app.clone()),
        _ => {}
    }
}

pub fn mostrar_popup(app: &AppHandle) {
    if let Some(w) = app.get_webview_window("popup") {
        let _ = ULTIMO_MOSTRADO
            .get_or_init(|| Mutex::new(None))
            .lock()
            .map(|mut x| *x = Some(Instant::now()));
        let ajustes = app
            .try_state::<crate::estado::Estado>()
            .and_then(|e| {
                e.db.lock()
                    .ok()
                    .and_then(|c| db::ajuste_leer(&c, "ajustes").ok().flatten())
                    .and_then(|x| serde_json::from_str::<db::Ajustes>(&x).ok())
            })
            .unwrap_or_default();
        // El tamaño se guarda en píxeles lógicos para que se vea igual con cualquier escalado de pantalla.
        // Se calcula aquí en físicos: justo después de set_size, outer_size() aún devuelve el tamaño anterior.
        let logico = tauri::LogicalSize::new(
            f64::from(ajustes.ventana.ancho.max(300)),
            f64::from(ajustes.ventana.alto.max(320)),
        );
        let tamano: tauri::PhysicalSize<u32> = logico.to_physical(w.scale_factor().unwrap_or(1.0));
        let _ = w.set_size(logico);
        if ajustes.ventana.modo == "recordar" {
            if let (Some(x), Some(y)) = (ajustes.ventana.x, ajustes.ventana.y) {
                if !colocar_recordada(&w, x, y, tamano) {
                    colocar_junto_al_raton(&w, tamano);
                }
            } else {
                colocar_junto_al_raton(&w, tamano);
            }
        } else {
            colocar_junto_al_raton(&w, tamano);
        }
        let _ = w.show();
        let _ = w.set_focus();
        let _ = w.emit("popup-mostrado", ());
        #[cfg(target_os = "windows")]
        {
            let ventana = w.clone();
            let app = app.clone();
            std::thread::spawn(move || {
                std::thread::sleep(Duration::from_millis(60));
                if !ventana.is_focused().unwrap_or(false) {
                    let _ = app.run_on_main_thread(move || {
                        let _ = ventana.set_focus();
                    });
                }
            });
        }
    }
}

fn colocar_recordada(w: &WebviewWindow, x: i32, y: i32, tamano: tauri::PhysicalSize<u32>) -> bool {
    let Ok(monitores) = w.available_monitors() else {
        return false;
    };
    if monitores.into_iter().any(|m| {
        let p = m.position();
        let s = m.size();
        x >= p.x
            && y >= p.y
            && x + tamano.width as i32 <= p.x + s.width as i32
            && y + tamano.height as i32 <= p.y + s.height as i32
    }) {
        let _ = w.set_position(PhysicalPosition::new(x, y));
        true
    } else {
        false
    }
}

pub fn guardar_geometria(app: &AppHandle, w: &WebviewWindow) {
    let ahora = Instant::now();
    let bloqueo = ULTIMO_GUARDADO.get_or_init(|| Mutex::new(None));
    let Ok(mut ultimo) = bloqueo.lock() else {
        return;
    };
    if ultimo
        .map(|x| ahora.duration_since(x) < Duration::from_secs(1))
        .unwrap_or(false)
    {
        return;
    }
    let (Ok(p), Ok(s)) = (w.outer_position(), w.outer_size()) else {
        return;
    };
    let Some(e) = app.try_state::<crate::estado::Estado>() else {
        return;
    };
    let Ok(c) = e.db.lock() else { return };
    let Ok(Some(valor)) = db::ajuste_leer(&c, "ajustes") else {
        return;
    };
    let Ok(mut a) = serde_json::from_str::<db::Ajustes>(&valor) else {
        return;
    };
    a.ventana.x = Some(p.x);
    a.ventana.y = Some(p.y);
    let escala = w.scale_factor().unwrap_or(1.0).max(0.1);
    a.ventana.ancho = ((f64::from(s.width) / escala).round() as u32).max(300);
    a.ventana.alto = ((f64::from(s.height) / escala).round() as u32).max(320);
    if let Ok(serializado) = serde_json::to_string(&a) {
        let _ = db::ajuste_guardar(&c, "ajustes", &serializado);
        *ultimo = Some(ahora);
    }
}

fn colocar_junto_al_raton(w: &WebviewWindow, tamano: tauri::PhysicalSize<u32>) {
    let Ok(raton) = w.cursor_position() else {
        return;
    };
    let Ok(monitores) = w.available_monitors() else {
        return;
    };
    if let Some(m) = monitores.into_iter().find(|m| {
        let p = m.position();
        let s = m.size();
        raton.x >= f64::from(p.x)
            && raton.x < f64::from(p.x + s.width as i32)
            && raton.y >= f64::from(p.y)
            && raton.y < f64::from(p.y + s.height as i32)
    }) {
        let p = m.position();
        let s = m.size();
        let x = (raton.x as i32)
            .min(p.x + s.width as i32 - tamano.width as i32)
            .max(p.x);
        let y = (raton.y as i32)
            .min(p.y + s.height as i32 - tamano.height as i32)
            .max(p.y);
        let _ = w.set_position(PhysicalPosition::new(x, y));
    }
}

pub fn foco_permitido() -> bool {
    ULTIMO_MOSTRADO
        .get()
        .and_then(|x| x.lock().ok())
        .and_then(|x| *x)
        .map(|t| t.elapsed() >= Duration::from_millis(500))
        .unwrap_or(true)
}
pub fn alternar_popup(app: &AppHandle) {
    if let Some(w) = app.get_webview_window("popup") {
        if w.is_visible().unwrap_or(false) && w.is_focused().unwrap_or(false) {
            let _ = w.hide();
        } else {
            mostrar_popup(app);
        }
    }
}
pub fn abrir_ajustes(app: &AppHandle, bienvenida: bool) -> Result<(), String> {
    if let Some(w) = app.get_webview_window("ajustes") {
        return w.set_focus().map_err(|e| e.to_string());
    }
    let p = if bienvenida {
        "ajustes.html#bienvenida"
    } else {
        "ajustes.html"
    };
    WebviewWindowBuilder::new(app, "ajustes", WebviewUrl::App(p.into()))
        .title("Vitaclip · Ajustes")
        .inner_size(760., 600.)
        .center()
        .build()
        .map(|_| ())
        .map_err(|e| e.to_string())
}
