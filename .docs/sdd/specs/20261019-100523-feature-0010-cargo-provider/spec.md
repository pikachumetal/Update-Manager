---
id: 20261019-100523-feature-0010-cargo-provider
feature: 0010
title: Providers cargo y rustup
mode: lite
status: approved
created: 2026-10-19
author: Àngel Delgado (con Claude)
approvers:
  - role: dev-lead
    name: Àngel Delgado
    approved_at: 2026-10-19
---

# Spec — Providers cargo y rustup

> **Estado**: approved.
> **Siguiente paso**: modo lite → implementación directa (Native).

## Capacidades

- Modificadas: `update-check` — `um check` lista los crates de cargo y los toolchains de rustup, y avisa si falta cargo-update
- Modificadas: `package-update` — `um update` actualiza crates con binstall o `cargo install`, y toolchains y rustup con `rustup`

## Decisiones que he tomado yo — valida estas

1. **Dos providers, `cargo` y `rustup`**, en lugar de uno. El único canal de avisos es que `checkUpdates` lance, y lanzar por falta de cargo-update haría perder los toolchains (ver «Decisiones tomadas con el dev-lead»).
2. **Nombres e iconos**: `🦀 Cargo` (id `cargo`) y `🔧 Rustup` (id `rustup`).
3. **Activos por defecto** en `DEFAULT_PROVIDERS`. Sin `cargo` o sin `rustup` en el `PATH` no aparecen, como el resto de providers.
4. **Fila de un toolchain**: id y nombre con el nombre completo que da `rustup check` (`stable-x86_64-pc-windows-msvc`), y versiones sin el hash ni la fecha (`1.98.0 → 1.99.1`).
5. **Cada fila actualiza solo lo suyo**: un toolchain con `rustup update <toolchain> --no-self-update`; la fila `rustup`, con `rustup self update`.
6. **`rustup check` sale con 100 cuando hay updates**: el provider lee stdout con cualquier código de salida. Sin ninguna línea reconocible, devuelve 0 updates.
7. **Versiones de los crates sin la `v`**: `cargo install-update -l` da `v0.20.0`, la fila muestra `0.20.0`.
8. **binstall se busca en el `PATH` en cada update** (`cargo-binstall`), no al arrancar.
9. **Timeouts**: 120 s el check de cargo (consulta el índice de crates.io), 30 s `rustup check`, 300 s un update con binstall, 600 s con `cargo install` (compila) y 600 s `rustup update` de un toolchain.
10. **Fixture de cargo**: la salida real de `cargo install-update -l` del 2026-10-19, con todo al día, y una copia con la fila de `mergiraf` cambiada a `v0.21.0  Yes` para el caso con update. La de rustup es la salida real de ese día.
11. **No entra**: limpiar los toolchains con versión fija (`1.92.0`…`1.99.1`); consultar con `cargo search`; instalar cargo-update desde `um`.
12. **Repaso de coherencia**: los mensajes y comandos literales coinciden entre decisiones y escenarios (`cargo-update not installed: cargo binstall cargo-update`, `--no-self-update`, timeouts).

### Decisiones tomadas con el dev-lead

- Consulta con `cargo install-update -l` — «Instalar cargo-update» (2026-10-19)
- Update con `cargo binstall -y <crate>`, y sin binstall `cargo install <crate>` — «binstall con fallback (Recomendado)»
- Los toolchains de rustup también entran — «Sí, en el mismo provider»; después, al ver el choque con el canal de avisos, «Dos providers (Recomendado)»
- Si falta cargo-update, aviso `⚠` sin instalar nada — «si»
- Modo lite, perfil delegate — «Feature lite, delegate (Recomendado)»

## Intent

`um` no actualiza nada de Rust: los crates instalados con `cargo install` o `cargo binstall` (hoy `cargo-binstall`, `cargo-update` y `mergiraf`) y los toolchains de rustup se actualizan a mano. Se quiere que `um check` y `um update` los traten como un gestor más.

## Scope

- Entra: provider `cargo` (crates), provider `rustup` (toolchains y el propio rustup), sus parsers con test en `parsers.ts`, su registro en `providers/index.ts` y `DEFAULT_PROVIDERS`, y la tabla de comandos de `architecture.md`.
- No entra: lo de la decisión 11; cambios en la UI, en `UpdateProvider` o en `collectUpdates`.

