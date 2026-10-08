---
id: 20261008-165945-feature-0007-ink-menu-providers-ignore
feature: 0007
proposal: 0004
title: Menú interactivo, `providers` e `ignore` en ink; fuera `@clack/prompts`
mode: full
status: approved
created: 2026-10-08
author: Claude (sdd-start-feature)
approvers:
  - role: dev-lead
    name: Àngel Delgado
    approved_at: 2026-10-08
---

# Spec — Menú interactivo, `providers` e `ignore` en ink; fuera `@clack/prompts`

> **Estado**: approved.
> **Siguiente paso**: `plan.md` con `superpowers:writing-plans`.

## Capacidades

- Nuevas: `interactive-menu` — qué muestra y qué hace `um` a secas: el menú, sus opciones, la salida, el comportamiento sin TTY y la cancelación.
- Nuevas: `settings` — `um providers` (listar, `enable`, `disable`), `um ignore`, `um unignore`, `um ignored` y la opción «Manage providers» del menú.

## Decisiones que he tomado yo — valida estas

```text
Review de spec propuesta: ninguna — señales: capacidad nueva (`interactive-menu`, `settings`) · tamaño: ~450 líneas en ~12 ficheros
- Mínimo razonable: ninguna — deja sin mirar, por otra mano, si los THEN del menú y de «Manage providers» calcan bien el select y el multiselect de clack. Lo cubren los tests de los THEN y el smoke comparado con develop
```

1. **Dos capacidades nuevas: `interactive-menu` y `settings`.** La proposal 0004 dejaba a cada feature crear la suya. `settings` documenta `providers`, `ignore`, `unignore` e `ignored`, que no tenían capacidad, más el «Manage providers» del menú, que cambia los mismos datos.
2. **Cada opción del menú monta la misma vista que su comando, con su propio marco.** «Check for updates» monta la vista de `um check`; «Update all», la de `um update`; «Update by provider», tras elegir el provider, la de `um update <provider>`. Cada una abre con su `┌` y cierra con su `└  Done`, y debajo vuelve el menú. Alternativa descartada: una sola app de ink para toda la sesión, con un único marco `┌ Update Manager … └`. Calca mejor el marco continuo de clack, pero obliga a reescribir `runUpdateFlow` para que no abra ni cierre su marco, y la 0006 lo dejó probado tal como está. El contenido de cada opción no cambia; cambia dónde empieza y acaba cada marco.
3. **El menú usa los flujos de ink, no los de clack.** «Update all» y «Update by provider» enseñan la lista antes de la selección y el progreso por paquete, igual que `um update`. En `develop` el menú iba directo a la selección y usaba los spinners de clack. Es lo que pide la proposal: el menú adopta los flujos que ya dejó la 0006.
4. **Select propio, plano.** Calcado del select de clack: `●` verde en la opción bajo el cursor y `○` atenuado en el resto. Teclas: ↑/↓ con vuelta y Enter. Esc no se atiende: en `develop` cerraba el menú con `Bye! 👋`, y no entra. Lo usan el menú y «Select provider to update».
5. **«Manage providers» no reutiliza `MultiSelect` tal cual.** Hoy está tipado a `PackageUpdate`, agrupa por provider, usa la clave `provider:id` y empieza con todo marcado. Los providers son una lista plana que empieza con los activos marcados. Se saca de `MultiSelect` su núcleo genérico (cursor, espacio, `a`, Enter) y queda en dos usos: el agrupado de `update`, con la misma API y sus tests de la 0006 sin cambios, y el plano de providers. Así no se duplica la lógica de teclado.
6. **«Manage providers» exige al menos uno marcado, como en `develop`.** El multiselect de clack lleva `required` por defecto. Enter con todo desmarcado no confirma y muestra `Please select at least one option.` en amarillo.
7. **Ctrl+C en cualquier punto del menú imprime `Cancelled` y sale con 0.** Es la regla de la proposal. En `develop`, Ctrl+C en el menú imprimía `Bye! 👋`, y en «Manage providers» o «Select provider to update» volvía al menú. `Bye! 👋` queda solo para la opción «Exit».
8. **La guarda de TTY de `um` a secas es la de `updateCommand`.** stdin y stdout TTY a la vez; si no, imprime por stderr, en texto plano, y sale con 1, antes de `console.clear()` y de montar nada. El mensaje es `Interactive terminal required (see um --help)`: el `(use --yes)` de `update` no sirve aquí, porque `um --yes` también entra en el menú.
9. **`providers`, `ignore`, `unignore` e `ignored` no se tocan.** Ya no usan clack (son `console.log` con picocolors) y ya funcionan sin TTY. Pasarlas a ink o al marco de `frame.tsx` cambiaría su salida sin ganar nada, y la regla es «misma salida». La spec las documenta en `settings` y el smoke las verifica.
10. **Se borra lo que deja sin uso la salida de clack.** De `src/index.ts`: `checkInteractive`, `checkAllProviders`, `formatStatus`, `displayUpdates`, `selectUpdates`, `updateInteractive` y `performUpdates`. `@clack/prompts` sale de `package.json` y de `bun.lock`. Para que `grep clack src` salga vacío, cambian también el comentario de `frame.tsx` y el nombre de un test de `frame.test.tsx` que mencionan clack.
11. **`Answer` sale de `UpdateApp.tsx` a `frame.tsx`.** El menú lo usa para dejar escrita cada respuesta (`◇  <pregunta>` y `│  <respuesta>`), igual que la 0006.
12. **Docs**: `tech-stack.md` (la UI de terminal es ink; fuera la fila de clack), `architecture.md` (piezas, flujo y la decisión estructural de clack, que pasa a superada) y `mission.md`, cuya definición dice «Bun + @clack/prompts». `mission.md` no está en el enunciado, pero diría algo falso.
13. **Deuda que no se toca** (se compara con `develop`): `um update --yes` sin provider; `check/update <provider>` y «Update by provider» sin filtrar ignorados ni `installedVersions`; WinGet ausente; el `[WARN]` de pnpm y de proto; `VERSION = "0.1.0"`; partir `index.ts`.
14. **«Update by provider» comprueba `isAvailable` de cada provider activo antes de enseñar el select, sin spinner, como en `develop`.**
15. **Repaso de coherencia**: los literales `Interactive terminal required (see um --help)`, `Please select at least one option.`, `What would you like to do?`, `Select provider to update` y `Toggle providers (space to select, enter to confirm)` son iguales en decisiones y escenarios. No hay `MODIFIED`: `update-check` y `package-update` no cambian; el menú monta sus vistas sin tocarlas.

