# Roadmap — update-manager

## Próximo

| # | Ítem | Estado |
| --- | --- | --- |
| 0001 | Tooling con moon, limpieza del repo y documentación al día | ✅ |

## Backlog

| # | Ítem | Origen |
| --- | --- | --- |
| **[Feature 0001, 2026-10-06: saldada — [walkthrough](specs/20261006-120318-feature-0001-tooling-moon/walkthrough.md)]** B1 | Decidir la indentación: `.prettierrc` (`useTabs: true`) contra `.editorconfig` y el código (2 espacios) | onboarding SDD, 2026-10-05 |
| **[Feature 0001, 2026-10-06: saldada — [walkthrough](specs/20261006-120318-feature-0001-tooling-moon/walkthrough.md)]** B2 | Decidir dónde se fija la versión de Bun: `packageManager` `bun@1.3.6`, `engines` `>=1.3` y `.prototools` `1.3` | onboarding SDD, 2026-10-05 |
| B3 | Progress bars estilo docker durante las actualizaciones | `PLANNING.md` original, fase 5 |
| B4 | Logs y errores detallados | `PLANNING.md` original, fase 5 |
| B5 | Pasar a TypeScript 7 cuando `typescript-eslint` lo admita (hoy exige `typescript <6.1.0`) | feature 0001, 2026-10-06 |

## Deuda técnica

| Ítem | Impacto | Destino |
| --- | --- | --- |
| `bun test`: 2 tests en rojo en `parseProtoOutput` (`parses proto outdated output`, `ignores invalid lines`): esperan 2 y 1 resultados y reciben 0 | alto: el parser de proto no reconoce la salida de los fixtures, así que el check de proto puede no listar nada | **Actuar**: patch |
| `loadConfig` (`src/config.ts`) devuelve los defaults en silencio si `config.json` no valida, y el siguiente `saveConfig` lo sobrescribe | alto: se pierden `ignoredPackages` e `installedVersions` sin aviso | **Actuar**: feature (regla de aviso nueva) |
| `check <provider>` y `update <provider>` (`src/index.ts`) no filtran `ignoredPackages` ni `installedVersions`; el filtro solo vive en `checkAllProviders` | medio: reaparecen los paquetes ignorados y los de versión mal etiquetada | **Actuar**: patch |
| **[Feature 0001, 2026-10-06: saldada — [walkthrough](specs/20261006-120318-feature-0001-tooling-moon/walkthrough.md)]** `tsc --noEmit`: 4 errores. `UpdateOptions.interactive` no existe (`winget.ts:54`, `winget.ts:66`); `$` sin usar (`runner.ts:1`); `provider` sin usar (`parsers.ts:239`) | medio: el typecheck no pasa y la rama de modo interactivo de WinGet nunca se activa | **Actuar**: patch |
| `VERSION = "0.1.0"` hardcodeado en `src/index.ts`, mientras `package.json` va por la 1.5.0 | bajo: `um --version` miente | **Actuar**: patch |
| **[Feature 0001, 2026-10-06: parcial — [walkthrough](specs/20261006-120318-feature-0001-tooling-moon/walkthrough.md); queda: `updateAll()`, `requiresAdmin` y `parseTableOutput`]** Código sin uso: `updateAll()` en `BaseProvider` y en 9 providers, `requiresAdmin`, `parseTableOutput` (`runner.ts`) y los path aliases `@update-manager/*` (`tsconfig.json`) | bajo: confunde al leer, no rompe nada | **Actuar**: patch |
| **[Feature 0001, 2026-10-06: saldada — [walkthrough](specs/20261006-120318-feature-0001-tooling-moon/walkthrough.md)]** `format:check` falla en 18 ficheros | bajo: depende de B1 | **Esperar 2.º ticket**: tras decidir B1 |
| **[Feature 0001, 2026-10-06: saldada — [walkthrough](specs/20261006-120318-feature-0001-tooling-moon/walkthrough.md)]** `bun run lint`: 15 warnings (vars sin usar, `any`). El script usa `--ext`, que ESLint 9 con flat config ignora | bajo | **Actuar**: patch |
| **[Feature 0001, 2026-10-06: saldada — [walkthrough](specs/20261006-120318-feature-0001-tooling-moon/walkthrough.md)]** `.gitignore` ignora `.idea/` y `.vscode/` pero están versionados. El patrón `settings.json` ignora cualquier `settings.json` (`.gemini/settings.json` está versionado) | bajo: reglas que no reflejan lo que hay en git | **Actuar**: patch |
| Chocolatey y Scoop parsean dentro de su provider, fuera de `parsers.ts` y sin tests | bajo: los dos providers están desactivados por defecto | **Esperar 2.º ticket** |
| No hay CI de tests ni de typecheck: `.github/workflows/` solo lanza Claude Code | medio: los rojos de arriba llegaron a `develop` sin aviso | **Esperar 2.º ticket** |
| `src/index.ts` concentra 557 líneas: comandos, menús, render y flujo de force | bajo: crece con cada comando | **Esperar 2.º ticket** |
| **[Feature 0001, 2026-10-06: saldada — [walkthrough](specs/20261006-120318-feature-0001-tooling-moon/walkthrough.md)]** `PLANNING.md` es el plan inicial, con las casillas de las fases sin marcar; no refleja el estado actual | bajo: documentación contradictoria | **Actuar**: patch (borrarlo o archivarlo) |
| `um check` no lista WinGet (ni con updates ni con ✓) en la máquina del autor; igual en `develop` antes de la 0001 | medio: el provider principal no aparece | **Actuar**: patch (investigar `isAvailable` / `checkUpdates` de winget) |
| `um update --yes` (sin provider) toma `--yes` como provider y falla con `Provider "--yes" not found` (`src/index.ts`, `updateCommand(args[1], …)`); `printHelp` lo anuncia | medio: el ejemplo de la ayuda no funciona | **Actuar**: patch |
| pnpm: `um check` muestra un update `[WARN] Using → skips`. Causa: `pnpm outdated -g --json` escribe `[WARN] Using --global skips…` antes del JSON, `parseNpmJsonOutput` falla el `JSON.parse` y devuelve `[]`, y `pnpm.ts` recurre a `parsePnpmTableOutput`, que toma la línea como paquete. Fix: `parseNpmJsonOutput` parsea desde el primer `{` | bajo: ruido en la salida | **Actuar**: patch 0002, tras la 0001 |
| Provider de proto: parsea la tabla de texto (corta `3.14.8+20261003` a `3.14.8+202`; con un agente en el entorno proto 0.62 escribe NDJSON, de ahí los 2 tests en rojo de `parseProtoOutput`) y actualiza con `proto install <tool>`, que no instala un `newest_version` con sufijo de build (python exige `proto install python 3 --pin`) | medio: proto lista updates que `um` no sabe aplicar | **Actuar**: feature (pasar a `proto outdated --json` y decidir la semántica de instalación y `--pin`) |
| **[Feature 0001, 2026-10-06: saldada — [walkthrough](specs/20261006-120318-feature-0001-tooling-moon/walkthrough.md)]** `bun run sonar` pasa `%SONAR_TOKEN%` con sintaxis de cmd. Sin verificar si `bun run` lo expande en Windows | bajo | **Esperar 2.º ticket** |

## Patches

| Fecha | Id | Descripción |
| --- | --- | --- |

## Releases cerradas
