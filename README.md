# Update Manager

CLI interactivo para gestionar actualizaciones de múltiples gestores de paquetes en Windows.

## Instalación

```bash
bun install
bun run build
```

## Uso

```bash
um                   # CLI interactivo
um check             # Ver updates disponibles
um update            # Actualizar todo
um update winget     # Actualizar solo WinGet
um providers         # Gestionar providers
um ignore <id>       # Ignorar un paquete
um unignore <id>     # Dejar de ignorar
um ignored           # Listar ignorados
```

## Gestores Soportados

- WinGet
- Proto
- Moonrepo
- PowerShell Modules
- Bun (global)
- npm (global)
- pnpm (global)
- Claude CLI
- Chocolatey (desactivado)
- Scoop (desactivado)

## WinGet: Paquetes con auto-update

Algunos paquetes (ej: Discord) no se pueden actualizar via WinGet porque tienen su propio auto-updater. Para ocultarlos:

```bash
winget pin add Discord.Discord
```

## Configuración

Archivo: `~/.config/update-manager/config.json`
