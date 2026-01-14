import { BaseProvider } from "./base";
import type { PackageUpdate } from "../types";
import { commandExists, runCommand } from "../runner";
import { parseBunOutdatedOutput } from "./parsers";

export class BunProvider extends BaseProvider {
  id = "bun";
  name = "Bun (global)";
  icon = "🥟";

  async isAvailable(): Promise<boolean> {
    return commandExists("bun");
  }

  async checkUpdates(): Promise<PackageUpdate[]> {
    const result = await runCommand(["bun", "outdated", "-g"], { timeout: 30000 });

    // bun outdated returns exit code 1 when there are outdated packages
    if (!result.stdout) {
      return [];
    }

    const parsed = parseBunOutdatedOutput(result.stdout);
    return parsed.map((pkg) =>
      this.createUpdate(pkg.id, pkg.name, pkg.currentVersion, pkg.newVersion)
    );
  }

  async updatePackage(packageId: string, _options?: unknown): Promise<boolean> {
    if (packageId === "bun") {
      // Update bun itself
      const result = await runCommand(["bun", "upgrade"], { timeout: 120000 });
      return result.success;
    }

    const result = await runCommand(["bun", "update", "-g", packageId], {
      timeout: 60000,
    });
    return result.success;
  }

  async updateAll(): Promise<{
    success: boolean;
    updated: string[];
    failed: string[];
    skipped: string[];
  }> {
    // Update bun itself
    const result = await runCommand(["bun", "upgrade"], { timeout: 120000 });

    return {
      success: result.success,
      updated: result.success ? ["bun"] : [],
      failed: result.success ? [] : ["bun"],
      skipped: [],
    };
  }
}
