---
id: 20261020-071630-feature-0012-agents-provider
feature: 0012
title: Walkthrough — Provider de agentes (claude, agy, codex)
spec: ./spec.md
status: done
created: 2026-10-20
---

# Walkthrough — Provider de agentes (claude, agy, codex)

## 1. Cambios realizados

- **Parsers** (`a0c19c4`): `parseFirstVersion` y `parseAgyChangelogLatest` en `src/providers/parsers.ts`, con 4 tests sobre las salidas reales del 2026-10-20.
- **Provider** (`a0c19c4`): `src/providers/agents.ts` (`🤖 AI agents`, id `agents`) sustituye a `claude.ts`. Una tabla `AGENTS` con claude, agy y codex: versión con `<agente> --version`, última del registry de npm (claude, codex) o de `agy changelog` (agy), update con `<agente> update`.
- **Registro** (`a0c19c4`): `providers/index.ts` y `DEFAULT_PROVIDERS` cambian `claude` por `agents` en la misma posición.
- **Docs** (`a0c19c4`): `README.md`, `architecture.md` y `mission.md`; capacidades `update-check` y `package-update` con el delta fusionado.

## 2. Tiempo y coste: estimado vs real

- Tipo: backend
- Estimación de implementación (de la spec): 0,75 h
- Esfuerzo real: 0,3 h — aproximado con las marcas de los commits: de la apertura (09:19) a la validación (~09:37). Spec, ~0,1 h aparte.
- Desviación: −0,45 h (−60 %)
- Causa de la desviación: un provider de una tabla sobre el molde de `claude.ts`, con las salidas reales ya capturadas; la estimación no aplicó el factor del log (0,44), que habría dado ~0,33 h.
- Modelo del hilo: Opus 5.5, effort medium
- Tokens del hilo: 11.275.887 — claude-opus-5-5 11.275.887
- Tokens de subagentes: 1.498.681 en 2 despachos — Revisor final 0012 agents claude-sonnet-5-5 704.830 / 2 min; el ejecutable qu etengo en el pc para publicarlo … claude-opus-5-5 793.851 / 0 min *(el segundo despacho no es de esta feature: lo lanzó el dev-lead durante la rama)*
- Coste de la sesión: sin precio (sin tabla pricing en sdd-kit.json)
- Coste de sujetos: no aplica
- Review de spec: no · hallazgos 0, aceptados 0

## 3. Desviaciones del plan

- Sin plan (modo lite).

### Decisiones tomadas sin el dev-lead

- **README y `mission.md`: `cargo` y `rustup`**, que faltaban desde la feature 0010. La revisión final lo dio como Important por alcance (principio 3); se mantiene como excepción declarada porque es documentación correcta. Coste si está mal: ninguno.
- **Fetch a `/<paquete>/latest` con `AbortSignal.timeout(10000)`** en lugar del documento completo (`@openai/codex` pesa 17,8 MB): misma versión, sin colgar `um check` sin red. Minor de la revisión final.
- **Minors diferidos**: doble ronda de `where` (`isAvailable` y `checkUpdates`, inocua); `2.1.304-beta` se lee como `2.1.304`, como antes; un `config.json` con `claude` desactivado recibe `agents` activo (asumido en la decisión 7).
- **Revisor final con Sonnet y effort high**, no con Opus como pide el kit: diff de 461 líneas y la regla global del dev-lead de usar el modelo más barato que resuelva.

### Revisión de skills

- No aplica: el repo no tiene `.claude/skills/` (comprobado).

## 4. Verificación

### 4.1 Builds

- `moon run :lint :typecheck --force` → verde. `moon run :build` → verde (`bin/um.exe`).
- Suite completa: `bun test` → 104/106; los 2 rojos son `parseProtoOutput`, deuda conocida · ~20 s.

### 4.2 Smoke / tests

- Validado: 2026-10-20 · «Validado: lo he probado y funciona» · no detalló qué probó.
- Revisión final: `sdd-kit:effort-high` + sonnet sobre `a0c19c4`, with fixes: 0 Critical, 1 Important, 6 Minor. Pasada de fix `bbdb24a`, 1 hallazgo RED→GREEN (cabecera `1.4.3: texto` de agy) más el fetch a `/latest` con timeout; sin re-revisión: la verifica su test.

| THEN | Evidencia | Resultado |
| --- | --- | --- |
| `🤖 AI agents` con `agy 1.3.5 → 1.4.3` y `codex 0.162.0 → 0.163.0`; `claude` al día no sale | ejecución real (`bun run` y `.exe`, `check agents`) | ok |
| Resultado agrupado con `🤖 AI agents ✓` | suite + `um check` real | ok |
| Solo claude en el `PATH` → `🤖 AI agents ✓`; ningún agente → no sale | no probado (los tres instalados) | — |
| `um check claude` → `■  Provider "claude" not found`; `agents` activo | ejecución real (`check claude`, `providers`) | ok |
| `agy update` / `codex update` / `claude update` | no probado por el agente; lo cubre la validación del dev-lead | — |

### 4.3 Residuales / deuda generada

- La fila de deuda «`um check` no lista WinGet» no se reprodujo el 2026-10-20: `um check` listó WinGet con sus updates. La fila del roadmap queda re-medida.

## 5. Aprendizajes

- `agy` no tiene modo solo-check: la última versión sale de la primera cabecera de `agy changelog` → `architecture.md`, tabla de comandos (volcado).

## 6. Adendas

_Ninguna._
