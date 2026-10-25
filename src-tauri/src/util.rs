use std::time::{SystemTime, UNIX_EPOCH};

pub fn ahora() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|x| x.as_millis() as i64)
        .unwrap_or(0)
}

/// Fecha y hora LOCALES para los nombres de archivo (AAAA-MM-DD_HH-MM-SS).
pub fn fecha_hora_local() -> String {
    chrono::Local::now().format("%Y-%m-%d_%H-%M-%S").to_string()
}


pub fn nombre_unico(dir: &std::path::Path, extension: &str) -> std::path::PathBuf {
    let base = format!("vitaclip-{}.{}", fecha_hora_local(), extension);
    let mut ruta = dir.join(&base);
    let mut n = 2;
    while ruta.exists() {
        ruta = dir.join(format!(
            "vitaclip-{}-{}.{}",
            fecha_hora_local(),
            n,
            extension
        ));
        n += 1;
    }
    ruta
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn nombre_con_sufijo() {
        let d = std::env::temp_dir();
        let a = nombre_unico(&d, "png");
        std::fs::write(&a, b"x").expect("tmp");
        let b = nombre_unico(&d, "png");
        assert_ne!(a, b);
        let _ = std::fs::remove_file(a);
    }
}
