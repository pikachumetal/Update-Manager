import { describe, expect, test } from "bun:test";
import type { PackageUpdate } from "../types";
import { MultiSelect } from "./MultiSelect";
import { mountWithKeys } from "./testStdin";

const pkg = (
  name: string,
  provider: string,
  currentVersion: string,
  newVersion: string,
  status: PackageUpdate["status"] = "available"
): PackageUpdate => ({ id: name, name, provider, currentVersion, newVersion, status });

const git = pkg("Git.Git", "winget", "2.50.0", "2.51.0");
const toys = pkg("Microsoft.PowerToys", "winget", "0.94.0", "0.95.0");
const typescript = pkg("typescript", "npm", "6.0.2", "6.0.3");
const three = [git, toys, typescript];

const MESSAGE = "Select packages to update (space to toggle, enter to confirm)";
const DOWN = "\u001B[B";
const UP = "\u001B[A";

const select = (updates: PackageUpdate[]) => {
  const submitted: PackageUpdate[][] = [];
  const node = (
    <MultiSelect
      message={MESSAGE}
      updates={updates}
      onSubmit={(selected) => submitted.push(selected)}
    />
  );
  return { node, submitted };
};

describe("MultiSelect", () => {
  test("groups by provider with everything checked", async () => {
    const { app, last } = await mountWithKeys(select(three).node);
    expect(last()).toEqual([
      "│",
      `◆  ${MESSAGE}`,
      "│  📦 WinGet",
      "│    ◼ Git.Git 2.50.0 → 2.51.0",
      "│    ◼ Microsoft.PowerToys 0.94.0 → 0.95.0",
      "│  📦 npm (global)",
      "│    ◼ typescript 6.0.2 → 6.0.3",
      "└",
    ]);
    app.unmount();
  });

  test("submits all three on Enter", async () => {
    const { node, submitted } = select(three);
    const { app, press } = await mountWithKeys(node);
    await press("\r");
    expect(submitted).toEqual([three]);
    app.unmount();
  });

  test("unchecks the row under the cursor", async () => {
    const { node, submitted } = select(three);
    const { app, press, last } = await mountWithKeys(node);
    await press(DOWN, " ");
    expect(last()).toContain("│    ◻ Microsoft.PowerToys 0.94.0 → 0.95.0");
    await press("\r");
    expect(submitted).toEqual([[git, typescript]]);
    app.unmount();
  });

  test("toggles all with a", async () => {
    const { app, press, last } = await mountWithKeys(select(three).node);
    const marks = () =>
      last()
        .filter((l) => l.startsWith("│    "))
        .map((l) => l.charAt(5));
    await press("a");
    expect(marks()).toEqual(["◻", "◻", "◻"]);
    await press("a");
    expect(marks()).toEqual(["◼", "◼", "◼"]);
    await press(DOWN, " ", "a");
    expect(marks()).toEqual(["◼", "◼", "◼"]);
    app.unmount();
  });

  test("wraps the cursor around", async () => {
    const { node, submitted } = select(three);
    const { app, press } = await mountWithKeys(node);
    await press(UP, " ", "\r");
    expect(submitted).toEqual([[git, toys]]);
    app.unmount();
  });

  test("toggles only the row under the cursor when ids repeat", async () => {
    const bunTs = { ...typescript, provider: "bun" };
    const { node, submitted } = select([typescript, bunTs]);
    const { app, press } = await mountWithKeys(node);
    await press(" ", "\r");
    expect(submitted).toEqual([[bunTs]]);
    app.unmount();
  });

  test("shows status badges", async () => {
    const { app, last } = await mountWithKeys(
      select([pkg("Foo.Pinned", "winget", "1.0", "2.0", "pinned")]).node
    );
    expect(last().find((l) => l.includes("Foo.Pinned"))).toEndWith("📌 pinned");
    app.unmount();
  });
});
