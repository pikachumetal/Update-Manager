# Roadmap — update-manager

## Próximo

| # | Ítem | Estado |
| --- | --- | --- |

## Backlog

| # | Ítem | Origen |
| --- | --- | --- |
| B1 | Decidir la indentación: `.prettierrc` (`useTabs: true`) contra `.editorconfig` y el código (2 espacios) | onboarding SDD, 2026-10-05 |
| B2 | Decidir dónde se fija la versión de Bun: `packageManager` `bun@1.3.6`, `engines` `>=1.3` y `.prototools` `1.3` | onboarding SDD, 2026-10-05 |

## Deuda técnica

| Ítem | Impacto | Destino |
| --- | --- | --- |
| `bun test`: 2 tests en rojo en `parseProtoOutput` (`parses proto outdated output`, `ignores invalid lines`): esperan 2 y 1 resultados y reciben 0 | alto: el parser de proto no reconoce la salida de los fixtures, así que el check de proto puede no listar nada | **Actuar**: patch |
| `loadConfig` (`src/config.ts`) devuelve los defaults en silencio si `config.json` no valida, y el siguiente `saveConfig` lo sobrescribe | alto: se pierden `ignoredPackages` e `installedVersions` sin aviso | **Actuar**: feature (regla de aviso nueva) |
| `check <provider>` y `update <provider>` (`src/index.ts`) no filtran `ignoredPackages` ni `installedVersions`; el filtro solo vive en `checkAllProviders` | medio: reaparecen los paquetes ignorados y los de versión mal etiquetada | **Actuar**: patch |
| `tsc --noEmit`: 4 errores. `UpdateOptions.interactive` no existe (`winget.ts:54`, `winget.ts:66`); `$` sin usar (`runner.ts:1`); `provider` sin usar (`parsers.ts:239`) | medio: el typecheck no pasa y la rama de modo interactivo de WinGet nunca se activa | **Actuar**: patch |
| `VERSION = "0.1.0"` hardcodeado en `src/index.ts`, mientras `package.json` va por la 1.5.0 | bajo: `um --version` miente | **Actuar**: patch |
| Código sin uso: `updateAll()` en `BaseProvider` y en 9 providers, `requiresAdmin`, `parseTableOutput` (`runner.ts`) y los path aliases `@update-manager/*` (`tsconfig.json`) | bajo: confunde al leer, no rompe nada | **Actuar**: patch |
| `format:check` falla en 18 ficheros | bajo: depende de B1 | **Esperar 2.º ticket**: tras decidir B1 |
| `bun run lint`: 15 warnings (vars sin usar, `any`). El script usa `--ext`, que ESLint 9 con flat config ignora | bajo | **Actuar**: patch |
| `.gitignore` ignora `.idea/` y `.vscode/` pero están versionados. El patrón `settings.json` ignora cualquier `settings.json` (`.gemini/settings.json` está versionado) | bajo: reglas que no reflejan lo que hay en git | **Actuar**: patch |
| Chocolatey y Scoop parsean dentro de su provider, fuera de `parsers.ts` y sin tests | bajo: los dos providers están desactivados por defecto | **Esperar 2.º ticket** |
| No hay CI de tests ni de typecheck: `.github/workflows/` solo lanza Claude Code | medio: los rojos de arriba llegaron a `develop` sin aviso | **Esperar 2.º ticket** |
| `src/index.ts` concentra 557 líneas: comandos, menús, render y flujo de force | bajo: crece con cada comando | **Esperar 2.º ticket** |
| `PLANNING.md` es el plan inicial, con las casillas de las fases sin marcar; no refleja el estado actual | bajo: documentación contradictoria | **Actuar**: patch (borrarlo o archivarlo) |
| `bun run sonar` pasa `%SONAR_TOKEN%` con sintaxis de cmd. Sin verificar si `bun run` lo expande en Windows | bajo | **Esperar 2.º ticket** |

## Patches

| Fecha | Id | Descripción |
| --- | --- | --- |

## Releases cerradas
