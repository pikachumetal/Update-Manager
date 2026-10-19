---
id: 20261008-175953-feature-0006-ink-update
feature: 0006
title: Plan de implementación — `um update` en ink
spec: ./spec.md
status: draft
created: 2026-10-08
---

# Plan de implementación — `um update` en ink

## Decisiones que he tomado yo — valida estas

1. **Modelo y effort.** En Native, las tres tasks las hace la sesión y no hay despacho por task. El revisor final de rama va con `subagent_type: sdd-kit:effort-high` + `model: opus`.
2. **Ejecución: Native.** Son 3 tasks en cadena: la 3 monta los prompts de la 1 y el progreso de la 2. Hay poco código, y el diseño está en el plan.
3. **El flujo es una función async que pinta por bloques.** `runUpdateFlow` avanza fase a fase. Cada fase hecha queda en una lista de bloques ya dibujados, y la fase viva (spinner, prompt o progreso) es un único nodo activo que se sustituye. Así el marco crece hacia abajo como en clack y la lógica de fases se lee de arriba abajo. No hace falta una máquina de estados en React.
4. **Los prompts no dibujan su estado «respondido».** `MultiSelect` y `Confirm` llaman a `onSubmit` y el flujo añade el bloque `◇  <mensaje>` + `│  <respuesta>`. Al pasar a bloque, el prompt se desmonta y perdería su estado.
5. **Ctrl+C.** `renderApp` gana un segundo parámetro opcional, `options?: { exitOnCtrlC?: boolean }`, que se pasa a `render`. `um update` lo monta con `exitOnCtrlC: false`, y un `useInput` raíz captura Ctrl+C (`isActive: isRawModeSupported`) y termina con `"cancelled"`. `index.ts` imprime entonces lo mismo que el manejador `SIGINT`, que se extrae a `cancel()`, y llama a `process.exit(0)`, porque un `runCommand` en curso mantendría vivo el proceso. Sin raw mode (stdin sin TTY), Ctrl+C llega como `SIGINT` al manejador global, como hoy.
6. **Fila `updating` con un espacio.** El `Spinner` dibuja `<frame>  <label>` con dos espacios, y la fila de la spec lleva uno. Se exporta `SpinnerFrame` (solo el frame animado) y `Spinner` se apoya en él.
7. **Reutilizar la lista de `check`.** `CheckApp.tsx` exporta `UpdatesFound` (el `CheckReport` de hoy sin el `Outro`), y `CheckReport` pasa a ser `UpdatesFound` + `Outro`. `useCheckResult` deja de llamar a `exit()` y se exporta: `CheckApp` llama a `exit` en su propio efecto. `CheckError` y `printCheckError` aceptan un `title` opcional, que por defecto es `Checking for updates`.
8. **Tests de los prompts con un stdin falso.** `src/ui/testStdin.ts` crea un `PassThrough` con `isTTY = true`, `setRawMode`, `ref` y `unref` vacíos, y las teclas se escriben como secuencias (`"\u001B[B"` ↓, `" "`, `"\r"`, `"\u0003"`). No entra `ink-testing-library`.
9. **El cursor del MultiSelect da la vuelta** (↓ en la última vuelve a la primera), como en clack. La clave interna de cada fila es `provider:id`, no `id`.
10. **Riesgo:** que ink 8 no acepte el stdin falso en los tests. Mitigación: si `useInput` no recibe las teclas, freno y lo digo. No se sustituye por tests de lógica pura sin avisar.
11. **Coste estimado:** ~3 h de implementación y un revisor final Opus, del orden de 100-150k tokens.
12. **Review Focus:** 5 entradas que la spec no fija, con su comportamiento esperado; ver la sección.

**Goal**: Dibujar `um update` y `um update <provider>` con ink: selección agrupada, Confirm de force y gsudo, una fila de progreso por paquete y el resultado, con la guarda de TTY y Ctrl+C.

**Architecture**: Prompts propios en `src/ui/` (`MultiSelect`, `Confirm`) y una vista de progreso pura (`UpdateProgress`). `UpdateApp` ejecuta `runUpdateFlow`, una función async que recibe la lógica de `index.ts` (consultar, gsudo, actualizar un paquete) y pinta cada fase como un bloque del marco de la 0005. `updateCommand` deja clack. El menú interactivo sigue con las funciones de clack.

**Tech Stack**: Bun 1.4.2, TypeScript 6.0.3, ink 8.0.0, React 19.3.0, picocolors 1.1.1.

**Spec**: `./spec.md`

**Ejecución**: native, la recomienda el handoff de `writing-plans` (`execution: auto` en sdd-kit.json): 3 tasks en cadena con interfaces compartidas y poco código. Si esta sesión se retomó tras una compactación (empieza por «This session is being continued from a previous conversation») y quedan dos o más tasks sin su línea `complete` en el ledger, no las hagas tú: despacha las que quedan con subagent-driven-development sobre el mismo ledger. La sesión que ejecuta va bien en gama media (Sonnet, effort medium); el modelo más capaz se reserva para la revisión final.

