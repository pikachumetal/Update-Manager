# Update Manager - Plan de Implementación

## Objetivo

Crear un CLI interactivo que unifique la gestión de actualizaciones de múltiples gestores de paquetes en Windows, similar al estilo de docker compose.

## Gestores a Soportar

### Activos por defecto

- **WinGet** - Gestor de paquetes de Windows
- **Proto** - Gestor de versiones de herramientas (node, bun, java, etc.)
- **Moonrepo** - Build system y gestor de monorepos
- **PowerShell Modules** - Módulos de PowerShell Gallery
- **Bun (global)** - Paquetes globales instalados con bun
- **npm (global)** - Paquetes globales instalados con npm
- **pnpm (global)** - Paquetes globales instalados con pnpm
- **Claude CLI** - CLI de Claude Code

### Desactivados por defecto (activables)

- **Chocolatey** - Gestor de paquetes legacy
- **Scoop** - Gestor de paquetes portable

## Arquitectura

### Provider Interface

```typescript
interface UpdateProvider {
  id: string;
  name: string;
  enabled: boolean;

  // Detectar si el gestor está instalado
  isAvailable(): Promise<boolean>;

  // Obtener lista de paquetes con updates
  checkUpdates(): Promise<PackageUpdate[]>;

  // Actualizar un paquete específico
  updatePackage(packageId: string): Promise<boolean>;

  // Actualizar todos los paquetes
  updateAll(): Promise<UpdateResult>;
}

interface PackageUpdate {
  id: string;
  name: string;
  currentVersion: string;
  newVersion: string;
  provider: string;
}
```

### Flujos de Usuario

1. **Modo interactivo** (`um`)
   - Menú principal con opciones
   - Check updates → muestra lista agrupada por provider
   - Update → selección de qué actualizar
   - Settings → activar/desactivar providers

2. **Modo directo** (`um check`, `um update`)
   - Ejecuta la acción sin menú
   - Útil para scripts y automatización

## Fases de Implementación

### Fase 1: Estructura base

- [ ] Configurar proyecto (package.json, tsconfig.json)
- [ ] Crear tipos base (types.ts)
- [ ] Implementar sistema de configuración (config.ts)
- [ ] Crear interface base de providers (providers/base.ts)
- [ ] Implementar CLI básico con @clack/prompts (index.ts)

### Fase 2: Providers principales

- [ ] WinGet provider (winget.ts)
- [ ] Proto provider (proto.ts)
- [ ] PowerShell modules provider (psmodules.ts)
- [ ] Claude CLI provider (claude.ts)

### Fase 3: Providers de paquetes JS

- [ ] Bun global provider (bun.ts)
- [ ] npm global provider (npm.ts)
- [ ] pnpm global provider (pnpm.ts)

### Fase 4: Providers opcionales

- [ ] Chocolatey provider (chocolatey.ts)
- [ ] Scoop provider (scoop.ts)

### Fase 5: CLI y UX

- [ ] Argumentos de línea de comandos (check, update, providers)
- [ ] Progress bars estilo docker
- [ ] Resumen de actualizaciones
- [ ] Logs y errores detallados

### Fase 6: Distribución

- [ ] Build con bun
- [ ] Publicar en npm/bun
- [ ] Crear ejecutable standalone (opcional)

## Decisiones Técnicas

### ¿Por qué Bun?

- Runtime rápido
- TypeScript nativo
- Gestión de paquetes integrada
- Spawn de procesos sencillo

### ¿Por qué @clack/prompts?

- UI consistente con project-manager
- Spinners y progress integrados
- Fácil de usar y bonito

### Ejecución de comandos

- Usar `Bun.spawn` para ejecutar comandos externos
- Parsear output de cada gestor (cada uno tiene formato diferente)
- Timeouts para evitar bloqueos

## Consideraciones

### WinGet

- Requiere parsear output de tabla
- Algunas actualizaciones requieren admin (gsudo)
- `winget upgrade --all` para actualizar todo

### Proto

- `proto outdated` devuelve JSON-like output
- `proto install <tool>` actualiza a la versión pinned

### PowerShell Modules

- Ejecutar via `pwsh -NoProfile -Command`
- `Get-InstalledModule | ForEach { ... }`
- Algunas actualizaciones requieren admin

### Paquetes globales JS

- bun/npm/pnpm tienen formatos de output diferentes
- Detectar cuáles están instalados antes de check

### Claude CLI

- No tiene comando "check updates"
- Solo `claude update` que actualiza si hay nueva versión
- Detectar versión actual con `claude --version`

### PowerShell Modules

- Ejecutar via `pwsh -NoProfile -Command`
- `Get-InstalledModule | ForEach { ... }`
- Algunas actualizaciones requieren admin

### Paquetes globales JS

- bun/npm/pnpm tienen formatos de output diferentes
- Detectar cuáles están instalados antes de check

### Claude CLI

- No tiene comando "check updates"
- Solo `claude update` que actualiza si hay nueva versión
- Detectar versión actual con `claude --version`
