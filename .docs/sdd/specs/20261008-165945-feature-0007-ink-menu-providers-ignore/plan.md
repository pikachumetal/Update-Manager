---
id: 20261008-165945-feature-0007-ink-menu-providers-ignore
feature: 0007
title: Plan de implementación — Menú interactivo, `providers` e `ignore` en ink; fuera `@clack/prompts`
spec: ./spec.md
status: draft
created: 2026-10-08
---

# Plan de implementación — Menú interactivo, `providers` e `ignore` en ink; fuera `@clack/prompts`

## Decisiones que he tomado yo — valida estas

1. **Modelo y effort.** En Native, las tres tasks las hace la sesión y no se despacha nada por task. El revisor final de rama va con `subagent_type: sdd-kit:effort-high` + `model: opus`.
2. **Ejecución: Native.** Son 3 tasks en cadena (la 2 monta los prompts de la 1 y la 3 borra lo que la 2 deja sin uso), con poco código y el diseño fijado aquí.
3. **El menú llama a los comandos, no a las vistas.** «Check for updates» llama a `checkCommand()`, «Update all» a `updateCommand()` y «Update by provider» a `updateCommand(<id>)`. Ya montan la vista de ink, guardan `lastCheck` y resuelven Ctrl+C. Para que la guarda sea literalmente la misma, sale de `updateCommand` una función `isInteractive()`.
4. **Un prompt suelto es una app de ink de un solo uso.** `runPrompt` monta el prompt con `exitOnCtrlC: false`. Al responder, lo sustituye por el `Answer` y sale tras el commit, con el patrón de la 0006. Con Ctrl+C devuelve `undefined`, e `index.ts` llama a `cancel()`.
5. **El núcleo de teclado de `MultiSelect` pasa a ser un hook sobre claves de texto** (`useCheckList`). `MultiSelect` (agrupado) y `CheckList` (plano, nuevo) lo usan. La API de `MultiSelect` y sus tests de la 0006 no cambian.
6. **Lo que el menú escribe fuera de un prompt** (`Intro`, `▲  No providers available`, `◆  Providers updated` y `└  Bye! 👋`) se imprime con `renderToString`, como `printCheckError`. `index.ts` sigue sin JSX.
7. **El error de `required`** se dibuja en la línea de cierre, como clack: `└  Please select at least one option.`, en amarillo.
8. **Riesgo:** al desmontar un prompt y montar la vista siguiente, una tecla pulsada en ese hueco se pierde. Es el mismo comportamiento de ink aceptado en la 0006, y no se mitiga.
9. **Coste estimado:** ~1 h de implementación y un revisor final Opus, del orden de 100-150k tokens.
10. **Review Focus:** 5 entradas que la spec no fija, con su comportamiento esperado; ver la sección.

**Goal**: Pasar `um` a secas y sus submenús a ink con prompts propios, y quitar `@clack/prompts` y el código que deja sin uso.

**Architecture**: Prompts planos en `src/ui/` (`Select`, `CheckList`) y `runPrompt`, que monta cada prompt como una app de ink de un solo uso, con la respuesta escrita y Ctrl+C. `src/ui/menu.tsx` define los textos y opciones del menú y de providers, sin lógica de config. `interactiveMode` en `index.ts` hace de bucle: llama a los prompts y a los comandos `check` y `update`, que ya van en ink.

**Tech Stack**: Bun 1.4.2, TypeScript 6.0.3, ink 8.0.0, React 19.3.0, picocolors 1.1.1.

**Spec**: `./spec.md`

**Ejecución**: native, la recomienda el handoff de `writing-plans` (`execution: auto` en sdd-kit.json): 3 tasks en cadena con interfaces compartidas y poco código. Si esta sesión se retomó tras una compactación (empieza por «This session is being continued from a previous conversation») y quedan dos o más tasks sin su línea `complete` en el ledger, no las hagas tú: despacha las que quedan con subagent-driven-development sobre el mismo ledger. La sesión que ejecuta va bien en gama media (Sonnet, effort medium); el modelo más capaz se reserva para la revisión final.

