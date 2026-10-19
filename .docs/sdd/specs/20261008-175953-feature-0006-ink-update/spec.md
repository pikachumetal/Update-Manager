---
id: 20261008-175953-feature-0006-ink-update
feature: 0006
proposal: 0004
title: "`um update` en ink"
mode: full
status: approved
created: 2026-10-08
author: Claude (sdd-start-feature)
approvers:
  - role: dev-lead
    name: Àngel Delgado
    approved_at: 2026-10-08
---

# Spec — `um update` en ink

> **Estado**: approved.
> **Siguiente paso**: `plan.md` con `superpowers:writing-plans`.

## Capacidades

- Nuevas: `package-update` — qué muestra y qué hace `um update` y `um update <provider>`: la consulta, la selección, force y gsudo, el progreso por paquete, el resultado, el comportamiento sin TTY y la cancelación.

## Decisiones que he tomado yo — valida estas

```text
Review de spec propuesta: ninguna — señales: capacidad nueva (`package-update`) · tamaño: ~600 líneas en ~10 ficheros
- Mínimo razonable: ninguna — deja sin mirar, por otra mano, si los THEN de la selección y del progreso calcan bien el marco de clack. Lo cubren los tests de los THEN y el smoke comparado con develop
```

1. **Capacidad nueva `package-update`.** La anticipaba la proposal 0004. Cubre `um update` y `um update <provider>`. Las entradas del menú interactivo («Update all», «Update by provider») no entran en ella (decisión 2).
2. **El menú interactivo sigue con el flujo de clack hasta la 0007.** `updateInteractive` y `updateByProviderInteractive` llaman todavía a `selectUpdates`, `performUpdates` y `displayUpdates` de clack. Así no se mezclan en la misma sesión el bucle de `p.select` de clack y un `render` de ink, que compiten por el modo raw de stdin. Tampoco sale un marco `┌ … └` de ink en mitad del menú de clack. Coste: esas tres funciones quedan duplicadas una feature más. La 0007 las borra junto con `@clack/prompts`.
3. **«Hay TTY» quiere decir que stdin y stdout son TTY a la vez.** Sin stdin no hay teclado. Sin stdout TTY, ink no repinta (modo no interactivo: solo escribe el último frame) y la selección no se vería mientras espera.
4. **La guarda de TTY va lo primero.** `um update [provider]` sin `--yes` y sin TTY imprime `Interactive terminal required (use --yes)` por stderr, en texto plano y sin marco, y sale con 1. No consulta nada antes: si no se puede elegir, no tiene sentido esperar hasta 120 s al check de WinGet. Por eso `um update foo < nul` también da este mensaje, no el de provider no encontrado.
5. **`--yes` se salta la selección, no la confirmación de force.** Con TTY, el Confirm de force y el de gsudo se piden igual que hoy en `develop` (art. 8 de la constitution). Sin TTY no hay a quién preguntar: force y gsudo se responden «no». Los `pinned` y `unknown` cuentan como `⊘ skipped` y no se instala gsudo. Es comportamiento nuevo: en `develop`, el `p.confirm` de clack sin TTY no tiene un resultado definido.
6. **MultiSelect agrupado propio.** Cabecera por provider (`<icono> <nombre>`) y, debajo, sus paquetes con `◼` (marcado) o `◻` (desmarcado), todos marcados al empezar. El cursor solo se posa en paquetes, no en cabeceras. Teclas: ↑/↓ para mover, espacio para marcar o desmarcar, `a` para marcar o desmarcar todos (como la `a` de clack) y Enter para confirmar. Marcar un grupo entero desde su cabecera no entra.
7. **Confirm propio, calcado del de clack.** `● Yes / ○ No`, con Yes por defecto. ←/→ o `y`/`n` para elegir y Enter para confirmar. Al responder queda `◇  <pregunta>` y debajo `│  Yes` o `│  No`.
8. **La vista de progreso sustituye a los spinners de clack de `performUpdates`.** Se ven a la vez todas las filas, agrupadas por provider como hoy. El progreso es por estado y no por porcentaje: `runCommand` lee stdout al final y no se toca, así que no hace falta streaming.
9. **Ctrl+C en cualquier momento de `um update` imprime `Cancelled` y sale con 0.** Con ink, mientras escucha el teclado, Ctrl+C no llega como `SIGINT`. La vista lo captura y termina igual que el manejador global de `src/index.ts`. Si hay una actualización en curso, el proceso del gestor no se espera (hoy tampoco).
10. **El marco reutiliza lo de la 0005.** `renderApp` (con `patchConsole: false`), `Intro`, `Log`, `Outro`, `Spinner` y `collectUpdates()`. Las piezas de la lista agrupada de `CheckApp.tsx` (grupo, provider al día y resumen) se exportan para que `update` no las copie. `Log` gana el tipo `warn` (`▲` amarillo, el de `p.log.warn`), y el error de provider no encontrado acepta el título del marco.
11. **Deuda que no se toca** (se compara con `develop`, no con la salida ideal): `um update --yes` sin provider sigue fallando con `Provider "--yes" not found`; `update <provider>` sigue sin filtrar ignorados ni `installedVersions`; WinGet ausente; el `[WARN]` de pnpm y de proto. Además, como en `develop`, si el check del provider lanza en `update <provider>`, el error no se captura.
12. **Sin `@inkjs/ui` y sin dependencias nuevas.** Basta con ink 8 (`useInput`, `useApp`), que ya está.
13. **Símbolos de las filas de progreso**: `<frame>` del Spinner para `updating`, `…` atenuado para `queued`, `✓` verde y `✗` rojo. El motivo de `✗` es `failed` si `updatePackage` devuelve `false`, y el mensaje del error si lanza, como hoy.
14. **Repaso de coherencia**: añadí a la decisión 11 que, en `update <provider>`, el error del check sigue sin capturarse, como en `develop`. No hay `MODIFIED`: `update-check` no cambia.

