import { BaseProvider } from "./base";
import type { PackageUpdate } from "../types";
import { commandExists, runCommand } from "../runner";
import { isNewerVersion } from "./parsers";

const NPM_REGISTRY_URL = "https://registry.npmjs.org/@anthropic-ai/claude-code";

export class ClaudeProvider extends BaseProvider {
  id = "claude";
  name = "Claude CLI";
  icon = "🤖";

  async isAvailable(): Promise<boolean> {
    return commandExists("claude");
  }

  async checkUpdates(): Promise<PackageUpdate[]> {
    const currentVersion = await this.getCurrentVersion();
    if (!currentVersion) {
      return [];
    }

    const latestVersion = await this.getLatestVersion();
    if (!latestVersion) {
      return [];
    }

    if (isNewerVersion(currentVersion, latestVersion)) {
      return [
        this.createUpdate("claude", "Claude CLI", currentVersion, latestVersion),
      ];
    }

    return [];
  }

  private async getCurrentVersion(): Promise<string | null> {
    const versionResult = await runCommand(["claude", "--version"], { timeout: 10000 });

    if (!versionResult.success) {
      return null;
    }

    const match = versionResult.stdout.match(/(\d+\.\d+\.\d+)/);
    return match ? match[1] : null;
  }

  private async getLatestVersion(): Promise<string | null> {
    try {
      const response = await fetch(NPM_REGISTRY_URL);
      if (!response.ok) {
        return null;
      }
      const data = await response.json() as { "dist-tags"?: { latest?: string } };
      return data["dist-tags"]?.latest ?? null;
    } catch {
      return null;
    }
  }

  async updatePackage(_packageId: string, _options?: unknown): Promise<boolean> {
    // `claude update` checks and updates if available
    const result = await runCommand(["claude", "update"], { timeout: 120000 });
    return result.success;
  }

  async updateAll(): Promise<{
    success: boolean;
    updated: string[];
    failed: string[];
    skipped: string[];
  }> {
    const beforeVersion = await this.getCurrentVersion();
    const success = await this.updatePackage("claude");
    const afterVersion = await this.getCurrentVersion();

    // Check if version actually changed
    const wasUpdated = success && beforeVersion !== afterVersion;

    return {
      success,
      updated: wasUpdated ? ["claude"] : [],
      failed: success ? [] : ["claude"],
      skipped: success && !wasUpdated ? ["claude (already up to date)"] : [],
    };
  }
}
