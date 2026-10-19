---
id: 20261008-150312-feature-0005-ink-base-check
feature: 0005
proposal: 0004
title: Base ink + `um check`
mode: full
status: approved
created: 2026-10-08
author: Claude (sdd-start-feature)
approvers:
  - role: dev-lead
    name: Àngel Delgado
    approved_at: 2026-10-08
---

# Spec — Base ink + `um check`

> **Estado**: approved.
> **Siguiente paso**: `plan.md` con `superpowers:writing-plans`.

## Capacidades

- Nuevas: `update-check` — qué muestra `um check` y `um check <provider>`, con TTY y sin él, y cómo se cancela.

## Decisiones que he tomado yo — valida estas

```text
Review de spec propuesta: ninguna — señales: capacidad nueva (`update-check`), dependencia externa (ink, React, react-devtools-core) · tamaño: ~350 líneas en ~9 ficheros
- Mínimo razonable: ninguna — deja sin mirar por otra mano si los THEN de «Misma salida» calcan bien el marco de clack; lo cubren los tests de los THEN y el smoke contra la salida de develop
```

1. **Capacidad nueva `update-check`.** La proposal 0004 la anticipaba. Cubre `um check` y `um check <provider>`. El menú interactivo («Check for updates») y `um update` siguen en @clack/prompts y no entran en ella hasta la 0006 y la 0007.
2. **Versiones exactas.** Dependencias: `ink` 8.0.0, `react` 19.3.0 y `react-devtools-core` 8.0.0. Dependencia de desarrollo: `@types/react` 19.3.0. Las versiones son las `latest` de npm a 2026-10-08 y cumplen los peers de ink (`react >=19.3.0`, `react-devtools-core >=6.1.2`). Ojo: ink 8.0.0 salió el 2026-10-03, hace 5 días.
3. **Marco calcado de clack.** Se dibujan `┌`, `│`, `◇`, `●`, `◆`, `■` y `└` con el mismo espaciado y el mismo contenido que hoy. El spinner usa los mismos frames (`◒◐◓◑`, 80 ms). Así `check` se ve igual que los comandos que siguen en clack mientras conviven, y la 0006 y la 0007 reutilizan el marco.
4. **Sin TTY, el modo no interactivo de ink.** Con stdout sin TTY (o en CI), ink no anima: escribe solo el último frame al desmontar, sin secuencias de borrado. No hace falta lógica propia. Es una mejora sobre `develop`: hoy `um check > out.txt` mete en el fichero todos los frames del spinner con `ESC[1G ESC[J`.
5. **Ctrl+C lo sigue resolviendo el manejador global de `src/index.ts`** (`Cancelled` atenuado y `process.exit(0)`), que ya existe. Hoy, además, el spinner de clack añade su `Canceled`. Con ink desaparece, porque `check` ya no usa ese spinner. El entry de render no registra su propio `SIGINT` (enmienda del 2026-10-08).
6. **La consulta se separa del dibujo.** `checkAllProviders` (`src/index.ts`) parte su lógica, consultar, filtrar ignorados e `installedVersions` y juntar los fallos, en una función sin spinner ni `console`, que usan las dos UIs. El camino de clack (`um update`, menú) conserva su spinner y su `console.warn`. No es refactor oportunista: ink no puede dibujar desde dentro de una función que escribe en la consola.
7. **`displayUpdates` queda duplicada hasta la 0007.** La versión de clack sigue para `um update` y el menú. La de ink vive en `src/ui/`. La 0007 borra la de clack junto con @clack/prompts.
8. **El aviso de fallo de un provider sigue en stderr.** Se escribe `  ⚠ <nombre>: <mensaje>` igual que hoy (`console.warn`), así que `um check > out.txt` tampoco lo mete en el fichero.
9. **`check <provider>` conserva lo que hace hoy.** No filtra ignorados ni `installedVersions` (deuda del roadmap). Consulta el provider aunque no esté disponible. Si el provider lanza, el error no se captura. Con un id desconocido escribe `■  Provider "<id>" not found` sin `└  Done` y sale con 0.
10. **JSX en `.tsx` bajo `src/ui/`.** `tsconfig.json` pasa a `"jsx": "react-jsx"`. `eslint` (`files`) y `prettier` (los globs de `lint` y `lint:fix`) añaden `tsx`. Son los cambios mínimos para que lint y typecheck vean los ficheros nuevos.
11. **Tests con `renderToString` de ink**, sin `ink-testing-library` (parada desde 2024-05). Los THEN de contenido se prueban sobre la vista con datos fijos. El sin-TTY y el Ctrl+C se prueban con ejecución real en el smoke: el proyecto no tiene tests de procesos (tech-stack, «Testing»).
12. **`tech-stack.md` y `architecture.md`** se ponen al día en el cierre: ink, React y `src/ui/`.

