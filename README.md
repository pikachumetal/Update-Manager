# Update Manager

`um` checks every package manager on your Windows machine for updates and applies the ones you pick, from one interactive terminal UI. It covers WinGet, proto, moon, PowerShell modules, global Bun, npm, and pnpm packages, and the Claude CLI.

This README is for people who install and use `um`. To work on the code, see [Develop](#develop).

## Before you begin

You need:

- Windows 10 or 11.
- [Bun](https://bun.sh) 1.4.2 or later. If you use [proto](https://moonrepo.dev/proto), run `proto install` in the repository to get the pinned versions of Bun and moon.
- Optional: [gsudo](https://github.com/gerardog/gsudo), to force updates of pinned WinGet packages with admin rights. If it's missing, `um` offers to install it.

## Install

`um` isn't published to a package registry. Install it from source:

1. Clone the repository and install its dependencies:

   ```powershell
   git clone https://github.com/pikachumetal/update-manager.git
   cd update-manager
   bun install
   ```

2. Register the `um` and `update-manager` commands globally:

   ```powershell
   bun link
   ```

3. Confirm that the command works:

   ```powershell
   um --help
   ```

## Check and apply updates

To open the interactive menu, run `um` with no arguments. To act directly, use a command:

| Command | What it does |
| --- | --- |
| `um check [PROVIDER]` | Lists available updates, grouped by package manager. |
| `um update [PROVIDER]` | Lists available updates and asks which ones to apply. |
| `um update PROVIDER --yes` | Applies every available update of one package manager without asking. |
| `um providers` | Lists every package manager as enabled, disabled, or not installed. |
| `um providers enable PROVIDER` | Turns a package manager on. |
| `um providers disable PROVIDER` | Turns a package manager off. |
| `um ignore PACKAGE_ID` | Hides a package when you check or update all package managers. |
| `um unignore PACKAGE_ID` | Shows an ignored package again. |
| `um ignored` | Lists ignored packages. |

Replace `PROVIDER` with one of the IDs from [Supported package managers](#supported-package-managers), and `PACKAGE_ID` with the ID that `um check` shows for the package.

For example, to update only WinGet packages:

```powershell
um update winget
```

`um` skips pinned WinGet packages and packages whose installed version it can't read. When the list includes them, `um` asks whether to force those WinGet updates.

## Supported package managers

`um` checks each enabled package manager that it finds on your `PATH`. The following IDs are available:

| ID | Package manager | Enabled by default |
| --- | --- | --- |
| `winget` | WinGet | Yes |
| `proto` | proto | Yes |
| `moonrepo` | moon | Yes |
| `psmodules` | PowerShell modules | Yes |
| `bun` | Bun global packages | Yes |
| `npm` | npm global packages | Yes |
| `pnpm` | pnpm global packages | Yes |
| `claude` | Claude CLI | Yes |
| `chocolatey` | Chocolatey | No |
| `scoop` | Scoop | No |

## Hide apps that update themselves

Some WinGet packages, such as Discord, ship their own updater, and WinGet can't update them. `um` marks these with "use app's built-in updater". To hide one, pin it in WinGet:

```powershell
winget pin add Discord.Discord
```

To show it again, run `winget pin remove Discord.Discord`.

## Configuration

`um` stores its settings in `~/.config/update-manager/config.json`: which package managers are enabled, which packages you ignore, and the version it installed for each package. You don't need to edit this file. The `providers` and `ignore` commands change it for you.

## Develop

The project uses [moon](https://moonrepo.dev) to run its tasks. Each task calls the matching script in `package.json`:

| Task | What it does |
| --- | --- |
| `moon run :start` | Runs `um` from source. |
| `moon run :dev` | Runs `um` and restarts it on every change. |
| `moon run :test` | Runs the test suite. |
| `moon run :lint` | Checks formatting with Prettier and lints with ESLint. |
| `moon run :lint-fix` | Fixes formatting and lint errors. |
| `moon run :typecheck` | Type-checks the code with `tsc`. |
| `moon run :build` | Compiles `bin/um.exe` and `bin/update-manager.exe`. |
| `moon run :deps-update` | Lists outdated dependencies, grouped by patch, minor, and major, and lets you pick which to upgrade. |

Dependency versions in `package.json` are exact. `bunfig.toml` keeps `bun add` from writing version ranges.

## License

MIT. See [LICENSE](LICENSE).
