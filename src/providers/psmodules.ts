import { BaseProvider } from "./base";
import type { PackageUpdate } from "../types";
import { commandExists, runPowerShell } from "../runner";

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

  async updatePackage(packageId: string): Promise<boolean> {
    // Step 1: Install the new version
    // Using Install-Module with -Force will install the latest version
    // even if an older version is loaded (installs side-by-side)
    const installScript = `
      $ErrorActionPreference = 'Stop'
      try {
        Install-Module -Name "${packageId}" -Force -AllowClobber -SkipPublisherCheck -ErrorAction Stop
        Write-Output "INSTALL_SUCCESS"
      } catch {
        Write-Output "INSTALL_ERROR: $($_.Exception.Message)"
      }
    `;

    const installResult = await runPowerShell(installScript, { timeout: 180000 });

    if (!installResult.stdout.includes("INSTALL_SUCCESS")) {
      return false;
    }

    // Step 2: Clean up old versions
    // Get all versions except the latest and uninstall them
    // Note: Can't uninstall a version that's currently loaded in any session
    const cleanupScript = `
      $ErrorActionPreference = 'SilentlyContinue'
      $allVersions = Get-InstalledModule -Name "${packageId}" -AllVersions |
        Sort-Object { [version]($_.Version -replace '-.*','') } -Descending

      if ($allVersions.Count -gt 1) {
        $latest = $allVersions[0]
        $oldVersions = $allVersions | Select-Object -Skip 1

        foreach ($old in $oldVersions) {
          try {
            Uninstall-Module -Name "${packageId}" -RequiredVersion $old.Version -Force -ErrorAction Stop
            Write-Output "REMOVED: $($old.Version)"
          } catch {
            Write-Output "SKIP: $($old.Version) - $($_.Exception.Message)"
          }
        }
      }
      Write-Output "CLEANUP_DONE"
    `;

    await runPowerShell(cleanupScript, { timeout: 60000 });

    // We consider success based on install, not cleanup
    // (cleanup may fail for modules in use, which is expected)
    return true;
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
