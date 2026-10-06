---
id: 20261006-120318-feature-0001-tooling-moon
feature: 0001
title: Tooling con moon, limpieza del repo y documentación al día
mode: full
status: approved
created: 2026-10-06
author: Àngel Delgado
approvers:
  - role: dev-lead
    name: Àngel Delgado
    approved_at: 2026-10-06
---

# Spec — Tooling con moon, limpieza del repo y documentación al día

## Capacidades

- Ninguna, porque son herramientas y docs: `um` no cambia su comportamiento observable.

## Decisiones que he tomado yo — valida estas

Review de spec propuesta: ninguna. Señales: dependencia externa (moon y `npm-check-updates`) y área no explorada (README entero, configuración de moon 2). Tamaño: ~400 líneas en ~25 ficheros, casi todo borrados y reformateo.
- Técnica: comprobaría que las tareas de moon cubren todos los scripts de `package.json` y que la subida de majors no cambia `um` (señal: dependencia externa).
- Mínimo razonable: ninguna. Queda sin mirar la sintaxis de moon 2, pero se cubre en la implementación con la documentación de moon (Context7) y ejecutando cada tarea.

1. **Sonar se quita entero**: `sonar-project.properties`, `.env.example`, el script `sonar`, las devDeps `@sonar/scan` y `sonarqube-scanner`, y `java` de `.prototools`. El servidor ya no existe, y si hiciera falta volver a él, se recupera con `git revert`.
2. **Se borran también `update-manager.code-workspace` y `.idea/workspace.xml`**: son ficheros de IDE, igual que `.idea/` y `.vscode/`, aunque no estaban en tu lista.
3. **Se borra `.github/` entero**, con los dos workflows de Claude Code (`claude.yml` y `claude-code-review.yml`). El repo se queda sin CI. La fila de deuda «No hay CI de tests» sigue abierta.
4. **moon 2.6.0**, la versión que tienes instalada, con un solo proyecto en la raíz. Las versiones de `bun` y `moon` se fijan solo en `.prototools`, que es la única fuente (B2). `packageManager` y `engines.bun` se alinean con esa versión.
5. **Bun se fija en 1.4.2**, la que usas globalmente. Hoy el repo dice 1.3.
6. **Ids de las tareas de moon en kebab-case**, uno por script: `start`, `dev`, `build`, `clean`, `test`, `test-coverage`, `typecheck`, `lint`, `lint-fix`, `deps-update` y `link`. `dev` y `deps-update` son persistentes o interactivas y van sin caché.
7. **`lint` = `prettier --check` + `eslint src`**, sin `--ext`, porque ESLint 9 con flat config lo ignora. `lint-fix` es su versión `--write` / `--fix`. Los scripts `format` y `format:check` se integran en `lint` y `lint:fix` y desaparecen.
8. **`npm-check-updates` entra como devDependency** con versión fijada, no como `bunx …@latest`. Así el actualizador no cambia de una ejecución a otra, y se actualiza a sí mismo con su propia tarea.
9. **Las dependencias y devDependencies se suben todas a su última versión, majors incluidas (ESLint 10, entre otras).** Si un major obliga a tocar código, se arregla en la feature solo si es un cambio de API sin efecto en `um`. Si no, la dependencia se queda en su major actual, con el motivo escrito en `tech-stack.md`.
17. **Todas las versiones de `package.json` van fijadas, sin `^` ni `~`.** `bunfig.toml` lleva `[install] exact = true` para que `bun add` también fije la versión exacta. ncu respeta los rangos exactos al subir.
18. **TypeScript 6.0.3, no 7.** La última `typescript-eslint` (8.71.1) exige `typescript >=4.8.4 <6.1.0`, y nuestra config de ESLint usa `parserOptions.project`. Pasar a TS 7 queda en el Backlog (B5), a la espera de que `typescript-eslint` lo soporte.
19. **Solo Bun, sin Node.** `bunfig.toml` lleva `[run] bun = true`, así que `eslint`, `prettier` y `tsc`, que tienen shebang de `node`, se ejecutan con Bun. Se quita `engines.node`. `@types/node` se mantiene como devDep explícita y fijada (enmienda del 2026-10-06). Si alguna herramienta falla bajo Bun, se queda con Node y el motivo se escribe en `tech-stack.md`.
10. **`UpdateOptions` gana `interactive?: boolean`**: `winget.ts` ya lo lee. Solo se tipa lo que hay, para que pase `tsc`, sin cambiar el comportamiento.
11. **El reformateo de `src/` va en su propio commit, solo de formato**, para que se lea aparte. Es la «migración masiva» del artículo 4 de la constitution, y su justificación es esta spec: B1 decidido y `format:check` en rojo.
12. **`.gitattributes` se reduce** a `* text=auto eol=lf`, las excepciones CRLF (`*.cmd`, `*.bat`, `*.ps1`) y los binarios. Las líneas `eol=lf` por extensión repiten la regla general. El working tree se renormaliza una sola vez.
13. **Migración de `PLANNING.md`**: «¿Por qué Bun?» y «¿Por qué @clack/prompts?» pasan a `architecture.md` § «Decisiones estructurales». «Progress bars estilo docker» y «logs y errores detallados» pasan al Backlog como B3 y B4. Después se borra.
14. **El README se reescribe en inglés**, el idioma de la constitution para la CLI y el README, con `code-craftsmanship:technical-documentation`, `elements-of-style:writing-clearly-and-concisely` y `humanizer:humanizer`. Va dirigido a quien instala y usa `um`. Lo de desarrollar el proyecto se queda en una sección corta que apunta a las tareas de moon.
15. **El `CLAUDE.md` se revisa con `claude-md-management:claude-md-improver`** después del resto, para que hable de moon. Se aplican sus mejoras sin volver al monolito: punteros y como mucho 5 reglas.
16. **Los 2 tests en rojo de `parseProtoOutput` no entran.** Son un bug con su propio patch. El criterio de éxito los excluye por nombre.