## Restricciones globales

### De código

- Sin dependencias nuevas. Se quita `@clack/prompts` y no entra nada. Versiones exactas (`bunfig.toml`, `install.exact = true`).
- Los comandos externos pasan siempre por `runCommand` / `runPowerShell` (`src/runner.ts`). `src/runner.ts` no se modifica.
- `renderApp` monta siempre con `patchConsole: false`.
- Textos literales de la CLI, en inglés:
  - Menú: `Update Manager`, `What would you like to do?`, `🔍 Check for updates`, `🔄 Update all`, `📦 Update by provider`, `⚙️  Manage providers` (dos espacios), `🚪 Exit` y `Bye! 👋`.
  - Provider: `Select provider to update`, `<icono> <nombre>` y `No providers available`.
  - Providers: `Toggle providers (space to select, enter to confirm)`, el bloque respondido `Toggle providers`, `(enabled)`, `(disabled)`, `(not installed)`, `not available`, `Please select at least one option.` y `Providers updated`.
  - Guarda: `Interactive terminal required (see um --help)`, por stderr. Ctrl+C: `Cancelled`.
- Símbolos calcados del marco: `┌`, `│` y `└` en gris; `◇` verde, `◆` cian en un prompt activo; `●` verde y `○` atenuado en el Select; `◼` cian y `◻` atenuado en las listas. Dos espacios entre el símbolo del marco y el mensaje.
- `providers`, `ignore`, `unignore` e `ignored` (`providersCommand`, `ignoreCommand`, `unignoreCommand` y `listIgnoredCommand`) no se tocan.
- Código e identificadores en inglés. Comentarios en español, solo el porqué que el código no dice. Sin comentarios que repitan el código ni que citen documentos (constitution, spec, task, capacidad).
- Cero refactor oportunista: solo se toca lo que nombra cada task. `index.ts` no se parte.
- Umbrales de alerta: funciones de ~20 líneas, ≤3 parámetros y anidamiento ≤3.

### De proceso

