---
id: 20261006-120318-feature-0001-tooling-moon
feature: 0001
title: Plan de implementación — Tooling con moon, limpieza del repo y documentación al día
spec: ./spec.md
status: approved
created: 2026-10-06
---

# Plan de implementación — Tooling con moon, limpieza del repo y documentación al día

## Decisiones que he tomado yo — valida estas

1. **Ejecución Native, implementada por el hilo.** Las 8 tasks son configuración en secuencia, y cada una se apoya en la anterior: el formato antes del lint, moon antes de verificar la subida de deps. Un subagente por task pagaría el contexto 8 veces para cambios de pocas líneas.
2. **Revisor final: `sdd-kit:effort-high` + `opus`**, sobre la rama entera. Es la única revisión independiente en Native.
3. **Las tasks de tooling no llevan tests unitarios.** Su RED es el comando de «Verificación» ejecutado antes del cambio, que tiene que fallar o no existir. Su GREEN es el mismo comando en verde. El único código TS que se toca es el de los errores de `tsc`, y lo cubre `:typecheck`.
4. **Los ids de proyecto y de tarea de moon**: el proyecto se llama `update-manager` y está en `.`, y las tareas son las de la decisión 6 de la spec. La sintaxis exacta de moon 2 (`workspace.yml`, `moon.yml`, `toolchains.yml`) se consulta en Context7 antes de escribirla: son 3 llamadas como máximo.
5. **El script `deps:update` es `ncu --interactive --format group`.** La instalación final la ofrece ncu, que detecta Bun por `packageManager`.
6. **Riesgo alto**: un major (ESLint 10, `@clack/prompts`, zod) rompa `um`. Mitigación: la subida va en la última task de código, con `:lint`, `:typecheck` y `:test` ya montados, más el smoke `um check`.
7. **Coste**: unas 4 h de hilo y una revisión final con Opus, de unos 150k tokens.
8. Review Focus: 4 entradas que la spec no fija; ver la sección.

**Goal**: dejar el repo con moon como orquestador, solo Bun, versiones fijadas, formato y EOL estables, sin configuración muerta y con los docs al día.

**Architecture**: `package.json` sigue definiendo los comandos. moon los orquesta con `bun run <script>`, y proto fija las versiones de `bun` y `moon` en `.prototools`. `bunfig.toml` fuerza que todo corra con Bun y que las versiones se instalen exactas.

**Tech Stack**: Bun 1.4.2, moon 2.6.0, TypeScript 6.0.3, ESLint 10 + typescript-eslint, Prettier, npm-check-updates.

**Spec**: `./spec.md`

**Ejecución**: native, porque son 8 tasks de configuración en secuencia, cada una con pocas líneas y apoyada en la anterior. Si esta sesión se retomó tras una compactación (empieza por «This session is being continued from a previous conversation») y quedan dos o más tasks sin su línea `complete` en el ledger, no las hagas tú: despacha las que quedan con subagent-driven-development sobre el mismo ledger. La sesión que ejecuta va bien en gama media (Sonnet, effort medium); el modelo más capaz se reserva para la revisión final.

## Restricciones globales

### De código

- Indentación de 2 espacios y LF en todo fichero de texto, salvo `*.cmd`, `*.bat` y `*.ps1`, que van en CRLF.
- Versiones exactas en `package.json`, sin `^` ni `~`.
- `typescript` = `6.0.3`. Bun = `1.4.2` (`.prototools`, `packageManager`: `bun@1.4.2`, `engines.bun`: `>=1.4.2`). moon = `2.6.0`.
- Sin `engines.node`. `@types/node` fijada como devDep (enmienda de la spec, 2026-10-06).
- El comportamiento de `um` no cambia. `UpdateOptions` solo gana `interactive?: boolean`.
- Los comandos externos pasan por `runCommand` / `runPowerShell` (`src/runner.ts`).
- Sin comentarios que repitan el código ni que citen documentos (constitution, spec, task, capacidad).
- El README y los mensajes de la CLI, en inglés. Los docs de `.docs/sdd/`, en español.

### De proceso