## Intent

`um update` dibuja hoy con `@clack/prompts`: una lista de selección plana y un spinner por paquete que solo dice que algo pasa. Una actualización de WinGet tarda hasta 300 s y no se ve qué queda en cola. La feature pasa `um update` y `um update <provider>` a ink, con la base que dejó la 0005: una selección agrupada por provider, confirmaciones propias y una fila por paquete con su estado (absorbe la 0003). La salida conserva el contenido de hoy, y el comando funciona sin TTY con `--yes`.

## Scope

- Entra: `um update` y `um update <provider>` en ink (`src/index.ts#updateCommand`).
- Entra: MultiSelect agrupado, Confirm y vista de progreso en `src/ui/`, con sus tests.
- Entra: la guarda de TTY, Ctrl+C y el resultado.
- Entra: exportar de `CheckApp.tsx` las piezas de la lista agrupada, `warn` en `Log` y el título del error de provider.
- Entra: `architecture.md` («Flujo principal», paso 4-5) y `tech-stack.md` (UI de terminal), para decir que `update` va en ink.
- No entra: el menú interactivo, `providers` e `ignore` (siguen en clack hasta la 0007).
- No entra: `runCommand` ni `runPowerShell` (`src/runner.ts`), ni `updatePackage` de los providers.
- No entra: la deuda de la decisión 11.
- No entra: una barra de porcentaje y el streaming de la salida del gestor.

## Approach

`updateCommand` deja de usar clack: comprueba la guarda de TTY y monta con `renderApp` una vista de update en `src/ui/`. `index.ts` le pasa la lógica como funciones, sin JSX: consultar (`collectUpdates` o el `checkUpdates` del provider), comprobar e instalar gsudo con `commandExists` y `runCommand`, y actualizar un paquete (`updatePackage` y, si va bien, `setInstalledVersion`). La vista avanza por fases: consulta con spinner, lista, selección, aviso de force con sus Confirm, progreso y resultado. Cada fase deja escrita la anterior en el marco, como hacía clack. Sin TTY no hay fases que esperen teclado: con `--yes` se salta la selección y los Confirm, y ink escribe solo el último frame. Los paquetes se actualizan uno detrás de otro, provider a provider, como hoy.

## Delta de comportamiento

### Capacidad: `package-update`

