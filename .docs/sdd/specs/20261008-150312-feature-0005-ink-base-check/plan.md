---
id: 20261008-150312-feature-0005-ink-base-check
feature: 0005
title: Plan de implementación — Base ink + `um check`
spec: ./spec.md
status: draft
created: 2026-10-08
---

# Plan de implementación — Base ink + `um check`

## Decisiones que he tomado yo — valida estas

1. **Modelo y effort.** En Native las dos tasks las hace la sesión: no hay despacho por task. El revisor final de rama va con `subagent_type: sdd-kit:effort-high` + `model: opus`: es la única revisión independiente de Native.
2. **Ejecución: Native.** Son 2 tasks en cadena: la 2 usa el marco, el Spinner y el entry de la 1. El código es poco y el diseño ya está en el plan. Un subagente por task pagaría contexto fresco dos veces para ~350 líneas.
3. **Dos tasks, no cuatro.** La primera pregunta preveía 4 (deps, base, check y check de un provider). Las deps van con la base porque sin ellas no compila nada. `check <provider>` va con `check` porque reutiliza `CheckApp` cambiando solo la etiqueta, la consulta y el mensaje final.
4. **`index.ts` no lleva JSX.** El dibujo vive en `src/ui/`, e `index.ts` llama a `runCheckView(options)` y a `printCheckError(message)`. Así no se renombra `index.ts` a `.tsx` ni cambian `bin/cli.js`, el script `build` ni `start`.
5. **La consulta va de `index.ts` a `CheckApp` como función (`load`).** `collectUpdates()` se queda en `index.ts`, junto a la config y los providers, y los tipos `CheckResult` y `CheckFailure` van a `src/types.ts`. No se crea un módulo de lógica nuevo.
6. **Los tests de la vista** comparan líneas tras `stripVTControlCharacters` y `trimEnd()`: ink puede recortar el espacio final de `┌   Checking for updates `, y el color no es contenido.
7. **Riesgo alto: ink 8.0.0 tiene 5 días.** Lo de Bun y `--compile` se comprueba en la Task 2 con `moon run :build` y `bin\um.exe check`. Si el bundle falla por `yoga-layout` (WASM) o por `react-devtools-core`, freno de alcance: no se baja de versión sin preguntar.
8. **Coste estimado:** ~3 h de implementación. Un revisor final Opus, del orden de 100-150k tokens.
9. **Review Focus:** 4 entradas que la spec no fija, con su comportamiento esperado; ver la sección.

**Goal**: Dibujar `um check` y `um check <provider>` con ink 8 y dejar la base (deps, entry de render, marco de clack, Spinner, compilación) para la 0006 y la 0007.

**Architecture**: Componentes de ink en `src/ui/`. Un marco que calca los símbolos de clack, un Spinner propio y `CheckApp`, que llama a una consulta inyectada, dibuja el progreso y luego el resultado, y desmonta. `index.ts` sigue siendo el router de comandos. Separa `collectUpdates()` de `checkAllProviders()`, que conserva su spinner de clack para `um update` y el menú.

**Tech Stack**: Bun 1.4.2, TypeScript 6.0.3, ink 8.0.0, React 19.3.0, react-devtools-core 8.0.0, @types/react 19.3.0. @clack/prompts 1.8.1 sigue para el resto de comandos.

**Spec**: `./spec.md`

**Ejecución**: native, fijado por el handoff de `writing-plans` (`execution: auto` en sdd-kit.json): 2 tasks en cadena con interfaces compartidas y poco código. Si esta sesión se retomó tras una compactación (empieza por «This session is being continued from a previous conversation») y quedan dos o más tasks sin su línea `complete` en el ledger, no las hagas tú: despacha las que quedan con subagent-driven-development sobre el mismo ledger. La sesión que ejecuta va bien en gama media (Sonnet, effort medium); el modelo más capaz se reserva para la revisión final.

## Restricciones globales

### De código

