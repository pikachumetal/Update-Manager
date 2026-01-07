import { describe, expect, test } from "bun:test";
import {
  parseWingetOutput,
  parseProtoOutput,
  parseNpmJsonOutput,
  parsePsModulesOutput,
  isNewerVersion,
} from "./parsers";

describe("parseWingetOutput", () => {
  test("parses standard winget upgrade output", () => {
    const output = `Name                                      Id                                   Version       Available     Source
--------------------------------------------------------------------------------------------------------------
Visual Studio Code                        Microsoft.VisualStudioCode           1.85.0        1.86.0        winget
Node.js                                   OpenJS.NodeJS                        20.10.0       20.11.0       winget

2 upgrade(s) available.`;

    const result = parseWingetOutput(output);

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      id: "Microsoft.VisualStudioCode",
      name: "Visual Studio Code",
      currentVersion: "1.85.0",
      newVersion: "1.86.0",
      status: "available",
      source: "winget",
      notes: undefined,
    });
    expect(result[1]).toEqual({
      id: "OpenJS.NodeJS",
      name: "Node.js",
      currentVersion: "20.10.0",
      newVersion: "20.11.0",
      status: "available",
      source: "winget",
      notes: undefined,
    });
  });

  test("detects unknown versions", () => {
    const output = `Name                                      Id                                   Version       Available     Source
--------------------------------------------------------------------------------------------------------------
Some Package                              Vendor.Package                       Unknown       2.0.0         winget

1 upgrade(s) available.`;

    const result = parseWingetOutput(output);

    expect(result).toHaveLength(1);
    expect(result[0].status).toBe("unknown");
    expect(result[0].currentVersion).toBe("Unknown");
    expect(result[0].notes).toBe("Current version unknown");
  });

  test("returns empty array for no updates", () => {
    const output = `No applicable upgrade found.`;

    const result = parseWingetOutput(output);
    expect(result).toHaveLength(0);
  });

  test("handles output without source column", () => {
    const output = `Name                        Id                          Version    Available
---------------------------------------------------------------------------------
Git                         Git.Git                     2.43.0     2.44.0

1 upgrade(s) available.`;

    const result = parseWingetOutput(output);

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("Git.Git");
    expect(result[0].source).toBeUndefined();
  });
});

describe("parseProtoOutput", () => {
  test("parses proto outdated output", () => {
    const output = `node 20.10.0 -> 20.11.0
bun 1.0.20 -> 1.0.25`;

    const result = parseProtoOutput(output);

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      id: "node",
      name: "node",
      currentVersion: "20.10.0",
      newVersion: "20.11.0",
      status: "available",
    });
    expect(result[1]).toEqual({
      id: "bun",
      name: "bun",
      currentVersion: "1.0.20",
      newVersion: "1.0.25",
      status: "available",
    });
  });

  test("returns empty array for no updates", () => {
    const output = ``;
    const result = parseProtoOutput(output);
    expect(result).toHaveLength(0);
  });

  test("ignores invalid lines", () => {
    const output = `Some random text
node 20.10.0 -> 20.11.0
Another invalid line`;

    const result = parseProtoOutput(output);
    expect(result).toHaveLength(1);
  });
});

describe("parseNpmJsonOutput", () => {
  test("parses npm outdated JSON output", () => {
    const output = JSON.stringify({
      typescript: { current: "5.2.0", latest: "5.3.0" },
      eslint: { current: "8.50.0", latest: "8.56.0" },
    });

    const result = parseNpmJsonOutput(output, "npm");

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      id: "typescript",
      name: "typescript",
      currentVersion: "5.2.0",
      newVersion: "5.3.0",
      status: "available",
    });
  });

  test("skips packages with same version", () => {
    const output = JSON.stringify({
      lodash: { current: "4.17.21", latest: "4.17.21" },
      axios: { current: "1.5.0", latest: "1.6.0" },
    });

    const result = parseNpmJsonOutput(output, "npm");

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("axios");
  });

  test("handles invalid JSON gracefully", () => {
    const output = "not valid json";
    const result = parseNpmJsonOutput(output, "npm");
    expect(result).toHaveLength(0);
  });

  test("handles empty JSON object", () => {
    const output = "{}";
    const result = parseNpmJsonOutput(output, "npm");
    expect(result).toHaveLength(0);
  });
});

describe("parsePsModulesOutput", () => {
  test("parses pipe-separated PowerShell output", () => {
    const output = `PSReadLine|2.3.4|2.4.0
Az|10.0.0|11.0.0`;

    const result = parsePsModulesOutput(output);

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      id: "PSReadLine",
      name: "PSReadLine",
      currentVersion: "2.3.4",
      newVersion: "2.4.0",
      status: "available",
    });
  });

  test("handles empty output", () => {
    const result = parsePsModulesOutput("");
    expect(result).toHaveLength(0);
  });

  test("skips malformed lines", () => {
    const output = `ValidModule|1.0|2.0
Invalid line without pipes
Another|module`;

    const result = parsePsModulesOutput(output);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("ValidModule");
  });
});

describe("isNewerVersion", () => {
  test("compares simple versions", () => {
    expect(isNewerVersion("1.0.0", "2.0.0")).toBe(true);
    expect(isNewerVersion("2.0.0", "1.0.0")).toBe(false);
    expect(isNewerVersion("1.0.0", "1.0.0")).toBe(false);
  });

  test("compares patch versions", () => {
    expect(isNewerVersion("1.0.0", "1.0.1")).toBe(true);
    expect(isNewerVersion("1.0.1", "1.0.0")).toBe(false);
  });

  test("compares minor versions", () => {
    expect(isNewerVersion("1.0.0", "1.1.0")).toBe(true);
    expect(isNewerVersion("1.1.0", "1.0.0")).toBe(false);
  });

  test("handles prerelease versions", () => {
    // Release is newer than prerelease of same base version
    expect(isNewerVersion("2.4.0-beta0", "2.4.0")).toBe(true);
    expect(isNewerVersion("2.4.0", "2.4.0-beta0")).toBe(false);

    // Higher base version is always newer
    expect(isNewerVersion("2.4.0-beta0", "2.5.0")).toBe(true);
    expect(isNewerVersion("2.4.0-beta0", "2.4.5")).toBe(true);
  });

  test("handles versions with different segment counts", () => {
    expect(isNewerVersion("1.0", "1.0.1")).toBe(true);
    expect(isNewerVersion("1.0.0.0", "1.0.0.1")).toBe(true);
  });

  test("handles non-numeric versions gracefully", () => {
    // When current is "unknown", we assume new version is newer (want to update)
    // String comparison: "1.0.0" > "unknown" is false, "unknown" < "1.0.0" depends on ASCII
    // In practice, unknown versions should trigger update
    expect(isNewerVersion("unknown", "1.0.0")).toBe(true);
    expect(isNewerVersion("1.0.0", "unknown")).toBe(false);
  });
});
