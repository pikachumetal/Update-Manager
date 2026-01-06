import { BaseProvider } from "./base";
import type { PackageUpdate } from "../types";
import { commandExists, runCommand } from "../runner";

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

    try {
      const outdated = JSON.parse(result.stdout);
      return this.parsePnpmOutput(outdated);
    } catch {
      // Try parsing as table if JSON fails
      return this.parseTableOutput(result.stdout);
    }
  }

  private parsePnpmOutput(
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

  private parseTableOutput(output: string): PackageUpdate[] {
    const updates: PackageUpdate[] = [];
    const lines = output.split("\n");

    for (const line of lines) {
      // Skip header and empty lines
      if (!line.trim() || line.includes("Package") || line.startsWith("─")) {
        continue;
      }

      const parts = line.split(/\s+/).filter(Boolean);
      if (parts.length >= 3) {
        const [name, current, , latest] = parts;
        if (current !== latest && latest) {
          updates.push(this.createUpdate(name, name, current, latest));
        }
      }
    }

    return updates;
  }

  async updatePackage(packageId: string): Promise<boolean> {
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
