use qrcode::{render::svg, QrCode};
pub fn svg(texto: &str) -> Result<String, String> {
    if texto.chars().count() > 1500 {
        return Err("Demasiado texto para un QR".into());
    }
    let q = QrCode::new(texto.as_bytes()).map_err(|_| "No se pudo crear el QR".to_string())?;
    Ok(q.render::<svg::Color>()
        .min_dimensions(240, 240)
        .dark_color(svg::Color("#111111"))
        .light_color(svg::Color("#ffffff"))
        .build())
}
#[cfg(test)]
mod tests {
    #[test]
    fn qr() {
        assert!(super::svg("hola").unwrap().contains("svg"));
    }
}