### Decisiones tomadas con el dev-lead

- Carril feature, modo full, entera, perfil `delegate` (del proyecto) — «Sí: full, delegate (Recommended)».
- El marco de `um check` en ink calca el de @clack/prompts — «Calcar el marco de clack (Recommended)».

## Intent

`um check` se dibuja con @clack/prompts, que solo ofrece prompts sueltos y un spinner. La proposal 0004 migra la CLI a ink 8 en tres features. Esta es la primera. Deja la base (dependencias, entry de render, compilación a `.exe` y un Spinner propio) y migra el comando más sencillo, que no pregunta nada. El contenido de `um check` no cambia, solo cómo se dibuja. Sin TTY, el fichero recibe solo el resultado, y Ctrl+C cancela limpio.

## Scope

- Entra:
  - `package.json` y `bun.lock`: ink, React, react-devtools-core, @types/react y los globs de `lint`/`lint:fix`.
  - `tsconfig.json` (`jsx`) y `eslint.config.js` (`files` con `tsx`).
  - `src/ui/`: entry de render, Spinner, marco de clack y vista de `check`, con sus tests.
  - `src/index.ts`: `checkCommand` dibuja con ink y la consulta se separa de `checkAllProviders`.
  - `bun build --compile` (`moon run :build`) genera un `bin/um.exe` que funciona con ink.
- No entra:
  - El menú interactivo, `um update`, `providers` e `ignore`/`unignore`/`ignored`: siguen en @clack/prompts hasta la 0006 y la 0007.
  - Los bugs conocidos que salen en `um check`: WinGet no aparece, `[WARN] Using → skips` de pnpm y el python con sufijo de build de proto. Tienen fila de deuda propia, y la salida se compara con la de `develop`, no con la ideal.
  - El filtro de ignorados en `check <provider>` (deuda).
  - `@inkjs/ui` e `ink-testing-library`.
  - Los 2 tests en rojo de `parseProtoOutput` (deuda).

## Approach

`checkCommand` deja de usar clack y llama al entry de render con un componente de ink. El componente arranca la consulta al montarse y muestra el Spinner mientras dura. Al terminar, dibuja el resultado con el marco calcado de clack y desmonta la app. El entry espera a que la app termine. Ctrl+C lo resuelve el manejador global de `SIGINT` que ya existe en `src/index.ts`. La detección de TTY la hace ink. La consulta es una función sin UI, extraída de `checkAllProviders`, que también usa el camino de clack. La vista del resultado es un componente puro que recibe los datos, para probarla con `renderToString`.

## Delta de comportamiento

### Capacidad: `update-check`

**ADDED — Resultado agrupado por provider**

- GIVEN Bun con 1 update (`@railway/cli` 5.63.4 → 5.64.0) y Proto, Moonrepo, PowerShell Modules, npm, pnpm y Claude CLI al día
- WHEN `um check`
- THEN la salida final, sin colores, son estas líneas en este orden: `┌   Checking for updates `, `│`, `◇  Found 1 update(s)`, una vacía, `🥟 Bun (global)`, `   • @railway/cli 5.63.4 → 5.64.0`, `🔧 Proto ✓`, `🌙 Moonrepo ✓`, `💠 PowerShell Modules ✓`, `📦 npm (global) ✓`, `📦 pnpm (global) ✓`, `🤖 Claude CLI ✓`, una vacía, `│`, `●  Summary: 1 available`, `│` y `└  Done`
- AND sale con código 0