- Versiones exactas, sin `^` ni `~` (`bunfig.toml`, `install.exact = true`): `ink` 8.0.0, `react` 19.3.0 y `react-devtools-core` 8.0.0 en `dependencies`; `@types/react` 19.3.0 en `devDependencies`.
- Sin `@inkjs/ui` ni `ink-testing-library`. Los tests usan `renderToString` de `ink`.
- Los comandos externos pasan siempre por `runCommand` / `runPowerShell` (`src/runner.ts`). Nunca `Bun.spawn` ni `$` directos.
- Los mensajes de la CLI van en inglés. El texto de `um check` es literal el de hoy: `Checking for updates`, `Checking for updates...`, `Checking <nombre>...`, `Found <n> update(s)`, `<nombre>: <n> update(s)`, `Summary: `, ` | `, `<n> available`, `<n> pinned`, `<n> unknown`, `Everything is up to date!`, `Done`, `📌 pinned`, `❓ unknown`, `⚠️ error`, `  ⚠ <nombre>: <mensaje>` (stderr) y `Provider "<id>" not found`.
- Símbolos y colores del marco, calcados de @clack/prompts 1.8.1: `┌` gris + título con fondo cian y texto negro rodeado de un espacio; `│` gris; `◇` verde (paso hecho); `●` azul (info); `◆` verde (éxito); `■` rojo (error); `└` gris + mensaje atenuado. Dos espacios entre símbolo y mensaje. Frames del spinner `◒ ◐ ◓ ◑` en magenta, cada 80 ms.
- Código e identificadores en inglés. Comentarios en español, solo el porqué que el código no dice. Sin comentarios que repitan el código ni que citen documentos (constitution, spec, task, capacidad).
- Cero refactor oportunista: solo se toca lo que nombra cada task.
- Umbrales de alerta: funciones de ~20 líneas, ≤3 parámetros y anidamiento ≤3.

### De proceso

