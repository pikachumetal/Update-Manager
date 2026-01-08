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
 * Handles multiple sections (available updates and pinned packages)
 */
export function parseWingetOutput(output: string): ParsedPackage[] {
  const updates: ParsedPackage[] = [];

  // Clean up control characters and normalize line endings
  const cleanedOutput = output
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n");

  const lines = cleanedOutput.split("\n");

  // Find all sections (each section has a header followed by separator ---)
  const sections: { headerIndex: number; separatorIndex: number; isPinned: boolean }[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    // Look for separator line (at least 10 dashes)
    if (line.match(/^-{10,}$/)) {
      if (i > 0) {
        const headerLine = lines[i - 1];
        // Verify it's a valid header
        if (
          headerLine.includes("Name") &&
          headerLine.includes("Id") &&
          headerLine.includes("Version")
        ) {
          // Check if this section is for pinned packages
          // Look at lines before the header for "pin" message
          let isPinned = false;
          for (let j = Math.max(0, i - 5); j < i - 1; j++) {
            if (lines[j].includes("pin") || lines[j].includes("Pin")) {
              isPinned = true;
              break;
            }
          }
          sections.push({ headerIndex: i - 1, separatorIndex: i, isPinned });
        }
      }
    }
  }

  // Parse each section
  for (let s = 0; s < sections.length; s++) {
    const section = sections[s];
    const headerLine = lines[section.headerIndex];

    // Find column positions from header
    const nameCol = headerLine.indexOf("Name");
    const idCol = headerLine.indexOf("Id");
    const versionCol = headerLine.indexOf("Version");
    const availableCol = headerLine.indexOf("Available");
    const sourceCol = headerLine.indexOf("Source");

    // Data starts after separator
    const dataStart = section.separatorIndex + 1;

    // Data ends at next section's "pin" message, empty line, or summary line
    const nextSectionStart = s + 1 < sections.length ? sections[s + 1].headerIndex - 3 : lines.length;

    for (let i = dataStart; i < nextSectionStart; i++) {
      const line = lines[i];

      // Stop at empty lines, summary lines, or pin messages
      if (
        !line.trim() ||
        line.includes("upgrade(s) available") ||
        line.includes("upgrades available") ||
        line.includes("package(s) have") ||
        line.includes("pin that needs") ||
        line.includes("pins that prevent")
      ) {
        break;
      }

      // Skip separator lines
      if (line.trim().match(/^-+$/)) continue;

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

      // Skip if id looks like header text
      if (id === "Id" || name === "Name") continue;

      // Determine status
      let status: PackageStatus = section.isPinned ? "pinned" : "available";
      let notes: string | undefined = section.isPinned ? "Package is pinned" : undefined;

      // Check for unknown version
      if (currentVersion.toLowerCase() === "unknown" || !currentVersion) {
        status = "unknown";
        notes = "Current version unknown";
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