### Decisiones tomadas con el dev-lead

- Modo full y perfil `delegate` del proyecto — «Full + delegate (Recomendada)».

## Intent

`um` a secas abre un menú de `@clack/prompts` que todavía llama a los flujos de clack (`checkAllProviders`, `selectUpdates`, `performUpdates`), duplicados de los de ink que dejaron la 0005 y la 0006. Es la última feature de la proposal 0004: el menú y «Manage providers» pasan a ink con un Select y una lista de marcar propios, el menú usa los flujos de ink de `check` y `update`, y `@clack/prompts` sale del proyecto junto con el código que deja sin uso.

## Scope

- Entra: `interactiveMode`, `updateByProviderInteractive` y `providersInteractive` en ink (`src/index.ts`).
- Entra: Select propio y el núcleo genérico de `MultiSelect` en `src/ui/`, con sus tests.
- Entra: la guarda de TTY de `um` a secas y Ctrl+C en el menú.
- Entra: mover `Answer` a `frame.tsx`; el comentario de `frame.tsx` y el nombre del test de `frame.test.tsx` que mencionan clack.
- Entra: borrar de `src/index.ts` las funciones de la decisión 10, y `@clack/prompts` de `package.json` y `bun.lock`.
- Entra: `tech-stack.md`, `architecture.md` y `mission.md`.
- No entra: `providersCommand`, `ignoreCommand`, `unignoreCommand` y `listIgnoredCommand` (decisión 9).
- No entra: `runUpdateFlow`, `CheckApp` ni las capacidades `update-check` y `package-update`.
- No entra: `src/runner.ts` ni los providers.
- No entra: la deuda de la decisión 13.