- Native: la sesión implementa con `superpowers:executing-plans` y su ledger. El revisor final va con `sdd-kit:effort-high` + `opus`.
- Commits en Conventional Commits, con tipo y scope en inglés y título y cuerpo en castellano, terminados con `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

- Terminal estrecha (`columns: 40`) con un paquete de nombre largo → ink parte la línea, pero no se pierde ni el nombre ni las versiones · Task 2, `keeps long package lines whole when wrapped`.
- `um check <provider>` cuyo `checkUpdates` lanza → el error sale por `main().catch(console.error)`, ink queda desmontado y el cursor visible · Task 2, smoke `bun run src/index.ts check` con un provider forzado a lanzar (ver Step 6).
- Varios providers fallan a la vez → una línea `  ⚠ <nombre>: <mensaje>` por cada uno en stderr, y stdout con el resto · Task 2, `CheckApp` escribe un aviso por fallo; lo cubre el test `writes one warning per failure`.
- `um check < nul` (stdin sin TTY y stdout con TTY) → funciona igual, porque `check` no lee teclado · Task 2, smoke.

---

## Phase -1 — Pre-Implementation Gates

- [x] **Simplicity gate**: sin módulo de lógica nuevo. El entry de render solo envuelve `render` + `waitUntilExit`, y lo reutilizan la 0006 y la 0007.
- [x] **YAGNI gate**: el marco tiene 3 usos reales en esta feature (`Intro`, `Log` con 4 tipos, `Outro`) y más en la 0006 y la 0007. No hay opciones sin uso.
- [x] **Brownfield gate**: `um update`, el menú, `providers` e `ignore` no cambian. `checkAllProviders()` conserva su salida de clack. `config.json` no se toca.
- [x] **Constitution check**: art. I (los comandos no cambian de significado), II (comandos en `index.ts`), III (solo lo de la spec), IV (la propuesta 0004 justifica la migración), V (sin procesos nuevos) y VII (un fallo no tumba el check).

---

## 1. Decisiones técnicas

### 1.1 Estructura de ficheros

**Crear**:

- `src/ui/render.tsx`: `renderApp`, el entry de render.
- `src/ui/frame.tsx`: el marco calcado de clack (`Intro`, `Log`, `Outro`).
- `src/ui/Spinner.tsx`: el Spinner propio.
- `src/ui/CheckApp.tsx`: `CheckApp`, `CheckReport`, `CheckError`, `runCheckView` y `printCheckError`.
- `src/ui/frame.test.tsx`, `src/ui/Spinner.test.tsx` y `src/ui/CheckApp.test.tsx`.

**Modificar**:

- `package.json` y `bun.lock`: las dependencias y los globs de `lint`/`lint:fix` (`src/**/*.{ts,tsx,js,json}`).
- `tsconfig.json`: `"jsx": "react-jsx"`.
- `eslint.config.js`: `files: ["src/**/*.{ts,tsx}"]`.
- `src/types.ts`: `CheckFailure` y `CheckResult`.
- `src/index.ts`: `collectUpdates()`, `checkAllProviders()` sobre ella y `checkCommand()` con ink. Se borra la `interface CheckResult` local.

**NO se tocan**:

- `bin/cli.js`, `moon.yml`, `.prettierrc` y `bunfig.toml`: `fileGroups.sources` (`src/**/*`) ya cubre `.tsx`.
- `displayUpdates`, `selectUpdates`, `performUpdates`, `interactiveMode` y `updateCommand`: siguen en clack hasta la 0006 y la 0007.
- El `process.on("SIGINT")` del final de `src/index.ts`: resuelve Ctrl+C también con ink (enmienda del 2026-10-08).
- `src/providers/*` y `src/runner.ts`.

### 1.5 UX

La salida es la de los escenarios de la spec. Con TTY, la línea del spinner se redibuja en su sitio. Sin TTY, ink escribe solo el último frame.

### 1.6 Dependencias

`ink` 8.0.0 (peers `react >=19.3.0`, `@types/react >=19.3.0` y `react-devtools-core >=6.1.2`), `react` 19.3.0, `react-devtools-core` 8.0.0 y `@types/react` 19.3.0.

### 1.7 Riesgos

| Riesgo | Probabilidad | Impacto | Mitigación |
| --- | --- | --- | --- |
| ink 8.0.0 (5 días) con un fallo bajo Bun | media | alto | La Task 2 lo comprueba con ejecución real (`bun run` y `.exe`). Si falla, freno de alcance: no se cambia de versión sin preguntar |
| `bun build --compile` no empaqueta `yoga-layout` (WASM) o `react-devtools-core` | media | alto | `moon run :build` y `bin\um.exe check` en la Task 2 |
| Los emojis de ancho 2 descuadran el layout de ink | baja | bajo | Cada línea es un `<Text>` sin anchos fijos, y los tests comparan líneas |
| Doble aviso al pulsar Ctrl+C (ink + manejador global) | baja | bajo | `exitOnCtrlC` solo actúa con raw mode, que `check` no activa. Smoke de Ctrl+C |

### 1.8 Rollout

Directo: `moon run :link` o `moon run :build` en la máquina del autor.

### 1.9 Excepciones a la constitution

Ninguna.

---

## 2. Tasks

### Task 1 — Base ink: dependencias, marco, Spinner y entry de render

**Modelo**: Native, la sesión.
**Tests RED**: hilo principal, `src/ui/frame.test.tsx` y `src/ui/Spinner.test.tsx`, escritos antes del código y sin commitear.
**Superficies**: tooling y frontend de terminal.
**Verificación**: `sh -c 'bun test src/ui && bun run typecheck && bun run lint && echo ok'`
**Se prueba en la aplicación**: no, porque es base común: ningún comando usa todavía el marco ni el Spinner. Lo prueba la Task 2.

**Interfaces**:
- Consume: nada.
- Produce:
  - `renderApp(node: ReactElement): Promise<void>` en `src/ui/render.tsx`: `render(node)` de ink y `await waitUntilExit()`, y propaga el error con que salga la app.
  - `Intro({ title }: { title: string })`, que dibuja `┌   <title> ` en `src/ui/frame.tsx`.
  - `type LogKind = "step" | "info" | "success" | "error"` y `Log({ kind, children }: { kind: LogKind; children: ReactNode })`, que dibuja `│` y en la línea siguiente `<◇|●|◆|■>  <children>`.
  - `Outro({ children }: { children: string })`, que dibuja `│` y en la línea siguiente `└  <children>` atenuado.
  - `Spinner({ label }: { label: string })` en `src/ui/Spinner.tsx`, que dibuja `<frame>  <label>` con `useAnimation({ interval: 80 })` y los frames `["◒", "◐", "◓", "◑"]` en magenta.

**Ficheros**: crear `src/ui/render.tsx`, `src/ui/frame.tsx`, `src/ui/Spinner.tsx`, `src/ui/frame.test.tsx` y `src/ui/Spinner.test.tsx`. Modificar `package.json`, `bun.lock`, `tsconfig.json` y `eslint.config.js`.

- [ ] **Step 1: Dependencias y config.** `bun add ink@8.0.0 react@19.3.0 react-devtools-core@8.0.0` y `bun add -d @types/react@19.3.0`. Comprueba en `package.json` que no hay `^`. Luego `"jsx": "react-jsx"` en `tsconfig.json`, `files: ["src/**/*.{ts,tsx}"]` en `eslint.config.js` y `src/**/*.{ts,tsx,js,json}` en los scripts `lint` y `lint:fix`.
- [ ] **Step 2: Tests RED.** El helper, en cada test:

  ```ts
  const lines = (node: ReactElement) =>
    stripVTControlCharacters(renderToString(node)).split("\n").map((l) => l.trimEnd());
  ```

  - `frame.test.tsx` › `draws the intro like clack`: `lines(<Intro title="Checking for updates" />)` → `["┌   Checking for updates"]`.
  - `frame.test.tsx` › `draws each log kind with its symbol`: `lines(<Log kind="step">Found 1 update(s)</Log>)` → `["│", "◇  Found 1 update(s)"]`. Igual con `info` y `●  Summary: 1 available`, `success` y `◆  Everything is up to date!`, y `error` y `■  Provider "foo" not found`.
  - `frame.test.tsx` › `draws the outro`: `lines(<Outro>Done</Outro>)` → `["│", "└  Done"]`.
  - `Spinner.test.tsx` › `draws the first frame and the label`: `lines(<Spinner label="Checking for updates..." />)` → `["◒  Checking for updates..."]`.

  Ejecuta `bun test src/ui`. Esperado: FAIL porque los módulos no existen. Guarda una copia de los dos tests fuera del repo (scratchpad) para compararla al cerrar la task.
