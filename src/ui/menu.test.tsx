import { describe, expect, test } from "bun:test";
import { providers } from "../providers";
import { MENU_MESSAGE, MENU_OPTIONS, type ProviderRow, toggleOptions } from "./menu";
import { CheckList } from "./MultiSelect";
import { Select } from "./Select";
import { mountWithKeys } from "./testStdin";

const ROWS: ProviderRow[] = [
  { provider: providers.winget, enabled: true, installed: true },
  { provider: providers.npm, enabled: false, installed: true },
  { provider: providers.chocolatey, enabled: false, installed: false },
];

describe("menu", () => {
  test("draws the main menu", async () => {
    const { app, last } = await mountWithKeys(
      <Select message={MENU_MESSAGE} options={MENU_OPTIONS} onSubmit={() => {}} />
    );
    expect(last()).toEqual([
      "│",
      "◆  What would you like to do?",
      "│  ● 🔍 Check for updates",
      "│  ○ 🔄 Update all",
      "│  ○ 📦 Update by provider",
      "│  ○ ⚙️  Manage providers",
      "│  ○ 🚪 Exit",
      "└",
    ]);
    app.unmount();
  });

  test("labels providers by state", async () => {
    const { app, last } = await mountWithKeys(
      <CheckList message="Toggle" options={toggleOptions(ROWS)} onSubmit={() => {}} />
    );
    expect(last()).toContain("│  ◼ 📦 WinGet (enabled)");
    expect(last()).toContain("│  ◻ 📦 npm (global) (disabled)");
    expect(last()).toContain("│  ◻ 🍫 Chocolatey (not installed)");
    expect(toggleOptions(ROWS)[2].hint).toBe("not available");
    app.unmount();
  });

  test("lists only registered providers", () => {
    expect(toggleOptions(ROWS).map((option) => option.value)).toEqual([
      "winget",
      "npm",
      "chocolatey",
    ]);
  });
});
