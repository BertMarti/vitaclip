mod boveda;
mod licencia;

pub fn run() {
    tauri::Builder::default()
        .run(tauri::generate_context!())
        .expect("error al arrancar Vitaclip");
}
