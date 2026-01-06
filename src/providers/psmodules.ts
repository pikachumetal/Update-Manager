import { BaseProvider } from "./base";
import type { PackageUpdate } from "../types";
import { commandExists, runCommand, runPowerShell } from "../runner";

export class PsModulesProvider extends BaseProvider {
  id = "psmodules";
  name = "PowerShell Modules";
  icon = "💠";
  requiresAdmin = true;

  async isAvailable(): Promise<boolean> {
    return commandExists("pwsh");
  }

  async checkUpdates(): Promise<PackageUpdate[]> {
    // Get all installed modules with their highest version
    // and compare with online versions
    const script = `
      $ErrorActionPreference = 'SilentlyContinue'
      $modules = Get-InstalledModule | Group-Object Name | ForEach-Object {
        # Sort by cleaned version (remove prerelease suffix) to get the actual highest
        $_.Group | Sort-Object { [version]($_.Version -replace '-.*','') } -Descending | Select-Object -First 1
      }
      foreach ($module in $modules) {
        try {
          $online = Find-Module -Name $module.Name -ErrorAction SilentlyContinue
          $installedClean = [version]($module.Version -replace '-.*','')
          $onlineClean = [version]$online.Version
          if ($online -and ($onlineClean -gt $installedClean)) {
            Write-Output "$($module.Name)|$($module.Version)|$($online.Version)"
          }
        } catch {}
      }
    `;

    const result = await runPowerShell(script, { timeout: 180000 });

    if (!result.success && !result.stdout) {
      return [];
    }

    return this.parsePsOutput(result.stdout);
  }

  private parsePsOutput(output: string): PackageUpdate[] {
    const updates: PackageUpdate[] = [];
    const lines = output.split("\n").filter((l) => l.trim());

    for (const line of lines) {
      const [name, current, latest] = line.split("|").map((s) => s.trim());
      if (name && current && latest) {
        updates.push(this.createUpdate(name, name, current, latest));
      }
    }

    return updates;
  }

  private async installViaCmd(shell: "pwsh" | "powershell", moduleName: string): Promise<boolean> {
    // Run Install-Module from cmd.exe to bypass module being loaded in current session
    const psCommand = `Install-Module -Name '${moduleName}' -Force -AllowClobber -SkipPublisherCheck -ErrorAction Stop; Write-Host 'SUCCESS'`;
    const result = await runCommand(
      ["cmd.exe", "/c", shell, "-NoProfile", "-NonInteractive", "-Command", psCommand],
      { timeout: 180000 }
    );
    return result.stdout.includes("SUCCESS");
  }

  private async cleanupOldVersions(moduleName: string): Promise<void> {
    // Try to remove old versions (best effort)
    const cleanupScript = `
      $ErrorActionPreference = 'SilentlyContinue'
      $allVersions = Get-InstalledModule -Name "${moduleName}" -AllVersions 2>$null |
        Sort-Object { [version]($_.Version -replace '-.*','') } -Descending

      if ($allVersions.Count -gt 1) {
        $oldVersions = $allVersions | Select-Object -Skip 1
        foreach ($old in $oldVersions) {
          Uninstall-Module -Name "${moduleName}" -RequiredVersion $old.Version -Force 2>$null
        }
      }
    `;
    await runPowerShell(cleanupScript, { timeout: 60000 });
  }

  async updatePackage(packageId: string): Promise<boolean> {
    // Install via cmd.exe -> pwsh (bypasses module being loaded)
    const pwshSuccess = await this.installViaCmd("pwsh", packageId);

    // Also update in Windows PowerShell for consistency
    await this.installViaCmd("powershell", packageId);

    // Try to cleanup old versions
    await this.cleanupOldVersions(packageId);

    return pwshSuccess;
  }

  async updateAll(): Promise<{
    success: boolean;
    updated: string[];
    failed: string[];
    skipped: string[];
  }> {
    const updates = await this.checkUpdates();
    const result = {
      success: true,
      updated: [] as string[],
      failed: [] as string[],
      skipped: [] as string[],
    };

    for (const update of updates) {
      const success = await this.updatePackage(update.id);
      if (success) {
        result.updated.push(update.id);
      } else {
        result.failed.push(update.id);
        result.success = false;
      }
    }

    return result;
  }
}
