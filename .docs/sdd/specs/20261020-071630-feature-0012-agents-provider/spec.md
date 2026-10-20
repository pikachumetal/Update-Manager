---
id: 20261020-071630-feature-0012-agents-provider
feature: 0012
title: Provider de agentes (claude, agy, codex)
mode: lite
status: done
created: 2026-10-20
author: Àngel Delgado (con Claude)
approvers:
  - role: dev-lead
    name: Àngel Delgado
    approved_at: 2026-10-20
---

# Spec — Provider de agentes (claude, agy, codex)

> **Estado**: done.
> **Siguiente paso**: modo lite → implementación directa (Native).

## Capacidades

- Modificadas: `update-check` — el provider `claude` (`🤖 Claude CLI`) pasa a `agents` (`🤖 AI agents`), con una fila por agente instalado
- Modificadas: `package-update` — `um update` actualiza cada agente con su propio comando

## Decisiones que he tomado yo — valida estas

1. **Nombre e icono**: `🤖 AI agents`.
2. **Filas**: id y nombre `claude`, `agy` y `codex`. El id `claude` se conserva para que `ignoredPackages` e `installedVersions` ya guardados sigan valiendo.
3. **Versión instalada**: el primer `X.Y.Z` de `<agente> --version` (`2.1.304 (Claude Code)`, `1.3.5`, `codex-cli 0.162.0`).
4. **Última versión**: claude, `dist-tags.latest` de `https://registry.npmjs.org/@anthropic-ai/claude-code` (como hoy); codex, el de `https://registry.npmjs.org/@openai/codex`; agy, el primer `X.Y.Z:` al principio de línea de `agy changelog`.
5. **Un agente que no se puede consultar** (sin red, salida sin versión) no sale y no avisa, como hoy con claude. Uno que no está en el `PATH` tampoco sale. El provider está disponible si hay al menos uno.
6. **Timeouts**: 10 s cada `--version`, 30 s `agy changelog`, 120 s `claude update` (como hoy) y 300 s `agy update` y `codex update`.
7. **Configuración**: `DEFAULT_PROVIDERS` cambia `claude` por `agents` en la misma posición, así que la salida de `um check` conserva el orden. La clave `claude` que ya tenga `config.json` queda sin efecto y no se borra.
8. **Codex instalado con npm**: no se trata; si un día pasa, saldría también en el provider npm.
9. **No entra**: gemini, copilot y demás agentes que se instalan con npm (los cubre el provider npm); avisar de un agente que no se puede consultar.
10. **Repaso de coherencia**: los literales (`🤖 AI agents`, ids, comandos y timeouts) coinciden entre decisiones y escenarios.

### Decisiones tomadas con el dev-lead

- Una sección de agentes que detecta lo instalado y lo actualiza — «podemos poner más que claude una sección de agentes, y actualiza claude, agy, codex etc? que detecte lo instalado y que lo actualice» (2026-10-20)
- Id nuevo `agents`, y `um check claude` / `um update claude` dejan de existir — «Nuevo id `agents` (Recomendado)»
- Entran claude, agy y codex — «claude, agy y codex (Recomendado)»
- Modo lite, perfil delegate — «Feature lite, delegate (Recomendado)»

## Intent

`um` solo actualiza el CLI de Claude. agy y Codex, que también se actualizan solos (`agy update`, `codex update`), se actualizan a mano. Se quiere un único provider de agentes que liste los que están instalados con versión nueva y los actualice.

## Scope

- Entra: `src/providers/agents.ts` (sustituye a `claude.ts`), los parsers de `--version` y `agy changelog` en `parsers.ts` con test, el registro en `providers/index.ts`, `DEFAULT_PROVIDERS` (`types.ts`), `CheckApp.test.tsx` (usa `claude` y `🤖 Claude CLI`), y `architecture.md`, `mission.md` y `README.md`, que nombran el provider `claude`.
- No entra: lo de la decisión 9; cambios en la UI, en `UpdateProvider` o en `collectUpdates`.

## Approach

Un provider con el molde `BaseProvider` y una tabla de agentes (comando, fuente de la última versión, comando de update y timeout). Por cada agente en el `PATH` compara la versión instalada con la última (`isNewerVersion`). Todo comando pasa por `runCommand`; la consulta al registry de npm, con `fetch`, como hoy.

