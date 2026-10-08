import { describe, expect, test } from "bun:test";
import { stripVTControlCharacters } from "node:util";
import type { ReactElement } from "react";
import { renderToString } from "ink";
import type { PackageUpdate } from "../types";
import { type ProgressRow, UpdateProgress, UpdateResult } from "./UpdateProgress";

const lines = (node: ReactElement) =>
  stripVTControlCharacters(renderToString(node))
    .split("\n")
    .map((l) => l.trimEnd());

const pkg = (name: string, provider: string, from: string, to: string): PackageUpdate => ({
  id: name,
  name,
  provider,
  currentVersion: from,
  newVersion: to,
  status: "available",
});

const git = pkg("Git.Git", "winget", "2.50.0", "2.51.0");
const toys = pkg("Microsoft.PowerToys", "winget", "0.94.0", "0.95.0");

const row = (update: PackageUpdate, state: ProgressRow["state"], extra = {}): ProgressRow => ({
  update,
  force: false,
  state,
  ...extra,
});

describe("UpdateProgress", () => {
  test("shows updating and queued rows", () => {
    expect(lines(<UpdateProgress rows={[row(git, "updating"), row(toys, "queued")]} />)).toEqual([
      "│  📦 WinGet",
      "│  ◒ Git.Git 2.50.0 → 2.51.0 updating",
      "│  … Microsoft.PowerToys 0.94.0 → 0.95.0 queued",
    ]);
  });

  test("shows done and failed rows", () => {
    const output = lines(
      <UpdateProgress rows={[row(git, "done"), row(toys, "failed", { reason: "failed" })]} />
    );
    expect(output).toContain("│  ✓ Git.Git 2.50.0 → 2.51.0");
    expect(output).toContain("│  ✗ Microsoft.PowerToys failed");
  });

  test("labels forced rows", () => {
    expect(lines(<UpdateProgress rows={[row(git, "queued", { force: true })]} />)).toContain(
      "│  … Git.Git 2.50.0 → 2.51.0 (force) queued"
    );
  });

  test("groups rows by provider", () => {
    const typescript = pkg("typescript", "npm", "6.0.2", "6.0.3");
    const output = lines(
      <UpdateProgress rows={[row(git, "queued"), row(typescript, "queued"), row(toys, "queued")]} />
    );
    expect(output.indexOf("│  📦 npm (global)")).toBeGreaterThan(
      output.indexOf("│  … Microsoft.PowerToys 0.94.0 → 0.95.0 queued")
    );
  });
});

describe("UpdateResult", () => {
  test("sums up the result", () => {
    expect(lines(<UpdateResult tally={{ updated: 2, failed: 1, skipped: 1 }} />)).toEqual([
      "│",
      "●  Result: ✓ 2 updated | ✗ 1 failed | ⊘ 1 skipped",
    ]);
  });

  test("omits zero parts", () => {
    expect(lines(<UpdateResult tally={{ updated: 2, failed: 0, skipped: 0 }} />)).toEqual([
      "│",
      "●  Result: ✓ 2 updated",
    ]);
  });
});
