# Update Manager

CLI interactiva (Bun + TypeScript) que consulta y aplica actualizaciones de varios gestores de paquetes en Windows. El proyecto se trabaja con el kit SDD: la documentación de anclaje vive en `.docs/sdd/`.

## Documentos

- `.docs/sdd/mission.md`: qué hace el sistema y su glosario (provider, status, force, `installedVersions`…).
- `.docs/sdd/tech-stack.md`: versiones, comandos `moon run` (lint, typecheck, test, build, deps-update) y política de testing.
- `.docs/sdd/architecture.md`: piezas, comandos reales de cada provider, flujo y dónde va lo nuevo.
- `.docs/sdd/constitution.md`: principios, convenciones (ramas, commits) y reglas de producto. Manda sobre cualquier spec.
- `.docs/sdd/roadmap.md`: lo próximo, el backlog y la deuda técnica.

## Comandos

- Antes de commitear: `moon run :lint :typecheck :test`. Todo corre con Bun (`bunfig.toml`), sin Node.
- moon cachea por inputs: cuando cambien dependencias o `tsconfig.json`, añade `--force` para no fiarte de un verde cacheado.

## Reglas críticas

- `~/.config/update-manager/config.json` es del usuario: un cambio de `ConfigSchema` nunca rompe un fichero ya existente.
- Los comandos externos pasan siempre por `runCommand` / `runPowerShell` (`src/runner.ts`).
- Un parser nuevo va en `src/providers/parsers.ts`, con su test en `parsers.test.ts` y una salida real como fixture.
- Nada de refactor oportunista: la deuda se salda desde la tabla del roadmap, en su propio patch.
- Gitflow: se trabaja desde `develop`. `main` y los tags los mueve una persona.
