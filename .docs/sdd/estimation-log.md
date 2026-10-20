<!-- AUTO-GENERADO por Build-EstimationLog.ps1 (sdd-kit) — no editar a mano. Regenerar: pwsh -NoProfile -File <sdd-templates>/scripts/Build-EstimationLog.ps1 -Root <proyecto> -->
# Estimation log (estimado vs real)

| Fecha | Id | Tipo | Est (h) | Real (h) | Ratio | Hilo (tokens) | Subagentes (tokens) | Sujetos ($) | Sesión ($) | Carpeta |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 2026-10-06 | 0001 | infra/tooling | 4 | 0.7 | 0.18 | 29924k | 1445k | no aplica | sin precio | 20261006-120318-feature-0001-tooling-moon |
| 2026-10-08 | 0005 | infra/tooling | 3 | 0.55 | 0.18 | 23017k | 1618k | no aplica | sin precio | 20261008-150312-feature-0005-ink-base-check |
| 2026-10-08 | 0007 | frontend | 1 | 1.25 | 1.25 | 18726k | 2018k | — | sin precio | 20261008-165945-feature-0007-ink-menu-providers-ignore |
| 2026-10-08 | 0006 | frontend | 3 | 0.7 | 0.23 | 37779k | 2772k | — | sin precio | 20261008-175953-feature-0006-ink-update |
| 2026-10-15 | 0008 | patch | 0.25 | 0.3 | 1.2 | — | — | — | — | 20261015-074853-patch-0008-winget-force-unchecked |
| 2026-10-15 | 0009 | frontend | 1 | 0.65 | 0.65 | 13676k | 461k | — | sin precio | 20261015-092338-feature-0009-ink-rest-cli |
| 2026-10-19 | 0010 | backend | 1 | 0.25 | 0.25 | 11599k | 414k | no aplica | sin precio | 20261019-100523-feature-0010-cargo-provider |
| 2026-10-19 | 0011 | patch | — | 0.1 | — | — | — | — | — | 20261019-121024-patch-0011-version-from-package |
| 2026-10-20 | 0012 | backend | 0.75 | 0.3 | 0.4 | 11276k | 1499k | no aplica | sin precio | 20261020-071630-feature-0012-agents-provider |

**Factor de calibración** (ratio mediano real/estimado, 8 artefactos): **0.32** · media 0.54

- p25–p75: 0.22–0.79
- p80: 0.98 — para comprometer una fecha, multiplica la estimación por el p80: así cubre 4 de cada 5 artefactos.
- Dentro de ±25 %: 25 % · sobreestimadas: 75 % · infraestimadas: 0 %
- Error absoluto (h): media 1.24 · mediana 0.6
- Tendencia: n insuficiente (hacen falta 20)

| Tramo del ratio | n | % |
| --- | --- | --- |
| <0.5 | 5 | 63 % |
| 0.5–0.8 | 1 | 13 % |
| 0.8–1.25 | 1 | 13 % |
| 1.25–2 | 1 | 13 % |
| ≥2 | 0 | 0 % |

| Tipo | n | Mediana | p25–p75 |
| --- | --- | --- | --- |
| backend | 2 | 0.32 | — |
| frontend | 3 | 0.65 | — |
| infra/tooling | 2 | 0.18 | — |
| patch | 1 | 1.2 | — |

| Release | Artefactos | Horas reales | Mediana | Sujetos ($) | Sesión ($) |
| --- | --- | --- | --- | --- | --- |
| 1.6.0 | 8 | 4.5 | 0.25 | — | — |
| sin publicar | 1 | 0.3 | 0.4 | — | — |

> Con menos de 10 tareas con ratio la calibración es orientativa. Ver `estimation.md`.
