---
id: 20261008-150312-feature-0005-ink-base-check
feature: 0005
title: Walkthrough — Base ink + `um check`
spec: ./spec.md
plan: ./plan.md
status: done
created: 2026-10-08
---

# Walkthrough — Base ink + `um check`

## 1. Cambios realizados

- **Base ink** (`f8d61df`):
  - `ink` 8.0.0, `react` 19.3.0 y `react-devtools-core` 8.0.0, y `@types/react` 19.3.0 como dependencia de desarrollo, todas con versión exacta.
  - JSX `react-jsx` en `tsconfig.json`, y `.tsx` en eslint y prettier.
  - `src/ui/render.tsx` (`renderApp`), `src/ui/frame.tsx` (`Intro`, `Log`, `Outro`, calcados de clack) y `src/ui/Spinner.tsx` (`◒◐◓◑`, 80 ms).
- **`um check` en ink** (`4d1a3bb`):
  - `src/ui/CheckApp.tsx` (`CheckApp`, `CheckReport`, `CheckError`, `runCheckView` y `printCheckError`).
  - `collectUpdates()` sale de `checkAllProviders()`, que conserva su spinner de clack para `um update` y el menú.
  - `CheckFailure` y `CheckResult` van a `src/types.ts`.
- **Pasada de fix** (`a5517c8`): `patchConsole: false` en `renderApp`, y `useCheckResult` y `summaryParts` extraídos.
- **Compilación**: `moon run :build` genera `bin/um.exe` con ink, `yoga-layout` y `react-devtools-core` dentro, sin cambios en el script.

## 2. Tiempo y coste: estimado vs real

- Tipo: infra/tooling
- Estimación de implementación (del plan): 3 h
- Esfuerzo real: 0,55 h. Es una aproximación con las marcas de los commits: de la apertura a las 17:13 a la validación a las 17:45. Spec y plan, de 16:45 a 17:13, ~0,5 h aparte.
- Desviación: −2,45 h (−82 %)
- Causa de la desviación:
  - El plan fijaba firmas, textos y tests con los valores reales.
  - La API de ink 8 (`renderToString`, `useAnimation`, modo no interactivo) cubría lo que hacía falta sin código propio.
  - Con solo 2 tasks en Native no hubo despachos por task.
  - La estimación no aplicó el factor del log (0,18 con n=1), que habría dado ~0,5 h.
- Modelo del hilo: Opus 5.5, effort no registrado (spec, plan y ejecución en la misma sesión)
- Tokens del hilo: 23.017.135 — claude-opus-5-5 23.017.135 (incluye la migración del kit a 2.3.3, anterior a la spec, en la misma rama)
- Tokens de subagentes: 1.618.393 en 1 despacho — Revisión final rama 0005 ink claude-opus-5-5 1.618.393 / 4 min
- Coste de la sesión: sin precio (sin tabla pricing en sdd-kit.json)
- Coste de sujetos: no aplica
- Review de spec: no · hallazgos 0, aceptados 0

## 3. Desviaciones del plan

- La enmienda del 2026-10-08, aprobada, quita el `SIGINT` del entry de render: Ctrl+C lo sigue resolviendo el manejador global que ya existía.
- El paquete de la revisión final excluye `bun.lock`, que es un fichero generado. Las versiones están en `package.json`.

### Decisiones tomadas sin el dev-lead

- **Task 2:** el handler de `main` pasó de `main().catch(console.error)` a `main().catch((error) => console.error(error))`. Con ink montado de forma síncrona en `main()`, el handler capturaba el `console.error` parcheado, y el error de un provider que lanza en `check <provider>` no se veía. Lo sustituye la pasada de fix (la línea vuelve a la de `develop`).
- **Pasada de fix:** `renderApp` monta ink con `patchConsole: false`. Con el console parcheado, el `Cancelled` de Ctrl+C salía encima del marco y el error de `main` se perdía al desmontar. La revisión lo dio como Minor y lo regradué a Important por su efecto. Test `leaves console untouched while mounted`, RED→GREEN. Coste si está mal: si alguien reactiva `patchConsole`, vuelve la trampa.
- **Pasada de fix:** `CheckApp` (34 líneas) y `Summary` (30) se parten en `useCheckResult` y `summaryParts`. Sin cambio de comportamiento: lo cubren los tests de `CheckApp`.
- **No se tocan** `checkCommand` ni `collectUpdates`, aunque superan el umbral: ya lo superaban en `develop`, y recortarlas sería refactor oportunista.
- **Ctrl+C con stdout redirigido** deja el último frame del spinner en `out.txt`. Se acepta: la spec trata el final normal.