## Approach

Dos providers con el molde `BaseProvider` + parser puro en `parsers.ts`, como `moonrepo` o `bun`. Todo comando pasa por `runCommand`. Los avisos usan el canal que ya existe: una excepción en `checkUpdates` sale como `⚠ <provider>: <mensaje>` y el resto sigue.

## Delta de comportamiento

### Capacidad: `update-check`

**ADDED — Crates de cargo y toolchains de rustup**
- GIVEN `cargo install-update -l` lista `mergiraf  v0.20.0  v0.21.0  Yes` y `cargo-binstall  v1.26.0  v1.26.0  No`
- WHEN `um check`
- THEN se ve `🦀 Cargo` con `   • mergiraf 0.20.0 → 0.21.0`, y `cargo-binstall` no sale
- GIVEN `rustup check` escribe `stable-x86_64-pc-windows-msvc - update available: 1.98.0 (88d9e12ae 2026-08-18) -> 1.99.1 (58cf8f9c3 2026-10-13)` y `rustup - up to date : 1.29.1`, y sale con código 100
- WHEN `um check`
- THEN se ve `🔧 Rustup` con `   • stable-x86_64-pc-windows-msvc 1.98.0 → 1.99.1`, y `rustup` no sale
- GIVEN `rustup check` escribe `rustup - update available: 1.29.1 -> 1.30.0`
- WHEN `um check`
- THEN `🔧 Rustup` lleva `   • rustup 1.29.1 → 1.30.0`
- GIVEN todo al día en los dos
- WHEN `um check`
- THEN se ve `🦀 Cargo ✓` y `🔧 Rustup ✓`

**ADDED — Aviso si falta cargo-update**
- GIVEN `cargo` en el `PATH` y `cargo-install-update` no
- WHEN `um check`
- THEN stderr recibe `  ⚠ Cargo: cargo-update not installed: cargo binstall cargo-update`, no se instala nada, y los demás providers, `Rustup` incluido, se listan como siempre

**Reglas de la capacidad**
- **Límites**: 60 s por comando por defecto, 120 s el check de WinGet, 120 s el check de cargo y 30 s `rustup check`.
- **Avisos**: fallo de check de un provider (`⚠`, por stderr), y se sigue con el resto. Cargo sin cargo-update es uno de esos fallos.

### Capacidad: `package-update`

**ADDED — Actualizar crates y toolchains**
- GIVEN `mergiraf` 0.20.0 → 0.21.0 seleccionado y `cargo-binstall` en el `PATH`
- WHEN se actualiza
- THEN se ejecuta `cargo binstall -y mergiraf`, y con éxito su fila pasa a `│  ✓ mergiraf 0.20.0 → 0.21.0`
- GIVEN el mismo crate sin `cargo-binstall` en el `PATH`
- WHEN se actualiza
- THEN se ejecuta `cargo install mergiraf`
- GIVEN `stable-x86_64-pc-windows-msvc` 1.98.0 → 1.99.1 seleccionado
- WHEN se actualiza
- THEN se ejecuta `rustup update stable-x86_64-pc-windows-msvc --no-self-update`
- GIVEN la fila `rustup` 1.29.1 → 1.30.0 seleccionada
- WHEN se actualiza
- THEN se ejecuta `rustup self update`

**Reglas de la capacidad**
- **Límites**: 60 s por comando por defecto, 120 s el check de WinGet, 300 s un update de WinGet, 120 s la instalación de gsudo, 300 s un update con `cargo binstall`, 600 s con `cargo install` y 600 s `rustup update` de un toolchain. Los paquetes se actualizan de uno en uno.

### Estimación y esfuerzo

- Tipo: backend
- Esfuerzo spec: 0,4 h
- Estimación de implementación: 1 h
- Base de la estimación: dos providers calcados de `moonrepo`/`bun`, dos parsers pequeños con fixtures ya capturados; factor del log 0,44 (n=6).
- Confianza: media (el código de salida 100 de `rustup check` y la detección de binstall solo se ven en ejecución real)

## Enmiendas

_Ninguna._

## Aprobaciones

| Rol | Nombre | Fecha | Estado |
| --- | --- | --- | --- |
| dev-lead | Àngel Delgado | 2026-10-19 | aprobada: «si» |
