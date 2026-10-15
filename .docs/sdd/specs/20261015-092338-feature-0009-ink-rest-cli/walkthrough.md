---
id: 20261015-092338-feature-0009-ink-rest-cli
feature: 0009
title: Walkthrough — Resto de la CLI en ink
spec: ./spec.md
status: done
created: 2026-10-15
---

# Walkthrough — Resto de la CLI en ink

## 1. Cambios realizados

- **Comandos en el marco de ink** (`5ddadf5`):
  - `src/ui/commands.tsx`: `ProviderList`, `IgnoredList`, `Notice` (Intro + Log, con `hint` atenuado), `Help` y `ErrorLine` (`■` sin raíl, en rojo solo con stderr TTY), con sus `print*` sobre `renderToString`.
  - `src/index.ts`: `providers` (lista, `enable`, `disable`, `Unknown action`), `ignore`, `unignore`, `ignored`, `--version`, `--help`, los dos avisos `Interactive terminal required…` (stderr, código 1), `cancel()` (`printOutro("Cancelled")`) y el handler de `main` (`■  <stack>` por stderr) dejan `console.*` y picocolors. Sale `printHelp` de `index.ts`.
  - `grep -n "console\." src/index.ts` solo deja `console.clear()` (decisión 8 de la spec).
- **Pasada de fix** (`97a2092`): `renderToString` parte a 80 columnas por defecto; `print` y `printErrorLine` comparten `toText` con `columns: Infinity`, como no partía `console.log`.

## 2. Tiempo y coste: estimado vs real

- Tipo: frontend
- Estimación de implementación (de la spec): 1 h
- Esfuerzo real: 0,65 h. Es una aproximación con las marcas de los commits: de la apertura a las 11:50 a la validación a las ~12:30. Spec, de ~11:15 a 11:50, ~0,5 h aparte.
- Desviación: −0,35 h (−35 %)
- Causa de la desviación:
  - Las cuatro piezas tenían molde (`printLog`, `CheckError`, la lista de «Toggle providers») y la spec fijaba las salidas literales, así que los tests salieron de los THEN sin diseño.
  - Sin tests de teclado: todo se prueba con `renderToString`, sin las pausas de 250 ms que alargaron la 0007.
  - Lo que más se llevó fue el corte a 80 columnas (~10 min, dos tests RED y una re-revisión).
- Modelo del hilo: Opus 5.5, effort no registrado (spec y ejecución en la misma sesión)
- Tokens del hilo: 13.675.647 — claude-opus-5-5 13.675.647
- Tokens de subagentes: 460.912 en 2 despachos — Revisor final 0009 ink rest cli claude-sonnet-5-5 188.470 / 1 min; Re-revisión 0009 tramo 97a2092 claude-sonnet-5-5 272.442 / 1 min
- Coste de la sesión: sin precio (sin tabla pricing en sdd-kit.json)
- Review de spec: no (modo lite) · hallazgos 0, aceptados 0

## 3. Desviaciones del plan

### Decisiones tomadas sin el dev-lead

- **Revisor final con Sonnet, effort medium**, en vez del `sdd-kit:effort-high` + opus del kit: lo eligió el dev-lead a la pregunta de coste («Sonnet, effort medium (Recomendada)»). La re-revisión del tramo usó el mismo.
- **Stack partido a 80 columnas** (salió en el smoke del error de `main`): `printErrorLine` pasa `columns: Infinity`. Test `writes long error lines to stderr without wrapping`, RED→GREEN.
- **Test RED corregido**: el primer `writes long error lines…` leía `write.mock.calls` después de `mockRestore()`, que las borra; fallaba con `TypeError`, no por el wrap. Se leyó la llamada antes de restaurar y se comprobó que salía RED por el wrap antes del fix.
- **Revisión final, Minor 1** (salidas de stdout partidas a 80 columnas, regresión frente a `console.log`): arreglado en `97a2092`. Test `writes long notices to stdout without wrapping`, RED→GREEN.
- **Smoke**: un `bun run src/index.ts check bun` real actualizó `lastCheck` en `config.json` del dev-lead (de `2026-10-08T18:12:48.600Z` a `2026-10-15T10:01:14.306Z`). Es lo único que cambió: `ignore`, `unignore` y `providers enable/disable` lo dejaron igual.

