# Changelog — update-manager

Formato: [Keep a Changelog 1.1.0](https://keepachangelog.com/). Changelog técnico del proyecto, backward-looking: `roadmap.md` es el forward-looking.

## [Unreleased]

### Added

- **Feature 0005** — Base de ink 8 (React 19.3.0, react-devtools-core 8.0.0): entry de render, marco calcado de @clack/prompts y Spinner propio; `bun build --compile` la empaqueta. → [ref](specs/20261008-150312-feature-0005-ink-base-check/)
- **Feature 0001** — moon 2.6.0 orquesta los scripts de `package.json` (`:lint`, `:typecheck`, `:test`, `:build`, `:deps-update` con npm-check-updates interactivo…). → [ref](specs/20261006-120318-feature-0001-tooling-moon/)

### Changed

- **Feature 0006** — `um update` y `um update <provider>` se dibujan con ink: selección agrupada por provider con todo marcado, Confirm propio para force y gsudo, una fila de progreso por paquete (`updating`, `queued`, `✓`, `✗`) y el resultado. Sin TTY y sin `--yes` sale con 1 y `Interactive terminal required (use --yes)`; con `--yes` y sin TTY no pregunta force ni gsudo y salta los `pinned`/`unknown`. El menú interactivo sigue en @clack/prompts. Absorbe la 0003. → [ref](specs/20261008-175953-feature-0006-ink-update/)
- **Feature 0005** — `um check` y `um check <provider>` se dibujan con ink: mismo contenido; sin TTY (`um check > out.txt`) solo se escribe el resultado final, sin frames del spinner; el error de un provider que lanza en `check <provider>` se imprime y el proceso termina en vez de quedarse colgado. → [ref](specs/20261008-150312-feature-0005-ink-base-check/)
- **Feature 0001** — Solo Bun (`bunfig.toml`), versiones exactas, todas las dependencias al día (TypeScript 6.0.3, ESLint 10, @clack/prompts 1.8.1), Prettier a 2 espacios y LF y README reescrito en inglés. → [ref](specs/20261006-120318-feature-0001-tooling-moon/)

### Removed

- **Feature 0001** — Sonar, configuración de IDE, workflows de `.github/`, `PLANNING.md`, los scripts `format` y `sonar`, y `engines.node`. → [ref](specs/20261006-120318-feature-0001-tooling-moon/)