- Ejecución Native: implementa el hilo. El revisor final va con `sdd-kit:effort-high` + `opus`.
- Commits en Conventional Commits, con tipo y scope en inglés y título en español, terminados en `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- El reformateo de `src/` va en su propio commit, solo de formato.

## Review Focus

- Un clon nuevo en Windows con `core.autocrlf=true` → los ficheros salen en LF y `git status` limpio · Task 1, `git ls-files --eol` tras renormalizar.
- `moon run :lint` con Prettier y ESLint ante un fichero mal formateado → sale distinto de 0 · Task 2, verificación con un fichero temporal mal formateado.
- Herramientas con shebang `node` y sin Node en el PATH → corren con Bun · Task 3, `:lint :typecheck :test` con un PATH sin `node`.
- `um check` tras la subida de majors → misma salida agrupada · Task 6, smoke `bun run start check`.

---

## Phase -1 — Pre-Implementation Gates

- [x] **Simplicity gate**: moon llama a los scripts existentes; no se escribe nada nuevo de lógica.
- [x] **YAGNI gate**: sin abstracciones; un solo proyecto moon.
- [x] **Brownfield gate**: `um` no cambia; el refactor masivo (el reformateo) lo justifica la spec (art. 4).
- [x] **Constitution check**: arts. 1, 3, 4 y 5, y convenciones de commits.

---

## 1. Decisiones técnicas

### 1.1 Estructura de ficheros

**Crear**:

- `bunfig.toml` — `[install] exact = true` y `[run] bun = true`.
- `.moon/workspace.yml` — workspace con el proyecto `update-manager` en `.`.
- `moon.yml` — tareas.

**Modificar**:

- `package.json` — scripts, versiones fijadas, `engines` y `packageManager`, sin Sonar ni `@types/node`, con `npm-check-updates`.
- `.prototools` — `bun = "1.4.2"` y `moon = "2.6.0"`; sin `java`.
- `.prettierrc` — `useTabs: false`, `endOfLine: "lf"`.
- `.gitignore` y `.gitattributes`.
- `src/types.ts`, `src/runner.ts`, `src/providers/parsers.ts` — errores de `tsc`. `src/**` — reformateo.
- `README.md`, `CLAUDE.md`, `.docs/sdd/tech-stack.md`, `.docs/sdd/architecture.md`, `.docs/sdd/roadmap.md`.

**Borrar**: `sonar-project.properties`, `.env.example`, `.gemini/`, `.idea/`, `.vscode/`, `.github/`, `update-manager.code-workspace`, `PLANNING.md`.

**NO se tocan**:

- `src/providers/parsers.ts` y su test en lo que respecta a `parseProtoOutput`: el bug tiene su propio patch.
- La lógica de `src/index.ts`, `config.ts` y los providers: solo cambia el formato.

### 1.6 Dependencias

moon 2.6.0 y proto, ya instalados. `npm-check-updates`, nuevo como devDep.

### 1.7 Riesgos

| Riesgo | Probabilidad | Impacto | Mitigación |
| --- | --- | --- | --- |
| Un major rompe `um` o el lint | media | alto | La subida va al final, con lint, typecheck y test montados, y el smoke `um check`. Si rompe, esa dependencia se queda en su major actual con el motivo en `tech-stack.md` |
| ESLint o `tsc` fallan bajo Bun | baja | medio | Escenario 12; si fallan, la herramienta se queda con Node y se documenta |
| La renormalización deja cambios inesperados | baja | bajo | Se hace con el árbol limpio y se revisa `git status` antes de seguir |

### 1.8 Rollout

Directo: merge a `develop`.

### 1.9 Excepciones a la constitution

Ninguna. El reformateo es la migración masiva del art. 4, justificada en la spec.

---

## 2. Tasks

### Task 1 — Limpieza y finales de línea

**Modelo**: hilo principal (Native).
**Tests RED**: `git ls-files --eol | Select-String 'w/crlf'` devuelve filas; los ficheros a borrar existen.
**Superficies**: tooling.
**Verificación**: `pwsh -NoProfile -Command "if (git ls-files --eol | Select-String 'w/crlf' | Where-Object { $_ -notmatch '\.(cmd|bat|ps1)$' }) { exit 1 }; if (git ls-files sonar-project.properties .env.example .gemini .idea .vscode .github update-manager.code-workspace) { exit 1 }; 'ok'"`
**Se prueba en la aplicación**: no, porque es un cambio de repo sin efecto en `um`.

**Interfaces**: Consume: nada. Produce: un árbol en LF y sin ficheros de IDE ni de Sonar.

**Ficheros**: borrar `sonar-project.properties`, `.env.example`, `.gemini/`, `.idea/`, `.vscode/`, `.github/`, `update-manager.code-workspace`. Modificar `.gitignore`, `.gitattributes`, `package.json` (quitar el script `sonar` y las devDeps `@sonar/scan` y `sonarqube-scanner`).

- [ ] **Step 1**:
  - `git rm -r` de los ficheros listados.
  - `.gitignore`: quitar `.idea/`, `.vscode/`, el `settings.json` genérico con su excepción, `projects.json`, `tools.json`, `recents.json` y SonarQube. Mantener `.claude/settings.local.json` y añadir `.moon/cache/`.
  - `.gitattributes`: dejar `* text=auto eol=lf`, las líneas `eol=crlf` de `*.cmd`, `*.bat` y `*.ps1`, y las de binarios.
- [ ] **Step 2**: commit. Después, con el árbol limpio: `git rm --cached -r -q .; git reset --hard`.
- [ ] **Step 3**: verificación.
- [ ] **Step 4**: el commit del Step 2 es el de la task.

### Task 2 — Formato y lint

**Modelo**: hilo principal (Native).
**Tests RED**: `bun run lint` con el script nuevo falla por formato.
**Superficies**: tooling.
**Verificación**: `bun run lint` (sale con 0).
**Se prueba en la aplicación**: no, porque solo cambia el formato.

**Interfaces**: Consume: nada. Produce: los scripts `lint` = `prettier --check "src/**/*.{ts,js,json}" && eslint src` y `lint:fix` = `prettier --write "src/**/*.{ts,js,json}" && eslint src --fix`. Desaparecen `format` y `format:check`.