## Delta de comportamiento

### Capacidad: `update-check`

**MODIFIED — Resultado agrupado por provider**
- GIVEN Bun con 1 update (`@railway/cli` 5.63.4 → 5.64.0) y Proto, Moonrepo, PowerShell Modules, npm, pnpm y AI agents al día
- WHEN `um check`
- THEN la salida final, sin colores, son estas líneas en este orden: `┌   Checking for updates `, `│`, `◇  Found 1 update(s)`, una vacía, `🥟 Bun (global)`, `   • @railway/cli 5.63.4 → 5.64.0`, `🔧 Proto ✓`, `🌙 Moonrepo ✓`, `💠 PowerShell Modules ✓`, `📦 npm (global) ✓`, `📦 pnpm (global) ✓`, `🤖 AI agents ✓`, una vacía, `│`, `●  Summary: 1 available`, `│` y `└  Done`
- AND sale con código 0
- GIVEN WinGet con 1 update `available` y 1 `pinned`, y npm con 1 `unknown`
- WHEN `um check`
- THEN la línea del paquete fijado acaba en `📌 pinned` y la del desconocido en `❓ unknown`
- AND el resumen es `●  Summary: 1 available | 1 pinned | 1 unknown`
- GIVEN ningún provider con updates
- WHEN `um check`
- THEN se ve `◇  Found 0 update(s)`, cada provider con `✓` y `◆  Everything is up to date!` en lugar del resumen, y acaba en `└  Done`

**ADDED — Agentes instalados**
- GIVEN claude 2.1.304 con 2.1.304 en npm, agy 1.3.5 con `agy changelog` empezando por `1.4.3:`, y codex `codex-cli 0.162.0` con 0.163.0 en npm
- WHEN `um check agents`
- THEN se ve `🤖 AI agents` con `   • agy 1.3.5 → 1.4.3` y `   • codex 0.162.0 → 0.163.0`, y `claude` no sale
- GIVEN solo claude en el `PATH`, al día
- WHEN `um check`
- THEN se ve `🤖 AI agents ✓`, sin filas de agy ni codex
- GIVEN ningún agente en el `PATH`
- WHEN `um check`
- THEN no sale `🤖 AI agents`
- GIVEN un `config.json` con `providers.claude` y sin `providers.agents`
- WHEN `um check claude`
- THEN se ve `■  Provider "claude" not found`, y `um check` lista `🤖 AI agents` activo

**Reglas de la capacidad**
- **Límites**: 60 s por comando por defecto, 120 s el check de WinGet, 120 s el check de cargo, 30 s `rustup check`, 10 s el `--version` de cada agente y 30 s `agy changelog`.

### Capacidad: `package-update`

**ADDED — Actualizar agentes**
- GIVEN `agy` 1.3.5 → 1.4.3 seleccionado
- WHEN se actualiza
- THEN se ejecuta `agy update`, y con éxito su fila pasa a `│  ✓ agy 1.3.5 → 1.4.3`
- GIVEN `codex` 0.162.0 → 0.163.0 seleccionado
- WHEN se actualiza
- THEN se ejecuta `codex update`
- GIVEN `claude` con versión nueva, seleccionado
- WHEN se actualiza
- THEN se ejecuta `claude update`

**Reglas de la capacidad**
- **Límites**: 60 s por comando por defecto, 120 s el check de WinGet, 300 s un update de WinGet, 120 s la instalación de gsudo, 300 s un update con `cargo binstall`, 600 s con `cargo install`, 600 s `rustup update` de un toolchain, 120 s `claude update` y 300 s `agy update` y `codex update`. Los paquetes se actualizan de uno en uno.

### Estimación y esfuerzo

- Tipo: backend
- Esfuerzo spec: 0,3 h
- Estimación de implementación: 0,75 h
- Base de la estimación: un provider con tres entradas sobre el molde de `claude.ts`, dos parsers pequeños con salidas reales ya capturadas; la 0010, parecida, tardó 0,25 h con estimación de 1 h.
- Confianza: media (las fuentes de versión de agy y codex solo se ven en ejecución real)

## Enmiendas

_Ninguna._

## Aprobaciones

| Rol | Nombre | Fecha | Estado |
| --- | --- | --- | --- |
| dev-lead | Àngel Delgado | 2026-10-20 | aprobada: «si» |
