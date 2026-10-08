---
id: 20261008-150312-feature-0005-ink-base-check
title: Tasks — Base ink + `um check`
spec: ./spec.md
plan: ./plan.md
created: 2026-10-08
---

# Tasks — Base ink + `um check` (registro vivo)

- **Spec**: `./spec.md`
- **Plan**: `./plan.md`
- **Rama**: `feature/0005-ink-base-check`

## Estado de las tasks

| # | Task | Status | Commit | Notas |
| --- | --- | --- | --- | --- |
| 1 | Base ink: dependencias, marco, Spinner y entry de render | done | f8d61df | |
| 2 | `um check` y `um check <provider>` en ink | done | 4d1a3bb | Ruling sustituido en la pasada de fix: `patchConsole: false` en `renderApp` |

## Verificación por task

- [x] Task 1 — `sh -c 'bun test src/ui && bun run typecheck && bun run lint && echo ok'`
- [x] Task 2 — `sh -c 'bun test src/ui && bun run typecheck && bun run lint && echo ok'` + ejecución real del Step 6

## Fixes adicionales

| Descubierto | Causa raíz | Decisión | Commit |
| --- | --- | --- | --- |
| Task 2, smoke 6.5: con ink, `check <provider>` cuyo provider lanza no imprime el error | `main()` monta ink de forma síncrona antes de evaluar `.catch(console.error)`, que captura el `console.error` parcheado por ink y se descarta al desmontar | Arreglado en la task: el handler lee `console.error` al fallar (está en `src/index.ts`, dentro del Scope) | Task 2 |

Revisión final: sdd-kit:effort-high + opus, with fixes (0 Critical, 1 Important, 6 Minor), sobre 4d1a3bb
Pasada de fix: juntada en el cierre, 2 hallazgos RED→GREEN
