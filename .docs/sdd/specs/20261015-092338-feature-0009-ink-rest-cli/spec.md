---
id: 20261015-092338-feature-0009-ink-rest-cli
feature: 0009
title: Resto de la CLI en ink
mode: lite
status: approved
created: 2026-10-15
author: Àngel Delgado (con Claude)
approvers:
  - role: dev-lead
    name: Àngel Delgado
    approved_at: 2026-10-15
---

# Spec — Resto de la CLI en ink

> **Estado**: approved.
> **Siguiente paso**: modo lite → implementación directa (Native).

## Capacidades

- Nuevas: `cli-common` — `um --version`, `um --help` y el error inesperado de `main`
- Modificadas: `settings` — `providers` (listar, `enable`, `disable`, `Unknown action`), `ignore`, `unignore` e `ignored` se dibujan con el marco
- Modificadas: `interactive-menu` — el aviso sin TTY va en una línea `■`, y Ctrl+C cierra con `└  Cancelled`
- Modificadas: `package-update` — el aviso sin TTY va en una línea `■`, y Ctrl+C cierra con `└  Cancelled`
- Modificadas: `update-check` — Ctrl+C cierra con `└  Cancelled`

## Decisiones que he tomado yo — valida estas

1. **Capacidad nueva `cli-common`** para `--version`, `--help` y el error de `main`. Ninguna de las cuatro capacidades las describe, y la petición pide que cada salida que cambie se fije en una capacidad.
2. **Títulos del Intro**: `Providers` para `providers` y sus subcomandos, y `Ignored packages` para `ignore`, `unignore` e `ignored`, también en sus mensajes de uso. La ayuda lleva `Update Manager v0.1.0`.
3. **Símbolos**: el `✓` de éxito pasa a `◆`, también en `disable` (hoy se ve atenuado). `Unknown action` y los `Usage` pasan a `■`, y `No packages ignored` a `●`. El `Example:` va atenuado en el raíl.
4. **Colores**: se conservan los de hoy. En la lista, `enabled` va en verde y `disabled`/`not installed` atenuados; en la ayuda, `Usage:`, `Options:` y `Examples:` van atenuados. Sin TTY no hay colores: `renderToString` no los emite con stdout redirigido.
5. **La línea `■` por stderr** va en rojo solo si stderr es una terminal. `um 2> err.txt` deja el texto sin escapes, como hoy.
6. **Error de `main`**: se dibuja como `■  <stack>` por stderr, con el stack del error tal como hoy lo imprime `console.error`; si el valor lanzado no es un `Error`, va `String(error)`. El código de salida no cambia.
7. **Códigos de salida**: no cambia ninguno. `Unknown action` y los `Usage` siguen saliendo con 0.
8. **`console.clear()`** se queda en `interactiveMode`. No escribe ningún mensaje, solo limpia la pantalla con TTY, y es lo único que `grep -n "console\." src/index.ts` sigue mostrando.
9. **Ctrl+C sin TTY**: si stdout va a un fichero, `│` y `└  Cancelled` quedan en él, igual que el resto del marco.
10. **picocolors sale de `index.ts`**, pero no del proyecto: lo siguen usando `CheckApp.tsx` y otros ficheros de `src/ui/`.
11. **Repaso de coherencia**: no encontré contradicciones. Contrasté las salidas literales de los escenarios con la decisión 2 (los títulos) y la 3 (los símbolos).

### Decisiones tomadas con el dev-lead

- Modo lite y perfil `delegate` — «Lite, delegate (Recomendada)»
- Listas en Intro + filas en el raíl, cerradas con `└` — «Intro + filas en el raíl (Recomendada)»
- Mensajes de una línea con Intro + Log, como `um check foo` — «Intro + Log (Recomendada)»
- `--version` en una línea sin marco y `--help` con marco — «version plana, help con marco (Recomendada)»
- Avisos por stderr en una línea `■`, sin Intro ni raíl — «Una línea ■ (Recomendada)»

## Intent

`um check`, `um update` y el menú ya dibujan con el marco de ink (features 0005-0007). El resto de comandos sigue escribiendo con `console.log`/`console.error` y picocolors: `providers`, `ignore`, `unignore`, `ignored`, `--version`, `--help`, los avisos sin TTY, el `Cancelled` y el error de `main`. La CLI se ve de dos maneras. Esta feature dibuja todos con el mismo marco, sin cambiar qué dicen ni cuándo.

## Scope

