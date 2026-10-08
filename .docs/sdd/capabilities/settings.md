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
- THEN `out.txt` contiene una vacía, `Providers:`, una vacía y una fila por provider registrado, como `  📦 WinGet               enabled`, `  📦 npm (global)         disabled` y `  🍫 Chocolatey           not installed` (nombre relleno a 20), y una vacía; sin escapes de color ni de cursor, y sale con 0

### Activar y desactivar un provider por comando

- GIVEN Chocolatey desactivado
- WHEN `um providers enable chocolatey`
- THEN se imprime `✓ chocolatey enabled`, `config.json` lo deja `enabled: true` y sale con 0
- AND `um providers disable chocolatey` imprime `✓ chocolatey disabled` y lo deja `enabled: false`
- AND `um providers foo` imprime `Unknown action: foo`

### Ignorar y dejar de ignorar paquetes

- GIVEN ningún paquete ignorado y sin TTY
- WHEN `um ignore Smoke.Test > out.txt`
- THEN `out.txt` contiene `✓ Smoke.Test added to ignore list`, `config.json` lo añade a `ignoredPackages` y sale con 0
- WHEN después `um ignored > out.txt`
- THEN `out.txt` contiene una vacía, `Ignored packages:`, una vacía, `  • Smoke.Test` y una vacía
- WHEN después `um unignore Smoke.Test > out.txt`
- THEN `out.txt` contiene `✓ Smoke.Test removed from ignore list` y `ignoredPackages` ya no lo lleva
- AND `um ignored` sin paquetes ignorados imprime `No packages ignored`
- AND `um ignore` sin id imprime `Usage: um ignore <package-id>` y `Example: um ignore Google.GooglePlayGames`; `um unignore` sin id, `Usage: um unignore <package-id>`
