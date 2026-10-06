# Tech Stack — update-manager

## Tecnologías

| Pieza | Tecnología | Versión |
| --- | --- | --- |
| Runtime y test runner | Bun | `packageManager: bun@1.3.6`, `engines.bun >=1.3`, `.prototools`: `1.3` (la máquina del autor tiene la 1.3.14) |
| Lenguaje | TypeScript (`strict`, `moduleResolution: bundler`) | 5.9.3 |
| UI de terminal | @clack/prompts | 0.11.0 |
| Colores | picocolors | 1.1.1 |
| Validación de la config | zod | 4.3.5 |
| Lint | ESLint (flat config) + @typescript-eslint | 9.39.2 / 8.53.0 |
| Formato | Prettier | 3.8.0 |
| Calidad | SonarQube (`@sonar/scan`, `sonarqube-scanner`) contra `https://sonarqube.devtools.local`; Java 24 vía `.prototools` | 4.3.4 |
| Plataforma | Windows (`cmd.exe /c`, `where`, `pwsh`, `gsudo`) | Windows 11 |
| Distribución | npm, `@pikachu-metal/update-manager`, binarios `um` y `update-manager` (`bin/cli.js`, shebang `bun`) | 1.5.0 |

## Comandos

- **Arrancar**: `bun run start` (o `bun run dev`, con `--watch`). Instalado: `um`.
- **Tests**: `bun test` (`bun test --coverage` para cobertura).
- **Build**: `bun run build`, que compila `bin/update-manager.exe` y lo copia a `bin/um.exe`. Los `.exe` están en `.gitignore`.
- **Calidad**: `bun run lint`, `bun run format:check`, `bunx tsc --noEmit` (no hay script `typecheck`), `bun run sonar` (necesita `SONAR_TOKEN`, ver `.env.example`).
- **Instalación local**: `bun run link`.

Estado medido el 2026-10-05 en `develop`: `bun test` da 21 en verde y 2 en rojo (`parseProtoOutput`); `tsc --noEmit`, 4 errores; lint, 0 errores y 15 warnings; `format:check` falla en 18 ficheros. Detalle en la tabla de deuda de `roadmap.md`.

## Testing

TDD con `bun test` para la lógica pura: los parsers de salida de cada gestor viven en `src/providers/parsers.ts` y se prueban en `src/providers/parsers.test.ts`. La parte que lanza procesos (`runCommand`, `updatePackage`, el flujo de `index.ts`) no tiene tests. Se verifica con smoke manual: `um check` y, si el cambio toca actualizaciones, `um update <provider>` en la máquina real. No hay CI de tests: los workflows de `.github/` solo lanzan Claude Code (en `@claude` y en la revisión de PR).

## Decisiones abiertas

- Indentación: `.prettierrc` pide tabs (`useTabs: true`) y `.editorconfig` pide 2 espacios. El código usa espacios. Opciones: alinear Prettier con el código · reformatear todo a tabs. Quién decide: el autor.
- Versión de Bun fijada en tres sitios (`packageManager`, `engines`, `.prototools`) con valores distintos. Opciones: unificar en `.prototools` · dejarlo como está. Quién decide: el autor.
