# Tech Stack — update-manager

## Tecnologías

| Pieza | Tecnología | Versión |
| --- | --- | --- |
| Runtime, gestor de paquetes y test runner | Bun (`.prototools`; `packageManager` y `engines.bun` alineados) | 1.4.2 |
| Orquestación de tareas | moon (`.prototools`, `.moon/workspace.yml`, `moon.yml`) | 2.6.0 |
| Lenguaje | TypeScript (`strict`, `moduleResolution: bundler`) | 6.0.3 |
| UI de terminal | @clack/prompts | 1.8.1 |
| Colores | picocolors | 1.1.1 |
| Validación de la config | zod | 4.6.5 |
| Lint | ESLint (flat config) + @typescript-eslint | 10.12.0 / 8.71.1 |
| Formato | Prettier (2 espacios, LF, como `.editorconfig`) | 3.9.9 |
| Actualizador de dependencias | npm-check-updates | 23.1.0 |
| Plataforma | Windows (`cmd.exe /c`, `where`, `pwsh`, `gsudo`) | Windows 11 |
| Distribución | Desde el código fuente con `bun link` (binarios `um` y `update-manager`, `bin/cli.js` con shebang `bun`); el paquete `@pikachu-metal/update-manager` no está en npm | 1.5.0 |

- **Solo Bun**: `bunfig.toml` lleva `[run] bun = true`, así que `eslint`, `prettier` y `tsc` corren con Bun aunque su shebang diga `node`. No hay `engines.node`. `@types/node` sí es devDep, porque son los tipos de la API de Node que implementa Bun, y `bun-types` la pide con `*`.
- **Versiones exactas**: `package.json` no lleva `^` ni `~`, y `bunfig.toml` (`[install] exact = true`) hace que `bun add` también fije la versión exacta. Se suben a mano con `moon run :deps-update`.
- **TypeScript se queda en 6**: `typescript-eslint` 8.71.1 exige `typescript <6.1.0`. Está en la deuda técnica del roadmap.

## Comandos

Cada tarea de moon ejecuta su script de `package.json` con `bun run`:

- **Arrancar**: `moon run :start` (o `:dev`, en modo watch). Instalado: `um`.
- **Tests**: `moon run :test` (`:test-coverage` para cobertura).
- **Build**: `moon run :build`, que compila `bin/update-manager.exe` y lo copia a `bin/um.exe` (en `.gitignore`).
- **Calidad**: `moon run :lint` (`prettier --check` + `eslint src`), `:lint-fix` y `:typecheck` (`tsc --noEmit`).
- **Dependencias**: `moon run :deps-update`, que lanza `ncu --interactive --format group`.
- **Instalación local**: `moon run :link`.

## Testing

TDD con `bun test` para la lógica pura: los parsers de salida de cada gestor viven en `src/providers/parsers.ts` y se prueban en `src/providers/parsers.test.ts`. La parte que lanza procesos (`runCommand`, `updatePackage`, el flujo de `index.ts`) no tiene tests. Se verifica con smoke manual: `um check` y, si el cambio toca actualizaciones, `um update <provider>` en la máquina real. No hay CI.

## Decisiones abiertas

_Ninguna._
