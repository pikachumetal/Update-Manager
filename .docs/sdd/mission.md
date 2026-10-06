# Misión — update-manager

## Por qué existe

En Windows, mantener al día un equipo de desarrollo obliga a recorrer varios gestores de paquetes (WinGet, proto, npm, pnpm, Bun, módulos de PowerShell…), cada uno con su comando y su formato de salida. `update-manager` (`um`) los consulta todos de una vez, muestra las actualizaciones pendientes agrupadas por gestor y deja elegir cuáles aplicar. Lo usa su autor en su propia máquina y se publica en npm como `@pikachu-metal/update-manager`.

## Usuarios y roles

- **Usuario de la CLI**: ejecuta `um` en modo interactivo, o `um check` / `um update [provider] [-y]` en modo directo. Activa o desactiva providers e ignora paquetes.

## Qué es y qué no es

- **Es**: una CLI interactiva (Bun + @clack/prompts) que delega en los comandos de cada gestor instalado: consulta, lista, selecciona y actualiza paquetes. Guarda su estado en `~/.config/update-manager/config.json`.
- **No es**: un gestor de paquetes propio, ni sirve para instalar paquetes nuevos (la única excepción es ofrecer instalar `gsudo` para elevar WinGet). No es multiplataforma en la práctica: los comandos y la elevación son de Windows. Tampoco programa actualizaciones ni corre como servicio.

## Dominio (lenguaje del proyecto)

- **Provider**: adaptador a un gestor de paquetes (`winget`, `proto`, `moonrepo`, `psmodules`, `bun`, `npm`, `pnpm`, `claude`, `chocolatey`, `scoop`). Implementa `UpdateProvider` (`src/types.ts`), normalmente heredando de `BaseProvider`.
- **Provider activo / disponible**: activo = `enabled: true` en la config. Disponible = su comando existe en el `PATH` (`isAvailable()`). Solo se consultan los que están activos y disponibles.
- **Update** (`PackageUpdate`): un paquete con versión actual y nueva, más su `status`.
- **Status**: `available` (se actualiza), `pinned` (fijado en WinGet), `unknown` (versión actual desconocida), `error`. Los `pinned` y `unknown` solo se actualizan forzando, y forzar solo existe para WinGet.
- **Force**: reintento de WinGet con `--force` y, si falla, con elevación vía `gsudo`.
- **Paquete ignorado**: id en `ignoredPackages`; desaparece de la consulta general.
- **Versión instalada registrada** (`installedVersions`): versión guardada tras un update correcto. Si la «nueva» coincide con ella, el paquete se omite. Sirve para paquetes con versiones mal etiquetadas (p. ej. Google Play Games).
- **Built-in updater**: paquete de WinGet que no se actualiza por WinGet (exit code 20, p. ej. Discord). La CLI lo indica con «use app's built-in updater».
