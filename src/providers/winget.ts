import { BaseProvider } from "./base";
import type { PackageUpdate, UpdateOptions } from "../types";
import { commandExists, runCommand } from "../runner";
import { parseWingetOutput } from "./parsers";

export class WingetProvider extends BaseProvider {
  id = "winget";
  name = "WinGet";
  icon = "📦";
  requiresAdmin = true;

  private gsudoAvailable: boolean | null = null;

  async isAvailable(): Promise<boolean> {
    return commandExists("winget");
  }

  private async hasGsudo(): Promise<boolean> {
    if (this.gsudoAvailable === null) {
      this.gsudoAvailable = await commandExists("gsudo");
    }
    return this.gsudoAvailable;
  }

  async checkUpdates(): Promise<PackageUpdate[]> {
    const result = await runCommand(
      ["winget", "upgrade", "--include-pinned"],
      { timeout: 120000 }
    );

    if (!result.success && !result.stdout) {
      return [];
    }

    const parsed = parseWingetOutput(result.stdout);
    return parsed.map((pkg) =>
      this.createUpdate(pkg.id, pkg.name, pkg.currentVersion, pkg.newVersion, {
        status: pkg.status,
        source: pkg.source,
        notes: pkg.notes,
      })
    );
  }

  async updatePackage(packageId: string, options?: UpdateOptions): Promise<boolean> {
    const wingetArgs = [
      "winget", "upgrade",
      "--id", packageId,
      "--silent",
      "--accept-package-agreements",
      "--accept-source-agreements"
    ];

    if (options?.force) {
      wingetArgs.push("--force");
    }

    // First try without elevation
    let result = await runCommand(wingetArgs, { timeout: 300000 });

    // If failed and force is enabled, retry with gsudo
    if (!result.success && options?.force && await this.hasGsudo()) {
      result = await runCommand(["gsudo", ...wingetArgs], { timeout: 300000 });
    }

    return result.success;
  }

  async updateAll(): Promise<{
    success: boolean;
    updated: string[];
    failed: string[];
    skipped: string[];
  }> {
    const updates = await this.checkUpdates();
    const pinned = updates.filter(u => u.status === "pinned").map(u => u.id);
    const available = updates.filter(u => u.status === "available");

    if (available.length === 0) {
      return {
        success: true,
        updated: [],
        failed: [],
        skipped: pinned,
      };
    }

    const result = await runCommand(
      [
        "winget", "upgrade", "--all",
        "--silent",
        "--accept-package-agreements",
        "--accept-source-agreements"
      ],
      { timeout: 600000 }
    );

    return {
      success: result.success,
      updated: result.success ? available.map(u => u.id) : [],
      failed: result.success ? [] : available.map(u => u.id),
      skipped: pinned,
    };
  }
}
