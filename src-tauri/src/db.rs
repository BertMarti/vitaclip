use rusqlite::{params, Connection, OptionalExtension};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::path::Path;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Clip {
    pub id: i64,
    pub tipo: String,
    pub texto: String,
    pub ancho: Option<i64>,
    pub alto: Option<i64>,
    pub creado: i64,
    pub usado: i64,
    pub usos: i64,
    pub fijado: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Fragmento {
    pub id: i64,
    pub nombre: String,
    pub abreviatura: String,
    pub contenido: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Accion {
    pub id: i64,
    pub nombre: String,
    pub pasos: serde_json::Value,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EntradaBoveda {
    pub id: i64,
    pub titulo: String,
    pub creado: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", default)]
pub struct ConfigIa {
    pub proveedor: String,
    pub url: String,
    pub modelo: String,
    pub clave: String,
}

impl Default for ConfigIa {
    fn default() -> Self {
        Self {
            proveedor: "ollama".into(),
            url: "http://localhost:11434/v1".into(),
            modelo: "llama3.2".into(),
            clave: String::new(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", default)]
pub struct Atajos {
    pub popup: String,
    pub captura: String,
    pub video: String,
}

impl Default for Atajos {
    fn default() -> Self {
        Self {
            popup: "CommandOrControl+Alt+KeyV".into(),
            captura: "CommandOrControl+Alt+KeyC".into(),
            video: "CommandOrControl+Alt+KeyR".into(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", default)]
pub struct Ventana {
    pub modo: String,
    pub x: Option<i32>,
    pub y: Option<i32>,
    pub ancho: u32,
    pub alto: u32,
}

impl Default for Ventana {
    fn default() -> Self {
        Self {
            modo: "raton".into(),
            x: None,
            y: None,
            ancho: 380,
            alto: 480,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase", default)]
pub struct Carpeta {
    pub carpeta: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", default)]
pub struct Video {
    pub carpeta: String,
    pub fps: u32,
    pub calidad: String,
}

impl Default for Video {
    fn default() -> Self {
        Self {
            carpeta: String::new(),
            fps: 30,
            calidad: "alta".into(),
        }
    }
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase", default)]
pub struct Ajustes {
    pub atajos: Atajos,
    pub ventana: Ventana,
    pub capturas: Carpeta,
    pub video: Video,
    pub tema: String,
    pub idioma: String,
    pub pegar_auto: bool,
    pub arrancar_con_sistema: bool,
    pub pausado: bool,
    pub limite_historial: u32,
    /// Días que se conserva lo no fijado sin usar (0 = sin límite).
    pub retencion_dias: u32,
    pub ignorar: Vec<String>,
    pub ia: ConfigIa,
}

impl Default for Ajustes {
    fn default() -> Self {
        Self {
            atajos: Atajos::default(),
            ventana: Ventana::default(),
            capturas: Carpeta::default(),
            video: Video::default(),
            tema: "sistema".into(),
            idioma: "es".into(),
            pegar_auto: true,
            arrancar_con_sistema: false,
            pausado: false,
            limite_historial: 500,
            retencion_dias: 0,
            ignorar: vec![
                r"^(?:\d[ -]?){13,19}$".into(),
                r"^(ghp_|github_pat_|sk-|xox[abp]-|AKIA)[A-Za-z0-9_\-]{8,}".into(),
            ],
            ia: ConfigIa::default(),
        }
    }
}

impl<'de> Deserialize<'de> for Ajustes {
    fn deserialize<D: serde::Deserializer<'de>>(d: D) -> Result<Self, D::Error> {
        let v = serde_json::Value::deserialize(d)?;
        let mut out = Self::default();
        if let Some(x) = v.get("atajos") {
            out.atajos = serde_json::from_value(x.clone()).map_err(serde::de::Error::custom)?;
        }
        if v.get("atajos").is_none() {
            if let Some(x) = v.get("atajo").and_then(|x| x.as_str()) {
                out.atajos.popup = x.into();
            }
        }
        macro_rules! campo {
            ($nombre:literal, $destino:expr) => {
                if let Some(x) = v.get($nombre) {
                    $destino =
                        serde_json::from_value(x.clone()).map_err(serde::de::Error::custom)?;
                }
            };
        }
        campo!("ventana", out.ventana);
        campo!("capturas", out.capturas);
        campo!("video", out.video);
        campo!("tema", out.tema);
        campo!("idioma", out.idioma);
        campo!("pegarAuto", out.pegar_auto);
        campo!("arrancarConSistema", out.arrancar_con_sistema);
        campo!("pausado", out.pausado);
        campo!("limiteHistorial", out.limite_historial);
        campo!("retencionDias", out.retencion_dias);
        campo!("ignorar", out.ignorar);
        campo!("ia", out.ia);
        Ok(out)
    }
}

pub fn abrir(ruta: &Path) -> Result<Connection, String> {
    // En Unix el archivo nace ya con permisos 0600 (solo el usuario), antes de que SQLite escriba nada.
    #[cfg(unix)]
    {
        use std::os::unix::fs::OpenOptionsExt;
        std::fs::OpenOptions::new()
            .create(true)
            .append(true)
            .mode(0o600)
            .open(ruta)
            .map_err(|e| crate::util::error_es(&e))?;
    }
    let conexion = Connection::open(ruta).map_err(|e| e.to_string())?;
    inicializar(&conexion)?;
    proteger_archivos(ruta);
    Ok(conexion)
}

/// Permisos 0600 para la base de datos y sus archivos auxiliares (-wal, -shm), que SQLite crea con los permisos por defecto.
fn proteger_archivos(ruta: &Path) {
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        let base = ruta.as_os_str().to_owned();
        for sufijo in ["", "-wal", "-shm"] {
            let mut nombre = base.clone();
            nombre.push(sufijo);
            let _ = std::fs::set_permissions(&nombre, std::fs::Permissions::from_mode(0o600));
        }
    }
    #[cfg(not(unix))]
    let _ = ruta;
}

/// Tras borrar: vuelca el diario WAL y lo deja a cero para que lo borrado no quede recuperable en él.
/// Con `compactar`, además reconstruye el archivo (VACUUM) para no dejar páginas libres con datos antiguos.
fn limpiar_rastro(c: &Connection, compactar: bool) -> Result<(), String> {
    c.execute_batch("PRAGMA wal_checkpoint(TRUNCATE);")
        .map_err(|e| e.to_string())?;
    if compactar {
        c.execute_batch("VACUUM; PRAGMA wal_checkpoint(TRUNCATE);")
            .map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[cfg_attr(not(test), allow(dead_code))]
pub fn abrir_memoria() -> Result<Connection, String> {
    let conexion = Connection::open_in_memory().map_err(|e| e.to_string())?;
    inicializar(&conexion)?;
    Ok(conexion)
}

fn inicializar(c: &Connection) -> Result<(), String> {
    c.execute_batch(
        "PRAGMA secure_delete=ON;
         PRAGMA journal_mode=WAL;
         CREATE TABLE IF NOT EXISTS clips(
           id INTEGER PRIMARY KEY, tipo TEXT NOT NULL, texto TEXT NOT NULL DEFAULT '',
           imagen BLOB, ancho INTEGER, alto INTEGER, huella TEXT NOT NULL UNIQUE,
           creado INTEGER NOT NULL, usado INTEGER NOT NULL, usos INTEGER NOT NULL DEFAULT 0,
           fijado INTEGER NOT NULL DEFAULT 0);
         CREATE TABLE IF NOT EXISTS fragmentos(
           id INTEGER PRIMARY KEY, nombre TEXT NOT NULL, abreviatura TEXT NOT NULL DEFAULT '',
           contenido TEXT NOT NULL);
         CREATE TABLE IF NOT EXISTS acciones(id INTEGER PRIMARY KEY, nombre TEXT NOT NULL, pasos TEXT NOT NULL);
         CREATE TABLE IF NOT EXISTS boveda(id INTEGER PRIMARY KEY, titulo TEXT NOT NULL, secreto BLOB NOT NULL, creado INTEGER NOT NULL);
         CREATE TABLE IF NOT EXISTS ajustes(clave TEXT PRIMARY KEY, valor TEXT NOT NULL);",
    )
    .map_err(|e| e.to_string())
}

pub fn huella(bytes: &[u8]) -> String {
    format!("{:x}", Sha256::digest(bytes))
}

fn recortar(c: &Connection, limite: u32) -> Result<(), String> {
    c.execute(
        "DELETE FROM clips WHERE id IN (
           SELECT id FROM clips WHERE fijado=0 ORDER BY usado ASC
           LIMIT MAX(0, (SELECT COUNT(*) FROM clips WHERE fijado=0)-?1))",
        params![i64::from(limite)],
    )
    .map(|_| ())
    .map_err(|e| e.to_string())
}

pub fn guardar_texto(c: &Connection, texto: &str, ahora: i64, limite: u32) -> Result<bool, String> {
    let h = huella(texto.as_bytes());
    if c.execute(
        "UPDATE clips SET usado=?1, usos=usos+1 WHERE huella=?2",
        params![ahora, h],
    )
    .map_err(|e| e.to_string())?
        > 0
    {
        return Ok(false);
    }
    c.execute(
        "INSERT INTO clips(tipo,texto,huella,creado,usado) VALUES('texto',?1,?2,?3,?3)",
        params![texto, h, ahora],
    )
    .map_err(|e| e.to_string())?;
    recortar(c, limite)?;
    Ok(true)
}

pub fn guardar_imagen(
    c: &Connection,
    png: &[u8],
    ancho: u32,
    alto: u32,
    ahora: i64,
    limite: u32,
) -> Result<bool, String> {
    let h = huella(png);
    if c.execute(
        "UPDATE clips SET usado=?1, usos=usos+1 WHERE huella=?2",
        params![ahora, h],
    )
    .map_err(|e| e.to_string())?
        > 0
    {
        return Ok(false);
    }
    c.execute(
        "INSERT INTO clips(tipo,imagen,ancho,alto,huella,creado,usado) VALUES('imagen',?1,?2,?3,?4,?5,?5)",
        params![png, i64::from(ancho), i64::from(alto), h, ahora],
    )
    .map_err(|e| e.to_string())?;
    recortar(c, limite)?;
    Ok(true)
}

fn escapar_like(s: &str) -> String {
    s.replace('\\', "\\\\")
        .replace('%', "\\%")
        .replace('_', "\\_")
}

pub fn listar(c: &Connection, consulta: &str, limite: u32) -> Result<Vec<Clip>, String> {
    let (filtro, terminos) = if let Some(x) = consulta.strip_prefix("img:") {
        (" AND tipo='imagen'", x)
    } else if let Some(x) = consulta.strip_prefix("url:") {
        (
            " AND tipo='texto' AND (texto LIKE 'http://%' OR texto LIKE 'https://%')",
            x,
        )
    } else if let Some(x) = consulta.strip_prefix("fij:") {
        (" AND fijado=1", x)
    } else {
        ("", consulta)
    };
    let palabras: Vec<String> = terminos.split_whitespace().map(escapar_like).collect();
    let mut sql =
        "SELECT id,tipo,texto,ancho,alto,creado,usado,usos,fijado FROM clips WHERE 1=1".to_string();
    sql.push_str(filtro);
    for _ in &palabras {
        sql.push_str(" AND lower(texto) LIKE lower(?) ESCAPE '\\'");
    }
    sql.push_str(" ORDER BY fijado DESC, usado DESC LIMIT ?");
    let mut valores: Vec<Box<dyn rusqlite::ToSql>> = palabras
        .iter()
        .map(|p| Box::new(format!("%{}%", p)) as Box<dyn rusqlite::ToSql>)
        .collect();
    valores.push(Box::new(i64::from(limite)));
    let mut stmt = c.prepare(&sql).map_err(|e| e.to_string())?;
    let filas = stmt
        .query_map(rusqlite::params_from_iter(valores.iter()), |r| {
            Ok(Clip {
                id: r.get(0)?,
                tipo: r.get(1)?,
                texto: r.get(2)?,
                ancho: r.get(3)?,
                alto: r.get(4)?,
                creado: r.get(5)?,
                usado: r.get(6)?,
                usos: r.get(7)?,
                fijado: r.get::<_, i64>(8)? != 0,
            })
        })
        .map_err(|e| e.to_string())?;
    filas
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())
}

pub fn imagen_png(c: &Connection, id: i64) -> Result<Option<Vec<u8>>, String> {
    c.query_row("SELECT imagen FROM clips WHERE id=?", [id], |r| r.get(0))
        .optional()
        .map_err(|e| e.to_string())
}

pub fn marcar_usado(c: &Connection, id: i64, ahora: i64) -> Result<(), String> {
    c.execute(
        "UPDATE clips SET usado=?, usos=usos+1 WHERE id=?",
        params![ahora, id],
    )
    .map(|_| ())
    .map_err(|e| e.to_string())
}
pub fn id_por_huella(c: &Connection, h: &str) -> Result<Option<i64>, String> {
    c.query_row("SELECT id FROM clips WHERE huella=?", [h], |r| r.get(0))
        .optional()
        .map_err(|e| e.to_string())
}
pub fn fijar(c: &Connection, id: i64, valor: bool) -> Result<(), String> {
    c.execute(
        "UPDATE clips SET fijado=? WHERE id=?",
        params![valor as i64, id],
    )
    .map(|_| ())
    .map_err(|e| e.to_string())
}
pub fn borrar(c: &Connection, id: i64) -> Result<(), String> {
    c.execute("DELETE FROM clips WHERE id=?", [id])
        .map_err(|e| e.to_string())?;
    limpiar_rastro(c, false)
}
pub fn vaciar(c: &Connection, incluir_fijados: bool) -> Result<(), String> {
    c.execute(
        if incluir_fijados {
            "DELETE FROM clips"
        } else {
            "DELETE FROM clips WHERE fijado=0"
        },
        [],
    )
    .map_err(|e| e.to_string())?;
    limpiar_rastro(c, true)
}

/// Retención: borra lo no fijado que no se ha usado en `dias` días (0 = sin límite). Devuelve cuántos borró.
pub fn purgar_antiguos(c: &Connection, dias: u32, ahora: i64) -> Result<usize, String> {
    if dias == 0 {
        return Ok(0);
    }
    let limite = ahora - i64::from(dias) * 86_400_000;
    let borrados = c
        .execute("DELETE FROM clips WHERE fijado=0 AND usado < ?1", [limite])
        .map_err(|e| e.to_string())?;
    if borrados > 0 {
        limpiar_rastro(c, false)?;
    }
    Ok(borrados)
}

/// Un solo clip por id (sin cargar todo el historial).
pub fn clip(c: &Connection, id: i64) -> Result<Option<Clip>, String> {
    c.query_row(
        "SELECT id,tipo,texto,ancho,alto,creado,usado,usos,fijado FROM clips WHERE id=?",
        [id],
        |r| {
            Ok(Clip {
                id: r.get(0)?,
                tipo: r.get(1)?,
                texto: r.get(2)?,
                ancho: r.get(3)?,
                alto: r.get(4)?,
                creado: r.get(5)?,
                usado: r.get(6)?,
                usos: r.get(7)?,
                fijado: r.get::<_, i64>(8)? != 0,
            })
        },
    )
    .optional()
    .map_err(|e| e.to_string())
}

pub fn ajuste_leer(c: &Connection, clave: &str) -> Result<Option<String>, String> {
    c.query_row("SELECT valor FROM ajustes WHERE clave=?", [clave], |r| {
        r.get(0)
    })
    .optional()
    .map_err(|e| e.to_string())
}
/// Ajustes guardados, o los de por defecto si aún no se han guardado nunca (o están dañados).
pub fn ajustes(c: &Connection) -> Ajustes {
    ajuste_leer(c, "ajustes")
        .ok()
        .flatten()
        .and_then(|x| serde_json::from_str(&x).ok())
        .unwrap_or_default()
}

pub fn ajuste_guardar(c: &Connection, clave: &str, valor: &str) -> Result<(), String> {
    c.execute(
        "INSERT INTO ajustes(clave,valor) VALUES(?,?) ON CONFLICT(clave) DO UPDATE SET valor=excluded.valor",
        params![clave, valor],
    )
    .map(|_| ())
    .map_err(|e| e.to_string())
}

pub fn fragmentos(c: &Connection) -> Result<Vec<Fragmento>, String> {
    let mut s = c
        .prepare("SELECT id,nombre,abreviatura,contenido FROM fragmentos ORDER BY id")
        .map_err(|e| e.to_string())?;
    let filas = s
        .query_map([], |r| {
            Ok(Fragmento {
                id: r.get(0)?,
                nombre: r.get(1)?,
                abreviatura: r.get(2)?,
                contenido: r.get(3)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string());
    filas
}
pub fn fragmento_guardar(c: &Connection, x: &Fragmento) -> Result<Fragmento, String> {
    let id = if x.id == 0 {
        c.execute(
            "INSERT INTO fragmentos(nombre,abreviatura,contenido) VALUES(?,?,?)",
            params![x.nombre, x.abreviatura, x.contenido],
        )
        .map_err(|e| e.to_string())?;
        c.last_insert_rowid()
    } else {
        c.execute(
            "UPDATE fragmentos SET nombre=?,abreviatura=?,contenido=? WHERE id=?",
            params![x.nombre, x.abreviatura, x.contenido, x.id],
        )
        .map_err(|e| e.to_string())?;
        x.id
    };
    Ok(Fragmento { id, ..x.clone() })
}
pub fn fragmento_borrar(c: &Connection, id: i64) -> Result<(), String> {
    c.execute("DELETE FROM fragmentos WHERE id=?", [id])
        .map(|_| ())
        .map_err(|e| e.to_string())
}
pub fn acciones(c: &Connection) -> Result<Vec<Accion>, String> {
    let mut s = c
        .prepare("SELECT id,nombre,pasos FROM acciones ORDER BY id")
        .map_err(|e| e.to_string())?;
    let filas = s
        .query_map([], |r| {
            Ok(Accion {
                id: r.get(0)?,
                nombre: r.get(1)?,
                pasos: serde_json::from_str(&r.get::<_, String>(2)?)
                    .unwrap_or(serde_json::Value::Null),
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string());
    filas
}
pub fn accion_guardar(c: &Connection, x: &Accion) -> Result<Accion, String> {
    let pasos = serde_json::to_string(&x.pasos).map_err(|e| e.to_string())?;
    let id = if x.id == 0 {
        c.execute(
            "INSERT INTO acciones(nombre,pasos) VALUES(?,?)",
            params![x.nombre, pasos],
        )
        .map_err(|e| e.to_string())?;
        c.last_insert_rowid()
    } else {
        c.execute(
            "UPDATE acciones SET nombre=?,pasos=? WHERE id=?",
            params![x.nombre, pasos, x.id],
        )
        .map_err(|e| e.to_string())?;
        x.id
    };
    Ok(Accion { id, ..x.clone() })
}
pub fn bovedas(c: &Connection) -> Result<Vec<EntradaBoveda>, String> {
    let mut s = c
        .prepare("SELECT id,titulo,creado FROM boveda ORDER BY id")
        .map_err(|e| e.to_string())?;
    let filas = s
        .query_map([], |r| {
            Ok(EntradaBoveda {
                id: r.get(0)?,
                titulo: r.get(1)?,
                creado: r.get(2)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string());
    filas
}
pub fn boveda_guardar(
    c: &Connection,
    titulo: &str,
    secreto: &[u8],
    creado: i64,
) -> Result<EntradaBoveda, String> {
    c.execute(
        "INSERT INTO boveda(titulo,secreto,creado) VALUES(?,?,?)",
        params![titulo, secreto, creado],
    )
    .map_err(|e| e.to_string())?;
    Ok(EntradaBoveda {
        id: c.last_insert_rowid(),
        titulo: titulo.into(),
        creado,
    })
}
pub fn boveda_secreto(c: &Connection, id: i64) -> Result<Option<Vec<u8>>, String> {
    c.query_row("SELECT secreto FROM boveda WHERE id=?", [id], |r| r.get(0))
        .optional()
        .map_err(|e| e.to_string())
}
pub fn boveda_borrar(c: &Connection, id: i64) -> Result<(), String> {
    c.execute("DELETE FROM boveda WHERE id=?", [id])
        .map_err(|e| e.to_string())?;
    limpiar_rastro(c, false)
}

#[derive(Serialize, Deserialize)]
struct Exportado {
    version: u8,
    clips: Vec<ExportClip>,
    fragmentos: Vec<Fragmento>,
    acciones: Vec<Accion>,
}
#[derive(Serialize, Deserialize)]
struct ExportClip {
    texto: String,
    creado: i64,
    fijado: bool,
}
pub fn exportar(c: &Connection) -> Result<String, String> {
    let clips = listar(c, "", u32::MAX)?
        .into_iter()
        .filter(|x| x.tipo == "texto")
        .map(|x| ExportClip {
            texto: x.texto,
            creado: x.creado,
            fijado: x.fijado,
        })
        .collect();
    serde_json::to_string(&Exportado {
        version: 1,
        clips,
        fragmentos: fragmentos(c)?,
        acciones: acciones(c)?,
    })
    .map_err(|e| e.to_string())
}
pub fn importar(c: &Connection, json: &str) -> Result<u32, String> {
    let datos: Exportado = serde_json::from_str(json)
        .map_err(|_| "El archivo de historial no es válido".to_string())?;
    let mut total = 0;
    for clip in datos.clips {
        if guardar_texto(c, &clip.texto, clip.creado, u32::MAX)? {
            let id = c.last_insert_rowid();
            if clip.fijado {
                fijar(c, id, true)?;
            }
            total += 1;
        }
    }
    // Siempre como fragmentos nuevos (id 0): importar nunca sobrescribe los que ya tienes.
    for f in datos.fragmentos {
        fragmento_guardar(c, &Fragmento { id: 0, ..f })?;
    }
    for a in datos.acciones {
        accion_guardar(c, &a)?;
    }
    Ok(total)
}

#[cfg(test)]
mod tests {
    use super::*;
    fn db() -> Connection {
        abrir_memoria().expect("db")
    }
    #[test]
    fn duplicado_sube_y_suma() {
        let c = db();
        assert!(guardar_texto(&c, "uno", 1, 10).unwrap());
        assert!(!guardar_texto(&c, "uno", 2, 10).unwrap());
        let x = listar(&c, "", 10).unwrap();
        assert_eq!(x[0].usos, 1);
    }
    #[test]
    fn recorte_respeta_fijados() {
        let c = db();
        guardar_texto(&c, "a", 1, 1).unwrap();
        fijar(&c, 1, true).unwrap();
        guardar_texto(&c, "b", 2, 1).unwrap();
        assert_eq!(listar(&c, "", 10).unwrap().len(), 2);
    }
    #[test]
    fn prefijos_y_palabras() {
        let c = db();
        guardar_texto(&c, "http://x dos", 1, 10).unwrap();
        guardar_texto(&c, "uno dos", 2, 10).unwrap();
        assert_eq!(listar(&c, "url:", 10).unwrap().len(), 1);
        assert_eq!(listar(&c, "uno dos", 10).unwrap().len(), 1);
    }
    #[test]
    fn escape_porcentaje() {
        let c = db();
        guardar_texto(&c, "100% real", 1, 10).unwrap();
        assert_eq!(listar(&c, "100%", 10).unwrap().len(), 1);
        assert_eq!(listar(&c, "100x", 10).unwrap().len(), 0);
    }
    #[test]
    fn exportar_importar() {
        let c = db();
        guardar_texto(&c, "hola", 1, 10).unwrap();
        let json = exportar(&c).unwrap();
        let d = db();
        assert_eq!(importar(&d, &json).unwrap(), 1);
    }
    #[test]
    fn ajustes_faltantes() {
        let a: Ajustes = serde_json::from_str("{}").unwrap();
        assert_eq!(a.idioma, "es");
        assert_eq!(a.ia.modelo, "llama3.2");
    }

    #[test]
    fn retencion_borra_lo_antiguo_no_fijado() {
        let c = db();
        guardar_texto(&c, "viejo", 1_000, 100).unwrap();
        guardar_texto(&c, "viejo fijado", 1_000, 100).unwrap();
        let fijado = c.last_insert_rowid();
        fijar(&c, fijado, true).unwrap();
        let ahora = 1_000 + 31 * 86_400_000;
        guardar_texto(&c, "reciente", ahora, 100).unwrap();
        assert_eq!(purgar_antiguos(&c, 0, ahora).unwrap(), 0);
        assert_eq!(purgar_antiguos(&c, 30, ahora).unwrap(), 1);
        let textos: Vec<String> = listar(&c, "", 10)
            .unwrap()
            .into_iter()
            .map(|x| x.texto)
            .collect();
        assert!(
            textos.contains(&"viejo fijado".to_string())
                && textos.contains(&"reciente".to_string())
        );
        assert!(!textos.contains(&"viejo".to_string()));
    }

    #[test]
    fn clip_por_id_e_importar_no_sobrescribe_fragmentos() {
        let c = db();
        guardar_texto(&c, "hola", 1, 10).unwrap();
        let id = c.last_insert_rowid();
        assert_eq!(clip(&c, id).unwrap().map(|x| x.texto), Some("hola".into()));
        assert!(clip(&c, 999).unwrap().is_none());
        let f = fragmento_guardar(
            &c,
            &Fragmento {
                id: 0,
                nombre: "a".into(),
                abreviatura: "a".into(),
                contenido: "uno".into(),
            },
        )
        .unwrap();
        let json = format!(
            r#"{{"version":1,"clips":[],"fragmentos":[{{"id":{},"nombre":"b","abreviatura":"b","contenido":"dos"}}],"acciones":[]}}"#,
            f.id
        );
        importar(&c, &json).unwrap();
        let todos = fragmentos(&c).unwrap();
        assert_eq!(todos.len(), 2);
        assert!(todos.iter().any(|x| x.contenido == "uno"));
    }
}
