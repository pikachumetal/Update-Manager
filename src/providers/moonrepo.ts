import { BaseProvider } from "./base";
import type { PackageUpdate } from "../types";
import { commandExists, runCommand } from "../runner";

export class MoonrepoProvider extends BaseProvider {
  id = "moonrepo";
  name = "Moonrepo";
  icon = "🌙";

  async isAvailable(): Promise<boolean> {
    return commandExists("moon");
  }

  async checkUpdates(): Promise<PackageUpdate[]> {
    // Get current version
    const versionResult = await runCommand(["moon", "--version"], { timeout: 10000 });

    if (!versionResult.success) {
      return [];
    }

    const currentVersion = this.parseVersion(versionResult.stdout);

    if (!currentVersion) {
      return [];
    }

    // Check for updates using moon upgrade --check
    const checkResult = await runCommand(["moon", "upgrade", "--check"], { timeout: 30000 });

    // If upgrade --check indicates an update is available
    if (checkResult.stdout.toLowerCase().includes("available") ||
        checkResult.stdout.toLowerCase().includes("new version")) {
      const newVersion = this.extractNewVersion(checkResult.stdout) || "latest";
      return [this.createUpdate("moon", "moon", currentVersion, newVersion)];
    }

    return [];
  }

  private parseVersion(output: string): string | null {
    // Format: "moon x.y.z" or just version number
    const match = output.match(/(\d+\.\d+\.\d+)/);
    return match ? match[1] : null;
  }

  private extractNewVersion(output: string): string | null {
    // Try to extract version from upgrade check output
    const match = output.match(/(\d+\.\d+\.\d+)/g);
    // Usually the last version mentioned is the new one
    return match && match.length > 0 ? match[match.length - 1] : null;
  }

  async updatePackage(_packageId: string): Promise<boolean> {
    const result = await runCommand(["moon", "upgrade"], { timeout: 120000 });
    return result.success;
  }

  async updateAll(): Promise<{
    success: boolean;
    updated: string[];
    failed: string[];
    skipped: string[];
  }> {
    const success = await this.updatePackage("moon");
    return {
      success,
      updated: success ? ["moon"] : [],
      failed: success ? [] : ["moon"],
      skipped: [],
    };
  }
}