- [ ] **Step 3: Implementación** de las firmas de «Produce», con los colores de las Restricciones de código.
- [ ] **Step 4: Verificación.** `sh -c 'bun test src/ui && bun run typecheck && bun run lint && echo ok'`. Esperado: `ok`.
- [ ] **Step 5: Commit de la task**: `git diff --no-index` de los tests contra la copia y, después, `feat(ui): añadir la base de ink con el marco de clack, el Spinner y el entry de render`.

### Task 2 — `um check` y `um check <provider>` en ink

**Modelo**: Native, la sesión.
**Tests RED**: hilo principal, `src/ui/CheckApp.test.tsx`, escrito antes del código y sin commitear.
**Superficies**: frontend de terminal, CLI y build.
**Verificación**: `sh -c 'bun test src/ui && bun run typecheck && bun run lint && echo ok'`
**Se prueba en la aplicación**: sí. `bun run src/index.ts check` muestra `┌   Checking for updates`, el spinner, `◇  Found 1 update(s)`, `🥟 Bun (global)` con `• @railway/cli 5.63.4 → 5.64.0`, el resto con `✓`, `●  Summary: 1 available` y `└  Done`. `um check bun` muestra `◇  Bun (global): 1 update(s)`, y `um check foo` muestra `■  Provider "foo" not found`.

**Interfaces**:
- Consume (de la Task 1): `renderApp(node: ReactElement): Promise<void>`, `Intro({ title })`, `Log({ kind, children })` con `kind` `"step" | "info" | "success" | "error"`, `Outro({ children })` y `Spinner({ label })`.
- Produce:
  - En `src/types.ts`: `interface CheckFailure { providerName: string; message: string }` y `interface CheckResult { updates: PackageUpdate[]; checkedProviders: string[]; failures: CheckFailure[] }`.
  - En `src/ui/CheckApp.tsx`:
    - `interface CheckViewOptions { spinnerLabel: string; load: () => Promise<CheckResult>; doneMessage: (result: CheckResult) => string }`
    - `CheckReport({ doneMessage, result }: { doneMessage: string; result: CheckResult })`: puro; `Log step` con `doneMessage`, una línea vacía, los grupos, los `✓`, una línea vacía, `Log info` con `Summary: …` o `Log success` con `Everything is up to date!`, y `Outro` con `Done`. Es el `displayUpdates` de hoy en ink: mismo orden de grupos (por orden de aparición del provider en `updates`), la misma insignia de estado y el mismo `[source]` atenuado.
    - `CheckApp(props: CheckViewOptions)`: `Intro` con `Checking for updates`. Mientras carga, `│` y `Spinner` con `spinnerLabel`. Al resolver, escribe por `useStderr().write` una línea `  ⚠ <providerName>: <message>\n` por cada fallo, dibuja `CheckReport` y llama a `exit()`. Si `load` rechaza, `exit(error)`.
    - `CheckError({ message }: { message: string })`: `Intro` con `Checking for updates` + `Log error` con `message`.
    - `runCheckView(options: CheckViewOptions): Promise<void>`, que hace `renderApp(<CheckApp {...options} />)`.
    - `printCheckError(message: string): void`, que escribe `renderToString(<CheckError message={message} />)` + `"\n"` en stdout.
  - En `src/index.ts`: `collectUpdates(): Promise<CheckResult>`, que es el cuerpo de hoy de `checkAllProviders()` sin spinner ni `console.warn`, guardando cada fallo en `failures` con `provider.name` y `error.message` (o `"check failed"`).

