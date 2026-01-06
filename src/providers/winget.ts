import { BaseProvider } from "./base";
import type { PackageUpdate, PackageStatus } from "../types";
import { commandExists, runCommand } from "../runner";

export class WingetProvider extends BaseProvider {
  id = "winget";
  name = "WinGet";
  icon = "📦";
  requiresAdmin = true;

  async isAvailable(): Promise<boolean> {
    return commandExists("winget");
  }

  async checkUpdates(): Promise<PackageUpdate[]> {
    // Use --include-pinned to show all packages including pinned ones
    const result = await runCommand(
      ["winget", "upgrade", "--include-pinned"],
      { timeout: 120000 }
    );

    if (!result.success && !result.stdout) {
      return [];
    }

    return this.parseWingetOutput(result.stdout);
  }

  private parseWingetOutput(output: string): PackageUpdate[] {
    const updates: PackageUpdate[] = [];
    const lines = output.split("\n");

    // Detect pinned packages from messages
    const hasPinnedMessage = output.includes("pin that needs to be removed") ||
                             output.includes("pins that prevent upgrade");

    // Find header line (contains "Name" and "Id" and "Version")
    let headerIndex = -1;
    let headerLine = "";

    for (let i = 0; i < lines.length; i++) {
      if (
        lines[i].includes("Name") &&
        lines[i].includes("Id") &&
        lines[i].includes("Version")
      ) {
        headerIndex = i;
        headerLine = lines[i];
        break;
      }
    }

    if (headerIndex === -1) return updates;

    // Find column positions from header
    const nameCol = headerLine.indexOf("Name");
    const idCol = headerLine.indexOf("Id");
    const versionCol = headerLine.indexOf("Version");
    const availableCol = headerLine.indexOf("Available");
    const sourceCol = headerLine.indexOf("Source");

    // Skip separator line (---)
    const dataStart = headerIndex + 2;

    for (let i = dataStart; i < lines.length; i++) {
      const line = lines[i];

      // Skip empty lines and summary lines
      if (!line.trim() ||
          line.includes("upgrade(s) available") ||
          line.includes("upgrades available") ||
          line.includes("package(s) have")) {
        continue;
      }

      // Extract columns based on positions
      const name = line.substring(nameCol, idCol).trim();
      const id = line.substring(idCol, versionCol).trim();
      const currentVersion = line.substring(versionCol, availableCol).trim();
      const newVersion = sourceCol > 0
        ? line.substring(availableCol, sourceCol).trim()
        : line.substring(availableCol).trim();
      const source = sourceCol > 0 ? line.substring(sourceCol).trim() : undefined;

      if (!id || !newVersion) continue;

      // Determine status
      let status: PackageStatus = "available";
      let notes: string | undefined;

      // Check for unknown version
      if (currentVersion.toLowerCase() === "unknown" || !currentVersion) {
        status = "unknown";
        notes = "Current version unknown";
      }

      // Check if this package is pinned (appears after pinned message and before available message)
      if (hasPinnedMessage && i < dataStart + 5) {
        // Packages listed right after the pinned message are likely pinned
        // This is a heuristic - winget doesn't clearly mark individual pinned packages
        status = "pinned";
        notes = "Package is pinned";
      }

      if (currentVersion !== newVersion) {
        updates.push(
          this.createUpdate(id, name || id, currentVersion || "unknown", newVersion, {
            status,
            source,
            notes,
          })
        );
      }
    }

    return updates;
  }

  async updatePackage(packageId: string): Promise<boolean> {
    const result = await runCommand(
      [
        "winget", "upgrade",
        "--id", packageId,
        "--silent",
        "--accept-package-agreements",
        "--accept-source-agreements"
      ],
      { timeout: 300000 }
    );
    return result.success;
  }

  async updateAll(): Promise<{
    success: boolean;
    updated: string[];
    failed: string[];
    skipped: string[];
  }> {
    // Get updates first to identify pinned packages
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