## Restricciones globales

### De código

- Sin dependencias nuevas: ni `@inkjs/ui` ni `ink-testing-library`. Si alguna hiciera falta, versión exacta (`bunfig.toml`, `install.exact = true`).
- Los comandos externos pasan siempre por `runCommand` / `runPowerShell` (`src/runner.ts`). Nunca `Bun.spawn` ni `$` directos. `src/runner.ts` no se modifica.
- `renderApp` monta siempre con `patchConsole: false`.
- Textos literales de la CLI, en inglés:
  - Marco y consulta: `Updating packages`, `Checking for updates...`, `Checking <nombre>...`, `Found <n> update(s)`, `Provider "<id>" not found` y `Done`.
  - Selección: `Select packages to update (space to toggle, enter to confirm)`, el bloque respondido `Select packages to update`, `Update cancelled` y `Cancelled`.
  - Force y gsudo: `Found <n> package(s) that require force:`, `   • <nombre> (pinned)`, `   • <nombre> (unknown version)`, `Force update <n> WinGet package(s)?`, `gsudo not found. Install it for admin elevation?`, `Installing gsudo...`, `gsudo installed`, `Failed to install gsudo` y `Yes` / `No`.
  - Progreso y resultado: `No packages to update`, `Updating <n> package(s)...`, `updating`, `queued`, `(force)`, `failed`, `Unknown error`, `Result: `, `✓ <n> updated`, `✗ <n> failed`, `⊘ <n> skipped`, ` | ` y `Interactive terminal required (use --yes)`.
- Símbolos del marco calcados de @clack/prompts 1.8.1:
  - `┌`, `│` y `└` en gris; `◇` verde, `●` azul, `◆` verde y `■` rojo.
  - `▲` amarillo para `warn`.
  - `◼` cian (marcado) y `◻` atenuado (desmarcado).
  - `●` verde y `○` atenuado en el Confirm.
  - En el progreso: `✓` verde, `✗` rojo y `…` atenuado.
  - Dos espacios entre el símbolo del marco y el mensaje.
- Código e identificadores en inglés. Comentarios en español, solo el porqué que el código no dice. Sin comentarios que repitan el código ni que citen documentos (constitution, spec, task, capacidad).
- Cero refactor oportunista: solo se toca lo que nombra cada task. `selectUpdates`, `performUpdates`, `displayUpdates`, `checkAllProviders` y el menú interactivo siguen en clack.
- Umbrales de alerta: funciones de ~20 líneas, ≤3 parámetros y anidamiento ≤3.

### De proceso

