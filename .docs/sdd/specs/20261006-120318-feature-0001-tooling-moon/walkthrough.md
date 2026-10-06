---
id: 20261006-120318-feature-0001-tooling-moon
feature: 0001
title: Walkthrough — Tooling con moon, limpieza del repo y documentación al día
spec: ./spec.md
plan: ./plan.md
status: done
created: 2026-10-06
---

# Walkthrough — Tooling con moon, limpieza del repo y documentación al día

## 1. Cambios realizados

- **Limpieza** (`d55a1d9`): fuera Sonar (fichero, script, devDeps, `.env.example`), `.gemini/`, `.idea/`, `.vscode/`, `.github/` y el `code-workspace`. `.gitignore` sin las reglas muertas y con `.moon/cache/`. `.gitattributes` reducido a `* text=auto eol=lf`, más CRLF para `*.cmd`, `*.bat` y `*.ps1` y los binarios. Working tree renormalizado a LF.
- **Formato y lint** (`7b5b6ba`, `6368935`): `.prettierrc` con 2 espacios y LF. `lint` = `prettier --check` + `eslint src`, y `lint:fix`. `src/` reformateado en un commit solo de formato.
- **Solo Bun** (`082458f`): `bunfig.toml` (`install.exact`, `run.bun`). `.prototools` con `bun 1.4.2` y `moon 2.6.0`, sin `java`. Versiones exactas en `package.json` y sin `engines.node`.
- **moon** (`fb5ea23`): `.moon/workspace.yml` con un solo proyecto y `moon.yml` con 11 tareas que llaman a `bun run`. Scripts nuevos: `typecheck` y `deps:update` (`ncu --interactive --format group`).
- **Typecheck** (`b2ff2ab`): `UpdateOptions.interactive?`; fuera el import sin uso de `runner.ts`; `_provider` en `parseNpmJsonOutput`. ESLint ignora los identificadores `^_`.
- **Dependencias** (`24a9596`): @clack/prompts 1.8.1, ESLint 10.12.0, typescript-eslint 8.71.1, zod 4.6.5, Prettier 3.9.9, @types/bun 1.4.2, @types/node 26.6.4, TypeScript 6.0.3 y npm-check-updates 23.1.0. `tsconfig.json` sin `baseUrl` ni `paths`.
- **Docs SDD** (`a74ed85`): `PLANNING.md` migrado (decisiones a `architecture.md`, B3 y B4 al Backlog) y borrado. B5 para TS 7. Dos bugs previos a la deuda. `tech-stack.md` reescrito.
- **README y CLAUDE.md** (`86fbe05`): README en inglés con instalación desde el código fuente (`bun link`). `CLAUDE.md` gana los comandos de verificación y el aviso de la caché de moon. `mission.md` y `tech-stack.md` ya no dicen que el paquete está en npm.

## 2. Tiempo y coste: estimado vs real

- Tipo: infra/tooling
- Estimación de implementación (del plan): 4 h
- Esfuerzo real: 0,7 h — aproximado con las marcas de los commits (`096206f` a las 14:13, `d22cee4` a las 14:51), con implementación, revisión final y pasada de fix
- Desviación: −3,3 h (−83 %)
- Causa de la desviación: la estimación suponía que algún major (ESLint 10, @clack/prompts 1.x) obligaría a tocar código y que configurar moon 2 llevaría tiempo. Ningún major rompió API y las tasks fueron mecánicas; la única incidencia fue `@types/node`.
- Modelo del hilo: Opus 5.5, effort no registrado
- Tokens del hilo: 29.924.189 — claude-opus-5-5 29.924.189 (incluye el onboarding brownfield de la misma sesión, anterior a la rama)
- Tokens de subagentes: 1.445.213 en 1 despacho — Revisión final rama 0001 claude-opus-5-5 1.445.213 / 4 min
- Coste de la sesión: sin precio (sin tabla pricing en sdd-kit.json)
- Coste de sujetos: no aplica
- Review de spec: no

## 3. Desviaciones del plan

- **Enmienda de la spec, aprobada**: `@types/node` 26.6.4 vuelve como devDep explícita. `bun-types` la pide con `*`, el lock la dejaba en 25.0.8 y con esa versión `process.on("SIGINT")` no tipaba.
- Revisión final (opus): «with fixes», con 0 Critical, 4 Important y 5 Minor. Corregidos en `d22cee4`: los `outputs` de `test-coverage`, `um update --yes` en el README, el alcance de `um ignore`, el puntero de `CLAUDE.md` y «Entry de npm» en `architecture.md`.
- `build` no depende de `clean` en `moon.yml`, porque el `prebuild` de `package.json` ya lo ejecuta.
- Además de lo planificado: `tsconfig.json` pierde `baseUrl` y `paths`, `eslint.config.js` gana `argsIgnorePattern` y se reformatea, y `mission.md` se corrige.

