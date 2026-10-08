# Architecture — update-manager

## Estructura

```text
.moon/workspace.yml        Workspace de moon con un solo proyecto (update-manager, en la raíz)
moon.yml                   Tareas de moon; cada una ejecuta su script de package.json con bun run
.prototools                Versiones de bun y moon (única fuente)
bunfig.toml                Bun como runtime de los scripts (run.bun) y versiones exactas al instalar (install.exact)
bin/cli.js                 Entry de `bun link` (shebang bun): importa src/index.ts
src/
├── index.ts               CLI: parseo de argv, modo interactivo, check/update/providers/ignore, flujo de force y gsudo
├── config.ts              Lectura y escritura de ~/.config/update-manager/config.json (providers, ignorados, installedVersions, lastCheck)
├── types.ts               Schemas zod de la config, tipos (PackageUpdate, UpdateProvider…), DEFAULT_PROVIDERS
├── ui/                    Componentes de ink (.tsx): renderApp (entry de render), marco calcado de clack, Spinner y la vista de `check`
├── runner.ts              runCommand (Bun.spawn vía cmd.exe /c, timeout), runPowerShell, commandExists (where), parseTableOutput (sin uso)
└── providers/
    ├── index.ts           Registro `providers` (id → instancia), getAvailableProviders, getProvider
    ├── base.ts            BaseProvider: updateAll genérico y createUpdate
    ├── parsers.ts         Parsers puros de la salida de cada gestor + isNewerVersion
    ├── parsers.test.ts    Tests de bun para los parsers
    └── <gestor>.ts        Un provider por gestor: winget, proto, moonrepo, psmodules, bun, npm, pnpm, claude, chocolatey, scoop
```

## Piezas y responsabilidades

| Pieza | Responsabilidad | Depende de |
| --- | --- | --- |
| `src/index.ts` | Comandos, menús (@clack/prompts), filtrado de ignorados e `installedVersions`, ejecución de updates por provider con spinner, force de WinGet y oferta de instalar `gsudo` | `config`, `providers`, `runner`, picocolors |
| `src/ui/*.tsx` | Dibujar con ink: `renderApp` monta y espera a que la app termine; `CheckApp` recibe la consulta como función (`load`) y dibuja progreso y resultado. `index.ts` no lleva JSX | ink, React, `providers` (iconos y nombres) |
| `src/config.ts` | Carga con fallback a defaults (si el JSON no existe o no valida, devuelve los defaults sin avisar), mezcla con `DEFAULT_PROVIDERS` y guarda | `types` (zod), `fs/promises` |
| `src/runner.ts` | Ejecutar comandos externos con timeout (60 s por defecto) y `FORCE_COLOR=0` | Bun.spawn, `cmd.exe`, `pwsh`, `where` |
| `src/providers/*.ts` | Por gestor: `isAvailable` (comando en el `PATH`), `checkUpdates` (comando + parser), `updatePackage` | `runner`, `parsers`, `base` |
| `src/providers/parsers.ts` | Convertir la salida de texto o JSON en `ParsedPackage[]`. Chocolatey y Scoop parsean dentro de su propio provider | — |
| `src/providers/claude.ts` | Versión local con `claude --version`, última versión del registry de npm (`fetch`), update con `claude update` | registry.npmjs.org |

Comandos reales de cada provider (los que verifica el código):

| Provider | Check | Update |
| --- | --- | --- |
| winget | `winget upgrade --include-pinned` | `winget upgrade --id <id> --accept-package-agreements --accept-source-agreements [--silent] [--force]`. Si falla con `--silent`, reintenta sin él; con force, reintenta con `gsudo` |
| proto | `proto outdated --config-mode global` | `proto install <tool>` |
| moonrepo | `moon upgrade --check` | `moon upgrade` |
| psmodules | script `pwsh` (`runPowerShell`) | `pwsh` + script de limpieza |
| bun | `bun outdated -g` | `bun update -g <pkg>`; el propio bun, con `bun upgrade` |
| npm | `npm outdated -g --json` | `npm update -g <pkg>` |
| pnpm | `pnpm outdated -g --json`; si no parsea, la tabla | `pnpm update -g <pkg>` |
| claude | `claude --version` + registry de npm | `claude update` |
| chocolatey | `choco outdated -r` | `choco upgrade` |
| scoop | `scoop update` + `scoop status` | `scoop update <pkg>` |

## Flujo principal

1. `bin/cli.js` → `src/index.ts#main` lee `argv[2]`. Si no hay comando, entra en modo interactivo (bucle de `p.select`).
2. Check general (`checkAllProviders`): coge los providers activos de la config, filtra los disponibles (`isAvailable`) y lanza `checkUpdates` de todos en paralelo (`Promise.all`). Si un provider lanza una excepción, lo avisa y sigue.
3. Filtra ignorados y paquetes cuya versión nueva coincide con `installedVersions`, y luego los muestra agrupados por provider (`displayUpdates`). Ese filtrado no se aplica a `check <provider>` ni a `update <provider>`.
4. `selectUpdates` (multiselect, con todo marcado por defecto) se salta con `-y`.
5. `performUpdates`: los `available` se actualizan. Los `pinned` y `unknown` de WinGet se pueden forzar, y ofrece instalar `gsudo` si falta. Se actualiza en secuencia, provider a provider, con `updatePackage(id, { force })`. Cada éxito guarda `installedVersions[id]`.

`UpdateProvider.updateAll()` existe en todos los providers, pero la CLI no lo llama. `requiresAdmin` se declara pero nadie lo lee.

## Dónde va lo nuevo

- Gestor nuevo → `src/providers/<gestor>.ts` que extienda `BaseProvider`, su parser en `parsers.ts` con test en `parsers.test.ts`, registro en `providers/index.ts` y entrada en `DEFAULT_PROVIDERS` (`types.ts`).
- Comando nuevo de la CLI → `main()` y su función `xxxCommand` en `src/index.ts`, más `printHelp`. Si tiene versión interactiva, opción en `interactiveMode`. Lo que dibuja con ink va en `src/ui/` y se monta con `renderApp`; `index.ts` le pasa la lógica como funciones, sin JSX.
- Dato persistente nuevo → campo opcional en `ConfigSchema` (`types.ts`) con getters y setters en `config.ts`.
- Ejecutar un comando externo → siempre con `runCommand` / `runPowerShell` de `runner.ts`, nunca `Bun.spawn` directo.

## Decisiones estructurales

- (anterior a SDD) — Los comandos van por `cmd.exe /c` en Windows — para resolver los alias de WindowsApps (`winget`) — `src/runner.ts`.
- (anterior a SDD) — Los parsers son funciones puras separadas de los providers — para poder testearlos sin lanzar procesos — `src/providers/parsers.ts`.
- (anterior a SDD) — Ante una config inválida se vuelve a los defaults en silencio — `src/config.ts#loadConfig`.
- (anterior a SDD) — Bun como runtime — TypeScript nativo, gestor de paquetes integrado y `Bun.spawn` para lanzar comandos — `PLANNING.md` original.
- (anterior a SDD) — @clack/prompts para la UI — consistencia con project-manager y spinners integrados — `PLANNING.md` original.
- 2026-10-08 — ink se monta con `patchConsole: false` — con el `console` parcheado, lo que escribe la consola mientras ink está montado (el `Cancelled` de Ctrl+C, el error de `main`) sale encima del marco o se pierde al desmontar — `src/ui/render.tsx`, feature 0005.
- 2026-10-06 — moon orquesta y `package.json` define — moon llama a los scripts con `bun run`, así que `bun run <script>` sigue funcionando — feature 0001.
