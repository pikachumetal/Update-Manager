---
id: 20261008-175953-feature-0006-ink-update
title: Tasks — `um update` en ink
spec: ./spec.md
plan: ./plan.md
created: 2026-10-08
---

# Tasks — `um update` en ink (registro vivo)

- **Spec**: `./spec.md`
- **Plan**: `./plan.md`
- **Rama**: `feature/0006-ink-update`

## Estado de las tasks

| # | Task | Status | Commit | Notas |
| --- | --- | --- | --- | --- |
| 1 | Prompts propios: Confirm y MultiSelect agrupado | done | 1e6845e | |
| 2 | Vista de progreso por paquete y resultado | done | 1f80a46 | |
| 3 | `um update` y `um update <provider>` en ink | done | 814f707 | Ruling: salida tras el commit del último bloque; pausa de 250 ms en los tests de teclado |

## Verificación por task

- [x] Task 1 — `sh -c 'bun test src/ui && bun run typecheck && bun run lint && echo ok'`
- [x] Task 2 — `sh -c 'bun test src/ui && bun run typecheck && bun run lint && echo ok'`
- [x] Task 3 — `sh -c 'bun test src/ui && bun run typecheck && bun run lint && echo ok'` + ejecución real del Step 7

## Fixes adicionales

| Descubierto | Causa raíz | Decisión | Commit |
| --- | --- | --- | --- |
| Task 3: con `exit()` directo, el último frame de `um update` salía sin los últimos bloques | ink desmonta antes del commit de los `setState` del flujo | Arreglado en la task: la salida va en un efecto tras el último commit | 814f707 |

Revisión final: sdd-kit:effort-high + opus, with fixes (0 Critical, 3 Important, 5 Minor), sobre 814f707
Pasada de fix: juntada en el cierre, 2 hallazgos RED→GREEN
