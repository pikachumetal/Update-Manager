import { BaseProvider } from "./base";
import type { PackageUpdate } from "../types";
import { commandExists, runCommand } from "../runner";

export class ChocolateyProvider extends BaseProvider {
  id = "chocolatey";
  name = "Chocolatey";
  icon = "🍫";
  requiresAdmin = true;

  async isAvailable(): Promise<boolean> {
    return commandExists("choco");
  }

  async checkUpdates(): Promise<PackageUpdate[]> {
    const result = await runCommand(["choco", "outdated", "-r"], {
      timeout: 120000,
    });

    if (!result.success && !result.stdout) {
      return [];
    }

    return this.parseChocoOutput(result.stdout);
  }

  private parseChocoOutput(output: string): PackageUpdate[] {
    const updates: PackageUpdate[] = [];
    const lines = output.split("\n").filter((l) => l.trim());

    for (const line of lines) {
      // Format: package|currentVersion|availableVersion|pinned
      const [name, current, latest] = line.split("|");
      if (name && current && latest && current !== latest) {
        updates.push(this.createUpdate(name, name, current, latest));
      }
    }

    return updates;
  }

  async updatePackage(packageId: string): Promise<boolean> {
    const result = await runCommand(
      ["choco", "upgrade", packageId, "-y", "--no-progress"],
      { timeout: 300000 }
    );
    return result.success;
  }

  async updateAll(): Promise<{
    success: boolean;
    updated: string[];
    failed: string[];
    skipped: string[];
  }> {
    const result = await runCommand(
      ["choco", "upgrade", "all", "-y", "--no-progress"],
      { timeout: 600000 }
    );

    return {
      success: result.success,
      updated: result.success ? ["all"] : [],
      failed: result.success ? [] : ["all"],
      skipped: [],
    };
  }
}