**Ficheros**: crear `src/ui/CheckApp.tsx` y `src/ui/CheckApp.test.tsx`. Modificar `src/types.ts` y `src/index.ts`.

- [ ] **Step 1: Tests RED** con el mismo helper `lines` de la Task 1. Fixture: `const railway: PackageUpdate = { id: "@railway/cli", name: "@railway/cli", currentVersion: "5.63.4", newVersion: "5.64.0", provider: "bun", status: "available" }` y `const upToDate = ["proto", "moonrepo", "psmodules", "npm", "pnpm", "claude"]`.
  - `groups updates by provider`: `lines(<><Intro title="Checking for updates" /><CheckReport doneMessage="Found 1 update(s)" result={{ updates: [railway], checkedProviders: ["bun", ...upToDate], failures: [] }} /></>)` → `["┌   Checking for updates", "│", "◇  Found 1 update(s)", "", "🥟 Bun (global)", "   • @railway/cli 5.63.4 → 5.64.0", "🔧 Proto ✓", "🌙 Moonrepo ✓", "💠 PowerShell Modules ✓", "📦 npm (global) ✓", "📦 pnpm (global) ✓", "🤖 Claude CLI ✓", "", "│", "●  Summary: 1 available", "│", "└  Done"]`.
  - `marks pinned and unknown and sums them up`: winget `a` available, winget `b` pinned y npm `c` unknown. La línea de `b` acaba en `📌 pinned`, la de `c` en `❓ unknown`, y alguna línea es `●  Summary: 1 available | 1 pinned | 1 unknown`.
  - `says everything is up to date`: `updates: []` y `checkedProviders: upToDate`. Contiene `◇  Found 0 update(s)`, `🔧 Proto ✓` y `◆  Everything is up to date!`, no contiene ninguna línea que empiece por `●  Summary`, y la última es `└  Done`.
  - `checks a single provider`: `doneMessage="Bun (global): 1 update(s)"` y `checkedProviders: ["bun"]` → `["┌   Checking for updates", "│", "◇  Bun (global): 1 update(s)", "", "🥟 Bun (global)", "   • @railway/cli 5.63.4 → 5.64.0", "", "│", "●  Summary: 1 available", "│", "└  Done"]`.
  - `reports an unknown provider`: `lines(<CheckError message={'Provider "foo" not found'} />)` → `["┌   Checking for updates", "│", "■  Provider \"foo\" not found"]`, sin ninguna línea con `└`.
  - `lists a failed provider as checked`: `checkedProviders: ["bun", "pnpm"]`, `updates: [railway]` y `failures: [{ providerName: "pnpm (global)", message: "boom" }]`. Contiene `📦 pnpm (global) ✓` y `   • @railway/cli 5.63.4 → 5.64.0`, y ninguna línea contiene `boom`, porque el aviso va por stderr.
  - `writes one warning per failure`: `render(<CheckApp spinnerLabel="Checking for updates..." load={async () => result} doneMessage={() => "Found 1 update(s)"} />, { stdout, stderr, interactive: false })` con dos `Writable` en memoria y dos fallos (`pnpm (global)`/`boom` y `npm (global)`/`bang`). Tras `await waitUntilExit()`, stderr es `"  ⚠ pnpm (global): boom\n  ⚠ npm (global): bang\n"`.
  - `keeps long package lines whole when wrapped`: `renderToString(<CheckReport doneMessage="Found 1 update(s)" result={{ updates: [{ ...railway, name: "@a-very-long-scope/with-a-long-package-name" }], checkedProviders: ["bun"], failures: [] }} />, { columns: 40 })`. Con los saltos de línea y los espacios quitados, contiene `@a-very-long-scope/with-a-long-package-name5.63.4→5.64.0`.

  Ejecuta `bun test src/ui/CheckApp.test.tsx`. Esperado: FAIL porque `CheckApp.tsx` no existe. Guarda una copia fuera del repo.