**Ficheros**: `.prettierrc`, `package.json`, `src/**`.

- [ ] **Step 1**: `.prettierrc` con `useTabs: false` y `endOfLine: "lf"`, y los scripts.
- [ ] **Step 2**: `bun run lint:fix`. El reformateo va en un commit propio, solo de formato.
- [ ] **Step 3**: verificación. Review Focus: un fichero temporal mal formateado en `src/` hace que `bun run lint` salga distinto de 0; después se borra.
- [ ] **Step 4**: dos commits: la configuración de formato y lint, y el reformateo.

### Task 3 — Solo Bun y versiones fijadas

**Modelo**: hilo principal (Native).
**Tests RED**: `package.json` tiene `^` y `engines.node`.
**Superficies**: tooling.
**Verificación**: `pwsh -NoProfile -Command "$p = Get-Content package.json -Raw | ConvertFrom-Json; $all = @($p.dependencies.PSObject.Properties) + @($p.devDependencies.PSObject.Properties); if ($all | Where-Object { $_.Value -match '^[\^~]' }) { exit 1 }; if ($p.engines.node -or $p.devDependencies.'@types/node') { exit 1 }; if ($p.packageManager -ne 'bun@1.4.2' -or $p.engines.bun -ne '>=1.4.2') { exit 1 }; 'ok'"` y `bun install`.
**Se prueba en la aplicación**: no, porque es base común del tooling.

**Interfaces**: Consume: nada. Produce: `bunfig.toml`; `.prototools` con `bun = "1.4.2"` y `moon = "2.6.0"`.

**Ficheros**: crear `bunfig.toml`; modificar `.prototools` y `package.json`.

- [ ] **Step 1**:
  - `bunfig.toml` con `[install] exact = true` y `[run] bun = true`.
  - `.prototools` sin `java`.
  - `package.json`: quitar `^` y `~` (dejando la versión instalada hoy), quitar `engines.node` y `@types/node`, y poner `packageManager: bun@1.4.2` y `engines.bun: >=1.4.2`.
- [ ] **Step 2**: `bun install`.
- [ ] **Step 3**: verificación.
- [ ] **Step 4**: commit.

### Task 4 — moon

**Modelo**: hilo principal (Native).
**Tests RED**: `moon query tasks` falla porque no hay workspace.
**Superficies**: tooling.
**Verificación**: `moon query tasks` lista `start`, `dev`, `build`, `clean`, `test`, `test-coverage`, `typecheck`, `lint`, `lint-fix`, `deps-update` y `link`. Además, `moon run :lint` y `moon run :build`, y `bin/um.exe --help` imprime el uso.
**Se prueba en la aplicación**: `moon run :build` y `bin/um.exe --help` imprime el uso.

