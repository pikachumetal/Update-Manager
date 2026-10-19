import { describe, expect, test } from "bun:test";
import { Writable } from "node:stream";
import { stripVTControlCharacters } from "node:util";
import type { ReactElement } from "react";
import { render, renderToString } from "ink";
import type { CheckResult, PackageUpdate } from "../types";
import { Intro } from "./frame";
import { CheckApp, CheckError, CheckReport } from "./CheckApp";

const lines = (node: ReactElement) =>
  stripVTControlCharacters(renderToString(node))
    .split("\n")
    .map((l) => l.trimEnd());

const railway: PackageUpdate = {
  id: "@railway/cli",
  name: "@railway/cli",
  currentVersion: "5.63.4",
  newVersion: "5.64.0",
  provider: "bun",
  status: "available",
};

const upToDate = ["proto", "moonrepo", "psmodules", "npm", "pnpm", "claude"];

const withIntro = (doneMessage: string, result: CheckResult) => (
  <>
    <Intro title="Checking for updates" />
    <CheckReport doneMessage={doneMessage} result={result} />
  </>
);

class MemoryStream extends Writable {
  data = "";
  columns = 80;
  _write(chunk: Buffer, _encoding: string, callback: () => void) {
    this.data += chunk.toString();
    callback();
  }
}

describe("CheckReport", () => {
  test("groups updates by provider", () => {
    const result = { updates: [railway], checkedProviders: ["bun", ...upToDate], failures: [] };
    expect(lines(withIntro("Found 1 update(s)", result))).toEqual([
      "┌   Checking for updates",
      "│",
      "◇  Found 1 update(s)",
      "",
      "🥟 Bun (global)",
      "   • @railway/cli 5.63.4 → 5.64.0",
      "🔧 Proto ✓",
      "🌙 Moonrepo ✓",
      "💠 PowerShell Modules ✓",
      "📦 npm (global) ✓",
      "📦 pnpm (global) ✓",
      "🤖 Claude CLI ✓",
      "",
      "│",
      "●  Summary: 1 available",
      "│",
      "└  Done",
    ]);
  });

  test("marks pinned and unknown and sums them up", () => {
    const pkg = (id: string, provider: string, status: PackageUpdate["status"]) => ({
      ...railway,
      id,
      name: id,
      provider,
      status,
    });
    const result = {
      updates: [
        pkg("a", "winget", "available"),
        pkg("b", "winget", "pinned"),
        pkg("c", "npm", "unknown"),
      ],
      checkedProviders: ["winget", "npm"],
      failures: [],
    };
    const output = lines(withIntro("Found 3 update(s)", result));
    expect(output.find((l) => l.includes(" b "))).toEndWith("📌 pinned");
    expect(output.find((l) => l.includes(" c "))).toEndWith("❓ unknown");
    expect(output).toContain("●  Summary: 1 available | 1 pinned | 1 unknown");
  });

  test("says everything is up to date", () => {
    const output = lines(
      withIntro("Found 0 update(s)", { updates: [], checkedProviders: upToDate, failures: [] })
    );
    expect(output).toContain("◇  Found 0 update(s)");
    expect(output).toContain("🔧 Proto ✓");
    expect(output).toContain("◆  Everything is up to date!");
    expect(output.some((l) => l.startsWith("●  Summary"))).toBe(false);
    expect(output.at(-1)).toBe("└  Done");
  });

  test("checks a single provider", () => {
    const result = { updates: [railway], checkedProviders: ["bun"], failures: [] };
    expect(lines(withIntro("Bun (global): 1 update(s)", result))).toEqual([
      "┌   Checking for updates",
      "│",
      "◇  Bun (global): 1 update(s)",
      "",
      "🥟 Bun (global)",
      "   • @railway/cli 5.63.4 → 5.64.0",
      "",
      "│",
      "●  Summary: 1 available",
      "│",
      "└  Done",
    ]);
  });

  test("lists a failed provider as checked", () => {
    const result = {
      updates: [railway],
      checkedProviders: ["bun", "pnpm"],
      failures: [{ providerName: "pnpm (global)", message: "boom" }],
    };
    const output = lines(withIntro("Found 1 update(s)", result));
    expect(output).toContain("📦 pnpm (global) ✓");
    expect(output).toContain("   • @railway/cli 5.63.4 → 5.64.0");
    expect(output.some((l) => l.includes("boom"))).toBe(false);
  });

  test("keeps long package lines whole when wrapped", () => {
    const longName = "@a-very-long-scope/with-a-long-package-name";
    const output = renderToString(
      <CheckReport
        doneMessage="Found 1 update(s)"
        result={{
          updates: [{ ...railway, name: longName }],
          checkedProviders: ["bun"],
          failures: [],
        }}
      />,
      { columns: 40 }
    );
    expect(stripVTControlCharacters(output).replace(/\s/g, "")).toContain(
      `${longName}5.63.4→5.64.0`
    );
  });
});

describe("CheckError", () => {
  test("reports an unknown provider", () => {
    const output = lines(<CheckError message={'Provider "foo" not found'} />);
    expect(output).toEqual(["┌   Checking for updates", "│", '■  Provider "foo" not found']);
    expect(output.some((l) => l.includes("└"))).toBe(false);
  });
});

describe("CheckApp", () => {
  test("writes one warning per failure", async () => {
    const stdout = new MemoryStream();
    const stderr = new MemoryStream();
    const result: CheckResult = {
      updates: [railway],
      checkedProviders: ["bun", "pnpm", "npm"],
      failures: [
        { providerName: "pnpm (global)", message: "boom" },
        { providerName: "npm (global)", message: "bang" },
      ],
    };
    const app = render(
      <CheckApp
        spinnerLabel="Checking for updates..."
        load={async () => result}
        doneMessage={() => "Found 1 update(s)"}
      />,
      {
        stdout: stdout as unknown as NodeJS.WriteStream,
        stderr: stderr as unknown as NodeJS.WriteStream,
        interactive: false,
      }
    );
    await app.waitUntilExit();
    expect(stderr.data).toBe("  ⚠ pnpm (global): boom\n  ⚠ npm (global): bang\n");
  });
});