**ADDED — Consulta y lista antes de actualizar**
- GIVEN Bun con 1 update (`@railway/cli` 5.63.4 → 5.64.0) y una terminal interactiva
- WHEN `um update bun`
- THEN se ve, en este orden: `┌   Updating packages `, `│`, `◇  Found 1 update(s)`, una vacía, `🥟 Bun (global)`, `   • @railway/cli 5.63.4 → 5.64.0`, una vacía, `│` y `●  Summary: 1 available`, y después la selección
- AND mientras consulta se ve una sola línea `<frame>  Checking Bun (global)...` que rota entre `◒ ◐ ◓ ◑`; con `um update` sin provider, `Checking for updates...`
- GIVEN Bun sin updates
- WHEN `um update bun`
- THEN se ve `┌   Updating packages `, `│`, `◇  Found 0 update(s)`, `│` y `└  Done`, sin lista ni selección, y sale con 0
- GIVEN ningún provider con id `foo` y una terminal interactiva
- WHEN `um update foo`
- THEN se ve `┌   Updating packages `, `│` y `■  Provider "foo" not found`, sin `└  Done`, y sale con 0

**ADDED — Selección agrupada por provider**
- GIVEN 3 updates: `Git.Git` 2.50.0 → 2.51.0 y `Microsoft.PowerToys` 0.94.0 → 0.95.0 de WinGet, y `typescript` 6.0.2 → 6.0.3 de npm, todos `available`, en una terminal interactiva
- WHEN `um update`
- THEN la selección muestra `◆  Select packages to update (space to toggle, enter to confirm)`; debajo, `│  📦 WinGet` con `│    ◼ Git.Git 2.50.0 → 2.51.0` y `│    ◼ Microsoft.PowerToys 0.94.0 → 0.95.0`, y `│  📦 npm (global)` con `│    ◼ typescript 6.0.2 → 6.0.3`; y cierra con `└`
- AND la fila bajo el cursor sale en cian, y el cursor empieza en la primera
- AND Enter sin tocar nada actualiza los 3
- AND al confirmar, la selección queda escrita como `◇  Select packages to update` y `│  Git.Git, Microsoft.PowerToys, typescript`
- GIVEN la misma selección
- WHEN el usuario baja a `Microsoft.PowerToys`, pulsa espacio y Enter
- THEN esa fila pasa a `◻` y solo se actualizan `Git.Git` y `typescript`
- GIVEN la misma selección
- WHEN el usuario pulsa `a` y Enter
- THEN las 3 filas pasan a `◻`, se ve `●  Update cancelled` y `└  Cancelled`, no se actualiza nada y sale con 0
- AND con alguna fila desmarcada, `a` marca las 3

**ADDED — Force solo para WinGet, con confirmación**
- GIVEN `Foo.Pinned` 1.0 → 2.0 de WinGet `pinned` y `left-pad` 1.0.0 → 1.1.0 de npm `unknown`, seleccionados, gsudo instalado y una terminal interactiva
- WHEN termina la selección
- THEN se ve `▲  Found 2 package(s) that require force:` y debajo `   • Foo.Pinned (pinned)` y `   • left-pad (unknown version)`
- AND se pide el Confirm `◆  Force update 1 WinGet package(s)?` con `● Yes / ○ No`
- AND con Yes, `Foo.Pinned` se actualiza con force y su fila lleva `(force)`, y `left-pad` cuenta como `⊘ 1 skipped` sin preguntar
- AND con No, los dos cuentan como `⊘ 2 skipped`
- GIVEN solo `left-pad` de npm `unknown`, seleccionado
- WHEN termina la selección
- THEN se ve el aviso `▲  Found 1 package(s) that require force:`, no se pide ningún Confirm, se ve `●  No packages to update` y `└  Done`

**ADDED — gsudo para la elevación**
- GIVEN `Foo.Pinned` de WinGet `pinned`, seleccionado, sin gsudo en el `PATH` y una terminal interactiva
- WHEN termina la selección
- THEN antes del Confirm de force se pide `◆  gsudo not found. Install it for admin elevation?`
- AND con Yes se ve `<frame>  Installing gsudo...` y después `◇  gsudo installed` (o `◇  Failed to install gsudo` si `winget install gerardog.gsudo` falla), y luego el Confirm de force
- AND con No se pasa directamente al Confirm de force