- GIVEN WinGet con 1 update `available` y 1 `pinned`, y npm con 1 `unknown`
- WHEN `um check`
- THEN la línea del paquete fijado acaba en `📌 pinned` y la del desconocido en `❓ unknown`
- AND el resumen es `●  Summary: 1 available | 1 pinned | 1 unknown`

- GIVEN ningún provider con updates
- WHEN `um check`
- THEN se ve `◇  Found 0 update(s)`, cada provider con `✓` y `◆  Everything is up to date!` en lugar del resumen, y acaba en `└  Done`

**ADDED — Check de un provider**

- GIVEN Bun con 1 update (`@railway/cli` 5.63.4 → 5.64.0)
- WHEN `um check bun`
- THEN la salida final es `┌   Checking for updates `, `│`, `◇  Bun (global): 1 update(s)`, una vacía, `🥟 Bun (global)`, `   • @railway/cli 5.63.4 → 5.64.0`, una vacía, `│`, `●  Summary: 1 available`, `│` y `└  Done`

- GIVEN ningún provider con id `foo`
- WHEN `um check foo`
- THEN se ve `┌   Checking for updates `, `│` y `■  Provider "foo" not found`, sin `└  Done`
- AND sale con código 0

**ADDED — Progreso mientras se consulta**

- GIVEN una terminal interactiva
- WHEN `um check` está consultando
- THEN se ve una sola línea `<frame>  Checking for updates...`, cuyo frame rota entre `◒ ◐ ◓ ◑` en su sitio
- AND al terminar esa línea pasa a `◇  Found <n> update(s)`; con `um check <provider>` dice `Checking <nombre>...` y pasa a `◇  <nombre>: <n> update(s)`

**ADDED — Sin terminal interactiva**

- GIVEN la máquina del primer escenario
- WHEN `um check > out.txt`
- THEN `out.txt` contiene las líneas del primer escenario, sin ningún frame del spinner (`◒`, `◐`, `◓`, `◑`) ni secuencias de borrado (`ESC[1G`, `ESC[J`)
- AND el proceso termina solo, sin esperar teclado, con código 0

**ADDED — Ctrl+C cancela**

- GIVEN `um check` consultando, en una terminal interactiva
- WHEN el usuario pulsa Ctrl+C
- THEN se ve `Cancelled`, no se ve el resumen ni `└  Done`, y sale con código 0

**ADDED — Un provider que falla no tumba el check**

- GIVEN pnpm lanza `boom` en su consulta y Bun tiene 1 update
- WHEN `um check`
- THEN stderr recibe `  ⚠ pnpm (global): boom`
- AND stdout lista Bun con su update y `📦 pnpm (global) ✓`, como hoy, y acaba en `└  Done`

**Reglas de la capacidad**

- **Dónde viven los datos**: el estado de cada paquete lo da el gestor en cada ejecución. `um check` solo guarda `lastCheck` en `~/.config/update-manager/config.json`.
- **Idioma de los nombres**: mensajes al usuario en inglés; ids de provider en minúsculas y en inglés.
- **Límites**: 60 s por comando por defecto y 120 s el check de WinGet.
- **Avisos**: fallo de check de un provider (`⚠`, por stderr), y se sigue con el resto.
- **Regla ante conflicto**: en `um check` sin provider, si la versión nueva coincide con `installedVersions[id]`, el paquete se omite. `um check <provider>` no aplica el filtro (deuda).

## Enmiendas

- 2026-10-08 — El entry de render no gestiona `SIGINT`: Ctrl+C lo sigue resolviendo el manejador global que ya existe al final de `src/index.ts` (`Cancelled` atenuado y `process.exit(0)`). El Scope pasa de «entry de render (`SIGINT` incluido)» a «entry de render». La decisión 5 se corrige: hoy Ctrl+C en `check` ya escribe `Cancelled` y sale con 0, y además el spinner de clack añade su `Canceled`, que desaparece con ink. El THEN de «Ctrl+C cancela» no cambia — al preparar el plan se vio que la decisión 5 describía mal el comportamiento actual — aprobada: «Apruebo (Recommended)»

## Aprobaciones

| Rol | Nombre | Fecha | Estado |
| --- | --- | --- | --- |
| dev-lead | Àngel Delgado | 2026-10-08 | aprobada: «Apruebo (Recommended)» |
