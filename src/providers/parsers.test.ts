import { describe, expect, test } from "bun:test";
import {
  parseWingetOutput,
  parseProtoOutput,
  parseNpmJsonOutput,
  parsePnpmTableOutput,
  parsePsModulesOutput,
  parseCargoInstallUpdateOutput,
  parseRustupCheckOutput,
  parseFirstVersion,
  parseAgyChangelogLatest,
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

describe("parsePnpmTableOutput", () => {
  test("parses pnpm table output", () => {
    const output = `Package     Current   Wanted    Latest
─────────────────────────────────────────
typescript  5.2.0     5.3.0     5.3.0
eslint      8.50.0    8.56.0    8.56.0`;

    const result = parsePnpmTableOutput(output);

    expect(result).toHaveLength(2);
    expect(result[0].id).toBe("typescript");
    expect(result[0].currentVersion).toBe("5.2.0");
    expect(result[0].newVersion).toBe("5.3.0");
  });

  test("skips header and separator lines", () => {
    const output = `Package     Current   Wanted    Latest
─────────────────────────────────────────
lodash      4.17.21   4.17.21   4.17.21`;

    const result = parsePnpmTableOutput(output);
    // lodash has same current and latest, should be skipped
    expect(result).toHaveLength(0);
  });

  test("handles empty output", () => {
    const result = parsePnpmTableOutput("");
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

// Salida real de `cargo install-update -l` (2026-10-19)
const CARGO_UP_TO_DATE = `    Polling registry 'https://index.crates.io/'...

Package         Installed  Latest   Needs update
cargo-binstall  v1.26.0    v1.26.0  No
cargo-update    v22.1.1    v22.1.1  No
mergiraf        v0.20.0    v0.20.0  No

cargo-binstall contains removed executables (cargo-binstall), which will be re-installed on update — you can remove it with cargo uninstall cargo-binstall`;

describe("parseCargoInstallUpdateOutput", () => {
  test("returns nothing when every crate is up to date", () => {
    expect(parseCargoInstallUpdateOutput(CARGO_UP_TO_DATE)).toEqual([]);
  });

  test("lists crates that need an update, without the v", () => {
    const output = CARGO_UP_TO_DATE.replace(
      "mergiraf        v0.20.0    v0.20.0  No",
      "mergiraf        v0.20.0    v0.21.0  Yes"
    );
    expect(parseCargoInstallUpdateOutput(output)).toEqual([
      {
        id: "mergiraf",
        name: "mergiraf",
        currentVersion: "0.20.0",
        newVersion: "0.21.0",
        status: "available",
      },
    ]);
  });
});

// Salida real de `rustup check` (2026-10-19), que sale con código 100
const RUSTUP_CHECK = `stable-x86_64-pc-windows-msvc - update available: 1.98.0 (88d9e12ae 2026-08-18) -> 1.99.1 (58cf8f9c3 2026-10-13)
rustup - up to date : 1.29.1`;

describe("parseRustupCheckOutput", () => {
  test("lists toolchains with an update, without hash or date", () => {
    expect(parseRustupCheckOutput(RUSTUP_CHECK)).toEqual([
      {
        id: "stable-x86_64-pc-windows-msvc",
        name: "stable-x86_64-pc-windows-msvc",
        currentVersion: "1.98.0",
        newVersion: "1.99.1",
        status: "available",
      },
    ]);
  });

  test("lists rustup itself when it has an update", () => {
    const output = RUSTUP_CHECK.replace(
      "rustup - up to date : 1.29.1",
      "rustup - update available : 1.29.1 -> 1.30.0"
    );
    expect(parseRustupCheckOutput(output)[1]).toEqual({
      id: "rustup",
      name: "rustup",
      currentVersion: "1.29.1",
      newVersion: "1.30.0",
      status: "available",
    });
  });

  test("returns nothing without recognizable lines", () => {
    expect(
      parseRustupCheckOutput("stable-x86_64-pc-windows-msvc - up to date : 1.99.1\nerror: network")
    ).toEqual([]);
  });
});

describe("parseFirstVersion", () => {
  // Salidas reales de `--version` (2026-10-20)
  test("reads the version of each agent", () => {
    expect(parseFirstVersion("2.1.304 (Claude Code)")).toBe("2.1.304");
    expect(parseFirstVersion("1.3.5")).toBe("1.3.5");
    expect(parseFirstVersion("codex-cli 0.162.0")).toBe("0.162.0");
  });

  test("returns null without a version", () => {
    expect(parseFirstVersion("command not found")).toBeNull();
  });
});

describe("parseAgyChangelogLatest", () => {
  test("takes the first version heading of agy changelog", () => {
    // Principio real de `agy changelog` (2026-10-20), recortado
    const output = `1.4.3:
· Added \`/\` search to the \`/diff\` file list and file view.
· Fixed the agent failing to create empty files such as __init__.py in 1.4.2.
1.4.2:
· Fixed something.`;
    expect(parseAgyChangelogLatest(output)).toBe("1.4.3");
  });

  test("returns null without a version heading", () => {
    expect(parseAgyChangelogLatest("· no headings here 1.2.3")).toBeNull();
  });
});