## Approach

`um` a secas comprueba la guarda de TTY, limpia la pantalla y escribe el `Intro` `Update Manager`. Luego entra en un bucle: monta con `renderApp` un prompt de ink con el Select del menú, que deja escrita la respuesta al desmontar. Según la opción, monta la vista que ya existe (`runCheckView` o `runUpdateView`, con las mismas opciones que su comando) o un segundo prompt (el Select de provider o la lista de providers), y vuelve al bucle. Cada prompt captura Ctrl+C como la vista de update: imprime `Cancelled` y sale con 0. `index.ts` sigue sin JSX: le pasa a `src/ui/` las opciones y recibe la respuesta. Con el menú fuera de clack, se borran el import, las funciones de clack y la dependencia.

## Delta de comportamiento

### Capacidad: `interactive-menu`

**ADDED — Menú principal**
- GIVEN una terminal interactiva
- WHEN `um`
- THEN se limpia la pantalla y se ve `┌   Update Manager `, `│`, `◆  What would you like to do?` y debajo `│  ● 🔍 Check for updates`, `│  ○ 🔄 Update all`, `│  ○ 📦 Update by provider`, `│  ○ ⚙️  Manage providers` y `│  ○ 🚪 Exit`; y cierra con `└`
- AND la opción bajo el cursor lleva `●` verde y el resto `○` atenuado; el cursor empieza en la primera, ↑/↓ lo mueven con vuelta (↑ en la primera va a «Exit») y Enter elige
- AND al elegir, el menú queda escrito como `◇  What would you like to do?` y `│  <opción elegida>`, p. ej. `│  🔍 Check for updates`

**ADDED — Check desde el menú**
- GIVEN el menú y Bun con 1 update (`@railway/cli` 5.63.4 → 5.64.0) y el resto de providers al día
- WHEN el usuario elige «Check for updates»
- THEN se ve la misma vista que `um check`: `┌   Checking for updates `, el spinner `Checking for updates...`, `◇  Found 1 update(s)`, `🥟 Bun (global)` con `   • @railway/cli 5.63.4 → 5.64.0`, los providers al día con `✓`, `●  Summary: 1 available` y `└  Done`
- AND se guarda `lastCheck` y debajo vuelve el menú

**ADDED — Update all desde el menú**
- GIVEN el menú y 1 update de Bun en una terminal interactiva
- WHEN el usuario elige «Update all»
- THEN se ve la misma vista que `um update`: `┌   Updating packages `, la lista, la selección agrupada con todo marcado, el progreso y `●  Result: ✓ 1 updated` y `└  Done`
- AND al terminar, o con `└  Cancelled` si desmarca todo, debajo vuelve el menú

**ADDED — Update by provider desde el menú**
- GIVEN WinGet y Bun activos e instalados, Proto activo sin instalar y npm desactivado
- WHEN el usuario elige «Update by provider»
- THEN se ve `◆  Select provider to update` con `│  ● 📦 WinGet` y `│  ○ 🥟 Bun (global)`, solo los activos e instalados
- AND al elegir Bun queda escrito `◇  Select provider to update` y `│  🥟 Bun (global)`, y se ve la misma vista que `um update bun`; al terminar, debajo vuelve el menú
- GIVEN ningún provider activo e instalado
- WHEN el usuario elige «Update by provider»
- THEN se ve `│` y `▲  No providers available`, y debajo vuelve el menú

**ADDED — Salir**
- GIVEN el menú
- WHEN el usuario elige «Exit»
- THEN queda escrito `◇  What would you like to do?` y `│  🚪 Exit`, se ve `│` y `└  Bye! 👋`, y sale con 0

**ADDED — Sin TTY**
- GIVEN stdin sin TTY
- WHEN `um < nul`
- THEN se imprime `Interactive terminal required (see um --help)` por stderr, sin marco ni escapes, no se limpia la pantalla y sale con 1
- AND lo mismo con stdout sin TTY (`um > out.txt`)

