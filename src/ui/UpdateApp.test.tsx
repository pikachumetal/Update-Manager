import { describe, expect, test } from "bun:test";
import { Writable } from "node:stream";
import { render } from "ink";
import type { PackageUpdate } from "../types";
import { UpdateApp, type UpdateViewOptions } from "./UpdateApp";
import { createTestStdin, mountWithKeys, tick } from "./testStdin";

const pkg = (
  name: string,
  provider: string,
  from: string,
  to: string,
  status: PackageUpdate["status"] = "available"
): PackageUpdate => ({ id: name, name, provider, currentVersion: from, newVersion: to, status });

const railway = pkg("@railway/cli", "bun", "5.63.4", "5.64.0");
const git = pkg("Git.Git", "winget", "2.50.0", "2.51.0");
const toys = pkg("Microsoft.PowerToys", "winget", "0.94.0", "0.95.0");
const pinned = pkg("Foo.Pinned", "winget", "1.0", "2.0", "pinned");
const leftPad = pkg("left-pad", "npm", "1.0.0", "1.1.0", "unknown");

const ENTER = "\r";
const RIGHT = "\u001B[C";

function setup(updates: PackageUpdate[], overrides: Partial<UpdateViewOptions> = {}) {
  const calls: { id: string; force: boolean }[] = [];
  const spies = { installGsudo: 0, hasGsudo: 0, cancel: 0 };
  const options: UpdateViewOptions = {
    spinnerLabel: "Checking for updates...",
    load: async () => ({
      updates,
      checkedProviders: [...new Set(updates.map((u) => u.provider))],
      failures: [],
    }),
    interactive: true,
    skipSelection: false,
    hasGsudo: async () => {
      spies.hasGsudo++;
      return true;
    },
    installGsudo: async () => {
      spies.installGsudo++;
      return true;
    },
    updatePackage: async (update, force) => {
      calls.push({ id: update.id, force });
      return true;
    },
    ...overrides,
  };
  return { options, calls, spies };
}

async function start(options: UpdateViewOptions, spies: { cancel: number }) {
  const mounted = await mountWithKeys(<UpdateApp {...options} onCancel={() => spies.cancel++} />, {
    exitOnCtrlC: false,
  });
  const settle = () => new Promise((resolve) => setTimeout(resolve, 250));
  await settle();
  // ink tarda en suscribir el useInput de un prompt montado tras una tecla: sin esta pausa, la siguiente se pierde
  const press = async (...keys: string[]) => {
    for (const key of keys) {
      await mounted.press(key);
      await settle();
    }
  };
  return { ...mounted, press };
}

const indexOf = (lines: string[], text: string) => lines.findIndex((l) => l.includes(text));

