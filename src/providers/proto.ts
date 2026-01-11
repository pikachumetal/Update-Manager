import { BaseProvider } from "./base";
import type { PackageUpdate } from "../types";
import { commandExists, runCommand } from "../runner";
import { parseProtoOutput } from "./parsers";

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

    const parsed = parseProtoOutput(result.stdout);
    return parsed.map((pkg) =>
      this.createUpdate(pkg.id, pkg.name, pkg.currentVersion, pkg.newVersion)
    );
  }

  async updatePackage(packageId: string, _options?: unknown): Promise<boolean> {
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