### Decisiones tomadas sin el dev-lead

- `.idea/` y `.vscode/` siguen en `.gitignore`: ya no están versionados, así que la regla vuelve a ser cierta — coste si está mal: ninguno.
- Renormalización de EOL con borrado + `git checkout HEAD -- .`, porque el hook del usuario bloquea el reset duro — coste si está mal: ninguno.
- `build` sin `deps: clean`, porque el `prebuild` ya limpia — coste si está mal: ninguno.
- Los 13 warnings de parámetros `_x` se resuelven con `argsIgnorePattern: "^_"`, y `eslint.config.js` pasa a 2 espacios — coste si está mal: ninguno.
- `tsconfig.json` sin `baseUrl` ni `paths`: TS 6 los marca obsoletos (TS5101) y los alias no se usaban — coste si está mal: ninguno.
- `mission.md` y `tech-stack.md` decían que el paquete se publica en npm, pero `npm view` da 404 — coste si está mal: si se publica, se añade la línea.
- Las líneas 2 y 3 del Review Focus se ejecutaron, pero no entraron en el ledger hasta después de la revisión — coste si está mal: ninguno.
- Minor diferido: repetir el smoke de `um check` con el binario recompilado tras los majors. Se repitió después y la salida fue igual.
- Minor diferido: `moon.yml` y otros ficheros de la raíz no tienen salto de línea final, porque el lint solo cubre `src/`.

## 4. Verificación

### 4.1 Builds

- `moon run :lint --force` → 0 · `moon run :typecheck --force` → 0 · `moon run :build --force` → 0 (6 s).
- Suite completa: `moon run :test --force` → 21 en verde y 2 en rojo (`parseProtoOutput > parses proto outdated output`, `parseProtoOutput > ignores invalid lines`), los 2 excluidos por la spec · 0,3 s.

### 4.2 Smoke / tests

- Validado: 2026-10-06 · «lo que me has planteado ok, validado» · no detalló qué probó, salvo la salida de `.\bin\um.exe check` que pegó antes (paso 3 del guion)

| THEN | Evidencia | Resultado |
| --- | --- | --- |
| 1. `moon run :lint` sale con 0 | ejecución real | ✅ 0; con un fichero mal formateado, 1 |
| 2. `moon run :typecheck` sale con 0 | ejecución real | ✅ |
| 3. `moon run :test`: los únicos fallos, los 2 de `parseProtoOutput` | ejecución real | ✅ 21 pass / 2 fail |
| 4. `moon run :build` crea los dos `.exe` y `um.exe --help` imprime el uso | ejecución real | ✅ |
| 5. `moon query tasks` lista las 11 tareas | ejecución real | ✅ |
| 6. `moon run :deps-update` muestra ncu interactivo agrupado | no probado | necesita TTY: va en el guion del dev-lead |
| 7. `git ls-files --eol` sin `w/crlf` | ejecución real | ✅ 0 ficheros |
| 8. Ninguno de los ficheros borrados está versionado | ejecución real | ✅ |
| 9. `um check` igual que antes | ejecución real | ✅ salida idéntica a la de `develop` en un worktree |
| 10. Bun `1.4.2` en `.prototools`, `packageManager` y `engines.bun` | ejecución real | ✅ |
| 11. Sin `^`/`~`, sin `engines.node`, `@types/node` fijada y TS `6.0.3` | ejecución real | ✅ |
| 12. Sin `node` en el PATH, lint, typecheck y test corren con Bun | ejecución real | ✅ lint 0, typecheck 0, test 21/2 |

### 4.3 Residuales / deuda generada

- `um check` no lista WinGet, y pnpm muestra `[WARN] Using → skips`. Son previos a la feature y están en la tabla de deuda.
- `um --version` sigue diciendo `0.1.0`; ya estaba en la deuda.
- Filas de deuda nuevas: `um update --yes` sin provider; el provider de proto (JSON, sufijos de build, `--pin`); la causa raíz del `[WARN]` de pnpm, para el patch 0002.

## 5. Aprendizajes

- La caché de moon dio un verde falso de `:typecheck` tras subir dependencias → `CLAUDE.md` § Comandos (`--force`).
- `bun-types` pide `@types/node` con `*` y el lock no la sube sola → `tech-stack.md` (motivo de la devDep).
- `typescript-eslint` limita TypeScript a `<6.1.0` → `tech-stack.md` y B5.

## 6. Adendas

_Ninguna._