**Interfaces**: Consume: los scripts de la Task 2 y el `.prototools` de la Task 3. Produce: tareas de moon que ejecutan `bun run <script>`, con los scripts `typecheck` = `tsc --noEmit` y `deps:update` = `ncu --interactive --format group` (este último se usa en la Task 6). `build` depende de `clean`, y `dev`, `start`, `deps-update` y `link` van sin caché y como `local`/persistentes según su naturaleza.

**Ficheros**: crear `.moon/workspace.yml` y `moon.yml`; modificar `package.json` (scripts `typecheck` y `deps:update`).

- [ ] **Step 1**: consultar en Context7 la sintaxis de moon 2, con 3 llamadas como máximo, y escribir la configuración.
- [ ] **Step 2**: `moon run :build`.
- [ ] **Step 3**: verificación.
- [ ] **Step 4**: commit.

### Task 5 — Typecheck en verde

**Modelo**: hilo principal (Native).
**Tests RED**: `moon run :typecheck` da los 4 errores (`winget.ts:54`, `winget.ts:66`, `runner.ts:1`, `parsers.ts:239`).
**Superficies**: backend (solo tipos e imports).
**Verificación**: `moon run :typecheck`, `moon run :lint` y `bun test` (los únicos fallos, los 2 de `parseProtoOutput`).
**Se prueba en la aplicación**: no, porque es solo tipado; el smoke va en la Task 6.

**Interfaces**: Consume: la tarea `typecheck` de la Task 4. Produce: `UpdateOptions { force?: boolean; interactive?: boolean }`.

**Ficheros**: `src/types.ts`, `src/runner.ts` (quitar el `import { $ }`) y `src/providers/parsers.ts:239` (el parámetro `provider` sin usar, que pasa a `_provider` sin cambiar la firma pública). Además, los warnings de lint por variables sin usar que se arreglen con el mismo criterio.

- [ ] **Step 1**: cambios.
- [ ] **Step 2**: `moon run :typecheck`.
- [ ] **Step 3**: verificación.
- [ ] **Step 4**: commit.

### Task 6 — Actualizador y subida de dependencias

**Modelo**: hilo principal (Native).
**Tests RED**: `bunx npm-check-updates` (no interactivo) lista dependencias desactualizadas.
**Superficies**: tooling, backend si un major exige ajustes de API.
**Verificación**: `moon run :lint :typecheck :test` (los únicos fallos, los 2 de `parseProtoOutput`), `moon run :build` y `bunx npm-check-updates`, que no lista nada salvo `typescript`.
**Se prueba en la aplicación**: `bun run start check` lista las actualizaciones agrupadas por provider, como antes.

**Interfaces**: Consume: el script `deps:update` de la Task 4. Produce: `package.json` con todo en su última versión, `typescript` en `6.0.3` y `npm-check-updates` como devDep.

**Ficheros**: `package.json`, `bun.lock`, y `src/**` solo si un major cambia una API.

- [ ] **Step 1**: `bun add -d npm-check-updates`; subir todo con `ncu -u --reject typescript`; `bun add -d typescript@6.0.3`; `bun install`.
- [ ] **Step 2**: `moon run :build`.
- [ ] **Step 3**: verificación. Smoke de `deps-update` interactivo en la validación, porque necesita TTY. Review Focus: `moon run :lint :typecheck :test` con un PATH sin `node`.
- [ ] **Step 4**: commit. Si una dependencia se queda atrás, su motivo va a `tech-stack.md` en la Task 7.

### Task 7 — Docs SDD y migración de PLANNING.md

**Modelo**: hilo principal (Native).
**Tests RED**: `PLANNING.md` existe y `tech-stack.md` habla de `bun run` y de Sonar.
**Superficies**: docs.
**Verificación**: `pwsh -NoProfile -File <sdd-templates>/scripts/Test-Roadmap.ps1 -Path .docs/sdd` y `Test-Path PLANNING.md` da `False`.
**Se prueba en la aplicación**: no, porque es documentación.

