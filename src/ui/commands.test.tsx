import { describe, expect, spyOn, test } from "bun:test";
import { stripVTControlCharacters } from "node:util";
import type { ReactElement } from "react";
import { renderToString } from "ink";
import { providers } from "../providers";
import {
  ErrorLine,
  Help,
  IgnoredList,
  Notice,
  printErrorLine,
  printNotice,
  ProviderList,
} from "./commands";
import type { ProviderRow } from "./menu";

const lines = (node: ReactElement) =>
  stripVTControlCharacters(renderToString(node))
    .split("\n")
    .map((l) => l.trimEnd());

const ROWS: ProviderRow[] = [
  { provider: providers.winget, enabled: true, installed: true },
  { provider: providers.npm, enabled: false, installed: true },
  { provider: providers.chocolatey, enabled: false, installed: false },
];

describe("commands", () => {
  test("lists providers on the rail", () => {
    expect(lines(<ProviderList rows={ROWS} />)).toEqual([
      "┌   Providers",
      "│",
      "│  📦 WinGet               enabled",
      "│  📦 npm (global)         disabled",
      "│  🍫 Chocolatey           not installed",
      "└",
    ]);
  });

  test("lists ignored packages on the rail", () => {
    expect(lines(<IgnoredList ids={["Smoke.Test"]} />)).toEqual([
      "┌   Ignored packages",
      "│",
      "│  • Smoke.Test",
      "└",
    ]);
  });

  test("says when no package is ignored", () => {
    expect(lines(<IgnoredList ids={[]} />)).toEqual([
      "┌   Ignored packages",
      "│",
      "●  No packages ignored",
    ]);
  });

  test("draws a one-line notice under its title", () => {
    expect(lines(<Notice title="Providers" kind="success" text="chocolatey enabled" />)).toEqual([
      "┌   Providers",
      "│",
      "◆  chocolatey enabled",
    ]);
    expect(lines(<Notice title="Providers" kind="error" text="Unknown action: foo" />)).toEqual([
      "┌   Providers",
      "│",
      "■  Unknown action: foo",
    ]);
  });

  test("draws a usage notice with its example", () => {
    expect(
      lines(
        <Notice
          title="Ignored packages"
          kind="error"
          text="Usage: um ignore <package-id>"
          hint="Example: um ignore Google.GooglePlayGames"
        />
      )
    ).toEqual([
      "┌   Ignored packages",
      "│",
      "■  Usage: um ignore <package-id>",
      "│  Example: um ignore Google.GooglePlayGames",
    ]);
  });

  test("draws the help on the rail", () => {
    expect(lines(<Help version="0.1.0" />)).toEqual([
      "┌   Update Manager v0.1.0",
      "│",
      "│  Usage:",
      "│    um                     Interactive mode",
      "│    um check [provider]    Check for updates",
      "│    um update [provider]   Update packages",
      "│    um providers           Manage providers",
      "│    um ignore <id>         Ignore a package",
      "│    um unignore <id>       Stop ignoring a package",
      "│    um ignored             List ignored packages",
      "│",
      "│  Options:",
      "│    -y, --yes             Skip confirmation",
      "│    -v, --version         Show version",
      "│    -h, --help            Show help",
      "│",
      "│  Examples:",
      "│    um check              Check all providers",
      "│    um check winget       Check only WinGet",
      "│    um update --yes       Update all without confirmation",
      "│    um providers enable chocolatey",
      "│    um ignore Google.GooglePlayGames",
      "└",
    ]);
  });

  test("draws a single error line without rail", () => {
    expect(lines(<ErrorLine text="Interactive terminal required (use --yes)" />)).toEqual([
      "■  Interactive terminal required (use --yes)",
    ]);
    expect(lines(<ErrorLine text={"Error: boom\n    at main"} />)).toEqual([
      "■  Error: boom",
      "    at main",
    ]);
  });

  test("writes long error lines to stderr without wrapping", () => {
    const text = `    at checkUpdates (${"D:\\code\\".repeat(12)}bun.ts:16:15)`;
    const write = spyOn(process.stderr, "write").mockImplementation(() => true);
    printErrorLine(text);
    const written = String(write.mock.calls[0][0]);
    write.mockRestore();
    expect(stripVTControlCharacters(written)).toBe(`■  ${text}\n`);
  });

  test("writes long notices to stdout without wrapping", () => {
    const id = "Very.Long.Package.Identifier".repeat(4);
    const write = spyOn(process.stdout, "write").mockImplementation(() => true);
    printNotice({ title: "Ignored packages", kind: "success", text: `${id} added to ignore list` });
    const written = String(write.mock.calls[0][0]);
    write.mockRestore();
    expect(stripVTControlCharacters(written)).toContain(`◆  ${id} added to ignore list\n`);
  });
});
