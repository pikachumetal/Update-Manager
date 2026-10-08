---
id: 20261008-165945-feature-0007-ink-menu-providers-ignore
feature: 0007
title: Walkthrough — Menú interactivo, `providers` e `ignore` en ink; fuera `@clack/prompts`
spec: ./spec.md
plan: ./plan.md
status: done
created: 2026-10-08
---

# Walkthrough — Menú interactivo, `providers` e `ignore` en ink; fuera `@clack/prompts`

## 1. Cambios realizados

- **Prompts planos** (`5d0ede4`):
  - `src/ui/Select.tsx`: Select propio, con `●` verde y `○` atenuado, ↑/↓ con vuelta y Enter.
  - `src/ui/MultiSelect.tsx`: el teclado pasa a `useCheckList`, que comparten `MultiSelect` (agrupado, con la API de la 0006) y `CheckList` (plano, con `hint` y `required`).
  - `src/ui/prompt.tsx`: `runPrompt` monta un prompt como app de un solo uso, deja escrita la respuesta y devuelve `undefined` con Ctrl+C.
  - `Answer` pasa de `UpdateApp.tsx` a `frame.tsx`.
- **Menú en ink** (`e3961a7`):
  - `src/ui/menu.tsx`: opciones y textos del menú, del select de provider y de «Manage providers», y `printIntro`, `printLog` y `printOutro`.
  - `src/index.ts`: `interactiveMode` exige TTY (`isInteractive()`, la misma guarda que `updateCommand`) y repite `runMenu`. Las opciones llaman a `checkCommand`, `updateCommand` y a los submenús.
  - Se borran `checkInteractive`, `checkAllProviders`, `formatStatus`, `displayUpdates`, `selectUpdates`, `updateInteractive`, `performUpdates` y el import de clack.
- **Fuera clack** (`b2833ab`): `@clack/prompts` sale de `package.json` y de `bun.lock` (con `@clack/core`, `fast-*` y `sisteransi`). `tech-stack.md`, `architecture.md` y `mission.md` dicen que la UI de terminal es ink.
- **`providers`, `ignore`, `unignore` e `ignored`**: sin cambios. Ya no usaban clack y funcionaban sin TTY.

## 2. Tiempo y coste: estimado vs real

- Tipo: frontend
- Estimación de implementación (del plan): 1 h
- Esfuerzo real: 1,25 h. Es una aproximación con las marcas de los commits: de la apertura a las 19:05 a la validación a las ~20:20. Spec y plan, de ~18:45 a 19:05, ~0,35 h aparte.
- Desviación: +0,25 h (+25 %)
- Causa de la desviación (por debajo del umbral, se anota igual): la CPU al 90 % por un juego abierto. La suite UI pasó de ~13 s a casi 5 min, y hubo que separar los timeouts de los fallos reales (~15 min).
- Modelo del hilo: Opus 5.5, effort no registrado (spec, plan y ejecución en la misma sesión)
- Tokens del hilo: 18.725.938 — claude-opus-5-5 18.725.938
- Tokens de subagentes: 2.018.193 en 1 despacho — Revisor final 0007 ink menu claude-opus-5-5 2.018.193 / 5 min
- Coste de la sesión: sin precio (sin tabla pricing en sdd-kit.json)
- Review de spec: no · hallazgos 0, aceptados 0

## 3. Desviaciones del plan

### Decisiones tomadas sin el dev-lead

- **Task 1:** el test `CheckList > toggles all with a` esperaba `◻` con la primera `a`. Con 2 de 3 marcados, `a` marca todos (la regla de la 0006 y de clack), así que se corrigió el orden esperado en el test.
- **Task 1:** Prettier colapsa los dos espacios del texto JSX `└  Please select at least one option.`, por eso va como expresión de cadena.
- **Task 1:** la máquina iba al 90 % de CPU durante la ejecución (un juego abierto). Los tests de teclado se verificaron con `--timeout 30000`. `UpdateApp > offers gsudo before forcing` rebasa su tope propio de 15 s también en la base `9ede153` (16,4 s).
- **Task 2:** el borrado de las funciones de clack pasó de la Task 3 a la 2. Al dejar de llamarlas, `tsc` fallaba en cascada por `noUnusedLocals`.
- **Task 2:** el smoke del Step 5 se hizo solo sin TTY. El menú en terminal no lo puede teclear la sesión, y queda para el guion de validación.
- **Task 3:** el `grep` de clack se ejecutó aparte del comando de `task-done`, porque el chequeo de borrados del harness no podía analizar el `sh -c`.
- **Revisión final, Important 1:** `Select` (~45 líneas), `CheckList` (~44) y `useCheckList` (26 líneas y 4 parámetros) siguen por encima del umbral. Es el mismo criterio que la 0006: Prettier infla los JSX y partirlos los deja superficiales. Compartir la cabecera `│`/`◆` tocaría los componentes de la 0006, y la firma de 4 parámetros la fija el plan.
- **Revisión final, Important 2:** el Ctrl+C dentro del check del menú y «Update all» sin updates no los podía probar la sesión en una terminal real. Pasaron a los pasos 3 y 5 del guion de validación.
- **Revisión final, Minor 4:** la frase de `architecture.md` sobre dónde va una opción nueva del menú se corrigió en `aa52fa3` (solo docs, revisado en el hilo).

