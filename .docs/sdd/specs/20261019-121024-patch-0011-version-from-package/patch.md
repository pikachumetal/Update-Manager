---
id: 20261019-121024-patch-0011-version-from-package
task: 0011
title: Patch — `um --version` lee la versión de package.json
type: patch
solution: dev-lead
status: done
created: 2026-10-19
branch: patch/0011-version-from-package
commit: 3f303f9
---

# Patch 0011 — `um --version` lee la versión de package.json

## Capacidades

- Modificadas: `cli-common` — `um --version` y la cabecera de `um --help` muestran la versión de `package.json`, no `0.1.0`

## 1. Síntoma

Fila de deuda: «`VERSION = "0.1.0"` hardcodeado en `src/index.ts`, mientras `package.json` va por la 1.5.0 · bajo: `um --version` miente». Medido el 2026-10-19: `bun run src/index.ts --version` → `um v0.1.0`.

## 2. Solución fijada

- Dev-lead, 2026-10-19, antes del corte de la release v1.6.0, a la pregunta «`um --version` dice `0.1.0` … ¿Lo arreglo antes de cortar?»: «Sí, patch antes (Recomendado)», cuya opción decía «Patch pequeño: leer la versión de `package.json`; así `um --version` dice la de la release».
- Comprobado lo que da por existente: `const VERSION = "0.1.0"` en `src/index.ts`, usado por `--version` y `printHelp`; `tsconfig.json` tiene `resolveJsonModule`.

## 3. Fix

- **Fichero(s)**: `src/index.ts`
- **Cambio**: `VERSION` se importa de `package.json` (`import { version as VERSION } from "../package.json"`) en lugar de la constante. `bun build --compile` lo empaqueta en `bin/um.exe`.
- **Decisiones**:
  - Leer la versión de `package.json` — dev-lead
  - Sin test unitario: `src/index.ts` ejecuta `main()` al importarse y la política de testing cubre su flujo con smoke — sin el dev-lead (no cambia lo que el usuario ve)

## 4. Verificación

| # | Caso | Resultado |
| --- | --- | --- |
| 1 | `bun run src/index.ts --version` antes → `um v0.1.0`; después → `um v1.5.0` | ✅ ejecución real |
| 2 | `.\bin\um.exe --version` → `um v1.5.0`; `.\bin\um.exe --help` → `┌   Update Manager v1.5.0` | ✅ ejecución real (binario compilado) |
| 3 | `moon run :lint :typecheck --force` | ✅ |
| 4 | `bun test` | ✅ 99/101; los 2 rojos son `parseProtoOutput`, deuda conocida |

Validado: 2026-10-19 · «Validado: lo he probado y funciona» · no detalló qué probó

## 5. Tiempo (ligero)

- Real: ~0,1 h

## 6. Delta de capacidad

### Capacidad: `cli-common`

**MODIFIED — Versión**
- GIVEN `package.json` con `"version": "1.5.0"`
- WHEN `um --version` (o `um -v`)
- THEN se imprime una sola línea, `um v1.5.0`, sin marco ni escapes, también en una terminal, y sale con 0

**MODIFIED — Ayuda**
- GIVEN `package.json` con `"version": "1.5.0"`
- WHEN `um --help` (o `um -h`)
- THEN se ve `┌   Update Manager v1.5.0 `, `│`, `│  Usage:` y las 7 filas de uso de hoy con el raíl delante (`│    um                     Interactive mode` … `│    um ignored             List ignored packages`), `│`, `│  Options:` y sus 3 filas (`│    -y, --yes             Skip confirmation`, `│    -v, --version         Show version`, `│    -h, --help            Show help`), `│`, `│  Examples:` y sus 5 filas (`│    um check              Check all providers` … `│    um ignore Google.GooglePlayGames`), y `└`; sale con 0
- AND con `um --help > out.txt`, `out.txt` contiene las mismas líneas sin escapes