**ADDED — Ctrl+C cancela**
- GIVEN el menú, el select de provider o la lista de «Manage providers» esperando teclado
- WHEN el usuario pulsa Ctrl+C
- THEN se ve `Cancelled`, no se guarda nada en la config y sale con 0
- AND dentro de las vistas de check y update, Ctrl+C se comporta como en `um check` y `um update` (`Cancelled`, código 0)

### Capacidad: `settings`

**ADDED — Activar y desactivar providers desde el menú**
- GIVEN WinGet, Proto y Bun instalados y activos, npm instalado y desactivado, y Chocolatey sin instalar y desactivado
- WHEN el usuario elige «Manage providers»
- THEN se ve `◆  Toggle providers (space to select, enter to confirm)` y una fila por provider registrado, en el orden del registro: `│  ◼ 📦 WinGet (enabled)` con `(enabled)` en verde, `│  ◻ 📦 npm (global) (disabled)` y `│  ◻ 🍫 Chocolatey (not installed)` con el estado atenuado; y cierra con `└`
- AND empiezan marcados los activos; ↑/↓ mueven el cursor con vuelta, espacio marca o desmarca, `a` marca o desmarca todos, y la fila bajo el cursor sale en cian
- AND la fila de un provider sin instalar, con el cursor encima, añade `(not available)` atenuado
- WHEN el usuario marca npm, desmarca Proto y pulsa Enter
- THEN queda escrito `◇  Toggle providers` y `│  WinGet, Bun (global), npm (global)` (los marcados, en el orden de la lista), se ve `◆  Providers updated` y debajo vuelve el menú
- AND en `config.json` npm queda `enabled: true`, Proto `enabled: false` y el resto como estaba
- GIVEN la misma lista
- WHEN el usuario pulsa `a` hasta que todas quedan `◻` y pulsa Enter
- THEN la lista sigue abierta, se ve `Please select at least one option.` en amarillo y no se guarda nada

**ADDED — Listar providers sin TTY**
- GIVEN WinGet instalado y activo, npm instalado y desactivado, y Chocolatey sin instalar
- WHEN `um providers > out.txt`
- THEN `out.txt` contiene una vacía, `Providers:`, una vacía y una fila por provider registrado, como `  📦 WinGet               enabled`, `  📦 npm (global)         disabled` y `  🍫 Chocolatey           not installed` (nombre relleno a 20), y una vacía; sin escapes de color ni de cursor, y sale con 0

**ADDED — Activar y desactivar un provider por comando**
- GIVEN Chocolatey desactivado
- WHEN `um providers enable chocolatey`
- THEN se imprime `✓ chocolatey enabled`, `config.json` lo deja `enabled: true` y sale con 0
- AND `um providers disable chocolatey` imprime `✓ chocolatey disabled` y lo deja `enabled: false`
- AND `um providers foo` imprime `Unknown action: foo`

**ADDED — Ignorar y dejar de ignorar paquetes**
- GIVEN ningún paquete ignorado y sin TTY
- WHEN `um ignore Smoke.Test > out.txt`
- THEN `out.txt` contiene `✓ Smoke.Test added to ignore list`, `config.json` lo añade a `ignoredPackages` y sale con 0
- WHEN después `um ignored > out.txt`
- THEN `out.txt` contiene una vacía, `Ignored packages:`, una vacía, `  • Smoke.Test` y una vacía
- WHEN después `um unignore Smoke.Test > out.txt`
- THEN `out.txt` contiene `✓ Smoke.Test removed from ignore list` y `ignoredPackages` ya no lo lleva
- AND `um ignored` sin paquetes ignorados imprime `No packages ignored`
- AND `um ignore` sin id imprime `Usage: um ignore <package-id>` y `Example: um ignore Google.GooglePlayGames`; `um unignore` sin id, `Usage: um unignore <package-id>`

## Enmiendas

_Ninguna._

## Aprobaciones

| Rol | Nombre | Fecha | Estado |
| --- | --- | --- | --- |
| dev-lead | Àngel Delgado | 2026-10-08 | aprobada: «Apruebo (Recomendada)» |
