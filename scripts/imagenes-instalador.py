#!/usr/bin/env python3
"""Genera las imágenes de los instaladores a partir de los iconos SVG de src-tauri/iconos-fuente.

Necesita rsvg-convert (librsvg2-bin) y Pillow. Uso: python3 scripts/imagenes-instalador.py
- Windows NSIS: cabecera 150x57 y lateral 164x314 (BMP de 24 bits).
- Windows MSI (WiX): banda 493x58 y diálogo 493x312 (BMP de 24 bits).
- macOS: fondo del .dmg 660x400 (PNG) con la flecha hacia Aplicaciones.
"""
import io
import subprocess
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

RAIZ = Path(__file__).resolve().parent.parent
FUENTE = RAIZ / "src-tauri" / "iconos-fuente"
SALIDA = RAIZ / "src-tauri" / "instalador"
NEGRITA = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
NORMAL = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"

OSCURO_ARRIBA, OSCURO_ABAJO = (27, 34, 30), (12, 16, 14)
CLARO = (247, 250, 245)
TEXTO_OSCURO, TEXTO_SUAVE = (28, 36, 23), (104, 114, 97)
LIMA, VERDE = (196, 236, 42), (34, 197, 94)


def icono(tamano, svg="icono.svg"):
    png = subprocess.run(
        ["rsvg-convert", "-w", str(tamano), "-h", str(tamano), str(FUENTE / svg)],
        capture_output=True,
        check=True,
    ).stdout
    return Image.open(io.BytesIO(png)).convert("RGBA")


def degradado(ancho, alto, arriba, abajo):
    img = Image.new("RGB", (ancho, alto))
    pintor = ImageDraw.Draw(img)
    for y in range(alto):
        t = y / max(1, alto - 1)
        pintor.line([(0, y), (ancho, y)], fill=tuple(round(a + (b - a) * t) for a, b in zip(arriba, abajo)))
    return img


def fuente(ruta, tamano):
    return ImageFont.truetype(ruta, tamano)


def pegar(fondo, img, x, y):
    fondo.paste(img, (x, y), img)


def guardar_bmp(img, nombre):
    img.convert("RGB").save(SALIDA / nombre, format="BMP")


def nsis_cabecera():
    img = Image.new("RGB", (150, 57), CLARO)
    pegar(img, icono(40), 102, 8)
    return img


def lateral(ancho, alto):
    """Panel oscuro con el icono, el nombre y el lema (lateral de NSIS y del diálogo de WiX)."""
    img = degradado(ancho, alto, OSCURO_ARRIBA, OSCURO_ABAJO)
    pintor = ImageDraw.Draw(img)
    grande = icono(96)
    pegar(img, grande, (ancho - 96) // 2, 48)
    titulo = fuente(NEGRITA, 22)
    w = pintor.textlength("Vitaclip", font=titulo)
    pintor.text(((ancho - w) / 2, 158), "Vitaclip", font=titulo, fill=(240, 244, 238))
    lema = fuente(NORMAL, 10)
    for i, linea in enumerate(["El portapapeles", "supervitaminado"]):
        w = pintor.textlength(linea, font=lema)
        pintor.text(((ancho - w) / 2, 190 + i * 14), linea, font=lema, fill=LIMA)
    # Franja de acento abajo.
    for x in range(ancho):
        t = x / max(1, ancho - 1)
        color = tuple(round(a + (b - a) * t) for a, b in zip(LIMA, VERDE))
        pintor.line([(x, alto - 6), (x, alto)], fill=color)
    return img


def wix_banda():
    img = Image.new("RGB", (493, 58), CLARO)
    pegar(img, icono(42), 493 - 42 - 10, 8)
    return img


def wix_dialogo():
    img = Image.new("RGB", (493, 312), (255, 255, 255))
    img.paste(lateral(164, 312), (0, 0))
    return img


def dmg_fondo():
    img = degradado(660, 400, (250, 252, 248), (236, 242, 232))
    pintor = ImageDraw.Draw(img)
    # Flecha de la app (x=180) a Aplicaciones (x=480), a la altura de los iconos (y=190).
    for x in range(250, 410, 1):
        t = (x - 250) / 160
        color = tuple(round(a + (b - a) * t) for a, b in zip(LIMA, VERDE))
        pintor.line([(x, 187), (x, 193)], fill=color)
    pintor.polygon([(410, 175), (436, 190), (410, 205)], fill=VERDE)
    texto = fuente(NORMAL, 15)
    mensaje = "Arrastra Vitaclip a Aplicaciones"
    w = pintor.textlength(mensaje, font=texto)
    pintor.text(((660 - w) / 2, 310), mensaje, font=texto, fill=TEXTO_SUAVE)
    return img


def main():
    SALIDA.mkdir(parents=True, exist_ok=True)
    guardar_bmp(nsis_cabecera(), "nsis-cabecera.bmp")
    guardar_bmp(lateral(164, 314), "nsis-lateral.bmp")
    guardar_bmp(wix_banda(), "wix-banda.bmp")
    guardar_bmp(wix_dialogo(), "wix-dialogo.bmp")
    dmg_fondo().save(SALIDA / "dmg-fondo.png")
    print("Imágenes generadas en", SALIDA)


if __name__ == "__main__":
    main()
