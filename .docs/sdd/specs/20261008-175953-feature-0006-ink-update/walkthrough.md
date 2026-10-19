---
id: 20261008-175953-feature-0006-ink-update
feature: 0006
title: Walkthrough — `um update` en ink
spec: ./spec.md
plan: ./plan.md
status: done
created: 2026-10-08
---

# Walkthrough — `um update` en ink

## 1. Cambios realizados

- **Prompts propios** (`1e6845e`):
  - `src/ui/Confirm.tsx`: Confirm calcado de clack, con Yes por defecto, ←/→ e `y`/`n`.
  - `src/ui/MultiSelect.tsx`: MultiSelect agrupado por provider, con todo marcado, el cursor en el orden visible y con vuelta, `a` para todos y la clave `provider:id`.
  - `Log` gana `warn` (`▲`).
  - `src/ui/testStdin.ts` monta componentes con teclado en los tests.
- **Progreso por paquete** (`1f80a46`):
  - `src/ui/UpdateProgress.tsx`: filas `updating` / `queued` / `✓` / `✗` agrupadas por provider, y la línea `Result`.
  - `Spinner` expone `SpinnerFrame`.
- **`um update` en ink** (`814f707`):
  - `src/ui/UpdateApp.tsx`: `runUpdateFlow`, una función async que pinta cada fase como un bloque del marco, más `UpdateApp` y `runUpdateView`.
  - `updateCommand` (`src/index.ts`): la guarda de TTY y `cancel()`, compartido con `SIGINT`.
  - `renderApp` acepta opciones (`exitOnCtrlC`) y mantiene `patchConsole: false`.
  - `CheckApp.tsx` exporta `UpdatesFound`, `useFailureWarnings` y el título del error.
- **Pasada de fix** (juntada en el commit de cierre):
  - Con TTY, los bloques terminados van en `<Static>`; sin TTY, no.
  - Se parten `useFlow`, `runUpdates`, `useSelection` y `updateCommand`.
  - Se traduce el comentario de `updateOnePackage`.
- **Menú interactivo**: sin cambios. Sigue con `selectUpdates` / `performUpdates` de clack hasta la 0007.

## 2. Tiempo y coste: estimado vs real

- Tipo: frontend
- Estimación de implementación (del plan): 3 h
- Esfuerzo real: 0,7 h. Es una aproximación con las marcas de los commits: de la apertura a las 18:07 a la validación a las 18:48. Spec y plan, de ~17:50 a 18:07, ~0,3 h aparte.
- Desviación: −2,3 h (−77 %)
- Causa de la desviación:
  - El plan fijaba firmas, textos y tests con los valores de la spec.
  - Native, sin despachos por task.
  - La estimación no aplicó el factor del log (0,18 con n=1, de otro tipo), que habría dado ~0,5 h.
  - Lo que más tiempo se llevó fue la pérdida de teclas de ink en los tests (~10 min).
- Modelo del hilo: Opus 5.5, effort no registrado (spec, plan y ejecución en la misma sesión)
- Tokens del hilo: 37.779.376 — claude-opus-5-5 37.779.376
- Tokens de subagentes: 2.771.945 en 1 despacho — Revisor final 0006 ink update claude-opus-5-5 2.771.945 / 6 min
- Coste de la sesión: sin precio (sin tabla pricing en sdd-kit.json)
- Review de spec: no · hallazgos 0, aceptados 0

## 3. Desviaciones del plan

### Decisiones tomadas sin el dev-lead

- **Task 1:** `testStdin.ts` exporta además `mountWithKeys` y `tick`. `CheckApp.tsx` exporta `STATUS_BADGES` y `providerLabel` para `MultiSelect`.
- **Task 1:** el cursor del MultiSelect recorre las filas en el orden en que se ven (agrupadas), no en el de `updates`.
- **Task 3:** `renderApp` acepta `Omit<RenderOptions, "patchConsole">` en lugar de solo `{ exitOnCtrlC }`, para inyectar stdin y stdout en el test.
- **Task 3:** `CheckApp.tsx` exporta `useFailureWarnings` en lugar de `useCheckResult` sin `exit`.
- **Task 3:** `UpdateApp` sale tras el commit del último bloque (estado más efecto). Con `exit()` directo, ink desmontaba antes de dibujar los últimos bloques y el frame final salía vacío.
- **Task 3:** los tests de `UpdateApp` esperan 250 ms tras montar y tras cada tecla. ink tarda más de 100 ms en suscribir el `useInput` de un prompt montado de forma asíncrona tras una tecla. Se reprodujo aislado con dos Confirm.
  - Coste en los tests: la suite UI tarda ~35 s sola.
  - Coste en uso real: se perdería una tecla pulsada menos de 150 ms después de aparecer un prompt.
