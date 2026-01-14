# Update Manager

CLI interactivo para gestionar actualizaciones de múltiples gestores de paquetes en Windows.

## Stack

- **Runtime**: Bun
- **Language**: TypeScript
- **UI**: @clack/prompts (CLI interactivo)
- **Colors**: picocolors

## Gestores de Paquetes Soportados

| Gestor        | Comando Check          | Comando Update             | Estado      |
| ------------- | ---------------------- | -------------------------- | ----------- |
| WinGet        | `winget upgrade`       | `winget upgrade --id <id>` | Activo      |
| Proto         | `proto outdated`       | `proto install <tool>`     | Activo      |
| Moonrepo      | `moon upgrade --check` | `moon upgrade`             | Activo      |
| PS Modules    | `Get-InstalledModule`  | `Update-Module`            | Activo      |
| Bun (global)  | `bun pm ls -g`         | `bun update -g`            | Activo      |
| npm (global)  | `npm outdated -g`      | `npm update -g`            | Activo      |
| pnpm (global) | `pnpm outdated -g`     | `pnpm update -g`           | Activo      |
| Claude CLI    | `claude --version`     | `claude update`            | Activo      |
| Chocolatey    | `choco outdated`       | `choco upgrade`            | Desactivado |
| Scoop         | `scoop status`         | `scoop update`             | Desactivado |

## Estructura del Proyecto

```bash
update-manager/
├── src/
│   ├── index.ts           # Entry point, CLI menu principal
│   ├── config.ts          # Configuración y estado de providers
│   ├── types.ts           # Tipos y schemas
│   └── providers/
│       ├── base.ts        # Interface base para providers
│       ├── winget.ts      # WinGet provider
│       ├── proto.ts       # Proto provider
│       ├── moonrepo.ts    # Moonrepo provider
│       ├── psmodules.ts   # PowerShell modules provider
│       ├── bun.ts         # Bun global packages provider
│       ├── npm.ts         # npm global packages provider
│       ├── pnpm.ts        # pnpm global packages provider
│       ├── claude.ts      # Claude CLI provider
│       ├── chocolatey.ts  # Chocolatey provider (disabled)
│       └── scoop.ts       # Scoop provider (disabled)
├── package.json
├── tsconfig.json
├── CLAUDE.md
├── PLANNING.md
└── README.md
```

## Comandos

```bash
# Desarrollo
bun run dev          # Ejecutar en modo desarrollo
bun run build        # Compilar

# Uso
um                   # CLI interactivo
um check             # Ver updates disponibles (todos los providers activos)
um update            # Actualizar todo
um update winget     # Actualizar solo WinGet
um providers         # Gestionar providers (activar/desactivar)
um ignore <id>       # Ignorar un paquete (no aparecerá en check/update)
um unignore <id>     # Dejar de ignorar un paquete
um ignored           # Listar paquetes ignorados
```

## Configuración

Archivo: `~/.config/update-manager/config.json`

```json
{
  "providers": {
    "winget": { "enabled": true },
    "proto": { "enabled": true },
    "moonrepo": { "enabled": true },
    "psmodules": { "enabled": true },
    "bun": { "enabled": true },
    "npm": { "enabled": true },
    "pnpm": { "enabled": true },
    "claude": { "enabled": true },
    "chocolatey": { "enabled": false },
    "scoop": { "enabled": false }
  },
  "ignoredPackages": [],
  "installedVersions": {
    "Google.PlayGames": "144.0.7547.0"
  },
  "lastCheck": "2026-01-06T12:00:00Z"
}
```

## Notas de Desarrollo

- Cada provider implementa la interface `UpdateProvider`
- Los providers desactivados no se ejecutan pero se muestran en el menú de gestión
- El CLI detecta automáticamente qué gestores están instalados
- Usa spinners y progress bars estilo docker para feedback visual
- `installedVersions` guarda la versión instalada después de cada update exitoso
  - Útil para paquetes con versiones mal etiquetadas (ej: Google Play Games)
  - Si la versión "nueva" coincide con la guardada, se omite el paquete
