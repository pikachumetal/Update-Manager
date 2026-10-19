---
id: 20261015-074853-patch-0008-winget-force-unchecked
task: 0008
title: Patch — WinGet pinned y unknown salen desmarcados en la selección
type: patch
solution: dev-lead
status: done
created: 2026-10-15
branch: patch/0008-winget-force-unchecked
commit: 6820836
---

# Patch 0008 — WinGet pinned y unknown salen desmarcados en la selección

## Capacidades

- Modificadas: `package-update` — en la selección, los paquetes de WinGet `pinned` y `unknown` empiezan desmarcados

## 1. Síntoma

«en winget los paquetes que estan pinneados no deberian aparecer selecionados en la lista por actualizar». Hoy `um update` abre el MultiSelect con todas las filas marcadas, también las de WinGet que solo se actualizan con force.

## 2. Solución fijada

- Dev-lead, 2026-10-15: los paquetes de WinGet `pinned` no salen marcados al empezar la selección.
- Dev-lead, 2026-10-15, a una pregunta cerrada: también los de WinGet `unknown`. El resto sigue marcado, incluidos los `unknown` de otros providers.
- Comprobado lo que da por existente: `useSelection` (`src/ui/MultiSelect.tsx`) marca todas las claves al empezar (`useCheckList(keys, keys, …)`). Solo `parseWingetOutput` (`src/providers/parsers.ts:124`) produce `pinned`.
- Cambia la regla «Selección agrupada por provider, con todo marcado al empezar» de la propuesta 0004: enmienda en su `proposal.md`.

## 3. Fix

- **Fichero(s)**: `src/ui/MultiSelect.tsx`, `src/ui/MultiSelect.test.tsx`, `src/ui/UpdateApp.test.tsx`
- **Cambio**: `useSelection` deja fuera de las claves iniciales las filas con provider `winget` y status `pinned` o `unknown`. Los tests de force de `UpdateApp` marcan `Foo.Pinned` con espacio antes de Enter.
- **Decisiones**:
  - Solo WinGet, porque es el único provider que admite force — dev-lead
  - `pinned` y `unknown` — dev-lead
  - `a` sigue igual: con alguna fila desmarcada, marca todas, también las de force — sin el dev-lead (comportamiento previo, sin cambio)
  - `um update <provider> --yes` no pasa por la selección y no cambia: sin TTY no hay Confirm de force y se saltan — sin el dev-lead (comportamiento previo, sin cambio)

## 4. Verificación

| # | Caso | Resultado |
| --- | --- | --- |
| 1 | Test `leaves WinGet packages that need force unchecked`: `Git.Git` `◼`, `Foo.Pinned` `◻`, `Foo.Unknown` `◻`, `left-pad` (npm `unknown`) `◼`; Enter envía `Git.Git` y `left-pad` | ✅ RED (recibía `◼` en las 4) → GREEN |
| 2 | Tests de force y gsudo de `UpdateApp`, con `Foo.Pinned` marcado a mano | ✅ |
| 3 | `moon run :lint :typecheck --force` | ✅ |
| 4 | `bun test` | ✅ 85/87; los 2 rojos son `parseProtoOutput`, deuda conocida |
| 5 | `moon run :build` (`bin/um.exe`) | ✅ |
| 6 | Smoke `um update winget` con un paquete pinned en una terminal | diferido (el agente no tiene TTY) |

Validación diferida: 2026-10-15 · «Diferir: lo pruebo en el próximo `um update` con un pinned de WinGet, a cargo del dev-lead» · disparador: próximo `um update` con un pinned de WinGet, a cargo del dev-lead

## 5. Tiempo (ligero)

- Estimación: 0,25 h
- Real: ~0,3 h

## 6. Delta de capacidad

### Capacidad: `package-update`

**MODIFIED — Selección agrupada por provider**
- GIVEN 3 updates: `Git.Git` 2.50.0 → 2.51.0 y `Microsoft.PowerToys` 0.94.0 → 0.95.0 de WinGet, y `typescript` 6.0.2 → 6.0.3 de npm, todos `available`, en una terminal interactiva
- WHEN `um update`
- THEN la selección muestra `◆  Select packages to update (space to toggle, enter to confirm)`; debajo, `│  📦 WinGet` con `│    ◼ Git.Git 2.50.0 → 2.51.0` y `│    ◼ Microsoft.PowerToys 0.94.0 → 0.95.0`, y `│  📦 npm (global)` con `│    ◼ typescript 6.0.2 → 6.0.3`; y cierra con `└`
- AND la fila bajo el cursor sale en cian, y el cursor empieza en la primera
- AND Enter sin tocar nada actualiza los 3
- AND al confirmar, la selección queda escrita como `◇  Select packages to update` y `│  Git.Git, Microsoft.PowerToys, typescript`
- GIVEN la misma selección
- WHEN el usuario baja a `Microsoft.PowerToys`, pulsa espacio y Enter
- THEN esa fila pasa a `◻` y solo se actualizan `Git.Git` y `typescript`
- GIVEN la misma selección
- WHEN el usuario pulsa `a` y Enter
- THEN las 3 filas pasan a `◻`, se ve `●  Update cancelled` y `└  Cancelled`, no se actualiza nada y sale con 0
- AND con alguna fila desmarcada, `a` marca las 3
- GIVEN `Git.Git` `available`, `Foo.Pinned` `pinned` y `Foo.Unknown` `unknown` de WinGet, y `left-pad` `unknown` de npm, en una terminal interactiva
- WHEN `um update`
- THEN `Foo.Pinned` y `Foo.Unknown` empiezan en `◻`, y `Git.Git` y `left-pad` en `◼`
- AND Enter sin tocar nada actualiza `Git.Git` y salta `left-pad`; para forzar `Foo.Pinned`, el usuario la marca con espacio

## Adendas

- 2026-10-19 — Validado en el cierre de la release v1.6.0: «Sí, funciona» · no detalló qué probó. Sale de las validaciones diferidas.
