<!-- AUTO-GENERADO por Build-EstimationLog.ps1 (sdd-kit) — no editar a mano. Regenerar: pwsh -NoProfile -File <sdd-templates>/scripts/Build-EstimationLog.ps1 -Root <proyecto> -->
# Estimation log (estimado vs real)

| Fecha | Id | Tipo | Est (h) | Real (h) | Ratio | Hilo (tokens) | Subagentes (tokens) | Sujetos ($) | Sesión ($) | Carpeta |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 2026-10-06 | 0001 | infra/tooling | 4 | 0.7 | 0.18 | 29924k | 1445k | no aplica | sin precio | 20261006-120318-feature-0001-tooling-moon |
| 2026-10-08 | 0005 | infra/tooling | 3 | 0.55 | 0.18 | 23017k | 1618k | no aplica | sin precio | 20261008-150312-feature-0005-ink-base-check |
| 2026-10-08 | 0006 | frontend | 3 | 0.7 | 0.23 | 37779k | 2772k | — | sin precio | 20261008-175953-feature-0006-ink-update |

**Factor de calibración** (ratio mediano real/estimado, 3 artefactos): **0.18** · media 0.2

- n insuficiente (hacen falta 5)
- Tendencia: n insuficiente (hacen falta 20)

| Tipo | n | Mediana | p25–p75 |
| --- | --- | --- | --- |
| frontend | 1 | 0.23 | — |
| infra/tooling | 2 | 0.18 | — |

> Con menos de 10 tareas con ratio la calibración es orientativa. Ver `estimation.md`.