- Native: la sesión implementa con `superpowers:executing-plans` y su ledger. El revisor final va con `sdd-kit:effort-high` + `opus`.
- Commits en Conventional Commits, con tipo y scope en inglés y título y cuerpo en castellano, terminados con `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

- Select con una sola opción (un único provider activo) → ↑/↓ no lo mueven y Enter lo elige · Task 1, `keeps the cursor with a single option`.
- Ctrl+C mientras corre la vista de check dentro del menú, después de que un prompt soltara el raw mode → `Cancelled` y código 0 por el `SIGINT` global · Task 2, smoke en terminal.
- «Update all» sin updates → `◇  Found 0 update(s)` y `└  Done`, y debajo vuelve el menú, no sale · Task 2, smoke (lo de dentro de la vista lo fija `UpdateApp.test.tsx`).
- `config.json` con un provider que ya no está en el registro → «Manage providers» lo ignora: solo lista y guarda los ids del registro, como `develop` · Task 2, `lists only registered providers` en `menu.test.tsx`.
- Desmarcar con espacio hasta dejar la lista vacía (no con `a`) y pulsar Enter → el mismo aviso `required` · Task 1, `refuses an empty submit when required`.

---

## Phase -1 — Pre-Implementation Gates

- [x] **Simplicity gate**: el menú reutiliza `checkCommand` y `updateCommand` tal cual. Los prompts son apps de un solo uso, sin máquina de estados.
- [x] **YAGNI gate**: `Select` lo usan el menú y el select de provider (2 usos), y `CheckList`, «Manage providers» (1 uso). El hook `useCheckList` tiene 2 usos y evita duplicar el teclado.
- [x] **Brownfield gate**: `config.json` no cambia de forma. Los comandos sin TTY no se tocan. `update-check` y `package-update` no cambian.
- [x] **Constitution check**: art. I (los comandos no cambian), II (dibujo en `src/ui/`, comando en `index.ts`), III (solo lo de la spec), IV (la migración la justifica la proposal 0004), V (`runCommand`) y VIII (la selección de `update` sigue igual).

---

## 1. Decisiones técnicas

### 1.1 Estructura de ficheros

**Crear**:

- `src/ui/Select.tsx` y `src/ui/Select.test.tsx`.
- `src/ui/prompt.tsx` y `src/ui/prompt.test.tsx`: `PromptApp` y `runPrompt`.
- `src/ui/menu.tsx` y `src/ui/menu.test.tsx`: opciones y textos del menú, del select de provider y de «Manage providers», más los `print*`.

**Modificar**:

- `src/ui/MultiSelect.tsx` (+ test): `useCheckList` y `CheckList`.
- `src/ui/frame.tsx` (+ test): recibe `Answer` desde `UpdateApp.tsx`; comentario y nombre de test sin «clack».
- `src/ui/UpdateApp.tsx`: importa `Answer` de `frame.tsx`.
- `src/index.ts`: `isInteractive`, `interactiveMode`, `updateByProviderInteractive` y `providersInteractive` en ink; se borran `checkInteractive`, `checkAllProviders`, `formatStatus`, `displayUpdates`, `selectUpdates`, `updateInteractive` y `performUpdates`.
- `package.json` y `bun.lock`: fuera `@clack/prompts`.
- `.docs/sdd/tech-stack.md`, `.docs/sdd/architecture.md` y `.docs/sdd/mission.md`.

**NO se tocan**:

- `src/runner.ts`, `src/providers/*`, `src/config.ts`, `src/types.ts`, `src/ui/CheckApp.tsx` y `src/ui/UpdateProgress.tsx`.
- En `src/index.ts`: `providersCommand`, `ignoreCommand`, `unignoreCommand`, `listIgnoredCommand`, `checkCommand`, `collectUpdates` y `updateViewOptions`.

### 1.5 UX

La de los escenarios de la spec. Cada prompt deja escrita su respuesta. Cada vista de check o update abre y cierra su marco, y debajo vuelve el menú.

### 1.6 Dependencias

Se quita `@clack/prompts` 1.8.1. No entra ninguna.

### 1.7 Riesgos

| Riesgo | Probabilidad | Impacto | Mitigación |
| --- | --- | --- | --- |
| Tras desmontar un prompt, stdin queda en raw mode y Ctrl+C en la vista de check no llega como `SIGINT` | baja | medio | Review Focus: smoke de Ctrl+C durante el check del menú |
| Se pierde una tecla pulsada justo al cambiar de prompt | media | bajo | Aceptado (0006). Tests con 250 ms tras cada tecla que monta otro prompt |
| `bun remove` cambia otras entradas de `bun.lock` | baja | bajo | Revisar el diff de `bun.lock`: solo debe salir clack y sus dependencias |

### 1.8 Rollout

Directo: `moon run :build` y `bin\um.exe` en la máquina del autor.

### 1.9 Excepciones a la constitution

Ninguna.

---

## 2. Tasks

### Task 1 — Prompts planos: Select, CheckList y runPrompt

**Modelo**: Native, la sesión (effort: el de la sesión).
**Tests RED**: hilo principal, TDD · `src/ui/Select.test.tsx`, `src/ui/MultiSelect.test.tsx` (casos nuevos de `CheckList`) y `src/ui/prompt.test.tsx`.
**Superficies**: frontend (src/ui).
**Verificación**: `sh -c 'bun test src/ui && bun run typecheck && bun run lint && echo ok'`
**Se prueba en la aplicación**: no, porque es base común: los prompts aún no los monta nada; lo hace la Task 2.

**Interfaces**:
- Consume: `mountWithKeys`, `tick` (`src/ui/testStdin.ts`) y `renderApp(node, options)` (`src/ui/render.tsx`).
- Produce:
  - `Select.tsx`: `interface SelectOption<T> { value: T; label: string }` y `function Select<T>(props: { message: string; options: SelectOption<T>[]; onSubmit: (value: T) => void })`.
  - `MultiSelect.tsx`: `interface CheckOption<T> { value: T; label: ReactNode; hint?: string; checked: boolean }`; `function CheckList<T>(props: { message: string; options: CheckOption<T>[]; required?: boolean; onSubmit: (selected: T[]) => void })`; `MultiSelect` con la misma API que en la 0006.
  - `frame.tsx`: `function Answer(props: { question: string; answer: string })`, movido sin cambios desde `UpdateApp.tsx`.
  - `prompt.tsx`: `function runPrompt<T>(prompt: (submit: (value: T) => void) => ReactElement, answer: (value: T) => { question: string; answer: string }): Promise<T | undefined>` (`undefined` = Ctrl+C) y `PromptApp`, el componente que monta, exportado para el test.

**Ficheros**: crear `src/ui/Select.tsx`, `src/ui/Select.test.tsx`, `src/ui/prompt.tsx`, `src/ui/prompt.test.tsx`; modificar `src/ui/MultiSelect.tsx`, `src/ui/MultiSelect.test.tsx`, `src/ui/frame.tsx`, `src/ui/UpdateApp.tsx`.

- [ ] **Step 1: Tests RED de `Select`**, con tres opciones `A`, `B`, `C` y el mensaje `Pick`:
  - `draws the options with the first one active`: `last()` es `["│", "◆  Pick", "│  ● A", "│  ○ B", "│  ○ C", "└"]`.
  - `wraps the cursor around`: `UP` y Enter → `submitted` es `["c"]`; `DOWN ×3` y Enter → `["a"]`.
  - `keeps the cursor with a single option`: con una opción, `DOWN`, `UP` y Enter → `["a"]`.
- [ ] **Step 2: Tests RED de `CheckList`** en `MultiSelect.test.tsx`, con opciones `WinGet` (checked), `Proto` (checked) y `Chocolatey` (sin marcar, `hint: "not available"`):
  - `draws a flat list with the initial checks`: `["│", "◆  Toggle", "│  ◼ WinGet", "│  ◼ Proto", "│  ◻ Chocolatey", "└"]`.
  - `shows the hint on the active row`: `DOWN DOWN` → la fila es `│  ◻ Chocolatey (not available)` y las demás sin hint.
  - `submits the checked values in list order`: `DOWN`, espacio (desmarca Proto), `DOWN`, espacio (marca Chocolatey) y Enter → `["winget", "chocolatey"]`.
  - `toggles all with a`: `a` → todas `◻`; `a` otra vez → todas `◼`.
  - `refuses an empty submit when required`: con `required`, espacio, `DOWN`, espacio y Enter → nada en `submitted` y la última línea es `└  Please select at least one option.`; un espacio después la quita.
- [ ] **Step 3: Tests RED de `PromptApp`**, con un `Select` dentro:
  - `writes the answer after submit`: Enter → el frame final contiene `◇  Pick` y `│  A`, ya sin las opciones, y `onDone` recibe `"a"`.
  - `cancels on Ctrl+C`: `"\u0003"` → `onDone` recibe `undefined`.
- [ ] **Step 4: Implementación.**
  - `Select`: la forma de `Confirm`. Fila activa `<Text color="green">●</Text> label`; el resto, `<Text dimColor>○ label</Text>`. `useInput` con `isActive: isRawModeSupported`.
  - `useCheckList(keys: string[], initial: string[], onSubmit: (checked: Set<string>) => void, required = false)` devuelve `{ cursor, checked, error }`. Agrupa el cursor con vuelta, espacio, `a` y Enter que hoy viven en `useChecked` y `useSelection`. `error` se pone a `true` con un Enter vacío y `required`, y vuelve a `false` con la siguiente tecla.
  - `MultiSelect` pasa sus claves `provider:id` en orden visible.
  - `CheckList` usa el índice como clave. Fila: `│  ◼ label`; la activa con el label en cian y ` (hint)` atenuado.
  - `PromptApp({ prompt, answer, onDone })`: estado `answered`. Tras el commit de `Answer`, `onDone(value)` y `exit()` desde un efecto. Ctrl+C con `useInput`: `onDone(undefined)` y `exit()`.
  - `runPrompt` monta `PromptApp` con `renderApp(..., { exitOnCtrlC: false })`.
  - `Answer` pasa a `frame.tsx`, y `UpdateApp.tsx` lo importa de ahí.
- [ ] **Step 5: Verificación**: el comando de «Verificación». Esperado: `ok`. Los tests de la 0006 (`MultiSelect`, `UpdateApp`) siguen en verde sin cambios.
- [ ] **Step 6: Commit**: `feat(ui): añadir Select, CheckList y runPrompt propios en ink`.

### Task 2 — `um` a secas y sus submenús en ink

**Modelo**: Native, la sesión (effort: el de la sesión).
**Tests RED**: hilo principal, TDD · `src/ui/menu.test.tsx`. El bucle de `index.ts` no tiene tests (tech-stack, «Testing»): smoke.
**Superficies**: frontend (src/ui, src/index.ts).
**Verificación**: `sh -c 'bun test src/ui && bun run typecheck && bun run lint && echo ok'` + el smoke del Step 5.
**Se prueba en la aplicación**: sí. `bun run src/index.ts` en una terminal: el menú con sus 5 opciones; «Check for updates» deja el informe y vuelve el menú; «Exit» → `└  Bye! 👋`; `bun run src/index.ts < nul` → `Interactive terminal required (see um --help)` y código 1.

**Interfaces**:
- Consume: `Select`, `SelectOption`, `CheckList`, `CheckOption` y `runPrompt` (Task 1); `Intro`, `Log`, `LogKind` y `Outro` (`frame.tsx`); `renderToString` de ink.
- Produce, en `src/ui/menu.tsx`:
  - `type MenuAction = "check" | "update" | "updateProvider" | "providers" | "exit"` y `MENU_OPTIONS: SelectOption<MenuAction>[]`, con los labels de la spec en orden.
  - `runMenu(): Promise<MenuAction | undefined>`.
  - `runProviderSelect(list: UpdateProvider[]): Promise<UpdateProvider | undefined>`. Mensaje `Select provider to update`, label `<icono> <nombre>`.
  - `interface ProviderRow { provider: UpdateProvider; enabled: boolean; installed: boolean }` y `toggleOptions(rows: ProviderRow[]): CheckOption<string>[]`. El label es `<icono> <nombre> <estado>`: `(not installed)` atenuado si no está instalado, `(enabled)` en verde si está activo y `(disabled)` atenuado si no. `hint: "not available"` si no está instalado, y `checked` = `enabled`.
  - `runProvidersToggle(rows: ProviderRow[]): Promise<string[] | undefined>`. Mensaje `Toggle providers (space to select, enter to confirm)`, con `required`. La respuesta es `Toggle providers` / los nombres marcados unidos con `, `.
  - `printIntro(title: string): void`, `printLog(kind: LogKind, text: string): void` y `printOutro(text: string): void`, con `renderToString` + `"\n"` a stdout.

**Ficheros**: crear `src/ui/menu.tsx`, `src/ui/menu.test.tsx`; modificar `src/index.ts`.

- [ ] **Step 1: Tests RED de `menu.tsx`**:
  - `draws the main menu`: `Select` con `MENU_OPTIONS` y el mensaje del menú → `["│", "◆  What would you like to do?", "│  ● 🔍 Check for updates", "│  ○ 🔄 Update all", "│  ○ 📦 Update by provider", "│  ○ ⚙️  Manage providers", "│  ○ 🚪 Exit", "└"]`.
  - `labels providers by state`: `toggleOptions` con WinGet activo e instalado, npm instalado y desactivado, y Chocolatey sin instalar → `CheckList` dibuja `│  ◼ 📦 WinGet (enabled)`, `│  ◻ 📦 npm (global) (disabled)` y `│  ◻ 🍫 Chocolatey (not installed)`, y Chocolatey lleva `hint: "not available"`.
  - `lists only registered providers`: la función que arma las filas en `index.ts` sale de `providers`, no de `config.providers`. Se fija revisando la Task 2: `toggleOptions` recibe filas ya armadas, y este test comprueba que `toggleOptions` devuelve una opción por fila y en su orden.
- [ ] **Step 2: Implementación de `menu.tsx`** con las firmas de «Produce».
- [ ] **Step 3: `src/index.ts`.**
  - `isInteractive(): boolean` = `Boolean(process.stdin.isTTY && process.stdout.isTTY)`; `updateCommand` lo usa.
  - `interactiveMode()`. Sin TTY: `console.error("Interactive terminal required (see um --help)")`, `process.exitCode = 1` y return. Si no, `console.clear()`, `printIntro("Update Manager")` y el bucle:
    - `runMenu()`: `undefined` → `cancel()`; `exit` → `printOutro("Bye! 👋")` y `process.exit(0)`.
    - `check` → `checkCommand()`; `update` → `updateCommand()`.
    - `updateProvider` → `updateByProviderInteractive()`; `providers` → `providersInteractive()`.
  - `updateByProviderInteractive()`: los activos con `isAvailable()`, como hoy. Sin ninguno → `printLog("warn", "No providers available")`. Si no, `runProviderSelect`: `undefined` → `cancel()`; si hay elegido → `updateCommand(provider.id)`.
  - `providersInteractive()`: las filas de `Object.entries(providers)` con `config.providers[id]?.enabled ?? false` y `getAvailableProviders()`. `runProvidersToggle`: `undefined` → `cancel()`. Si no, `toggleProvider(id, ids.includes(id))` para cada id del registro, y `printLog("success", "Providers updated")`.
- [ ] **Step 4: Verificación**: el comando de «Verificación». Esperado: `ok`.
- [ ] **Step 5: Smoke** con `bun run src/index.ts`. En terminal: el menú, «Check for updates» y vuelta al menú, «Exit». Sin TTY: `cmd /c "bun run src/index.ts < nul"` → mensaje y `%ERRORLEVEL%` 1.
- [ ] **Step 6: Commit**: `feat(menu): dibujar el menú interactivo y Manage providers con ink`.

### Task 3 — Fuera `@clack/prompts` y docs

**Modelo**: Native, la sesión (effort: el de la sesión).
**Tests RED**: no aplica (borrado); la red es la suite y `grep`.
**Superficies**: frontend (src), tooling (package.json, bun.lock), docs.
**Verificación**: `sh -c 'bun test src/ui && bun run typecheck && bun run lint && ! grep -rn clack src && echo ok'`
**Se prueba en la aplicación**: sí. `bun run src/index.ts` abre el menú igual que tras la Task 2, y `bun pm ls` no lista `@clack/prompts`.

**Interfaces**:
- Consume: el `index.ts` de la Task 2.
- Produce: nada.

**Ficheros**: modificar `src/index.ts`, `src/ui/frame.tsx`, `src/ui/frame.test.tsx`, `package.json`, `bun.lock`, `.docs/sdd/tech-stack.md`, `.docs/sdd/architecture.md`, `.docs/sdd/mission.md`.

- [ ] **Step 1: Borrar** de `src/index.ts` el import de clack, `checkInteractive`, `checkAllProviders`, `formatStatus`, `displayUpdates`, `selectUpdates`, `updateInteractive`, `performUpdates`, y los imports que queden sin uso (lint).
- [ ] **Step 2: `bun remove @clack/prompts`** y revisar que el diff de `bun.lock` solo quita clack y sus dependencias.
- [ ] **Step 3: Quitar «clack» de `src/`**:
  - `frame.tsx`: el comentario pasa a `// Símbolos y colores del marco de la CLI: cada vista abre con ┌ y cierra con └`.
  - `frame.test.tsx`: el test pasa a llamarse `draws the intro`.
- [ ] **Step 4: Docs.**
  - `tech-stack.md`: la fila «UI de terminal» dice que toda la CLI va en ink y enlaza `interactive-menu` y `settings`; se borra la fila «UI de terminal (en retirada)».
  - `architecture.md`:
    - La pieza `src/index.ts` deja de decir «menús (@clack/prompts)».
    - La fila `src/ui/*.tsx` nombra los prompts (`Select`, `CheckList`, `MultiSelect`, `Confirm`) y `runPrompt`.
    - En «Flujo principal», el paso 1 dice que el menú es un bucle de `runMenu`, los pasos 2-5 ya no nombran `checkAllProviders`, `displayUpdates`, `selectUpdates` ni `performUpdates`, y el paso 3 conserva que el filtrado no se aplica a `<provider>`.
    - La decisión estructural de @clack/prompts se marca superada por ink (proposal 0004, feature 0007).
  - `mission.md`: «Bun + @clack/prompts» pasa a «Bun + ink».
- [ ] **Step 5: Verificación**: el comando de «Verificación». Esperado: `ok`, y `grep` sin salida.
- [ ] **Step 6: Commit**: `chore(deps): quitar @clack/prompts y el código que dejaba sin uso`.

---

## Estimación y esfuerzo

- Tipo: frontend
- Esfuerzo spec + plan: 0,5 h
- Estimación de implementación: 1 h
- Base de la estimación: 3 tasks; ~4 h en bruto por el método de la 0006, × factor 0,23 de frontend (n=1) ≈ 0,9 h, redondeado a 1 h por el smoke del menú en terminal real.
- Confianza: media

---

## 3. Validación final

- [ ] Gate de cierre, una vez y en el hilo principal: `moon run :lint :typecheck :test --force` (2 rojos conocidos de `parseProtoOutput`) y `moon run :build`.
- [ ] Smoke con `.\bin\um.exe`:
  - En terminal: cada opción del menú y Ctrl+C.
  - `um < nul`: código 1 y el mensaje.
  - Sin TTY, con `> out.txt`: `providers`, `ignore Smoke.Test`, `ignored` y `unignore Smoke.Test`.
- [ ] Spec satisfecha: cada requisito tiene su task (§4).
- [ ] Cierre de rama según el flujo del proyecto (`sdd-end-feature`).

---

## 4. Self-review (cobertura spec → tasks)

- Menú principal (dibujo, cursor, respuesta) → Task 1 (`Select`, `PromptApp`) + Task 2 (`draws the main menu`). ✓
- Check desde el menú → Task 2 (`checkCommand()`), smoke. ✓
- Update all desde el menú → Task 2 (`updateCommand()`), smoke. ✓
- Update by provider (select de activos e instalados, `No providers available`) → Task 2, smoke. ✓
- Salir (`Bye! 👋`, código 0) → Task 2, smoke. ✓
- Sin TTY → Task 2 (`isInteractive`), smoke `< nul` y `> out.txt`. ✓
- Ctrl+C cancela → Task 1 (`cancels on Ctrl+C`) + Task 2 (`cancel()`), smoke. ✓
- Activar y desactivar providers desde el menú → Task 1 (`CheckList`, `required`) + Task 2 (`labels providers by state`, `providersInteractive`). ✓
- Listar providers sin TTY, `enable`/`disable`, ignore/unignore/ignored → N/A en código (no se tocan, decisión 9); smoke de §3. ✓
- Fuera clack y docs → Task 3. ✓
- Review Focus: una opción → Task 1, `keeps the cursor with a single option` ✓ · Ctrl+C en el check del menú → smoke ✓ · Update all sin updates → smoke ✓ · providers fuera del registro → Task 2 ✓ · lista vaciada con espacio → Task 1, `refuses an empty submit when required` ✓
