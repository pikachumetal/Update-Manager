# Capacidad — package-update

## Propósito

Qué muestra y qué hace `um update` y `um update <provider>`: la consulta, la selección, force y gsudo, el progreso por paquete, el resultado, el comportamiento sin TTY y la cancelación.

## Requisitos

### Consulta y lista antes de actualizar

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

### Selección agrupada por provider

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

### Force solo para WinGet, con confirmación

- GIVEN `Foo.Pinned` 1.0 → 2.0 de WinGet `pinned` y `left-pad` 1.0.0 → 1.1.0 de npm `unknown`, seleccionados, gsudo instalado y una terminal interactiva
- WHEN termina la selección
- THEN se ve `▲  Found 2 package(s) that require force:` y debajo `   • Foo.Pinned (pinned)` y `   • left-pad (unknown version)`
- AND se pide el Confirm `◆  Force update 1 WinGet package(s)?` con `● Yes / ○ No`
- AND con Yes, `Foo.Pinned` se actualiza con force y su fila lleva `(force)`, y `left-pad` cuenta como `⊘ 1 skipped` sin preguntar
- AND con No, los dos cuentan como `⊘ 2 skipped`
- GIVEN solo `left-pad` de npm `unknown`, seleccionado
- WHEN termina la selección
- THEN se ve el aviso `▲  Found 1 package(s) that require force:`, no se pide ningún Confirm, se ve `●  No packages to update` y `└  Done`

### gsudo para la elevación

- GIVEN `Foo.Pinned` de WinGet `pinned`, seleccionado, sin gsudo en el `PATH` y una terminal interactiva
- WHEN termina la selección
- THEN antes del Confirm de force se pide `◆  gsudo not found. Install it for admin elevation?`
- AND con Yes se ve `<frame>  Installing gsudo...` y después `◇  gsudo installed` (o `◇  Failed to install gsudo` si `winget install gerardog.gsudo` falla), y luego el Confirm de force
- AND con No se pasa directamente al Confirm de force

### Una fila de progreso por paquete, en secuencia

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

### Resultado

- GIVEN 2 actualizados, 1 fallido y 1 saltado
- WHEN termina la actualización
- THEN se ve `│`, `●  Result: ✓ 2 updated | ✗ 1 failed | ⊘ 1 skipped`, `│` y `└  Done`, y sale con 0
- AND las partes que valen 0 no aparecen (`●  Result: ✓ 2 updated`)

### Sin terminal interactiva

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

### Ctrl+C cancela

- GIVEN `um update bun` en la selección, en una terminal interactiva
- WHEN el usuario pulsa Ctrl+C
- THEN se ve `Cancelled`, no se actualiza nada y sale con código 0
- GIVEN `um update` consultando, en un Confirm o con un paquete `updating`
- WHEN el usuario pulsa Ctrl+C
- THEN se ve `Cancelled`, no se ve `●  Result:` ni `└  Done`, y sale con código 0

## Reglas de la capacidad

- **Dónde viven los datos**: el estado de cada paquete lo da el gestor en cada ejecución. Cada update con éxito guarda `installedVersions[id]` en `~/.config/update-manager/config.json`, y un fallo no guarda nada.
- **Idioma de los nombres**: mensajes al usuario en inglés; ids de provider en minúsculas y en inglés.
- **Límites**: 60 s por comando por defecto, 120 s el check de WinGet, 300 s un update de WinGet y 120 s la instalación de gsudo. Los paquetes se actualizan de uno en uno.
- **Avisos**: paquetes que necesitan force (`▲`), falta de `gsudo` (Confirm), y un provider que falla en `um update` sin provider (`⚠`, por stderr), sin parar el resto.
- **Regla ante conflicto**: en `um update` sin provider, si la versión nueva coincide con `installedVersions[id]`, el paquete se omite. `um update <provider>` no aplica el filtro (deuda).
