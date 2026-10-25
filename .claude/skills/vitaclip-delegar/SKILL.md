---
name: vitaclip-delegar
description: Encargar trabajo de Vitaclip al modelo que toca (GPT-5.6 Luna, Gemini Flash, Zen) con OpenCode. Úsala antes de escribir código, interfaz, documentación o pruebas nuevas de Vitaclip; el orquestador no hace el trabajo pesado.
---

# Delegar una tarea de Vitaclip

Reparto en `AGENTS.md` → «Reparto del trabajo». Claude se queda con diseño, seguridad (bóveda, CSP, capacidades), integración y publicación.

1. Worktree: `git worktree add -q ~/homelab/.wt/vitaclip-<tarea> -b vitaclip-<tarea>` desde el repo.
2. Encargo CERRADO en `~/homelab/.wt/encargos/encargo-vitaclip-<tarea>.txt`: objetivo, archivos que puede tocar y los que no,
   contrato exacto (sección 4 del spec), reglas de `AGENTS.md`, comprobaciones (`npm test`, `cargo test`, `cargo clippy`)
   y «resume en N líneas». Nada de secretos ni datos reales.
3. Lanzar en segundo plano (el perfil `delegado` está en `opencode.json` del repo):
   ```bash
   source ~/.cargo/env
   (CARGO_BUILD_JOBS=2 CARGO_TARGET_DIR=<repo>/src-tauri/target nice -n 15 timeout 5400 ~/.local/bin/opencode run --agent delegado -m openai/gpt-5.6-luna \
     --dir ~/homelab/.wt/vitaclip-<tarea> --title "Vitaclip · <tarea>" "$(cat ~/homelab/.wt/encargos/encargo-vitaclip-<tarea>.txt)" \
     > ~/homelab/.wt/encargos/luna-vitaclip-<tarea>.log 2>&1; echo "FIN $?" >> ~/homelab/.wt/encargos/luna-vitaclip-<tarea>.log) >/dev/null 2>&1 &
   ```
   y un `until grep -q "^FIN" …; do sleep 30; done` en segundo plano para que avise. Las sesiones se ven en la app de OpenCode.
4. Al terminar: skill `vitaclip-revisar-entrega`. Si falla dos veces, lo termina Claude y lo dice.
5. En el commit, quién hizo qué («Hecho por GPT-5.6 Luna (delegado) y revisado por Claude; corregido: …»).
