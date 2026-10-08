# Capacidad — interactive-menu

## Propósito

qué muestra y qué hace `um` a secas: el menú, sus opciones, la salida, el comportamiento sin TTY y la cancelación.

## Requisitos

### Menú principal

- GIVEN una terminal interactiva
- WHEN `um`
- THEN se limpia la pantalla y se ve `┌   Update Manager `, `│`, `◆  What would you like to do?` y debajo `│  ● 🔍 Check for updates`, `│  ○ 🔄 Update all`, `│  ○ 📦 Update by provider`, `│  ○ ⚙️  Manage providers` y `│  ○ 🚪 Exit`; y cierra con `└`
- AND la opción bajo el cursor lleva `●` verde y el resto `○` atenuado; el cursor empieza en la primera, ↑/↓ lo mueven con vuelta (↑ en la primera va a «Exit») y Enter elige
- AND al elegir, el menú queda escrito como `◇  What would you like to do?` y `│  <opción elegida>`, p. ej. `│  🔍 Check for updates`

### Check desde el menú

- GIVEN el menú y Bun con 1 update (`@railway/cli` 5.63.4 → 5.64.0) y el resto de providers al día
- WHEN el usuario elige «Check for updates»
- THEN se ve la misma vista que `um check`: `┌   Checking for updates `, el spinner `Checking for updates...`, `◇  Found 1 update(s)`, `🥟 Bun (global)` con `   • @railway/cli 5.63.4 → 5.64.0`, los providers al día con `✓`, `●  Summary: 1 available` y `└  Done`
- AND se guarda `lastCheck` y debajo vuelve el menú

### Update all desde el menú

- GIVEN el menú y 1 update de Bun en una terminal interactiva
- WHEN el usuario elige «Update all»
- THEN se ve la misma vista que `um update`: `┌   Updating packages `, la lista, la selección agrupada con todo marcado, el progreso y `●  Result: ✓ 1 updated` y `└  Done`
- AND al terminar, o con `└  Cancelled` si desmarca todo, debajo vuelve el menú

### Update by provider desde el menú

- GIVEN WinGet y Bun activos e instalados, Proto activo sin instalar y npm desactivado
- WHEN el usuario elige «Update by provider»
- THEN se ve `◆  Select provider to update` con `│  ● 📦 WinGet` y `│  ○ 🥟 Bun (global)`, solo los activos e instalados
- AND al elegir Bun queda escrito `◇  Select provider to update` y `│  🥟 Bun (global)`, y se ve la misma vista que `um update bun`; al terminar, debajo vuelve el menú
- GIVEN ningún provider activo e instalado
- WHEN el usuario elige «Update by provider»
- THEN se ve `│` y `▲  No providers available`, y debajo vuelve el menú

### Salir

- GIVEN el menú
- WHEN el usuario elige «Exit»
- THEN queda escrito `◇  What would you like to do?` y `│  🚪 Exit`, se ve `│` y `└  Bye! 👋`, y sale con 0

### Sin TTY

- GIVEN stdin sin TTY
- WHEN `um < nul`
- THEN se imprime `Interactive terminal required (see um --help)` por stderr, sin marco ni escapes, no se limpia la pantalla y sale con 1
- AND lo mismo con stdout sin TTY (`um > out.txt`)

### Ctrl+C cancela

- GIVEN el menú, el select de provider o la lista de «Manage providers» esperando teclado
- WHEN el usuario pulsa Ctrl+C
- THEN se ve `Cancelled`, no se guarda nada en la config y sale con 0
- AND dentro de las vistas de check y update, Ctrl+C se comporta como en `um check` y `um update` (`Cancelled`, código 0)