**Interfaces**: Consume: las versiones finales de la Task 6. Produce: docs coherentes con el repo.

**Ficheros**: borrar `PLANNING.md`; modificar `tech-stack.md`, `architecture.md` y `roadmap.md`.

- [ ] **Step 1**:
  - `tech-stack.md`: versiones y comandos con `moon run`; sin Sonar ni Node; las decisiones abiertas B1/B2 ya resueltas; nota de TS 7.
  - `architecture.md`: «¿Por qué Bun?» y «¿Por qué @clack/prompts? Consistencia con project-manager» en Decisiones estructurales, y `.moon/`, `moon.yml` y `bunfig.toml` en la estructura.
  - `roadmap.md`: añadir B3 (progress bars estilo docker), B4 (logs y errores detallados) y B5 (TypeScript 7 cuando typescript-eslint lo soporte). B1, B2 y las filas de deuda que salda la feature las marca el cierre.
- [ ] **Step 2**: `git rm PLANNING.md`.
- [ ] **Step 3**: verificación.
- [ ] **Step 4**: commit.

### Task 8 — README y CLAUDE.md

**Modelo**: hilo principal (Native), con las skills `code-craftsmanship:technical-documentation`, `elements-of-style:writing-clearly-and-concisely`, `humanizer:humanizer` y `claude-md-management:claude-md-improver`.
**Tests RED**: el README menciona comandos que ya no existen (o no menciona moon).
**Superficies**: docs.
**Verificación**: cada comando del README existe (`moon query tasks`, `um --help`), y `CLAUDE.md` tiene como mucho 5 reglas y solo punteros.
**Se prueba en la aplicación**: no, porque es documentación; el dev-lead la lee en la validación.

**Interfaces**: Consume: las tareas de moon de la Task 4 y la salida de `um --help`. Produce: `README.md` en inglés para quien instala y usa `um`, y `CLAUDE.md` revisado.

**Ficheros**: `README.md`, `CLAUDE.md`.

- [ ] **Step 1**: README con `technical-documentation` (estructura), `elements-of-style` (redacción) y `humanizer` (repaso final). Después, `claude-md-improver` sobre `CLAUDE.md`.
- [ ] **Step 2**: no aplica build.
- [ ] **Step 3**: verificación.
- [ ] **Step 4**: commit.

---

## Estimación y esfuerzo

- Tipo: infra/tooling
- Esfuerzo spec + plan: 1,5 h
- Estimación de implementación: 4 h
- Base de la estimación: 8 tasks de configuración; la incertidumbre está en los majors (ESLint 10) y en la sintaxis de moon 2. Sin referencia en el estimation-log, que está vacío.
- Confianza: media

---

## 3. Validación final

- [ ] Gate de cierre: `moon run :lint :typecheck :test :build` (los únicos fallos, los 2 de `parseProtoOutput`).
- [ ] Escenarios 1-12 de la spec, con una fila de smoke por THEN.
- [ ] Spec satisfecha (§4).
- [ ] Cierre con `sdd-end-feature`.

---

## 4. Self-review (cobertura spec → tasks)

- Escenario 1 (`:lint`) → Tasks 2 y 4. ✓
- Escenario 2 (`:typecheck`) → Task 5. ✓
- Escenario 3 (`:test`, solo los 2 de proto en rojo) → Tasks 5 y 6. ✓
- Escenario 4 (`:build` y `um.exe --help`) → Task 4. ✓
- Escenario 5 (`moon query tasks`) → Task 4. ✓
- Escenario 6 (`:deps-update` interactivo) → Tasks 4 y 6; smoke con TTY en la validación. ✓
- Escenario 7 (EOL) → Task 1. ✓
- Escenario 8 (ficheros borrados) → Tasks 1 y 7. ✓
- Escenario 9 (`um check` igual) → Task 6. ✓
- Escenario 10 (versión de Bun) → Task 3. ✓
- Escenario 11 (sin `^`/`~`, sin Node, TS 6.0.3) → Tasks 3 y 6. ✓
- Escenario 12 (sin `node` en el PATH) → Tasks 3 y 6. ✓
- Decisiones 13-15 (PLANNING, README, CLAUDE.md) → Tasks 7 y 8. ✓
- Review Focus → Tasks 1, 2, 3 y 6. ✓
