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
| 1 | Prompts planos: Select, CheckList y runPrompt | pending | | |
| 2 | `um` a secas y sus submenús en ink | pending | | |
| 3 | Fuera `@clack/prompts` y docs | pending | | |

## Verificación por task

- [ ] Task 1 — `sh -c 'bun test src/ui && bun run typecheck && bun run lint && echo ok'`
- [ ] Task 2 — `sh -c 'bun test src/ui && bun run typecheck && bun run lint && echo ok'` + smoke del Step 5
- [ ] Task 3 — `sh -c 'bun test src/ui && bun run typecheck && bun run lint && ! grep -rn clack src && echo ok'`

## Fixes adicionales

_Ninguno._
