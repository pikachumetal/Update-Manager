# Capacidad — settings

## Propósito

`um providers` (listar, `enable`, `disable`), `um ignore`, `um unignore`, `um ignored` y la opción «Manage providers» del menú.

## Requisitos

### Activar y desactivar providers desde el menú

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

### Listar providers sin TTY

- GIVEN WinGet instalado y activo, npm instalado y desactivado, y Chocolatey sin instalar
- WHEN `um providers > out.txt`
- THEN `out.txt` contiene `┌   Providers `, `│`, una fila por provider registrado en el orden del registro, como `│  📦 WinGet               enabled`, `│  📦 npm (global)         disabled` y `│  🍫 Chocolatey           not installed` (nombre relleno a 20), y `└`; sin escapes de color ni de cursor, y sale con 0
- AND en una terminal, `um providers` dibuja las mismas líneas, con `enabled` en verde y `disabled`/`not installed` atenuados

### Activar y desactivar un provider por comando

- GIVEN Chocolatey desactivado
- WHEN `um providers enable chocolatey`
- THEN se ve `┌   Providers `, `│` y `◆  chocolatey enabled`; `config.json` lo deja `enabled: true` y sale con 0
- AND `um providers disable chocolatey` dibuja `┌   Providers `, `│` y `◆  chocolatey disabled`, y lo deja `enabled: false`
- AND `um providers foo` dibuja `┌   Providers `, `│` y `■  Unknown action: foo`, no toca `config.json` y sale con 0

### Ignorar y dejar de ignorar paquetes

- GIVEN ningún paquete ignorado y sin TTY
- WHEN `um ignore Smoke.Test > out.txt`
- THEN `out.txt` contiene `┌   Ignored packages `, `│` y `◆  Smoke.Test added to ignore list`, sin escapes; `config.json` lo añade a `ignoredPackages` y sale con 0
- WHEN después `um ignored > out.txt`
- THEN `out.txt` contiene `┌   Ignored packages `, `│`, `│  • Smoke.Test` y `└`, sin escapes
- WHEN después `um unignore Smoke.Test > out.txt`
- THEN `out.txt` contiene `┌   Ignored packages `, `│` y `◆  Smoke.Test removed from ignore list`, y `ignoredPackages` ya no lo lleva
- AND `um ignored` sin paquetes ignorados dibuja `┌   Ignored packages `, `│` y `●  No packages ignored`
- AND `um ignore` sin id dibuja `┌   Ignored packages `, `│`, `■  Usage: um ignore <package-id>` y `│  Example: um ignore Google.GooglePlayGames`; `um unignore` sin id, `┌   Ignored packages `, `│` y `■  Usage: um unignore <package-id>`; los dos salen con 0 sin tocar `config.json`
- AND en una terminal se ven las mismas líneas, con el `•` y el `Example:` atenuados