- Native: la sesión implementa con `superpowers:executing-plans` y su ledger. El revisor final va con `sdd-kit:effort-high` + `opus`.
- Commits en Conventional Commits, con tipo y scope en inglés y título y cuerpo en castellano, terminados con `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

- Mismo `id` en dos providers (p. ej. `typescript` en npm y en bun) → espacio desmarca solo la fila del cursor · Task 1, `toggles only the row under the cursor when ids repeat`.
- ↑ en la primera fila o ↓ en la última → el cursor da la vuelta, como clack · Task 1, `wraps the cursor around`.
- `updatePackage` lanza algo que no es `Error` → `✗ <nombre> Unknown error`, como hoy · Task 3, `reports Unknown error for non-Error throws`.
- `setInstalledVersion` falla tras un update correcto (config bloqueada) → la fila sale `✗ <nombre> <mensaje>` y se sigue, como hoy, porque va dentro del mismo `try` · Task 3, lo cubre `marks a throwing update as failed and goes on` (la función `updatePackage` de `index.ts` incluye el guardado).
- Selección con muchos paquetes (20+ de WinGet), más alta que la terminal → se dibujan todas las filas sin paginar · Task 3, smoke en terminal con `um update` sobre la máquina real; sin test.

---

## Phase -1 — Pre-Implementation Gates

- [x] **Simplicity gate**: sin máquina de estados. El flujo es una función async con dos primitivas (`push` y `ask`). Los prompts son de un solo uso.
- [x] **YAGNI gate**: `MultiSelect` sirve solo para `PackageUpdate[]`, sin genéricos. La 0007 hará su `Select` cuando lo necesite.
- [x] **Brownfield gate**: `um check` no cambia de salida (lo fijan sus tests). El menú interactivo sigue en clack. `config.json` no cambia de forma.
- [x] **Constitution check**: art. I (`update` no cambia de significado), II (comando en `index.ts`, dibujo en `src/ui/`), III (solo lo de la spec), V (`runCommand`), VII (un fallo no para el resto) y VIII (selección y confirmación de force).

---

## 1. Decisiones técnicas

### 1.1 Estructura de ficheros

**Crear**:

- `src/ui/testStdin.ts`: el stdin falso para los tests de teclado.
- `src/ui/Confirm.tsx` y `src/ui/Confirm.test.tsx`.
- `src/ui/MultiSelect.tsx` y `src/ui/MultiSelect.test.tsx`.
- `src/ui/UpdateProgress.tsx` y `src/ui/UpdateProgress.test.tsx`: las filas de progreso y el resultado, puros.
- `src/ui/UpdateApp.tsx` y `src/ui/UpdateApp.test.tsx`: `runUpdateFlow`, `UpdateApp` y `runUpdateView`.

**Modificar**:

- `src/ui/frame.tsx` (+ test): `LogKind` gana `"warn"`.
- `src/ui/Spinner.tsx` (+ test): exporta `SpinnerFrame`.
- `src/ui/render.tsx` (+ test): segundo parámetro opcional `options?: { exitOnCtrlC?: boolean }`.
- `src/ui/CheckApp.tsx`: exporta `UpdatesFound`, `useCheckResult` sin `exit` y `title` opcional en `CheckError` y `printCheckError`.
- `src/index.ts`: `updateCommand` en ink, la guarda de TTY y `cancel()`.
- `.docs/sdd/architecture.md` («Flujo principal», pasos 4 y 5) y `.docs/sdd/tech-stack.md` (fila «UI de terminal»): `um update` va en ink y enlaza la capacidad `package-update`.

**NO se tocan**:

- `src/runner.ts`, `src/providers/*`, `src/config.ts` y `src/types.ts`.
- En `src/index.ts`: `interactiveMode`, `updateInteractive`, `updateByProviderInteractive`, `selectUpdates`, `performUpdates`, `displayUpdates` y `checkAllProviders`. Siguen en clack hasta la 0007.

### 1.5 UX

La de los escenarios de la spec. Con TTY, cada fase se redibuja en su sitio. Sin TTY, ink escribe solo el último frame.

### 1.6 Dependencias

Ninguna nueva.

### 1.7 Riesgos

| Riesgo | Probabilidad | Impacto | Mitigación |
| --- | --- | --- | --- |
| ink 8 no lee el `PassThrough` como stdin en los tests | media | medio | Lo comprueba el primer test de la Task 1. Si falla, freno de alcance |
| `useInput` sin raw mode (stdin sin TTY) lanza `Raw mode is not supported` | alta si no se guarda | alto | Todo `useInput` va con `isActive` dependiente de `useStdin().isRawModeSupported`, y sin TTY no se monta ningún prompt. Smoke `update bun --yes < nul` |
| Ctrl+C con un update en curso deja el proceso del gestor vivo | media | bajo | Como hoy: no se espera. `process.exit(0)` tras `Cancelled` |
| Una lista más alta que la terminal parpadea al redibujar | media | bajo | Review Focus: smoke en terminal real |

### 1.8 Rollout

Directo: `moon run :build` y `bin\um.exe` en la máquina del autor.

### 1.9 Excepciones a la constitution

Ninguna.

---

## 2. Tasks

### Task 1 — Prompts propios: Confirm y MultiSelect agrupado

**Modelo**: Native, la sesión.
**Tests RED**: hilo principal, `src/ui/Confirm.test.tsx`, `src/ui/MultiSelect.test.tsx` y el caso `warn` de `src/ui/frame.test.tsx`, escritos antes del código y sin commitear.
**Superficies**: frontend de terminal.
**Verificación**: `sh -c 'bun test src/ui && bun run typecheck && bun run lint && echo ok'`
**Se prueba en la aplicación**: no, porque es base común: ningún comando monta todavía los prompts. Lo prueba la Task 3.

**Interfaces**:
- Consume (de la 0005): `Log({ kind, children })`, `providers` (`src/providers`) para el icono y el nombre, y `PackageUpdate` (`src/types.ts`).
- Produce:
  - `type LogKind = "step" | "info" | "success" | "error" | "warn"` en `src/ui/frame.tsx`; `warn` dibuja `▲` amarillo.
  - `createTestStdin(): NodeJS.ReadStream` en `src/ui/testStdin.ts`.
  - `Confirm({ message, onSubmit }: { message: string; onSubmit: (value: boolean) => void })` en `src/ui/Confirm.tsx`. Dibuja `│`, `◆  <message>`, `│  ● Yes / ○ No` (el elegido con `●`) y `└`. Teclas: ←/→ cambian, `y` elige Yes y `n` elige No (sin enviar), y Enter envía. Yes por defecto.
  - `MultiSelect({ message, updates, onSubmit }: { message: string; updates: PackageUpdate[]; onSubmit: (selected: PackageUpdate[]) => void })` en `src/ui/MultiSelect.tsx`. Dibuja `│`, `◆  <message>` y, por provider en orden de aparición, `│  <icono> <nombre>`, y debajo `│    <◼|◻> <name> <current> → <new>[ <insignia>]`, con la fila del cursor en cian, y cierra con `└`. Insignias: `📌 pinned` y `❓ unknown`, como en `check`. Teclas: ↑/↓ (con vuelta), espacio, `a` (si todas marcadas desmarca todas; si no, marca todas) y Enter, que llama a `onSubmit` con los marcados en el orden de `updates`.
  - Los dos `useInput` llevan `{ isActive: isRawModeSupported }`.

**Ficheros**: crear `src/ui/testStdin.ts`, `src/ui/Confirm.tsx`, `src/ui/Confirm.test.tsx`, `src/ui/MultiSelect.tsx` y `src/ui/MultiSelect.test.tsx`. Modificar `src/ui/frame.tsx` y `src/ui/frame.test.tsx`.

- [ ] **Step 1: Tests RED.** El helper:

  ```ts
  const mount = (node: ReactElement) => {
    const stdout = new MemoryStream(); const stdin = createTestStdin();
    const app = render(node, { stdout, stdin, patchConsole: false, interactive: true });
    return { app, stdin, last: () => lastFrameLines(stdout) };
  };
  const press = async (stdin, ...keys: string[]) => { for (const k of keys) { stdin.write(k); await tick(); } };
  ```

  `lastFrameLines` devuelve las líneas del último frame escrito, sin VT ni espacios finales. Fixture `three`: `Git.Git` 2.50.0 → 2.51.0 y `Microsoft.PowerToys` 0.94.0 → 0.95.0 (`provider: "winget"`) y `typescript` 6.0.2 → 6.0.3 (`provider: "npm"`), todos `available`.
  - `frame.test.tsx` › `draws a warning`: `lines(<Log kind="warn">Found 2 package(s) that require force:</Log>)` → `["│", "▲  Found 2 package(s) that require force:"]`.
  - `Confirm.test.tsx` › `starts on Yes`: `last()` → `["│", "◆  Force update 1 WinGet package(s)?", "│  ● Yes / ○ No", "└"]`.
  - `Confirm.test.tsx` › `submits Yes on Enter`: `press(stdin, "\r")` → `onSubmit` recibe `true`.
  - `Confirm.test.tsx` › `moves to No with the arrow and submits it`: `press(stdin, "\u001B[C", "\r")` → la línea antes de Enter es `│  ○ Yes / ● No` y `onSubmit` recibe `false`.
  - `Confirm.test.tsx` › `picks with y and n`: `press(stdin, "n", "\r")` → `false`. `press(stdin, "y", "\r")` en otro montaje → `true`.
  - `MultiSelect.test.tsx` › `groups by provider with everything checked`: `last()` → `["│", "◆  Select packages to update (space to toggle, enter to confirm)", "│  📦 WinGet", "│    ◼ Git.Git 2.50.0 → 2.51.0", "│    ◼ Microsoft.PowerToys 0.94.0 → 0.95.0", "│  📦 npm (global)", "│    ◼ typescript 6.0.2 → 6.0.3", "└"]`.
  - `MultiSelect.test.tsx` › `submits all three on Enter`: `press(stdin, "\r")` → `onSubmit` recibe `three`.
  - `MultiSelect.test.tsx` › `unchecks the row under the cursor`: `press(stdin, "\u001B[B", " ")` → `│    ◻ Microsoft.PowerToys 0.94.0 → 0.95.0`. Después, `"\r"` → `onSubmit` recibe `[Git.Git, typescript]`.
  - `MultiSelect.test.tsx` › `toggles all with a`: `press(stdin, "a")` → las 3 filas con `◻`. Otra `a` → las 3 con `◼`. Con la segunda desmarcada, `a` → las 3 con `◼`.
  - `MultiSelect.test.tsx` › `wraps the cursor around`: `press(stdin, "\u001B[A", " ", "\r")` → `onSubmit` recibe `[Git.Git, Microsoft.PowerToys]`.
  - `MultiSelect.test.tsx` › `toggles only the row under the cursor when ids repeat`: `typescript` en `npm` y en `bun`, `press(stdin, " ", "\r")` → `onSubmit` recibe solo el de `bun` (si `bun` aparece segundo, el cursor empieza en `npm`).
  - `MultiSelect.test.tsx` › `shows status badges`: un `pinned` de winget → su fila acaba en `📌 pinned`.

  Ejecuta `bun test src/ui`. Esperado: FAIL porque los módulos no existen. Guarda una copia de los tests fuera del repo.
- [ ] **Step 2: Implementación** de las firmas de «Produce».
- [ ] **Step 3: Verificación.** `sh -c 'bun test src/ui && bun run typecheck && bun run lint && echo ok'`. Esperado: `ok`. Los tests de `CheckApp` siguen verdes.
- [ ] **Step 4: Commit de la task**: `git diff --no-index` de los tests contra la copia y, después, `feat(ui): añadir Confirm y MultiSelect agrupado propios en ink`.

### Task 2 — Vista de progreso por paquete y resultado

**Modelo**: Native, la sesión.
**Tests RED**: hilo principal, `src/ui/UpdateProgress.test.tsx` y el caso `SpinnerFrame` de `src/ui/Spinner.test.tsx`, sin commitear.
**Superficies**: frontend de terminal.
**Verificación**: `sh -c 'bun test src/ui && bun run typecheck && bun run lint && echo ok'`
**Se prueba en la aplicación**: no, porque es base común: la monta la Task 3.

**Interfaces**:
- Consume: `Log`, `providers` y `PackageUpdate`.
- Produce:
  - `SpinnerFrame()` en `src/ui/Spinner.tsx`: solo `<frame>` magenta animado. `Spinner` lo usa.
  - En `src/ui/UpdateProgress.tsx`:
    - `type RowState = "queued" | "updating" | "done" | "failed"`
    - `interface ProgressRow { update: PackageUpdate; force: boolean; state: RowState; reason?: string }`
    - `UpdateProgress({ rows }: { rows: ProgressRow[] })`: por provider en orden de aparición, `│  <icono> <nombre>`, y por fila:
      - `queued`: `│  … <name> <current> → <new>[ (force)] queued`
      - `updating`: `│  <SpinnerFrame> <name> <current> → <new>[ (force)] updating`
      - `done`: `│  ✓ <name> <current> → <new>`
      - `failed`: `│  ✗ <name> <reason>`
    - `interface UpdateTally { updated: number; failed: number; skipped: number }`
    - `UpdateResult({ tally }: { tally: UpdateTally })`: `Log info` con `Result: ` y las partes no nulas `✓ <n> updated` (verde), `✗ <n> failed` (rojo) y `⊘ <n> skipped` (amarillo), unidas por ` | `.

**Ficheros**: crear `src/ui/UpdateProgress.tsx` y `src/ui/UpdateProgress.test.tsx`. Modificar `src/ui/Spinner.tsx` y `src/ui/Spinner.test.tsx`.

- [ ] **Step 1: Tests RED** con `lines` (`renderToString`). Fixture: `git` (`Git.Git` 2.50.0 → 2.51.0) y `toys` (`Microsoft.PowerToys` 0.94.0 → 0.95.0), los dos de `winget`.
  - `Spinner.test.tsx` › `draws only the frame`: `lines(<SpinnerFrame />)` → `["◒"]`.
  - `shows updating and queued rows`: `[{ update: git, force: false, state: "updating" }, { update: toys, force: false, state: "queued" }]` → `["│  📦 WinGet", "│  ◒ Git.Git 2.50.0 → 2.51.0 updating", "│  … Microsoft.PowerToys 0.94.0 → 0.95.0 queued"]`.
  - `shows done and failed rows`: `done` y `failed` con `reason: "failed"` → `"│  ✓ Git.Git 2.50.0 → 2.51.0"` y `"│  ✗ Microsoft.PowerToys failed"`.
  - `labels forced rows`: `git` con `force: true`, `queued` → `"│  … Git.Git 2.50.0 → 2.51.0 (force) queued"`.
  - `groups rows by provider`: más `typescript` de `npm`, `queued` → la cabecera `│  📦 npm (global)` va después de las filas de WinGet.
  - `sums up the result`: `{ updated: 2, failed: 1, skipped: 1 }` → `["│", "●  Result: ✓ 2 updated | ✗ 1 failed | ⊘ 1 skipped"]`.
  - `omits zero parts`: `{ updated: 2, failed: 0, skipped: 0 }` → `["│", "●  Result: ✓ 2 updated"]`.

  Ejecuta `bun test src/ui/UpdateProgress.test.tsx src/ui/Spinner.test.tsx`. Esperado: FAIL. Guarda una copia fuera del repo.
- [ ] **Step 2: Implementación** de las firmas de «Produce».
- [ ] **Step 3: Verificación.** `sh -c 'bun test src/ui && bun run typecheck && bun run lint && echo ok'`. Esperado: `ok`.
- [ ] **Step 4: Commit de la task**: `git diff --no-index` de los tests contra la copia y, después, `feat(ui): añadir la vista de progreso por paquete y el resultado del update`.

### Task 3 — `um update` y `um update <provider>` en ink

**Modelo**: Native, la sesión.
**Tests RED**: hilo principal, `src/ui/UpdateApp.test.tsx` y el caso de `src/ui/render.test.tsx`, sin commitear.
**Superficies**: frontend de terminal, CLI, build y docs.
**Verificación**: `sh -c 'bun test src/ui && bun run typecheck && bun run lint && echo ok'`
**Se prueba en la aplicación**: sí.
- `um update bun` en una terminal: `┌   Updating packages`, el spinner `Checking Bun (global)...`, `◇  Found 1 update(s)`, la lista con `●  Summary: 1 available` y la selección agrupada con todo marcado. Enter → `◇  Updating 1 package(s)...`, `│  ✓ @railway/cli 5.63.4 → 5.64.0`, `●  Result: ✓ 1 updated` y `└  Done`.
- `um update winget < nul` → `Interactive terminal required (use --yes)` y código 1.

**Interfaces**:
- Consume:
  - De la Task 1: `Confirm`, `MultiSelect`, `Log` con `"warn"` y `createTestStdin`.
  - De la Task 2: `UpdateProgress`, `ProgressRow`, `UpdateResult` y `UpdateTally`.
  - De la 0005: `Intro`, `Log`, `Outro`, `Spinner`, `renderApp`, `CheckResult` y `collectUpdates`.
- Produce:
  - `renderApp(node: ReactElement, options?: { exitOnCtrlC?: boolean }): Promise<void>`. `patchConsole: false` siempre.
  - En `src/ui/CheckApp.tsx`:
    - `UpdatesFound({ doneMessage, result })`: el `CheckReport` de hoy sin `Outro`. `CheckReport` es `UpdatesFound` + `<Outro>Done</Outro>`.
    - `useCheckResult(load)`: escribe los avisos por stderr y devuelve `CheckResult | null`, sin `exit`.
    - `CheckError({ message, title = "Checking for updates" })` y `printCheckError(message: string, title?: string)`.
  - En `src/ui/UpdateApp.tsx`:
    - `interface UpdateViewOptions { spinnerLabel: string; load: () => Promise<CheckResult>; interactive: boolean; skipSelection: boolean; hasGsudo: () => Promise<boolean>; installGsudo: () => Promise<boolean>; updatePackage: (update: PackageUpdate, force: boolean) => Promise<boolean> }`
    - `type UpdateOutcome = "done" | "cancelled"`
    - `interface FlowUi { push: (node: ReactNode) => void; show: (node: ReactNode | null) => void; ask: <T>(prompt: (resolve: (value: T) => void) => ReactNode) => Promise<T> }`
    - `runUpdateFlow(options: UpdateViewOptions, ui: FlowUi): Promise<void>`, con las fases de abajo.
    - `UpdateApp(props: UpdateViewOptions & { onCancel: () => void })`
    - `runUpdateView(options: UpdateViewOptions): Promise<UpdateOutcome>`, que monta con `exitOnCtrlC: false`.
  - En `src/index.ts`: `cancel(): never`, que imprime `pc.dim("\nCancelled")` y hace `process.exit(0)`. La usan el manejador `SIGINT` y `updateCommand`.

  Fases de `runUpdateFlow` (cada `push` deja un bloque dibujado; `show` cambia el nodo activo):
  1. `show(<Spinner label={spinnerLabel} />)` precedido de `│`. Después, `load()` y los avisos de fallo por stderr (como `useCheckResult`).
  2. Con 0 updates: `push(<Log kind="step">Found 0 update(s)</Log>)` y `push(<Outro>Done</Outro>)`, y termina.
  3. `push(<UpdatesFound doneMessage={\`Found ${n} update(s)\`} result={result} />)`.
  4. Si `skipSelection` es `false`: `ask` con `MultiSelect`, y luego `push` de `◇  Select packages to update` y `│  <nombres unidos por ", ">`. Con la selección vacía: `push(Log info "Update cancelled")` y `push(<Outro>Cancelled</Outro>)`, y termina.
  5. Si hay `pinned` o `unknown`: `push(Log warn "Found <n> package(s) that require force:")` y una línea `   • <name> (pinned|unknown version)` por paquete. Si hay de `winget` y `interactive` es `true`:
     - Si `await hasGsudo()` es `false`: `ask` con el Confirm de gsudo. Con Yes, `show(Spinner "Installing gsudo...")` y luego `push(Log step "gsudo installed" | "Failed to install gsudo")`.
     - `ask` con el Confirm de force.
     - Cada respuesta deja su bloque `◇  <pregunta>` + `│  Yes|No`.
  6. Con 0 por actualizar: `push(Log info "No packages to update")` y `push(<Outro>Done</Outro>)`.
  7. `push(Log step "Updating <n> package(s)...")` y `│`. Las filas van agrupadas por provider en orden de aparición de `[...available, ...forced]`, todas `queued`. En ese orden y una a una:
     - la fila pasa a `updating`;
     - `await updatePackage(update, force)`: `true` → `done`, `false` → `failed`/`failed`, y si lanza → `failed` con `error.message` o `Unknown error`;
     - tras cada cambio, `show(<UpdateProgress rows={rows} />)`.
  8. `push` del progreso final, `push(<UpdateResult tally={...} />)` con `skipped` = los `pinned`/`unknown` no forzados, y `push(<Outro>Done</Outro>)`.

  `updateCommand(providerId?, skipConfirm)` en `src/index.ts`:
  1. Si `!skipConfirm` y no son TTY a la vez `process.stdin.isTTY` y `process.stdout.isTTY`: `console.error("Interactive terminal required (use --yes)")`, `process.exitCode = 1` y `return`.
  2. Con un id desconocido: `printCheckError(\`Provider "${providerId}" not found\`, "Updating packages")` y `return`.
  3. `runUpdateView`. Con `"cancelled"`, `cancel()`. Opciones:
     - `load`: `collectUpdates` sin provider. Con provider, `async () => ({ updates: await provider.checkUpdates(), checkedProviders: [providerId], failures: [] })`.
     - `spinnerLabel`: `"Checking for updates..."` o `` `Checking ${provider.name}...` ``.
     - `interactive`: stdin y stdout TTY.
     - `skipSelection`: `skipConfirm`.
     - `hasGsudo`: `() => commandExists("gsudo")`.
     - `installGsudo`: `runCommand(["winget", "install", "gerardog.gsudo", "--silent", "--accept-package-agreements"], { timeout: 120000 })` y su `.success`.
     - `updatePackage`: `providers[u.provider].updatePackage(u.id, { force })` y, si devuelve `true`, `setInstalledVersion(u.id, u.newVersion)`.

**Ficheros**: crear `src/ui/UpdateApp.tsx` y `src/ui/UpdateApp.test.tsx`. Modificar `src/ui/render.tsx`, `src/ui/render.test.tsx`, `src/ui/CheckApp.tsx`, `src/index.ts`, `.docs/sdd/architecture.md` y `.docs/sdd/tech-stack.md`.

- [ ] **Step 1: Tests RED.** Montan `<UpdateApp {...options} onCancel={onCancel} />` con el `mount` de la Task 1 y opciones falsas: `load` devuelve el fixture, `updatePackage` es un mock que registra las llamadas en orden, y `hasGsudo`/`installGsudo` son mocks. Fixtures: `railway` (bun), `git`/`toys` (winget), `pinned` (`Foo.Pinned` 1.0 → 2.0, winget, `pinned`) y `leftPad` (`left-pad` 1.0.0 → 1.1.0, npm, `unknown`).
  - `render.test.tsx` › `passes exitOnCtrlC through`: `renderApp(<App />, { exitOnCtrlC: false })` con un stdin falso y `"\u0003"` → la app no se desmonta sola.
  - `lists the updates before selecting`: `railway` con `interactive: true` → las líneas contienen, en orden, `◇  Found 1 update(s)`, `🥟 Bun (global)`, `   • @railway/cli 5.63.4 → 5.64.0`, `●  Summary: 1 available` y `◆  Select packages to update (space to toggle, enter to confirm)`.
  - `ends with Done when there are no updates`: `updates: []` → la cola es `["◇  Found 0 update(s)", "│", "└  Done"]`, sin `◆  Select`.
  - `updates the selection in order`: `git`+`toys`, Enter → `updatePackage` recibe `git` y luego `toys`, con `force: false`. Contiene `◇  Select packages to update`, `│  Git.Git, Microsoft.PowerToys`, `◇  Updating 2 package(s)...`, `│  ✓ Git.Git 2.50.0 → 2.51.0`, `●  Result: ✓ 2 updated` y `└  Done`.
  - `shows one updating row at a time`: con un `updatePackage` que no resuelve hasta que el test lo libera, tras Enter el frame tiene `│  ◒ Git.Git 2.50.0 → 2.51.0 updating` y `│  … Microsoft.PowerToys 0.94.0 → 0.95.0 queued`, y `toys` aún no se ha llamado.
  - `cancels on empty selection`: `a` y Enter → contiene `●  Update cancelled` y `└  Cancelled`, y `updatePackage` no se llama.
  - `marks a failed update and goes on`: `updatePackage(git)` → `false` → `│  ✗ Git.Git failed`, `toys` se llama, `●  Result: ✓ 1 updated | ✗ 1 failed`.
  - `marks a throwing update as failed and goes on`: lanza `new Error("timeout")` → `│  ✗ Git.Git timeout`, y `toys` se llama.
  - `reports Unknown error for non-Error throws`: lanza `"boom"` → `│  ✗ Git.Git Unknown error`.
  - `asks to force WinGet only`: `pinned`+`leftPad`, gsudo presente. Enter en la selección → `▲  Found 2 package(s) that require force:`, `   • Foo.Pinned (pinned)`, `   • left-pad (unknown version)` y `◆  Force update 1 WinGet package(s)?`. Enter (Yes) → `updatePackage(pinned, true)`, la fila tiene `(force)`, y `●  Result: ✓ 1 updated | ⊘ 1 skipped`.
  - `skips both when force is declined`: el mismo con →, Enter → `updatePackage` no se llama, `●  No packages to update` y `└  Done`.
  - `does not ask without WinGet packages`: solo `leftPad` → sin `◆  Force`, con `●  No packages to update` y `└  Done`.
  - `offers gsudo before forcing`: `hasGsudo` → `false`, Enter (Yes) → `installGsudo` se llama, `◇  gsudo installed` y luego `◆  Force update 1 WinGet package(s)?`. Con → y Enter (No), `installGsudo` no se llama y sale el Confirm de force.
  - `never asks without a terminal`: `interactive: false`, `skipSelection: true` y `pinned`+`railway` → sin `◆`, `hasGsudo` no se llama, `updatePackage(railway, false)` y `●  Result: ✓ 1 updated | ⊘ 1 skipped`.
  - `skips selection with --yes`: `skipSelection: true` e `interactive: true` con `git` → sin `◆  Select`, y `updatePackage(git)` se llama.
  - `cancels on Ctrl+C`: en la selección, `"\u0003"` → `onCancel` se llama una vez y `updatePackage` no.

  Ejecuta `bun test src/ui`. Esperado: FAIL porque `UpdateApp.tsx` no existe. Guarda una copia fuera del repo.
- [ ] **Step 2: `renderApp` con `options` y los cambios de `CheckApp.tsx`.** Los tests de `CheckApp` siguen verdes sin tocarlos.
- [ ] **Step 3: `src/ui/UpdateApp.tsx`**: `runUpdateFlow`, `UpdateApp` (bloques en un estado `ReactNode[]` más el nodo activo, `useEffect` que lanza el flujo una vez y llama a `exit()` al acabar, y un `useInput` raíz que con `key.ctrl && input === "c"` llama a `onCancel` y a `exit()`) y `runUpdateView`.
- [ ] **Step 4: `src/index.ts`**: `cancel()`, el manejador `SIGINT` sobre ella y `updateCommand` como arriba. Se quitan sus `p.intro`, `p.spinner`, `displayUpdates`, `selectUpdates`, `performUpdates` y `p.outro`, que siguen vivos para el menú.
- [ ] **Step 5: Docs.**
  - `architecture.md`, «Flujo principal»: pasos 4 y 5. `um update` selecciona y actualiza en ink (`src/ui/UpdateApp.tsx`), y el menú sigue con `selectUpdates`/`performUpdates` de clack hasta la 0007.
  - `tech-stack.md`, fila «UI de terminal»: `um check` y `um update` en ink, enlazando [`package-update`](capabilities/package-update.md).
- [ ] **Step 6: Verificación.** `sh -c 'bun test src/ui && bun run typecheck && bun run lint && echo ok'`. Esperado: `ok`.
- [ ] **Step 7: Ejecución real.** El hilo, con `bun run src/index.ts` y luego con `.\bin\um.exe`, tras `moon run :build`:
  1. `update foo < nul` y `update winget < nul` → `Interactive terminal required (use --yes)` por stderr y `$LASTEXITCODE` 1.
  2. `update bun --yes > out.txt` → código 0. En `out.txt`, `◇  Updating 1 package(s)...`, la fila `✓`/`✗`, `●  Result:` y `└  Done`, y 0 frames del spinner y 0 `ESC[1G`.
  3. `update bun --yes < nul` → sin prompts y código 0.
  4. `update foo` en una terminal → `■  Provider "foo" not found`.
  5. `um check` sigue igual que en `develop` (el `CheckApp` refactorizado).

  Lo interactivo (selección, Confirm y Ctrl+C) va al guion del dev-lead si el hilo no tiene TTY.
- [ ] **Step 8: Commit de la task**: `git diff --no-index` de los tests contra la copia y, después, `feat(update): dibujar um update y um update <provider> con ink`.

---

## Estimación y esfuerzo

- Tipo: frontend
- Esfuerzo spec + plan: 0,75 h
- Estimación de implementación: 3 h
- Base de la estimación: 3 tasks, 4 componentes y un flujo async con prompts. La incertidumbre es el stdin falso de ink 8 en los tests. El estimation-log tiene una sola muestra (0005, infra/tooling, factor 0,18) y de otro tipo: no se aplica.
- Confianza: media

---

## 3. Validación final

- [ ] Gate de cierre, una vez y en el hilo principal: `moon run :lint :typecheck :test --force` y `moon run :build`. Los 2 rojos de `parseProtoOutput` son deuda conocida.
- [ ] Smoke con `.\bin\um.exe`: `update <provider>` interactivo en una terminal, `update <provider> --yes > out.txt`, `update winget < nul` y Ctrl+C durante la selección.
- [ ] Spec satisfecha: cada requisito tiene su task (ver Self-review).
- [ ] Cierre de rama con `sdd-end-feature`.

---

## 4. Self-review (cobertura spec → tasks)

- Consulta y lista antes de actualizar → Task 3, `lists the updates before selecting`, `ends with Done when there are no updates` y el smoke de `update foo`. ✓
- Selección agrupada por provider → Task 1 (dibujo y teclas) y Task 3 (`updates the selection in order`, `cancels on empty selection`). ✓
- Force solo para WinGet → Task 3, `asks to force WinGet only`, `skips both when force is declined` y `does not ask without WinGet packages`. ✓
- gsudo → Task 3, `offers gsudo before forcing`. ✓
- Una fila por paquete, en secuencia → Task 2 (filas) y Task 3 (`shows one updating row at a time`, `marks a failed update…`, `marks a throwing update…`). ✓
- Resultado → Task 2, `sums up the result` y `omits zero parts`. ✓
- Sin terminal interactiva → Task 3, `never asks without a terminal` y el smoke 1-3. ✓
- Ctrl+C → Task 3, `cancels on Ctrl+C`, `cancel()` y el smoke del dev-lead en las otras fases. ✓
- `installedVersions` tras un éxito → Task 3, `updatePackage` de `index.ts` (smoke: `config.json` tras `update bun --yes`). ✓
- Las líneas del Review Focus → Task 1 (ids repetidos, vuelta del cursor), Task 3 (no-`Error`, fallo de guardado) y el smoke (lista alta). ✓
