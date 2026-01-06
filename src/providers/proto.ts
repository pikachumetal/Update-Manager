import { BaseProvider } from "./base";
import type { PackageUpdate } from "../types";
import { commandExists, runCommand } from "../runner";

export class ProtoProvider extends BaseProvider {
  id = "proto";
  name = "Proto";
  icon = "🔧";

  async isAvailable(): Promise<boolean> {
    return commandExists("proto");
  }

  async checkUpdates(): Promise<PackageUpdate[]> {
    const result = await runCommand(["proto", "outdated"], { timeout: 60000 });

    if (!result.success && !result.stdout) {
      return [];
    }

    return this.parseProtoOutput(result.stdout);
  }

  private parseProtoOutput(output: string): PackageUpdate[] {
    const updates: PackageUpdate[] = [];
    const lines = output.split("\n");

    for (const line of lines) {
      // Format: "tool - current -> latest" or similar
      // Example: "node - 20.0.0 -> 22.0.0"
      const match = line.match(/^(\w+)\s*[-–]\s*([\d.]+)\s*(?:->|→)\s*([\d.]+)/);

      if (match) {
        const [, tool, currentVersion, newVersion] = match;
        updates.push(this.createUpdate(tool, tool, currentVersion, newVersion));
      }
    }

    return updates;
  }

  async updatePackage(packageId: string): Promise<boolean> {
    // Proto uses "proto install <tool>" to update to the pinned/latest version
    const result = await runCommand(["proto", "install", packageId], {
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
    // First get all outdated tools
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