### Minors diferidos de la revisión final

- `pc.createColors` ignora `NO_COLOR` y `FORCE_COLOR` en el aviso por stderr.
- `Summary` saldría vacío si todas las updates tuvieran status `error` (`develop` omitía la línea). Ningún parser lo produce hoy.
- `key={update.id}` daría una key duplicada si un provider repitiera un id.
- El camino de rechazo de `load` no tiene test unitario: lo cubre el smoke.
- Un rechazo que no sea `Error` se trataría como resultado: es teórico.

## 4. Verificación

### 4.1 Builds

- `moon run :build` → verde. `bin/um.exe` lleva dentro ink, `yoga-layout` y `react-devtools-core`, y su salida es igual a la de `bun run src/index.ts check`.
- Suite completa: `moon run :lint :typecheck :test --force`. Lint y typecheck en verde. Tests 34/36: los 2 rojos son `parseProtoOutput` (`parses proto outdated output`, `ignores invalid lines`), deuda conocida del roadmap. Tarda ~1 s.

### 4.2 Smoke / tests

- Validado: 2026-10-08 · «si, funciona!» · no detalló qué probó. Validó sobre el guion de pruebas y el smoke del agente.
- Revisión final: `sdd-kit:effort-high` + opus sobre `4d1a3bb`, con fixes: 0 Critical, 1 Important y 6 Minor. La pasada de fix tuvo 2 hallazgos RED→GREEN.

| THEN | Evidencia | Resultado |
| --- | --- | --- |
| Resultado agrupado (Bun con 1 update y el resto `✓`, `Summary: 1 available`, `Done`) | ejecución real (`bun run` y `.exe`, comparado con `develop`) + suite | ok |
| Insignias `📌 pinned` y `❓ unknown`, y su resumen | suite | ok |
| Todo al día (`◆  Everything is up to date!`) | suite | ok |
| `um check bun` (`◇  Bun (global): 1 update(s)`) | ejecución real + suite | ok |
| `um check foo` (`■  Provider "foo" not found`, sin `Done`, código 0) | ejecución real + suite | ok |
| El spinner rota en su sitio y pasa a `◇` | no probado por el agente (sin TTY); lo cubre la validación del dev-lead | — |
| `um check > out.txt` sin frames ni secuencias de escape, código 0 | ejecución real (`bun run` y `.exe`) | ok |
| Ctrl+C escribe `Cancelled` y sale con 0 | no probado por el agente (sin TTY); lo cubre la validación del dev-lead | — |
| Un provider que falla no tumba el check (`⚠` por stderr) | ejecución real (provider forzado a lanzar, revertido) + suite | ok |

### 4.3 Residuales / deuda generada

- Los 5 Minors diferidos de la sección 3 pasan como una sola fila a la deuda técnica del roadmap.

## 5. Aprendizajes

- ink parchea `console` al montarse (`patchConsole`), y lo que se escribe por consola sale encima del marco o se pierde al desmontar. `renderApp` lo monta con `patchConsole: false` → `architecture.md`, «Decisiones estructurales» (volcado).
- La UI de ink vive en `src/ui/` (`.tsx`), e `index.ts` sigue sin JSX → `architecture.md`, «Estructura», «Piezas» y «Dónde va lo nuevo» (volcado).
- ink 8, React y react-devtools-core entran en el stack → `tech-stack.md`, «Tecnologías» y «Testing» (volcado).

## 6. Adendas

_Ninguna._
