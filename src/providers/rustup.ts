import { BaseProvider } from "./base";
import type { PackageUpdate } from "../types";
import { commandExists, runCommand } from "../runner";
import { parseRustupCheckOutput } from "./parsers";

export class RustupProvider extends BaseProvider {
  id = "rustup";
  name = "Rustup";
  icon = "🔧";

  async isAvailable(): Promise<boolean> {
    return commandExists("rustup");
  }

  async checkUpdates(): Promise<PackageUpdate[]> {
    // rustup check sale con 100 cuando hay updates: se lee stdout con cualquier código
    const result = await runCommand(["rustup", "check"], { timeout: 30000 });
    return parseRustupCheckOutput(result.stdout).map((pkg) =>
      this.createUpdate(pkg.id, pkg.name, pkg.currentVersion, pkg.newVersion)
    );
  }

  async updatePackage(packageId: string, _options?: unknown): Promise<boolean> {
    const result =
      packageId === "rustup"
        ? await runCommand(["rustup", "self", "update"])
        : await runCommand(["rustup", "update", packageId, "--no-self-update"], {
            timeout: 600000,
          });
    return result.success;
  }
}