describe("UpdateApp", () => {
  test("lists the updates before selecting", async () => {
    const { options, spies } = setup([railway]);
    const { app, last } = await start(options, spies);
    const output = last();
    const order = [
      "◇  Found 1 update(s)",
      "🥟 Bun (global)",
      "   • @railway/cli 5.63.4 → 5.64.0",
      "●  Summary: 1 available",
      "◆  Select packages to update (space to toggle, enter to confirm)",
    ].map((text) => indexOf(output, text));
    expect(order.every((index) => index >= 0)).toBe(true);
    expect(order).toEqual([...order].sort((a, b) => a - b));
    app.unmount();
  });

  test("ends with Done when there are no updates", async () => {
    const { options, spies } = setup([]);
    const { app, last } = await start(options, spies);
    expect(last().slice(-3)).toEqual(["◇  Found 0 update(s)", "│", "└  Done"]);
    expect(indexOf(last(), "◆  Select")).toBe(-1);
    app.unmount();
  });

  test("updates the selection in order", async () => {
    const { options, spies, calls } = setup([git, toys]);
    const { app, press, last } = await start(options, spies);
    await press(ENTER);
    await tick();
    expect(calls).toEqual([
      { id: "Git.Git", force: false },
      { id: "Microsoft.PowerToys", force: false },
    ]);
    const output = last();
    for (const line of [
      "◇  Select packages to update",
      "│  Git.Git, Microsoft.PowerToys",
      "◇  Updating 2 package(s)...",
      "│  ✓ Git.Git 2.50.0 → 2.51.0",
      "●  Result: ✓ 2 updated",
    ]) {
      expect(output).toContain(line);
    }
    expect(output.at(-1)).toBe("└  Done");
    app.unmount();
  });

  test("shows one updating row at a time", async () => {
    let release = () => {};
    const { options, spies, calls } = setup([git, toys], {
      updatePackage: (update) => {
        calls.push({ id: update.id, force: false });
        return new Promise((resolve) => (release = () => resolve(true)));
      },
    });
    const { app, press, last } = await start(options, spies);
    await press(ENTER);
    expect(last().some((l) => /^│  [◒◐◓◑] Git\.Git 2\.50\.0 → 2\.51\.0 updating$/.test(l))).toBe(
      true
    );
    expect(last()).toContain("│  … Microsoft.PowerToys 0.94.0 → 0.95.0 queued");
    expect(calls.map((c) => c.id)).toEqual(["Git.Git"]);
    release();
    app.unmount();
  });

  test("cancels on empty selection", async () => {
    const { options, spies, calls } = setup([git, toys]);
    const { app, press, last } = await start(options, spies);
    await press("a", ENTER);
    expect(last()).toContain("●  Update cancelled");
    expect(last().at(-1)).toBe("└  Cancelled");
    expect(calls).toEqual([]);
    app.unmount();
  });

  test("marks a failed update and goes on", async () => {
    const { options, spies, calls } = setup([git, toys], {
      updatePackage: async (update) => {
        calls.push({ id: update.id, force: false });
        return update !== git;
      },
    });
    const { app, press, last } = await start(options, spies);
    await press(ENTER);
    await tick();
    expect(last()).toContain("│  ✗ Git.Git failed");
    expect(calls.map((c) => c.id)).toEqual(["Git.Git", "Microsoft.PowerToys"]);
    expect(last()).toContain("●  Result: ✓ 1 updated | ✗ 1 failed");
    app.unmount();
  });

  test("marks a throwing update as failed and goes on", async () => {
    const { options, spies, calls } = setup([git, toys], {
      updatePackage: async (update) => {
        calls.push({ id: update.id, force: false });
        if (update === git) throw new Error("timeout");
        return true;
      },
    });
    const { app, press, last } = await start(options, spies);
    await press(ENTER);
    await tick();
    expect(last()).toContain("│  ✗ Git.Git timeout");
    expect(calls.map((c) => c.id)).toEqual(["Git.Git", "Microsoft.PowerToys"]);
    app.unmount();
  });

  test("reports Unknown error for non-Error throws", async () => {
    const { options, spies } = setup([git], {
      updatePackage: async () => {
        throw "boom";
      },
    });
    const { app, press, last } = await start(options, spies);
    await press(ENTER);
    await tick();
    expect(last()).toContain("│  ✗ Git.Git Unknown error");
    app.unmount();
  });

  test("asks to force WinGet only", async () => {
    let release = () => {};
    const { options, spies, calls } = setup([pinned, leftPad], {
      updatePackage: (update, force) => {
        calls.push({ id: update.id, force });
        return new Promise((resolve) => (release = () => resolve(true)));
      },
    });
    const { app, press, last } = await start(options, spies);
    await press(ENTER);
    for (const line of [
      "▲  Found 2 package(s) that require force:",
      "   • Foo.Pinned (pinned)",
      "   • left-pad (unknown version)",
      "◆  Force update 1 WinGet package(s)?",
    ]) {
      expect(last()).toContain(line);
    }
    await press(ENTER);
    expect(calls).toEqual([{ id: "Foo.Pinned", force: true }]);
    expect(last().some((l) => l.includes("Foo.Pinned 1.0 → 2.0 (force) updating"))).toBe(true);
    release();
    await tick();
    expect(last()).toContain("│  ✓ Foo.Pinned 1.0 → 2.0");
    expect(last()).toContain("●  Result: ✓ 1 updated | ⊘ 1 skipped");
    app.unmount();
  });

  test("skips both when force is declined", async () => {
    const { options, spies, calls } = setup([pinned, leftPad]);
    const { app, press, last } = await start(options, spies);
    await press(ENTER, RIGHT, ENTER);
    expect(calls).toEqual([]);
    expect(last()).toContain("●  No packages to update");
    expect(last().at(-1)).toBe("└  Done");
    app.unmount();
  });

  test("does not ask without WinGet packages", async () => {
    const { options, spies, calls } = setup([leftPad]);
    const { app, press, last } = await start(options, spies);
    await press(ENTER);
    expect(indexOf(last(), "◆  Force")).toBe(-1);
    expect(last()).toContain("●  No packages to update");
    expect(last().at(-1)).toBe("└  Done");
    expect(calls).toEqual([]);
    app.unmount();
  });

  test("offers gsudo before forcing", async () => {
    const yes = setup([pinned], { hasGsudo: async () => false });
    const first = await start(yes.options, yes.spies);
    await first.press(ENTER);
    expect(first.last()).toContain("◆  gsudo not found. Install it for admin elevation?");
    await first.press(ENTER);
    expect(yes.spies.installGsudo).toBe(1);
    expect(first.last()).toContain("◇  gsudo installed");
    expect(first.last()).toContain("◆  Force update 1 WinGet package(s)?");
    first.app.unmount();

    const no = setup([pinned], { hasGsudo: async () => false });
    const second = await start(no.options, no.spies);
    await second.press(ENTER, RIGHT, ENTER);
    expect(no.spies.installGsudo).toBe(0);
    expect(second.last()).toContain("◆  Force update 1 WinGet package(s)?");
    second.app.unmount();
  }, 15000);

  test("never asks without a terminal", async () => {
    const { options, spies, calls } = setup([pinned, railway], {
      interactive: false,
      skipSelection: true,
    });
    const { app, last } = await start(options, spies);
    await tick();
    expect(last().some((l) => l.startsWith("◆"))).toBe(false);
    expect(spies.hasGsudo).toBe(0);
    expect(calls).toEqual([{ id: "@railway/cli", force: false }]);
    expect(last()).toContain("●  Result: ✓ 1 updated | ⊘ 1 skipped");
    app.unmount();
  });

  test("skips selection with --yes", async () => {
    const { options, spies, calls } = setup([git], { skipSelection: true });
    const { app, last } = await start(options, spies);
    await tick();
    expect(indexOf(last(), "◆  Select")).toBe(-1);
    expect(calls).toEqual([{ id: "Git.Git", force: false }]);
    app.unmount();
  });

  test("writes finished blocks once while the spinner repaints", async () => {
    let release = () => {};
    const { options, spies } = setup([git], {
      interactive: false,
      skipSelection: true,
      updatePackage: () => new Promise((resolve) => (release = () => resolve(true))),
    });
    let written = "";
    const stdout = new Writable({
      write: (chunk, _encoding, callback) => {
        written += chunk.toString();
        callback();
      },
    });
    Object.assign(stdout, { columns: 80, rows: 10, isTTY: true });
    const app = render(<UpdateApp {...options} onCancel={() => spies.cancel++} />, {
      stdout: stdout as unknown as NodeJS.WriteStream,
      stdin: createTestStdin(),
      patchConsole: false,
      interactive: true,
      exitOnCtrlC: false,
    });
    await new Promise((resolve) => setTimeout(resolve, 500));
    release();
    await app.waitUntilExit();
    expect(written.split("Updating packages").length - 1).toBe(1);
    expect(written.split("Summary: 1 available").length - 1).toBe(1);
  });

  test("writes each block once without a terminal", async () => {
    const { options, spies } = setup([git], { interactive: false, skipSelection: true });
    let written = "";
    const stdout = new Writable({
      write: (chunk, _encoding, callback) => {
        written += chunk.toString();
        callback();
      },
    });
    const app = render(<UpdateApp {...options} onCancel={() => spies.cancel++} />, {
      stdout: stdout as unknown as NodeJS.WriteStream,
      stdin: createTestStdin(),
      patchConsole: false,
      interactive: false,
      exitOnCtrlC: false,
    });
    await app.waitUntilExit();
    expect(written.split("Updating packages").length - 1).toBe(1);
    expect(written.split("✓ Git.Git 2.50.0 → 2.51.0").length - 1).toBe(1);
    expect(written.split("Done").length - 1).toBe(1);
  });

  test("cancels on Ctrl+C", async () => {
    const { options, spies, calls } = setup([git]);
    const { app, press } = await start(options, spies);
    await press("\u0003");
    expect(spies.cancel).toBe(1);
    expect(calls).toEqual([]);
    app.unmount();
  });
});
