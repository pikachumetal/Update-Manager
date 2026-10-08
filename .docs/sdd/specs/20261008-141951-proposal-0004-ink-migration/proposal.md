---
id: 20261008-141951-proposal-0004-ink-migration
proposal: 0004
title: Migrar toda la CLI de @clack/prompts a ink
source: interview
created: 2026-10-08
---

# Propuesta — Migrar toda la CLI de @clack/prompts a ink

## Por qué

`um` dibuja su UI con `@clack/prompts`, que solo ofrece prompts sueltos y un spinner. Una actualización larga de WinGet (hasta 300 s) no muestra ningún progreso. ink 8 (React para terminal) permite componer la UI, por ejemplo con un progreso por paquete que se refresca en su sitio. La justificación del art. IV de la constitution es que es un proyecto personal de aprendizaje. No se usa `@inkjs/ui`, parado desde 2024-05: los componentes son propios (Spinner, MultiSelect agrupado, Select, Confirm). `react-devtools-core` entra como dependencia porque `bun build --compile` la exige con ink. La fila original citaba un spike en `D:\code\.spikes\update-manager-tui`, que el 2026-10-08 ya no existe.

## Reglas de negocio

- **Misma salida**: el contenido de cada comando no cambia, solo cómo se dibuja. Ejemplo: `um check` con 1 update en pnpm y el resto al día sigue mostrando `📦 pnpm (global)` con su paquete, `🔧 Proto ✓`… y `Summary: 1 available`.
- **Los comandos que no preguntan funcionan sin TTY**: `um check`, `um update PROVIDER --yes`, `um providers`, `um ignore ID`, `um unignore ID` y `um ignored`. Ejemplo: `um check > out.txt` deja el resultado final en `out.txt` y termina sin esperar teclado.
- **Los comandos que preguntan exigen TTY**: `um` a secas y `um update` sin `--yes`, sin TTY, salen con 1 y un mensaje. Ejemplo: `um update winget < nul` imprime `Interactive terminal required (use --yes)` y sale con 1.
- **Selección agrupada por provider, con todo marcado al empezar**: ejemplo: 3 updates (2 de winget y 1 de npm) salen en 2 grupos con los 3 marcados; Enter sin tocar nada actualiza los 3.
- **Force solo para WinGet y siempre con confirmación**: ejemplo: 1 paquete `pinned` de winget y 1 `unknown` de npm → Confirm `Force update 1 WinGet package(s)?`; el de npm se salta sin preguntar.
- **Una fila de progreso por paquete, en secuencia**: ejemplo: con 2 paquetes de winget, la fila 1 muestra `updating` y la 2 `queued`; al terminar cada una pasa a `✓ <nombre> <actual> → <nueva>` o `✗ <nombre> <motivo>`. Los paquetes se actualizan uno detrás de otro, como hoy.
- **Ctrl+C cancela en cualquier momento**: ejemplo: Ctrl+C durante la selección imprime `Cancelled` y sale con 0, como hoy.

## Capacidades que toca

- Todavía no hay capacidades en `capabilities/`. Cada feature crea o modifica la suya en su spec (previsibles: `update-check` y `package-update`).

## Reparto

| Orden | Id | Feature | Tras |
| --- | --- | --- | --- |
| 1 | 0005 | Base ink + `um check`: ink 8 y React, el entry de render, `bun build --compile` con `react-devtools-core`, Spinner propio y `check` dibujado en ink | — |
| 2 | 0006 | `um update` en ink: MultiSelect agrupado, Confirm para force y gsudo, y progreso por paquete (absorbe la 0003) | 0005 |
| 3 | 0007 | Menú interactivo (Select), `providers` e `ignore` en ink; fuera `@clack/prompts` | 0006 |

## Acta

No aplica: entrevista.

## Enmiendas

_Ninguna._