- Entra: `src/index.ts` (`providersCommand`, `ignoreCommand`, `unignoreCommand`, `listIgnoredCommand`, `printHelp`, el `--version`, los dos avisos sin TTY de `interactiveMode` y `updateCommand`, `cancel()` y el handler de `main`). Entra `src/ui/` para dibujar listas, la ayuda y la línea `■` por stderr: `menu.tsx`, `frame.tsx` y un fichero nuevo si hace falta. Entran los tests de `src/ui/`.
- No entra:
  - El número de `VERSION = "0.1.0"`.
  - `um update --yes` sin provider, aunque la ayuda lo anuncie.
  - El filtro de ignorados en `check/update <provider>`.
  - WinGet ausente, el `[WARN]` de pnpm, proto y `loadConfig`.
  - Partir `index.ts`.
  - El aviso `⚠` de un provider que falla (`useFailureWarnings`), que ya dibuja la 0005.
  - Cómo escriben `config.json` `ignore` y `providers enable/disable`: lo escriben igual que hoy.

## Approach

Se reutiliza el marco que ya existe: `Intro`, `Log` y `Outro` de `src/ui/frame.tsx`, y el molde `printIntro`/`printLog`/`printOutro` de `src/ui/menu.tsx`, que escribe `renderToString` en stdout. Cada comando imprime un bloque estático de una vez, sin montar una app de ink, porque ninguno espera teclado ni se anima. `index.ts` sigue sin JSX: llama a funciones de `src/ui/` con los datos. La línea `■` por stderr es la única pieza nueva del marco: un `Log` sin raíl que se escribe en `process.stderr`. `cancel()` pasa a `printOutro("Cancelled")` antes de `process.exit(0)`. Lo que dibuja cada componente se prueba con `renderToString` en `src/ui/*.test.tsx`. Los comandos se prueban con un smoke contra `bin/um.exe`, en terminal y con `> out.txt`.

## Delta de comportamiento

### Capacidad: `settings`

**MODIFIED — Listar providers sin TTY** (antes: "`out.txt` contiene una vacía, `Providers:`, una vacía y una fila por provider…")

- GIVEN WinGet instalado y activo, npm instalado y desactivado, y Chocolatey sin instalar
- WHEN `um providers > out.txt`
- THEN `out.txt` contiene `┌   Providers `, `│`, una fila por provider registrado en el orden del registro, como `│  📦 WinGet               enabled`, `│  📦 npm (global)         disabled` y `│  🍫 Chocolatey           not installed` (nombre relleno a 20), y `└`; sin escapes de color ni de cursor, y sale con 0
- AND en una terminal, `um providers` dibuja las mismas líneas, con `enabled` en verde y `disabled`/`not installed` atenuados

**MODIFIED — Activar y desactivar un provider por comando** (antes: "se imprime `✓ chocolatey enabled`")

- GIVEN Chocolatey desactivado
- WHEN `um providers enable chocolatey`
- THEN se ve `┌   Providers `, `│` y `◆  chocolatey enabled`; `config.json` lo deja `enabled: true` y sale con 0
- AND `um providers disable chocolatey` dibuja `┌   Providers `, `│` y `◆  chocolatey disabled`, y lo deja `enabled: false`
- AND `um providers foo` dibuja `┌   Providers `, `│` y `■  Unknown action: foo`, no toca `config.json` y sale con 0

**MODIFIED — Ignorar y dejar de ignorar paquetes** (antes: "`out.txt` contiene `✓ Smoke.Test added to ignore list`…")

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

### Capacidad: `interactive-menu`

**MODIFIED — Sin TTY** (antes: "se imprime `Interactive terminal required (see um --help)` por stderr, sin marco ni escapes")

- GIVEN stdin sin TTY
- WHEN `um < nul`
- THEN stderr recibe una sola línea, `■  Interactive terminal required (see um --help)`, sin `┌`, `│` ni `└`; stdout queda vacío, no se limpia la pantalla y sale con 1
- AND lo mismo con stdout sin TTY (`um > out.txt`): `out.txt` queda vacío
- AND con `2> err.txt`, `err.txt` contiene esa línea sin escapes

**MODIFIED — Ctrl+C cancela** (antes: "se ve `Cancelled`")

- GIVEN el menú, el select de provider o la lista de «Manage providers» esperando teclado
- WHEN el usuario pulsa Ctrl+C
- THEN se ve `│` y `└  Cancelled`, no se guarda nada en la config y sale con 0
- AND dentro de las vistas de check y update, Ctrl+C se comporta como en `um check` y `um update` (`└  Cancelled`, código 0)

### Capacidad: `package-update`

**MODIFIED — Sin terminal interactiva** (antes: "stderr recibe `Interactive terminal required (use --yes)`")

