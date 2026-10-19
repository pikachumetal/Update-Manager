# Capacidad — update-check

## Propósito

Qué muestra `um check` y `um check <provider>`, con TTY y sin él, y cómo se cancela.

## Requisitos

### Resultado agrupado por provider

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

### Check de un provider

- GIVEN Bun con 1 update (`@railway/cli` 5.63.4 → 5.64.0)
- WHEN `um check bun`
- THEN la salida final es `┌   Checking for updates `, `│`, `◇  Bun (global): 1 update(s)`, una vacía, `🥟 Bun (global)`, `   • @railway/cli 5.63.4 → 5.64.0`, una vacía, `│`, `●  Summary: 1 available`, `│` y `└  Done`
- GIVEN ningún provider con id `foo`
- WHEN `um check foo`
- THEN se ve `┌   Checking for updates `, `│` y `■  Provider "foo" not found`, sin `└  Done`
- AND sale con código 0

### Progreso mientras se consulta

- GIVEN una terminal interactiva
- WHEN `um check` está consultando
- THEN se ve una sola línea `<frame>  Checking for updates...`, cuyo frame rota entre `◒ ◐ ◓ ◑` en su sitio
- AND al terminar esa línea pasa a `◇  Found <n> update(s)`; con `um check <provider>` dice `Checking <nombre>...` y pasa a `◇  <nombre>: <n> update(s)`

### Sin terminal interactiva

- GIVEN la máquina del primer escenario
- WHEN `um check > out.txt`
- THEN `out.txt` contiene las líneas del primer escenario, sin ningún frame del spinner (`◒`, `◐`, `◓`, `◑`) ni secuencias de borrado (`ESC[1G`, `ESC[J`)
- AND el proceso termina solo, sin esperar teclado, con código 0

### Ctrl+C cancela

- GIVEN `um check` consultando, en una terminal interactiva
- WHEN el usuario pulsa Ctrl+C
- THEN se ve `│` y `└  Cancelled`, no se ve el resumen ni `└  Done`, y sale con código 0

### Un provider que falla no tumba el check

- GIVEN pnpm lanza `boom` en su consulta y Bun tiene 1 update
- WHEN `um check`
- THEN stderr recibe `  ⚠ pnpm (global): boom`
- AND stdout lista Bun con su update y `📦 pnpm (global) ✓`, como hoy, y acaba en `└  Done`

### Crates de cargo y toolchains de rustup

- GIVEN `cargo install-update -l` lista `mergiraf  v0.20.0  v0.21.0  Yes` y `cargo-binstall  v1.26.0  v1.26.0  No`
- WHEN `um check`
- THEN se ve `🦀 Cargo` con `   • mergiraf 0.20.0 → 0.21.0`, y `cargo-binstall` no sale
- GIVEN `rustup check` escribe `stable-x86_64-pc-windows-msvc - update available: 1.98.0 (88d9e12ae 2026-08-18) -> 1.99.1 (58cf8f9c3 2026-10-13)` y `rustup - up to date : 1.29.1`, y sale con código 100
- WHEN `um check`
- THEN se ve `🔧 Rustup` con `   • stable-x86_64-pc-windows-msvc 1.98.0 → 1.99.1`, y `rustup` no sale
- GIVEN `rustup check` escribe `rustup - update available : 1.29.1 -> 1.30.0` (con espacio antes de los dos puntos, como `rustup - up to date : 1.29.1`)
- WHEN `um check`
- THEN `🔧 Rustup` lleva `   • rustup 1.29.1 → 1.30.0`
- GIVEN todo al día en los dos
- WHEN `um check`
- THEN se ve `🦀 Cargo ✓` y `🔧 Rustup ✓`

### Aviso si falta cargo-update

- GIVEN `cargo` en el `PATH` y `cargo-install-update` no
- WHEN `um check`
- THEN stderr recibe `  ⚠ Cargo: cargo-update not installed: cargo binstall cargo-update`, no se instala nada, y los demás providers, `Rustup` incluido, se listan como siempre

## Reglas de la capacidad

- **Dónde viven los datos**: el estado de cada paquete lo da el gestor en cada ejecución. `um check` solo guarda `lastCheck` en `~/.config/update-manager/config.json`.
- **Idioma de los nombres**: mensajes al usuario en inglés; ids de provider en minúsculas y en inglés.
- **Límites**: 60 s por comando por defecto, 120 s el check de WinGet, 120 s el check de cargo y 30 s `rustup check`.
- **Avisos**: fallo de check de un provider (`⚠`, por stderr), y se sigue con el resto. Cargo sin cargo-update es uno de esos fallos.
- **Regla ante conflicto**: en `um check` sin provider, si la versión nueva coincide con `installedVersions[id]`, el paquete se omite. `um check <provider>` no aplica el filtro (deuda).
