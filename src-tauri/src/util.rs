use std::time::{SystemTime, UNIX_EPOCH};

pub fn ahora() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|x| x.as_millis() as i64)
        .unwrap_or(0)
}

pub fn fecha_hora_local() -> String {
    let dias = ahora().div_euclid(86_400_000);
    let ms = ahora().rem_euclid(86_400_000);
    let z = dias + 719468;
    let era = (if z >= 0 { z } else { z - 146096 }).div_euclid(146097);
    let doe = z - era * 146097;
    let yoe = (doe - doe / 1460 + doe / 36524 - doe / 146096).div_euclid(365);
    let y = yoe + era * 400;
    let doy = doe - (365 * yoe + yoe / 4 - yoe / 100);
    let mp = (5 * doy + 2).div_euclid(153);
    let d = doy - (153 * mp + 2).div_euclid(5) + 1;
    let m = mp + if mp < 10 { 3 } else { -9 };
    let year = y + if m <= 2 { 1 } else { 0 };
    let h = ms / 3_600_000;
    let min = (ms / 60_000) % 60;
    let sec = (ms / 1000) % 60;
    format!("{year:04}-{m:02}-{d:02}_{h:02}-{min:02}-{sec:02}")
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
