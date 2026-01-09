import { BaseProvider } from "./base";
import type { PackageUpdate } from "../types";
import { commandExists, runCommand } from "../runner";
import { parseNpmJsonOutput } from "./parsers";

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

    const parsed = parseNpmJsonOutput(result.stdout, this.id);
    return parsed.map((pkg) =>
      this.createUpdate(pkg.id, pkg.name, pkg.currentVersion, pkg.newVersion)
    );
  }

  async updatePackage(packageId: string, _options?: unknown): Promise<boolean> {
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
