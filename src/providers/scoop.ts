import { BaseProvider } from "./base";
import type { PackageUpdate } from "../types";
import { commandExists, runCommand } from "../runner";

export class ScoopProvider extends BaseProvider {
  id = "scoop";
  name = "Scoop";
  icon = "🥄";

  async isAvailable(): Promise<boolean> {
    return commandExists("scoop");
  }

  async checkUpdates(): Promise<PackageUpdate[]> {
    // First update scoop itself and buckets
    await runCommand(["scoop", "update"], { timeout: 60000 });

    const result = await runCommand(["scoop", "status"], { timeout: 60000 });

    if (!result.success && !result.stdout) {
      return [];
    }

    return this.parseScoopOutput(result.stdout);
  }

  private parseScoopOutput(output: string): PackageUpdate[] {
    const updates: PackageUpdate[] = [];
    const lines = output.split("\n");

    let inUpdatesSection = false;

    for (const line of lines) {
      // Skip header lines
      if (line.includes("Name") && line.includes("Installed Version")) {
        inUpdatesSection = true;
        continue;
      }

      if (line.startsWith("---") || !line.trim()) {
        continue;
      }

      if (inUpdatesSection) {
        // Format: Name    Installed Version    Latest Version    Info
        const parts = line.split(/\s{2,}/).filter(Boolean);
        if (parts.length >= 3) {
          const [name, current, latest] = parts;
          if (current !== latest) {
            updates.push(this.createUpdate(name, name, current, latest));
          }
        }
      }
    }

    return updates;
  }

  async updatePackage(packageId: string, _options?: unknown): Promise<boolean> {
    const result = await runCommand(["scoop", "update", packageId], {
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
    const result = await runCommand(["scoop", "update", "*"], {
      timeout: 300000,
    });

    return {
      success: result.success,
      updated: result.success ? ["all"] : [],
      failed: result.success ? [] : ["all"],
      skipped: [],
    };
  }
}
