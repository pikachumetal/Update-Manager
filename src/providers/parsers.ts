/**
 * Parser functions for provider outputs.
 * Extracted from providers to enable unit testing.
 */

import type { PackageStatus } from "../types";

export interface ParsedPackage {
  id: string;
  name: string;
  currentVersion: string;
  newVersion: string;
  status: PackageStatus;
  source?: string;
  notes?: string;
}

/**
 * Parse WinGet upgrade output
 */
export function parseWingetOutput(output: string): ParsedPackage[] {
  const updates: ParsedPackage[] = [];
  const lines = output.split("\n");

  // Detect pinned packages from messages
  const hasPinnedMessage =
    output.includes("pin that needs to be removed") ||
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
    if (
      !line.trim() ||
      line.includes("upgrade(s) available") ||
      line.includes("upgrades available") ||
      line.includes("package(s) have")
    ) {
      continue;
    }

    // Extract columns based on positions
    const name = line.substring(nameCol, idCol).trim();
    const id = line.substring(idCol, versionCol).trim();
    const currentVersion = line.substring(versionCol, availableCol).trim();
    const newVersion =
      sourceCol > 0
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

    // Check if package is pinned
    if (hasPinnedMessage && i < dataStart + 5) {
      status = "pinned";
      notes = "Package is pinned";
    }

    if (currentVersion !== newVersion) {
      updates.push({
        id,
        name: name || id,
        currentVersion: currentVersion || "unknown",
        newVersion,
        status,
        source,
        notes,
      });
    }
  }

  return updates;
}

/**
 * Parse Proto outdated output
 * Format: "tool - current -> latest" or "tool current → latest"
 */
export function parseProtoOutput(output: string): ParsedPackage[] {
  const updates: ParsedPackage[] = [];
  const lines = output.split("\n").filter((l) => l.trim());

  for (const line of lines) {
    // Format: "tool - current -> latest" or similar variations
    const match = line.match(/^(\w+)\s*[-–]?\s*([\d.]+)\s*(?:->|→)\s*([\d.]+)/);
    if (match) {
      const [, tool, current, latest] = match;
      updates.push({
        id: tool,
        name: tool,
        currentVersion: current,
        newVersion: latest,
        status: "available",
      });
    }
  }

  return updates;
}

/**
 * Parse npm/pnpm outdated JSON output
 */
export function parseNpmJsonOutput(
  output: string,
  provider: string
): ParsedPackage[] {
  const updates: ParsedPackage[] = [];

  try {
    const data = JSON.parse(output);
    for (const [name, info] of Object.entries(data)) {
      const pkg = info as { current?: string; latest?: string };
      if (pkg.current && pkg.latest && pkg.current !== pkg.latest) {
        updates.push({
          id: name,
          name,
          currentVersion: pkg.current,
          newVersion: pkg.latest,
          status: "available",
        });
      }
    }
  } catch {
    // JSON parse failed, return empty
  }

  return updates;
}

/**
 * Parse pnpm table output (fallback when JSON fails)
 */
export function parsePnpmTableOutput(output: string): ParsedPackage[] {
  const updates: ParsedPackage[] = [];
  const lines = output.split("\n");

  for (const line of lines) {
    // Skip header and separator lines
    if (!line.trim() || line.includes("Package") || line.startsWith("─")) {
      continue;
    }

    const parts = line.split(/\s+/).filter(Boolean);
    if (parts.length >= 3) {
      const [name, current, , latest] = parts;
      if (current !== latest && latest) {
        updates.push({
          id: name,
          name,
          currentVersion: current,
          newVersion: latest,
          status: "available",
        });
      }
    }
  }

  return updates;
}

/**
 * Parse PowerShell module output (pipe-separated)
 */
export function parsePsModulesOutput(output: string): ParsedPackage[] {
  const updates: ParsedPackage[] = [];
  const lines = output.split("\n").filter((l) => l.trim());

  for (const line of lines) {
    const [name, current, latest] = line.split("|").map((s) => s.trim());
    if (name && current && latest) {
      updates.push({
        id: name,
        name,
        currentVersion: current,
        newVersion: latest,
        status: "available",
      });
    }
  }

  return updates;
}

/**
 * Compare versions, handling prerelease suffixes
 * Returns true if newVersion > currentVersion
 */
export function isNewerVersion(
  currentVersion: string,
  newVersion: string
): boolean {
  // Strip prerelease suffix for comparison
  const cleanCurrent = currentVersion.replace(/-.*$/, "");
  const cleanNew = newVersion.replace(/-.*$/, "");

  try {
    const currentParts = cleanCurrent.split(".").map(Number);
    const newParts = cleanNew.split(".").map(Number);

    for (let i = 0; i < Math.max(currentParts.length, newParts.length); i++) {
      const curr = currentParts[i] || 0;
      const next = newParts[i] || 0;

      if (next > curr) return true;
      if (next < curr) return false;
    }

    // If base versions are equal, check prerelease
    // A release version (no suffix) is newer than prerelease
    const currentIsPrerelease = currentVersion.includes("-");
    const newIsPrerelease = newVersion.includes("-");

    if (currentIsPrerelease && !newIsPrerelease) return true;
    if (!currentIsPrerelease && newIsPrerelease) return false;

    return false;
  } catch {
    // Fallback to string comparison
    return newVersion > currentVersion;
  }
}