### Decisiones tomadas con el dev-lead

- Carril full, perfil `delegate` — «Full + delegate (Recomendado)».
- Feature sin partir pese a las ~8 tasks — «Seguir entera en la 0001».
- Indentación de 2 espacios (B1) — «2 espacios (Recomendado)».
- Los scripts de `package.json` se mantienen y moon los llama — «Mantenerlos; moon los llama».
- Alcance añadido: `:typecheck`, B2, borrar `PLANNING.md`, limpiar `.gitignore`, revisar `.gitattributes` y CRLF/LF — respuesta a «¿qué metemos en la 0001?».
- Alcance añadido: migrar `PLANNING.md`, reescribir el README con las tres skills de escritura y revisar el `CLAUDE.md` con su skill — «otra cosa sería revisar @PLANNING.md… también revisar README… y revisar el CLAUDE.md».
- Sonar fuera — «sonar ya no lo uso no tengo ya el servidor local». Propuse quitarlo y no hubo objeción; se valida aquí (decisión 1).
- Versiones fijadas, solo Bun y subir todo — «yo en dependencies normalmente no uso ni ^ ni ~… si podemos tener solo bun mejor… actualizar todas las dep y dev dep».

## Intent

Hoy el repo arrastra configuración muerta (Sonar, tres IDEs, workflows de Claude Code), dos ficheros de formato que se contradicen, ningún typecheck que pase, dependencias sin revisar y documentación desfasada (`PLANNING.md`, un README escrito antes del código actual). Lo que se quiere es un repo donde una sola orden, `moon run`, lo hace todo: arrancar, testear, lintar, tipar, compilar y actualizar dependencias. El formato y los finales de línea quedan estables, y los docs dicen la verdad.

## Scope

- Entra: borrar Sonar, `.gemini/`, `.idea/`, `.vscode/`, `.github/`, `update-manager.code-workspace` y `PLANNING.md` (tras migrarlo).
- Entra: limpiar `.gitignore`, simplificar `.gitattributes` y renormalizar a LF.
- Entra: conciliar `.prettierrc` con `.editorconfig` (2 espacios, LF) y reformatear `src/`.
- Entra: `.prototools` como única fuente de versión de `bun` y `moon`.
- Entra: `.moon/workspace.yml` y `moon.yml` con una tarea por script de `package.json`.
- Entra: scripts `lint`, `lint:fix`, `typecheck` y `deps:update` (ncu interactivo agrupado) en `package.json`.
- Entra: `bunfig.toml` (`exact`, `run.bun`); fijar versiones exactas; quitar `engines.node` y `@types/node`.
- Entra: subir todas las dependencias (TypeScript a 6.0.3) y arreglar los 4 errores de `tsc` y los warnings de lint que se puedan quitar sin tocar lógica.
- Entra: actualizar `tech-stack.md`, `architecture.md` y `roadmap.md`; reescribir `README.md`; revisar `CLAUDE.md`.
- No entra: los tests en rojo de `parseProtoOutput`, el filtro de `check`/`update <provider>`, el aviso de config inválida y el código sin uso (`updateAll`, `requiresAdmin`, `parseTableOutput`). Todo eso tiene su fila de deuda.
- No entra: CI nueva ni partir `src/index.ts`.

