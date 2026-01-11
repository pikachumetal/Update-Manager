import { BaseProvider } from "./base";
import type { PackageUpdate } from "../types";
import { commandExists, runCommand } from "../runner";
import { parseNpmJsonOutput, parsePnpmTableOutput } from "./parsers";

export class PnpmProvider extends BaseProvider {
  id = "pnpm";
  name = "pnpm (global)";
  icon = "📦";

  async isAvailable(): Promise<boolean> {
    return commandExists("pnpm");
  }

  async checkUpdates(): Promise<PackageUpdate[]> {
    const result = await runCommand(["pnpm", "outdated", "-g", "--json"], {
      timeout: 60000,
    });

    if (!result.stdout) {
      return [];
    }

    // Try JSON first, fallback to table parsing
    let parsed = parseNpmJsonOutput(result.stdout, this.id);
    if (parsed.length === 0 && result.stdout.trim()) {
      parsed = parsePnpmTableOutput(result.stdout);
    }

    return parsed.map((pkg) =>
      this.createUpdate(pkg.id, pkg.name, pkg.currentVersion, pkg.newVersion)
    );
  }

  async updatePackage(packageId: string, _options?: unknown): Promise<boolean> {
    const result = await runCommand(["pnpm", "update", "-g", packageId], {
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
    const result = await runCommand(["pnpm", "update", "-g"], {
      timeout: 180000,
    });

    return {
      success: result.success,
      updated: result.success ? ["all"] : [],
      failed: result.success ? [] : ["all"],
      skipped: [],
    };
  }
}
