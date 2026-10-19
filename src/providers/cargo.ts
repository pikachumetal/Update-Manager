import { BaseProvider } from "./base";
import type { PackageUpdate } from "../types";
import { commandExists, runCommand } from "../runner";
import { parseCargoInstallUpdateOutput } from "./parsers";

export class CargoProvider extends BaseProvider {
  id = "cargo";
  name = "Cargo";
  icon = "🦀";

  async isAvailable(): Promise<boolean> {
    return commandExists("cargo");
  }

  async checkUpdates(): Promise<PackageUpdate[]> {
    if (!(await commandExists("cargo-install-update"))) {
      throw new Error("cargo-update not installed: cargo binstall cargo-update");
    }
    const result = await runCommand(["cargo", "install-update", "-l"], { timeout: 120000 });
    if (!result.success) {
      throw new Error(result.stderr || "cargo install-update failed");
    }
    return parseCargoInstallUpdateOutput(result.stdout).map((pkg) =>
      this.createUpdate(pkg.id, pkg.name, pkg.currentVersion, pkg.newVersion)
    );
  }

  async updatePackage(packageId: string, _options?: unknown): Promise<boolean> {
    // binstall descarga binarios; sin él, cargo install compila
    const result = (await commandExists("cargo-binstall"))
      ? await runCommand(["cargo", "binstall", "-y", packageId], { timeout: 300000 })
      : await runCommand(["cargo", "install", packageId], { timeout: 600000 });
    return result.success;
  }
}
