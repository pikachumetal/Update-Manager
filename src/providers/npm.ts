import { BaseProvider } from "./base";
import type { PackageUpdate } from "../types";
import { commandExists, runCommand } from "../runner";

export class NpmProvider extends BaseProvider {
  id = "npm";
  name = "npm (global)";
  icon = "📦";

  async isAvailable(): Promise<boolean> {
    return commandExists("npm");
  }

  async checkUpdates(): Promise<PackageUpdate[]> {
    const result = await runCommand(["npm", "outdated", "-g", "--json"], {
      timeout: 60000,
    });

    // npm outdated returns exit code 1 when there are outdated packages
    if (!result.stdout) {
      return [];
    }

    try {
      const outdated = JSON.parse(result.stdout);
      return this.parseNpmOutput(outdated);
    } catch {
      return [];
    }
  }

  private parseNpmOutput(
    outdated: Record<string, { current: string; wanted: string; latest: string }>
  ): PackageUpdate[] {
    const updates: PackageUpdate[] = [];

    for (const [name, info] of Object.entries(outdated)) {
      if (info.current !== info.latest) {
        updates.push(this.createUpdate(name, name, info.current, info.latest));
      }
    }

    return updates;
  }

  async updatePackage(packageId: string): Promise<boolean> {
    const result = await runCommand(["npm", "update", "-g", packageId], {
      timeout: 120000,
    });
    return result.success;
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
