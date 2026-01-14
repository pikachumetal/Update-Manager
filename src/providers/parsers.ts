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
  const sections: { headerIndex: number; separatorIndex: number; isPinned: boolean; requiresExplicit: boolean }[] = [];

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
          // Check if this section is for pinned packages or requires explicit targeting
          // Look at lines before the header for context messages
          let isPinned = false;
          let requiresExplicit = false;
          for (let j = Math.max(0, i - 10); j < i; j++) {
            const checkLine = lines[j].toLowerCase();
            if (checkLine.includes("pin that needs") || checkLine.includes("pins that prevent")) {
              isPinned = true;
            }
            if (checkLine.includes("explicit targeting") || checkLine.includes("require explicit")) {
              requiresExplicit = true;
            }
          }
          sections.push({ headerIndex: i - 1, separatorIndex: i, isPinned, requiresExplicit });
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

    // Data ends at next section header or end of output
    const nextSectionHeader = s + 1 < sections.length ? sections[s + 1].headerIndex : lines.length;

    for (let i = dataStart; i < nextSectionHeader; i++) {
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

      // Determine status and notes
      let status: PackageStatus = section.isPinned ? "pinned" : "available";
      let notes: string | undefined;

      if (section.isPinned) {
        notes = "Package is pinned";
      } else if (section.requiresExplicit) {
        notes = "Requires explicit targeting";
      }

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
 * Format is a table with columns: Tool, Current, Newest, Latest, Config
 * Example:
 * │bun         1.3.5       1.3.6       1.3.6       C:\...│
 */
export function parseProtoOutput(output: string): ParsedPackage[] {
  const updates: ParsedPackage[] = [];
  const lines = output.split("\n");

  for (const line of lines) {
    // Remove box drawing characters and clean up
    const cleaned = line.replace(/[│╭╮╰╯─]/g, "").trim();
    if (!cleaned) continue;

    // Skip header line
    if (cleaned.startsWith("Tool") || cleaned.includes("─")) continue;

    // Parse columns: Tool, Current, Newest, Latest, Config
    const parts = cleaned.split(/\s{2,}/).filter(Boolean);
    if (parts.length >= 4) {
      const [tool, current, newest] = parts;

      // Skip if it looks like header or invalid
      if (tool === "Tool" || !current || !newest) continue;

      // Only add if there's actually an update available
      if (current !== newest && newest.match(/^[\d.]+/)) {
        updates.push({
          id: tool,
          name: tool,
          currentVersion: current,
          newVersion: newest,
          status: "available",
        });
      }
    }
  }

  return updates;
}

/**
 * Parse Bun outdated output
 * Format is a table with columns: Package, Current, Update, Latest
 * Example:
 * | @angular/cli | 21.0.6  | 21.1.0 | 21.1.0 |
 */
export function parseBunOutdatedOutput(output: string): ParsedPackage[] {
  const updates: ParsedPackage[] = [];
  const lines = output.split("\n");

  for (const line of lines) {
    // Skip lines that are just separators
    if (line.match(/^[|\-\s]+$/) || line.includes("---")) continue;

    // Skip header line and version line
    if (line.includes("Package") || line.includes("bun outdated")) continue;

    // Parse pipe-separated columns
    const parts = line.split("|").map(s => s.trim()).filter(Boolean);
    if (parts.length >= 3) {
      const [pkg, current, update] = parts;

      // Skip if it looks like header or invalid
      if (!pkg || !current || !update) continue;
      if (pkg === "Package" || current === "Current") continue;

      // Only add if there's actually an update available
      if (current !== update && update.match(/^[\d.]+/)) {
        updates.push({
          id: pkg,
          name: pkg,
          currentVersion: current,
          newVersion: update,
          status: "available",
        });
      }
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