## Approach

`package.json` sigue siendo el sitio donde vive cada comando. moon los orquesta: cada tarea de `moon.yml` ejecuta `bun run <script>`, declara sus `inputs` para la caché y, si toca, sus `deps` (`build` depende de `clean`). Las versiones de las herramientas las fija proto (`.prototools`). El actualizador es `ncu --interactive --format group`, que agrupa las subidas en patch, minor y major y ofrece instalar al terminar.

El orden protege cada paso con el anterior: limpieza → formato y EOL → moon y scripts → typecheck → subida de dependencias (ya con `:lint`, `:typecheck` y `:test` para verificarla) → docs.

Escenarios de aceptación (el smoke de la validación da una fila por THEN):

1. GIVEN el repo limpio · WHEN `moon run :lint` · THEN sale con 0, con Prettier y ESLint ejecutados y 0 errores.
2. GIVEN el repo limpio · WHEN `moon run :typecheck` · THEN sale con 0 y `tsc --noEmit` no da ningún error.
3. GIVEN el repo limpio · WHEN `moon run :test` · THEN los únicos fallos son `parseProtoOutput > parses proto outdated output` y `parseProtoOutput > ignores invalid lines`.
4. GIVEN el repo limpio · WHEN `moon run :build` · THEN existen `bin/update-manager.exe` y `bin/um.exe`, y `bin/um.exe --help` imprime el uso.
5. GIVEN las tareas de moon · WHEN `moon query tasks` · THEN aparecen `start`, `dev`, `build`, `clean`, `test`, `test-coverage`, `typecheck`, `lint`, `lint-fix`, `deps-update` y `link`.
6. GIVEN una terminal interactiva · WHEN `moon run :deps-update` · THEN ncu muestra las dependencias desactualizadas agrupadas por patch, minor y major y deja elegir cuáles subir.
7. GIVEN un clon recién sacado en Windows con `core.autocrlf=true` · WHEN `git ls-files --eol` · THEN ningún fichero de texto sale con `w/crlf`, salvo `*.cmd`, `*.bat` y `*.ps1`.
8. GIVEN la rama terminada · WHEN se listan los ficheros versionados · THEN no existe ninguno de `sonar-project.properties`, `.env.example`, `.gemini/`, `.idea/`, `.vscode/`, `.github/`, `update-manager.code-workspace` ni `PLANNING.md`.
9. GIVEN `um` instalado desde la rama · WHEN `um check` · THEN lista las actualizaciones agrupadas por provider, igual que antes de la feature.
10. GIVEN `.prototools` · WHEN se busca la versión de Bun en el repo · THEN `.prototools` dice `bun = "1.4.2"`, `packageManager` dice `bun@1.4.2` y `engines.bun` dice `>=1.4.2`.
11. GIVEN `package.json` · WHEN se leen `dependencies` y `devDependencies` · THEN ninguna versión empieza por `^` ni por `~`, no hay `engines.node`, `@types/node` está fijada como devDep y `typescript` es `6.0.3`.
12. GIVEN un PATH sin `node` · WHEN `moon run :lint :typecheck :test` · THEN las tres tareas se ejecutan con Bun y salen como dicen los escenarios 1, 2 y 3.

## Enmiendas

- 2026-10-06 — `@types/node` vuelve como devDep explícita (`26.6.4`); cambian la decisión 19 y el escenario 11 — `bun-types` la pide con `*`, el lock la deja en 25.0.8 y con esa versión `process.on("SIGINT")` no tipa; son solo tipos, y Node sigue fuera como runtime — aprobada: «devDep explícita (Recomendado)»

## Aprobaciones

| Rol | Nombre | Fecha | Estado |
| --- | --- | --- | --- |
| dev-lead | Àngel Delgado | 2026-10-06 | aprobada: «si, ya te dije que era un mover papeles» |