**ADDED — Una fila de progreso por paquete, en secuencia**
- GIVEN `Git.Git` 2.50.0 → 2.51.0 y `Microsoft.PowerToys` 0.94.0 → 0.95.0 de WinGet, seleccionados, en una terminal interactiva
- WHEN empieza la actualización
- THEN se ve `◇  Updating 2 package(s)...`, la cabecera `│  📦 WinGet`, la fila `│  <frame> Git.Git 2.50.0 → 2.51.0 updating` y la fila `│  … Microsoft.PowerToys 0.94.0 → 0.95.0 queued`
- AND solo hay un paquete `updating` a la vez; el segundo empieza cuando acaba el primero
- AND al acabar con éxito, la fila pasa a `│  ✓ Git.Git 2.50.0 → 2.51.0` y se guarda `installedVersions["Git.Git"] = "2.51.0"`
- GIVEN `Microsoft.PowerToys` cuyo `updatePackage` devuelve `false`
- WHEN le toca
- THEN su fila pasa a `│  ✗ Microsoft.PowerToys failed`, no se guarda en `installedVersions` y se sigue con el siguiente
- GIVEN un paquete cuyo `updatePackage` lanza `timeout`
- WHEN le toca
- THEN su fila pasa a `│  ✗ <nombre> timeout` y se sigue con el siguiente

**ADDED — Resultado**
- GIVEN 2 actualizados, 1 fallido y 1 saltado
- WHEN termina la actualización
- THEN se ve `│`, `●  Result: ✓ 2 updated | ✗ 1 failed | ⊘ 1 skipped`, `│` y `└  Done`, y sale con 0
- AND las partes que valen 0 no aparecen (`●  Result: ✓ 2 updated`)

**ADDED — Sin terminal interactiva**
- GIVEN Bun con 1 update (`@railway/cli` 5.63.4 → 5.64.0)
- WHEN `um update bun --yes > out.txt`
- THEN el proceso termina solo, sin esperar teclado, con código 0
- AND `out.txt` contiene el marco con la lista, `◇  Updating 1 package(s)...`, `│  ✓ @railway/cli 5.63.4 → 5.64.0` (o `✗`), el `●  Result: …` y `└  Done`, sin frames del spinner (`◒`, `◐`, `◓`, `◑`) ni secuencias de borrado (`ESC[1G`, `ESC[J`)
- GIVEN `Foo.Pinned` de WinGet `pinned`
- WHEN `um update winget --yes < nul`
- THEN no se pide ningún Confirm ni se instala gsudo, y `Foo.Pinned` cuenta como `⊘ 1 skipped`
- GIVEN cualquier estado de los providers
- WHEN `um update winget < nul`
- THEN stderr recibe `Interactive terminal required (use --yes)`, no se consulta ningún provider y sale con código 1

**ADDED — Ctrl+C cancela**
- GIVEN `um update bun` en la selección, en una terminal interactiva
- WHEN el usuario pulsa Ctrl+C
- THEN se ve `Cancelled`, no se actualiza nada y sale con código 0
- GIVEN `um update` consultando, en un Confirm o con un paquete `updating`
- WHEN el usuario pulsa Ctrl+C
- THEN se ve `Cancelled`, no se ve `●  Result:` ni `└  Done`, y sale con código 0

**Reglas de la capacidad**
- **Dónde viven los datos**: el estado de cada paquete lo da el gestor en cada ejecución. Cada update con éxito guarda `installedVersions[id]` en `~/.config/update-manager/config.json`, y un fallo no guarda nada.
- **Idioma de los nombres**: mensajes al usuario en inglés; ids de provider en minúsculas y en inglés.
- **Límites**: 60 s por comando por defecto, 120 s el check de WinGet, 300 s un update de WinGet y 120 s la instalación de gsudo. Los paquetes se actualizan de uno en uno.
- **Avisos**: paquetes que necesitan force (`▲`), falta de `gsudo` (Confirm), y un provider que falla en `um update` sin provider (`⚠`, por stderr), sin parar el resto.
- **Regla ante conflicto**: en `um update` sin provider, si la versión nueva coincide con `installedVersions[id]`, el paquete se omite. `um update <provider>` no aplica el filtro (deuda).

## Enmiendas

_Ninguna._

## Aprobaciones

| Rol | Nombre | Fecha | Estado |
| --- | --- | --- | --- |
| dev-lead | Àngel Delgado | 2026-10-08 | aprobada: «Sí» |