### Minors diferidos de la revisión final

- `lists only registered providers` (`menu.test.tsx`) prueba el mapeo 1:1 de `toggleOptions`, no el filtrado del registro. Debería renombrarse a `maps one option per row in order`.
- El test RED `toggles all with a` cambió su aserción por ruling (Task 1).
- `PromptApp` tiene ~21 líneas útiles.
- El efecto de `PromptApp` depende de `onDone`, una flecha nueva en cada render. Un re-render tras responder repite `onDone` y `exit()`, sin efecto visible. Se evitaría con un ref.

## 4. Verificación

### 4.1 Builds

- `moon run :build` → verde. Genera `bin/um.exe` sin `@clack/prompts`.
- Suite completa: `moon run :lint :typecheck :test --force`.
  - Lint y typecheck en verde.
  - Tests 84/86. Los 2 rojos son `parseProtoOutput`, deuda conocida del roadmap.
  - Tarda ~13 s, ya sin carga de CPU.
- `grep clack src`: sin coincidencias.

### 4.2 Smoke / tests

- Validado: 2026-10-08 · «ok, probado» · no detalló qué probó. Respondió a la pregunta de validación tras el guion de 8 pasos: menú, check, Ctrl+C en el check, update by provider, update all cancelado, Manage providers, Exit y `< nul`.
- Revisión final: `sdd-kit:effort-high` + opus sobre `b2833ab`, «With fixes»: 0 Critical, 2 Important (resueltos por ruling) y 5 Minor. No hubo pasada de fix de código. `aa52fa3` (solo docs) se revisó en el hilo.

| THEN | Evidencia | Resultado |
| --- | --- | --- |
| Menú principal (dibujo, cursor con vuelta, respuesta escrita) | suite + reportado por el dev-lead | ok |
| Check desde el menú | reportado por el dev-lead | ok |
| Update all desde el menú | reportado por el dev-lead | ok |
| Update by provider | reportado por el dev-lead | ok |
| Salir (`Bye! 👋`, código 0) | reportado por el dev-lead | ok |
| `um < nul` → mensaje y código 1 | ejecución real (`bin/um.exe`) | ok |
| `um > out.txt` → mensaje y código 1 | ejecución real (`bun run`) | ok |
| Ctrl+C cancela | suite + reportado por el dev-lead | ok |
| Activar y desactivar providers desde el menú | suite + reportado por el dev-lead | ok |
| `um providers > out.txt` | ejecución real | ok |
| `ignore`, `ignored` y `unignore` con `> out.txt` | ejecución real; `config.json` queda con el mismo hash | ok |
| `providers enable/disable` | no probado (no se ejecutó contra la config del dev-lead); el código no cambia | — |

### 4.3 Residuales / deuda generada

- Los 4 Minors diferidos pasan como una fila a la deuda técnica del roadmap.
- En la máquina del autor, `config.json` tiene WinGet `enabled: false`. Probablemente explica la deuda «`um check` no lista WinGet».

## 5. Aprendizajes

- Prettier colapsa los espacios repetidos del texto JSX. Un literal que los necesita (`└  …`) va como expresión de cadena → `tech-stack.md`, «Testing» (volcado).
- Los tests de teclado de ink dependen de pausas fijas. Con la CPU cargada, rebasan el tope de 5 s de `bun test`, y hay que distinguir el timeout del fallo con `--timeout 30000` → `tech-stack.md`, «Testing» (volcado).
- Una opción nueva del menú va en `MENU_OPTIONS` y `runMenuAction` → `architecture.md`, «Dónde va lo nuevo» (volcado en `aa52fa3`).
- Revisión de skills: no aplica, el proyecto no tiene `.claude/skills/`.

## 6. Adendas

_Ninguna._