### Minors diferidos de la revisión final

- `printErrorLine` pone el rojo según `stderr.isTTY`, pero chalk decide el color por stdout: con `um > out.txt` en terminal el `■` sale sin rojo.
- `ProviderStatus` (`commands.tsx`) duplica `ProviderState` (`menu.tsx`) salvo los paréntesis.
- `IGNORED_TITLE` se exporta y repite en cuatro `printNotice`, mientras Providers tiene `printProvidersNotice`.
- El handler de `main` imprime `stack`: pierde `cause` y los `errors` de un `AggregateError`, que `console.error` mostraba.
- Los `print*` no tienen test propio salvo `printNotice` y `printErrorLine`; los cubre el smoke.
- Re-revisión: `menu.tsx` (`print`) y `CheckApp.tsx` (`printCheckError`) siguen con las 80 columnas por defecto.

## 4. Verificación

### 4.1 Builds

- `moon run :build` → verde; `bin/um.exe` es el binario del smoke.
- Suite completa: `moon run :lint :typecheck :test --force`. Lint y typecheck en verde. Tests 94/96: los 2 rojos son `parseProtoOutput`, deuda conocida del roadmap. Tarda ~29 s.
- `grep -n "console\." src/index.ts`: solo `console.clear()` (decisión 8).

### 4.2 Smoke / tests

- Validado: 2026-10-15 · «probado todo» · respondió al guion de 8 pasos: `--version`, `--help`, `providers`, `ignore`/`ignored`/`unignore`, `ignore` sin id, `update winget < nul`, Ctrl+C en el menú y Ctrl+C en `um check`.
- Revisión final: `sdd-kit:effort-medium` + sonnet sobre `5ddadf5`, «Yes»: 0 Critical, 0 Important y 6 Minor.
- Pasada de fix: `97a2092`, 1 hallazgo RED→GREEN (Minor 1, corte a 80 columnas).
- Re-revisión: `5ddadf5..97a2092`, `sdd-kit:effort-medium` + sonnet, «Yes»: 1 Minor.

| THEN | Evidencia | Resultado |
| --- | --- | --- |
| `providers > out.txt` (`┌   Providers `, filas en el raíl, `└`, sin escapes, código 0) | ejecución real + suite | ok |
| `providers` con TTY y sus colores | reportado por el dev-lead | ok |
| `providers enable/disable chocolatey`, `providers foo` | ejecución real (`config.json` a `true` y de vuelta a `false`) | ok |
| `ignore`, `ignored`, `unignore`, lista vacía y `Usage` con `> out.txt` | ejecución real + suite; `config.json` igual salvo `lastCheck` | ok |
| Mismas líneas con TTY (`•` y `Example:` atenuados) | reportado por el dev-lead | ok |
| `um < nul`, `um > out.txt`, `um 2> err.txt` → una línea `■`, código 1, stdout vacío, sin escapes | ejecución real | ok |
| `update winget < nul` → una línea `■` por stderr, código 1 | ejecución real + reportado por el dev-lead | ok |
| Ctrl+C en menú, check y update → `│` y `└  Cancelled`, código 0 | reportado por el dev-lead (menú y check) | ok |
| `--version` → `um v0.1.0` en una línea | ejecución real + reportado por el dev-lead | ok |
| `--help` con marco, 7+3+5 filas y `└`; `> out.txt` sin escapes | ejecución real + suite + reportado por el dev-lead | ok |
| Error inesperado → `■  Error: boom` y el stack sin cortes, código de hoy (0) | ejecución real (provider forzado a lanzar, revertido) + suite | ok |

### 4.3 Residuales / deuda generada

- Los Minors diferidos de la sección 3 pasan como una fila a la deuda técnica del roadmap.
- Ctrl+C dentro de `um update` (selección, Confirm, `updating`) no se probó por separado: comparte `cancel()` con el menú y el check.

## 5. Aprendizajes

- `renderToString` de ink parte a 80 columnas si no se le pasa `columns`; para una salida que antes escribía `console.log`, `{ columns: Infinity }` → `tech-stack.md`, «Testing» (volcado).
- Revisión de skills: no aplica, el proyecto no tiene `.claude/skills/`.

## 6. Adendas

_Ninguna._