- [ ] **Step 2: Tipos y `collectUpdates()`.** `CheckFailure` y `CheckResult` en `src/types.ts`. En `src/index.ts`, `collectUpdates()` y `checkAllProviders()` sobre ella: el mismo `p.spinner()`, `console.warn(pc.yellow(\`  ⚠ ${f.providerName}: ${f.message}\`))` por cada fallo y el mismo `spinner.stop`. La firma de retorno de `checkAllProviders()` no cambia para sus llamadores (`{ updates, checkedProviders }`).
- [ ] **Step 3: `src/ui/CheckApp.tsx`** con las firmas de «Produce».
- [ ] **Step 4: `checkCommand(providerId?)` en `src/index.ts`.** Sin `p.intro`, `p.spinner`, `displayUpdates` ni `p.outro`.
  - Sin provider: `runCheckView({ spinnerLabel: "Checking for updates...", load: collectUpdates, doneMessage: (r) => \`Found ${r.updates.length} update(s)\` })`.
  - Con un id desconocido: `printCheckError(\`Provider "${providerId}" not found\`)` y `return`, sin `updateLastCheck`, como hoy.
  - Con un id conocido: `runCheckView({ spinnerLabel: \`Checking ${provider.name}...\`, load: async () => ({ updates: await provider.checkUpdates(), checkedProviders: [providerId], failures: [] }), doneMessage: (r) => \`${provider.name}: ${r.updates.length} update(s)\` })`.
  - Después, en los dos casos que consultan, `await updateLastCheck()`.
- [ ] **Step 5: Verificación.** `sh -c 'bun test src/ui && bun run typecheck && bun run lint && echo ok'`. Esperado: `ok`.
- [ ] **Step 6: Ejecución real**, comparada con `develop-check.txt` del scratchpad:
  1. `bun run src/index.ts check` en terminal.
  2. `bun run src/index.ts check > out.txt; echo $?`. En `out.txt`, `grep -c $'\x1b\[1G\|◒\|◐\|◓\|◑'` → `0`; las líneas, las del primer escenario; y el código de salida, `0`.
  3. `bun run src/index.ts check bun` y `bun run src/index.ts check foo`.
  4. `bun run src/index.ts check < nul`.
  5. Un provider que lanza: una copia temporal con `checkUpdates` que lanza, sin commitear y revertida al acabar, con `check bun` → el error impreso por `main().catch` y el cursor visible.
  6. `moon run :build` y `.\bin\um.exe check`.

  Si el `.exe` falla por `yoga-layout` o `react-devtools-core`, freno de alcance.
- [ ] **Step 7: Commit de la task**: `git diff --no-index` de los tests contra la copia y, después, `feat(check): dibujar um check y um check <provider> con ink`.

---

## Estimación y esfuerzo

- Tipo: infra/tooling
- Esfuerzo spec + plan: 1 h
- Estimación de implementación: 3 h
- Base de la estimación: 2 tasks, una dependencia nueva recién publicada (ink 8.0.0) y el riesgo de `--compile`. El factor del estimation-log (0.18, n=1, infra/tooling) es orientativo y no se aplica con una sola muestra.
- Confianza: media

---

## 3. Validación final

- [ ] Gate de cierre, una vez y en el hilo principal: `moon run :lint :typecheck :test --force` (los 2 rojos de `parseProtoOutput` son deuda conocida) y `moon run :build`.
- [ ] Smoke con TTY: `.\bin\um.exe check` y Ctrl+C durante el spinner → `Cancelled`, código 0.
- [ ] Smoke sin TTY: `.\bin\um.exe check > out.txt`, comparado con la salida de `develop`.
- [ ] Spec satisfecha: cada requisito tiene su task (ver §4).
- [ ] Cierre con `sdd-end-feature`.

---

## 4. Self-review (cobertura spec → tasks)

- Resultado agrupado por provider (3 escenarios) → Task 2, `groups updates by provider`, `marks pinned and unknown and sums them up` y `says everything is up to date`. ✓
- Check de un provider (conocido y desconocido) → Task 2, `checks a single provider` y `reports an unknown provider`. Ejecución real en el Step 6.3. ✓
- Progreso mientras se consulta → Task 1, `draws the first frame and the label`. La rotación y el cambio a `◇` se comprueban en la ejecución real (Task 2, Step 6.1). ✓
- Sin terminal interactiva → Task 2, Step 6.2 (ejecución real), y §3. ✓
- Ctrl+C cancela → manejador global existente, sin cambios (enmienda). Ejecución real en §3. ✓
- Un provider que falla no tumba el check → Task 2, `lists a failed provider as checked` y `writes one warning per failure`. ✓
- Base: deps, entry, Spinner y `--compile` → Task 1 y Task 2, Step 6.6. ✓
- Review Focus → Task 2: `keeps long package lines whole when wrapped`, `writes one warning per failure` y Step 6.4 y 6.5. ✓
