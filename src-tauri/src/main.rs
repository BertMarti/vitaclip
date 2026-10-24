// Evita la consola extra en Windows en las versiones de publicación.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    vitaclip_lib::run()
}
