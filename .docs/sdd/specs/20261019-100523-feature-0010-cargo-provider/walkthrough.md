---
id: 20261019-100523-feature-0010-cargo-provider
feature: 0010
title: Walkthrough — Providers cargo y rustup
spec: ./spec.md
status: done
created: 2026-10-19
---

# Walkthrough — Providers cargo y rustup

## 1. Cambios realizados

- **Parsers** (`7dda469`): `parseCargoInstallUpdateOutput` y `parseRustupCheckOutput` en `src/providers/parsers.ts`, con 5 tests en `parsers.test.ts` sobre las salidas reales del 2026-10-19.
- **Providers** (`7dda469`):
  - `src/providers/cargo.ts` (`🦀 Cargo`): check con `cargo install-update -l`, y si falta `cargo-install-update` lanza `cargo-update not installed: cargo binstall cargo-update`. Update con `cargo binstall -y`, o con `cargo install` sin binstall.
  - `src/providers/rustup.ts` (`🔧 Rustup`): check con `rustup check`, leyendo stdout con cualquier código de salida. Update con `rustup update <toolchain> --no-self-update`, y la fila `rustup` con `rustup self update`.
- **Registro** (`7dda469`): `providers/index.ts` y `DEFAULT_PROVIDERS` (`types.ts`), los dos activos.
- **Docs**: tabla de comandos de `architecture.md`; capacidades `update-check` y `package-update` con el delta fusionado.

## 2. Tiempo y coste: estimado vs real

- Tipo: backend
- Estimación de implementación (de la spec): 1 h
- Esfuerzo real: 0,25 h — aproximado con las marcas de los commits: de la apertura (12:12) a la validación (~12:25). Spec, ~0,2 h aparte (de ~12:00 a 12:12, con los fixtures capturados antes).
- Desviación: −0,75 h (−75 %)
- Causa de la desviación: dos providers calcados de `moonrepo`/`bun`, con las salidas reales ya capturadas al escribir la spec; la estimación no aplicó el factor del log (0,44), que habría dado ~0,45 h.
- Modelo del hilo: Opus 5.5, effort medium
- Tokens del hilo: 11.599.200 — claude-opus-5-5 11.599.200
- Tokens de subagentes: 414.216 en 1 despacho — Revisor final 0010 cargo rustup claude-sonnet-5-5 414.216 / 2 min
- Coste de la sesión: sin precio (sin tabla pricing en sdd-kit.json)
- Coste de sujetos: no aplica
- Review de spec: no · hallazgos 0, aceptados 0

## 3. Desviaciones del plan

- Sin plan (modo lite).

### Decisiones tomadas sin el dev-lead

- **`rustup self update` va con el timeout por defecto de `runCommand` (60 s)**: la spec no le fija uno en «Límites», y darle 600 s habría cambiado una regla sin aprobarla. Coste si está mal: un self-update lento en una red mala falla por timeout.
- **Minors diferidos de la revisión final**: `(unknown version)` de un toolchain saldría como `(unknown`; los crates instalados desde git se ignoran; `rustup self update` con 60 s puede quedarse corto en una red lenta; un `cargo install` que agota el timeout puede quedar huérfano (`runner` solo mata `cmd.exe`, común a todos los providers); ids de `ignored`/`installedVersions` sin provider (defecto previo).
- **Revisor final con Sonnet y effort high**, no con Opus como pide el kit: diff de 379 líneas y la regla global del dev-lead de usar el modelo más barato que resuelva. Coste si está mal: un hallazgo que solo vería Opus.

### Revisión de skills

- No aplica: el repo no tiene `.claude/skills/` (comprobado).

## 4. Verificación

### 4.1 Builds

- `moon run :lint :typecheck --force` → verde. `moon run :build` → verde (`bin/um.exe`).
- Suite completa: `bun test` → 99/101; los 2 rojos son `parseProtoOutput`, deuda conocida · ~20 s.

### 4.2 Smoke / tests

- Validado: 2026-10-19 · «Validado: lo he probado y funciona» · no detalló qué probó. Aprobó con ella la enmienda del GIVEN de la fila `rustup`.
- Revisión final: `sdd-kit:effort-high` + sonnet sobre `7dda469`, with fixes: 0 Critical, 1 Important, 5 Minor. Pasada de fix `788e0d5`, 1 hallazgo RED→GREEN (la línea `rustup - update available : …`), sin re-revisión: la verifica su test.

| THEN | Evidencia | Resultado |
| --- | --- | --- |
| `🦀 Cargo` lista `mergiraf 0.20.0 → 0.21.0` y omite los `No` | suite | ok |
| `🦀 Cargo ✓` con todo al día | ejecución real (`um check cargo`) | ok |
| `🔧 Rustup` lista `stable-x86_64-pc-windows-msvc 1.98.0 → 1.99.1` con salida 100 | ejecución real (`um check rustup`) + suite | ok |
| Fila `rustup 1.29.1 → 1.30.0` | suite | ok |
| Sin cargo-update: `⚠ Cargo: cargo-update not installed: cargo binstall cargo-update`, Rustup listado | ejecución real (`cargo-install-update.exe` renombrado y restaurado) | ok |
| `cargo binstall -y` / `cargo install` / `rustup update … --no-self-update` / `rustup self update` | no probado por el agente (actualizan la máquina); lo cubre la validación del dev-lead | — |

### 4.3 Residuales / deuda generada

- Un provider cuyo check falla sale igualmente como `<icono> <nombre> ✓` en `um check` (con cargo-update ausente: `⚠ Cargo: …` por stderr y `🦀 Cargo ✓` en stdout). Es el comportamiento de todos los providers, recogido en `update-check` («como hoy»): pasa a la tabla de deuda.

## 5. Aprendizajes

- `rustup check` sale con código 100 cuando hay updates → `architecture.md`, tabla de comandos (volcado).

## 6. Adendas

_Ninguna._
