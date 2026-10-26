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

/// Errores de archivos en español (los de std vienen en inglés y se enseñan tal cual al usuario).
pub fn error_es(e: &std::io::Error) -> String {
    use std::io::ErrorKind::*;
    match e.kind() {
        NotFound => "No se encuentra el archivo o la carpeta.".into(),
        PermissionDenied => "No hay permiso para usar ese archivo o carpeta.".into(),
        AlreadyExists => "Ya existe un archivo con ese nombre.".into(),
        StorageFull => "El disco está lleno.".into(),
        ReadOnlyFilesystem => "La unidad es de solo lectura.".into(),
        InvalidInput | InvalidFilename => "La ruta no es válida.".into(),
        _ => format!("Error de archivo ({e})."),
    }
}

/// Crea un archivo NUEVO `vitaclip-AAAA-MM-DD_HH-MM-SS[-n].ext` en `dir`. `create_new` falla si ya existe algo con ese
/// nombre (también un enlace simbólico), así que no se puede sobrescribir nada ni escribir a través de un enlace.
pub fn crear_nuevo(
    dir: &std::path::Path,
    extension: &str,
) -> Result<(std::path::PathBuf, std::fs::File), String> {
    let fecha = fecha_hora_local();
    for n in 1..1000 {
        let nombre = if n == 1 {
            format!("vitaclip-{fecha}.{extension}")
        } else {
            format!("vitaclip-{fecha}-{n}.{extension}")
        };
        let ruta = dir.join(nombre);
        match std::fs::OpenOptions::new()
            .write(true)
            .create_new(true)
            .open(&ruta)
        {
            Ok(archivo) => return Ok((ruta, archivo)),
            Err(e) if e.kind() == std::io::ErrorKind::AlreadyExists => continue,
            Err(e) => return Err(error_es(&e)),
        }
    }
    Err("No se pudo crear un nombre de archivo libre.".into())
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn nombre_con_sufijo_y_sin_sobrescribir() {
        let d = std::env::temp_dir().join(format!("vitaclip-util-{}", std::process::id()));
        std::fs::create_dir_all(&d).expect("tmp");
        let (a, _) = crear_nuevo(&d, "png").expect("a");
        let (b, _) = crear_nuevo(&d, "png").expect("b");
        assert_ne!(a, b);
        assert!(b.to_string_lossy().ends_with("-2.png") || b.to_string_lossy().contains(".png"));
        let _ = std::fs::remove_dir_all(d);
    }

    #[test]
    fn errores_de_archivo_en_espanol() {
        let e = std::io::Error::from(std::io::ErrorKind::PermissionDenied);
        assert!(error_es(&e).starts_with("No hay permiso"));
    }
}
