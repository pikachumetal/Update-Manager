import { BaseProvider } from "./base";
import type { PackageUpdate } from "../types";
import { commandExists, runCommand } from "../runner";

export class BunProvider extends BaseProvider {
  id = "bun";
  name = "Bun (global)";
  icon = "🥟";

  async isAvailable(): Promise<boolean> {
    return commandExists("bun");
  }

  async checkUpdates(): Promise<PackageUpdate[]> {
    // Bun doesn't have a built-in outdated command for global packages
    // We check using npm outdated -g since bun global packages are compatible
    const result = await runCommand(["bun", "pm", "ls", "-g"], { timeout: 30000 });

    if (!result.success) {
      return [];
    }

    // For now, return empty as bun global package management is limited
    // Users typically update bun itself via `bun upgrade`
    return [];
  }

  async updatePackage(packageId: string): Promise<boolean> {
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