- GIVEN Bun con 1 update (`@railway/cli` 5.63.4 → 5.64.0)
- WHEN `um update bun --yes > out.txt`
- THEN el proceso termina solo, sin esperar teclado, con código 0
- AND `out.txt` contiene el marco con la lista, `◇  Updating 1 package(s)...`, `│  ✓ @railway/cli 5.63.4 → 5.64.0` (o `✗`), el `●  Result: …` y `└  Done`, sin frames del spinner (`◒`, `◐`, `◓`, `◑`) ni secuencias de borrado (`ESC[1G`, `ESC[J`)
- GIVEN `Foo.Pinned` de WinGet `pinned`
- WHEN `um update winget --yes < nul`
- THEN no se pide ningún Confirm ni se instala gsudo, y `Foo.Pinned` cuenta como `⊘ 1 skipped`
- GIVEN cualquier estado de los providers
- WHEN `um update winget < nul`
- THEN stderr recibe una sola línea, `■  Interactive terminal required (use --yes)`, sin `┌`, `│` ni `└`; no se consulta ningún provider y sale con código 1

**MODIFIED — Ctrl+C cancela** (antes: "se ve `Cancelled`")

- GIVEN `um update bun` en la selección, en una terminal interactiva
- WHEN el usuario pulsa Ctrl+C
- THEN se ve `│` y `└  Cancelled`, no se actualiza nada y sale con código 0
- GIVEN `um update` consultando, en un Confirm o con un paquete `updating`
- WHEN el usuario pulsa Ctrl+C
- THEN se ve `│` y `└  Cancelled`, no se ve `●  Result:` ni `└  Done`, y sale con código 0

### Capacidad: `update-check`

**MODIFIED — Ctrl+C cancela** (antes: "se ve `Cancelled`")

- GIVEN `um check` consultando, en una terminal interactiva
- WHEN el usuario pulsa Ctrl+C
- THEN se ve `│` y `└  Cancelled`, no se ve el resumen ni `└  Done`, y sale con código 0

### Capacidad: `cli-common`

**ADDED — Versión**

- GIVEN cualquier estado
- WHEN `um --version` (o `um -v`)
- THEN se imprime una sola línea, `um v0.1.0`, sin marco ni escapes, también en una terminal, y sale con 0

**ADDED — Ayuda**

- GIVEN cualquier estado
- WHEN `um --help` (o `um -h`)
- THEN se ve `┌   Update Manager v0.1.0 `, `│`, `│  Usage:` y las 7 filas de uso de hoy con el raíl delante (`│    um                     Interactive mode` … `│    um ignored             List ignored packages`), `│`, `│  Options:` y sus 3 filas (`│    -y, --yes             Skip confirmation`, `│    -v, --version         Show version`, `│    -h, --help            Show help`), `│`, `│  Examples:` y sus 5 filas (`│    um check              Check all providers` … `│    um ignore Google.GooglePlayGames`), y `└`; sale con 0
- AND con `um --help > out.txt`, `out.txt` contiene las mismas líneas sin escapes

**ADDED — Error inesperado**

- GIVEN un error que nadie captura antes de `main` (p. ej. un provider de `um check <provider>` que lanza `boom`)
- WHEN llega al handler de `main`
- THEN stderr recibe `■  Error: boom` seguido del stack, sin `┌`, `│` ni `└`, y el código de salida es el de hoy

**Reglas de la capacidad**

- **Dónde viven los datos**: no aplica; ni `--version` ni `--help` leen o escriben `config.json`.
- **Idioma de los nombres**: mensajes al usuario en inglés.
- **Límites**: no aplica.
- **Avisos**: el error inesperado de `main` (`■`, por stderr).
- **Regla ante conflicto**: no aplica.

### Estimación y esfuerzo

- Tipo: frontend
- Esfuerzo spec: 0,4 h
- Estimación de implementación: 1 h
- Base de la estimación: hay 4 piezas, todas con un molde ya hecho (`printLog`, `CheckError`, `CheckList`): las listas, los mensajes de una línea, la ayuda y la línea por stderr. La 0007, parecida, llevó 1,25 h con la CPU cargada. El factor del log es 0,23, pero en frontend va de 0,23 a 1,25, y no lo aplico.
- Confianza: media. Lo incierto es el smoke de Ctrl+C, que la sesión no puede teclear.

## Enmiendas

_Ninguna._

## Aprobaciones

| Rol | Nombre | Fecha | Estado |
| --- | --- | --- | --- |
| dev-lead | Àngel Delgado | 2026-10-15 | aprobada: «si» |
