# Constitution — update-manager

> Aprobada por el autor el 2026-10-05. Los artículos salen de las convenciones observadas en el código y en el historial de git.

## Principios

1. **Retrocompatibilidad por defecto.** `~/.config/update-manager/config.json` ya existe en la máquina de cada usuario. Un campo nuevo es opcional en `ConfigSchema`, y ninguno se renombra ni se quita sin migración. Los comandos (`um check`, `um update`…) y sus flags no cambian de significado.
2. **Respetar el patrón existente aunque no sea ideal.** Un gestor nuevo sigue el molde `BaseProvider` + parser en `parsers.ts`. Un comando nuevo sigue el molde de `index.ts`. Ver `architecture.md` § «Dónde va lo nuevo».
3. **Cero refactor oportunista.** Una feature o un patch toca solo lo que su spec necesita. La deuda (formato, lint, código sin uso, `index.ts` de 557 líneas) se arregla en su propio patch o feature, desde la tabla de deuda de `roadmap.md`.
4. **Migraciones masivas solo con justificación escrita.** Reformatear todo el repo, cambiar de librería de prompts o reestructurar carpetas exige una spec que lo justifique.
5. **Los comandos externos pasan por `runner.ts`.** `runCommand` / `runPowerShell` con su timeout explícito. Nunca `Bun.spawn` ni `$` directos: así todos heredan `cmd.exe /c` y `FORCE_COLOR=0`.
6. **Todo parser de salida es una función pura con test.** Vive en `src/providers/parsers.ts` y su caso va en `parsers.test.ts`, con una salida real del gestor como fixture. Chocolatey y Scoop son la excepción heredada.
7. **Un fallo de un provider no tumba la CLI.** Si el check falla, se avisa y se sigue con el resto. Si el update falla, cuenta como fallido y no se guarda en `installedVersions`.
8. **No se actualiza nada sin que el usuario lo vea.** Antes de actualizar se lista lo que va a cambiar y se pide selección. Solo `-y` se salta la selección, y forzar (`--force`, `gsudo`) siempre pide confirmación.

## Convenciones

- **Idioma**: código e identificadores en inglés. Los mensajes de la CLI y el README, en inglés. Los docs de `.docs/sdd/`, en español.
- **Ramas**: gitflow. `main` estable, `develop` de integración, `feature/<id>-<slug>` y `patch/<id>-<slug>` desde `develop`. Las releases salen en `release/vX.Y.Z` y los hotfix en `hotfix/vX.Y.Z`, con tag `vX.Y.Z` en `main`.
- **Commits**: Conventional Commits. Tipo y scope en inglés; título y cuerpo en español, con los términos técnicos en inglés. Ejemplo: `fix(winget): reintentar sin --silent cuando el instalador lo rechaza`. El historial anterior a SDD mezcla mensajes libres en inglés y en español.
- **Proyecto de referencia**: no aplica.

## Reglas de producto

- **Dónde viven los datos**: respondida (observada). En un único fichero, `~/.config/update-manager/config.json`, validado con zod. No hay base de datos ni caché. El estado de cada paquete lo da siempre el gestor en cada ejecución.
- **Idioma de los nombres**: respondida (observada). Ids de provider en minúsculas y en inglés (`winget`, `psmodules`). Claves de config en camelCase y en inglés (`ignoredPackages`, `installedVersions`). Mensajes al usuario, en inglés.
- **Límites**: respondida (observada) en timeouts por comando: 60 s por defecto en `runCommand`, 120 s el check de WinGet, 300 s un update de WinGet y 600 s `upgrade --all`. No hay topes de número de paquetes. Los valores pasarán a `capabilities/` cuando una feature los toque.
- **Avisos**: parcialmente respondida (observada). Se avisa del fallo de check de un provider, de los paquetes que necesitan force, de la falta de `gsudo` y de los paquetes con updater propio. Pendiente: avisar cuando `config.json` no valida, porque hoy se vuelve a los defaults en silencio.
- **Regla ante conflicto**: respondida (observada). Si la versión «nueva» que da el gestor coincide con `installedVersions[id]`, manda `installedVersions` y el paquete se omite. Pendiente: ese filtro no se aplica a `check <provider>` ni a `update <provider>`.