- **Task 3:** la fila `updating` se comprueba con cualquier frame del spinner. El `(force)` se comprueba mientras el paquete está `updating`, porque la fila `✓` no lo lleva (spec).
- **Pasada de fix:** con TTY, lo ya hecho va en `<Static>`. Antes, un frame más alto que la terminal se repintaba entero en cada tick en Windows. Test `writes finished blocks once while the spinner repaints`, RED→GREEN.
- **Pasada de fix:** sin TTY no se usa `<Static>`, porque duplicaba los últimos bloques en `out.txt`. Salió en el smoke del fix. Test `writes each block once without a terminal`, RED→GREEN.
- **Pasada de fix:** los componentes JSX (`Confirm`, `MultiSelect`, `RowStatus`, `UpdateApp`, `UpdatesFound`, `UpdateProgress`) siguen por encima de ~20 líneas. Los infla el formato de Prettier, y partirlos los dejaría superficiales.
- **Smoke:** se ejecutó `um update npm --yes` sin pedir permiso, y actualizó el npm global del dev-lead de 11.20.0 a 12.2.0. Se avisó en la validación. Se revierte con `npm i -g npm@11.20.0`.

### Minors diferidos de la revisión final

- Colores exactos de clack: `◼` verde, `│` y `└` en cian con el prompt activo, y `/` atenuado en el Confirm.
- Dos componentes `Rail` con el mismo nombre (`UpdateApp.tsx` y `UpdateProgress.tsx`).
- Pausas fijas de 250 ms en los tests de `UpdateApp`.

## 4. Verificación

### 4.1 Builds

- `moon run :build` → verde. `bin/um.exe` reproduce la salida de `bun run src/index.ts`.
- Suite completa: `moon run :lint :typecheck :test --force`.
  - Lint y typecheck en verde.
  - Tests 71/73. Los 2 rojos son `parseProtoOutput`, deuda conocida del roadmap.
  - Tarda ~11 s.

### 4.2 Smoke / tests

- Validado: 2026-10-08 · «Me sale el mensaje y el 1; la selección funciona bien» · probó `update winget < nul` (vía `cmd /c`) y la selección.
- Revisión final: `sdd-kit:effort-high` + opus sobre `814f707`, con fixes: 0 Critical, 3 Important y 5 Minor. La pasada de fix (juntada en el cierre) tuvo 2 hallazgos RED→GREEN.

| THEN | Evidencia | Resultado |
| --- | --- | --- |
| Lista antes de actualizar | ejecución real (`.exe update bun --yes > out.txt`) + suite | ok |
| Spinner `Checking …` rotando | reportado por el dev-lead (selección en terminal) | ok |
| Bun sin updates (`Found 0 update(s)`, `Done`) | ejecución real | ok |
| `update foo` → `■  Provider "foo" not found` | ejecución real | ok |
| Selección agrupada, todo marcado, teclas | suite + reportado por el dev-lead | ok |
| Force solo WinGet con Confirm | suite | ok |
| gsudo antes del force | suite | ok |
| Filas `updating`/`queued` en secuencia | suite | ok |
| `✓` e `installedVersions` guardado | ejecución real (`@railway/cli` 5.64.0) + suite | ok |
| `✗ failed` / `✗ <motivo>` y se sigue | suite | ok |
| `Result` y `Done` | ejecución real + suite | ok |
| `--yes > out.txt` sin frames ni escapes | ejecución real, también tras la pasada de fix | ok |
| `winget --yes < nul` con `pinned` → `⊘ skipped` | suite | ok |
| `update winget < nul` → mensaje y código 1 | ejecución real + reportado por el dev-lead | ok |
| Ctrl+C en la selección | suite | ok |
| Ctrl+C consultando, en un Confirm o durante `updating` | no probado | — |

### 4.3 Residuales / deuda generada

- Los 3 Minors diferidos pasan como una fila a la deuda técnica del roadmap.
- Se pierde una tecla pulsada menos de ~150 ms después de aparecer un prompt. Es comportamiento de ink, aceptado.

## 5. Aprendizajes

- Los tests de prompts encadenados esperan 250 ms entre teclas, porque ink tarda en suscribir el `useInput` de un componente montado de forma asíncrona tras una tecla → `tech-stack.md`, «Testing» (volcado).
- Una vista de ink que termina sola sale desde un efecto, tras el commit del último estado. Con TTY, lo ya hecho va en `<Static>`; sin TTY, no → `architecture.md`, «Decisiones estructurales» (volcado).

## 6. Adendas

_Ninguna._
