---
id: 20261008-165945-feature-0007-ink-menu-providers-ignore
title: Tasks — Menú interactivo, `providers` e `ignore` en ink; fuera `@clack/prompts`
spec: ./spec.md
plan: ./plan.md
created: 2026-10-08
---

# Tasks — Menú interactivo, `providers` e `ignore` en ink (registro vivo)

- **Spec**: `./spec.md`
- **Plan**: `./plan.md`
- **Rama**: `feature/0007-ink-menu-providers-ignore`

## Estado de las tasks

| # | Task | Status | Commit | Notas |
| --- | --- | --- | --- | --- |
| 1 | Prompts planos: Select, CheckList y runPrompt | done | 5d0ede4 | Ruling: aserción de `a` en el test; tests con `--timeout 30000` por carga de CPU |
| 2 | `um` a secas y sus submenús en ink | done | e3961a7 | Ruling: el borrado del código de clack se adelanta a esta task |
| 3 | Fuera `@clack/prompts` y docs | done | b2833ab | |

## Verificación por task

- [x] Task 1 — `sh -c 'bun test src/ui && bun run typecheck && bun run lint && echo ok'`
- [x] Task 2 — `sh -c 'bun test src/ui && bun run typecheck && bun run lint && echo ok'` + smoke del Step 5
- [x] Task 3 — `sh -c 'bun test src/ui && bun run typecheck && bun run lint && ! grep -rn clack src && echo ok'`

## Fixes adicionales

- `aa52fa3` — architecture «Dónde va lo nuevo» (Minor 4 de la revisión final), solo docs, revisado en el hilo.

Revisión final: sdd-kit:effort-high + opus, with fixes (0 Critical, 2 Important resueltos por ruling, 5 Minor), sobre b2833ab
