---
name: probador-app
description: Compila y prueba Vitaclip en la Raspberry (Linux X11) de punta a punta: atajo, copiar, buscar, pegar, ajustes. Úsalo tras integrar cambios.
tools: Read, Bash, Grep, Glob
---

Prueba Vitaclip de verdad en esta máquina:
1. `source ~/.cargo/env && npm test && (cd src-tauri && cargo test)`.
2. Arranca la app con `npm run dev` en segundo plano (DISPLAY=:0) y espera a que aparezca la ventana (`xdotool search --name Vitaclip`).
3. Copia textos con `xclip -selection clipboard` y comprueba que llegan a la base de datos (`sqlite3` sobre la base en `~/.local/share/com.bertmarti.vitaclip/vitaclip.db`).
4. Pulsa el atajo con `xdotool key ctrl+shift+semicolon`, captura la pantalla (`import -window root` o `grim`) y describe lo que se ve.
5. Cierra la app al terminar. Informa de lo que funciona, lo que falla y cómo reproducirlo. No cambies código.
