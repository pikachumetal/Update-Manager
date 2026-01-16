#!/usr/bin/env bun
import * as p from "@clack/prompts";
import pc from "picocolors";
import { loadConfig, toggleProvider, updateLastCheck, getEnabledProviders, getIgnoredPackages, addIgnoredPackage, removeIgnoredPackage, getInstalledVersions, setInstalledVersion } from "./config";
import { providers, getAvailableProviders } from "./providers";
import { commandExists, runCommand } from "./runner";
import type { PackageUpdate, UpdateProvider } from "./types";

const VERSION = "0.1.0";

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  // Handle direct commands
  if (command === "check") {
    await checkCommand(args[1]);
    return;
  }

  if (command === "update") {
    await updateCommand(args[1], args.includes("--yes") || args.includes("-y"));
    return;
  }

  if (command === "providers") {
    await providersCommand(args[1], args[2]);
    return;
  }

  if (command === "ignore") {
    await ignoreCommand(args[1]);
    return;
  }

  if (command === "unignore") {
    await unignoreCommand(args[1]);
    return;
  }

  if (command === "ignored") {
    await listIgnoredCommand();
    return;
  }

  if (command === "--version" || command === "-v") {
    console.log(`um v${VERSION}`);
    return;
  }

  if (command === "--help" || command === "-h") {
    printHelp();
    return;
  }

  // Interactive mode
  await interactiveMode();
}

function printHelp() {
  console.log(`
${pc.bold("Update Manager")} v${VERSION}

${pc.dim("Usage:")}
  um                     Interactive mode
  um check [provider]    Check for updates
  um update [provider]   Update packages
  um providers           Manage providers
  um ignore <id>         Ignore a package
  um unignore <id>       Stop ignoring a package
  um ignored             List ignored packages

${pc.dim("Options:")}
  -y, --yes             Skip confirmation
  -v, --version         Show version
  -h, --help            Show help

${pc.dim("Examples:")}
  um check              Check all providers
  um check winget       Check only WinGet
  um update --yes       Update all without confirmation
  um providers enable chocolatey
  um ignore Google.GooglePlayGames
`);
}

async function interactiveMode() {
  console.clear();

  p.intro(pc.bgCyan(pc.black(" Update Manager ")));

  while (true) {
    const action = await p.select({
      message: "What would you like to do?",
      options: [
        { value: "check", label: `${pc.cyan("🔍")} Check for updates` },
        { value: "update", label: `${pc.green("🔄")} Update all` },
        { value: "updateProvider", label: `${pc.yellow("📦")} Update by provider` },
        { value: "providers", label: `${pc.magenta("⚙️")}  Manage providers` },
        { value: "exit", label: `${pc.dim("🚪")} Exit` },
      ],
    });

    if (p.isCancel(action) || action === "exit") {
      p.outro("Bye! 👋");
      process.exit(0);
    }

    switch (action) {
      case "check":
        await checkInteractive();
        break;
      case "update":
        await updateInteractive();
        break;
      case "updateProvider":
        await updateByProviderInteractive();
        break;
      case "providers":
        await providersInteractive();
        break;
    }
  }
}

async function checkInteractive() {
  const { updates, checkedProviders } = await checkAllProviders();
  displayUpdates(updates, checkedProviders);
  await updateLastCheck();
}

async function checkCommand(providerId?: string) {
  p.intro(pc.bgCyan(pc.black(" Checking for updates ")));

  if (providerId) {
    const provider = providers[providerId];
    if (!provider) {
      p.log.error(`Provider "${providerId}" not found`);
      return;
    }

    const spinner = p.spinner();
    spinner.start(`Checking ${provider.name}...`);

    const updates = await provider.checkUpdates();
    spinner.stop(`${provider.name}: ${updates.length} update(s)`);

    displayUpdates(updates, [providerId]);
  } else {
    const { updates, checkedProviders } = await checkAllProviders();
    displayUpdates(updates, checkedProviders);
  }

  await updateLastCheck();
  p.outro(pc.dim("Done"));
}

interface CheckResult {
  updates: PackageUpdate[];
  checkedProviders: string[];
}

async function checkAllProviders(): Promise<CheckResult> {
  const enabledIds = await getEnabledProviders();
  const ignoredPackages = await getIgnoredPackages();
  const installedVersions = await getInstalledVersions();
  const allUpdates: PackageUpdate[] = [];
  const checkedProviders: string[] = [];

  const spinner = p.spinner();
  spinner.start("Checking for updates...");

  // Check all providers in parallel
  const checks = enabledIds.map(async (id) => {
    const provider = providers[id];
    if (!provider) return { id, available: false, updates: [] as PackageUpdate[] };

    const isAvailable = await provider.isAvailable();
    if (!isAvailable) return { id, available: false, updates: [] as PackageUpdate[] };

    try {
      const updates = await provider.checkUpdates();
      return { id, available: true, updates };
    } catch (error) {
      console.warn(pc.yellow(`  ⚠ ${provider.name}: ${error instanceof Error ? error.message : "check failed"}`));
      return { id, available: true, updates: [] as PackageUpdate[] };
    }
  });

  const results = await Promise.all(checks);

  for (const result of results) {
    if (result.available) {
      checkedProviders.push(result.id);
    }

    for (const u of result.updates) {
      // Skip ignored packages
      if (ignoredPackages.includes(u.id)) continue;

      // Skip if we already have this version installed (handles version mismatch issues)
      const savedVersion = installedVersions[u.id];
      if (savedVersion && savedVersion === u.newVersion) continue;

      allUpdates.push(u);
    }
  }

  spinner.stop(`Found ${allUpdates.length} update(s)`);
  return { updates: allUpdates, checkedProviders };
}

function formatStatus(status: string): string {
  switch (status) {
    case "pinned":
      return pc.yellow("📌 pinned");
    case "unknown":
      return pc.magenta("❓ unknown");
    case "error":
      return pc.red("⚠️ error");
    default:
      return "";
  }
}

function displayUpdates(updates: PackageUpdate[], checkedProviders: string[]) {
  // Group by provider
  const grouped = updates.reduce(
    (acc, update) => {
      if (!acc[update.provider]) {
        acc[update.provider] = [];
      }
      acc[update.provider].push(update);
      return acc;
    },
    {} as Record<string, PackageUpdate[]>
  );

  // Find providers with no updates
  const providersWithUpdates = new Set(Object.keys(grouped));
  const providersWithoutUpdates = checkedProviders.filter(id => !providersWithUpdates.has(id));

  // Count by status
  const available = updates.filter(u => u.status === "available").length;
  const pinned = updates.filter(u => u.status === "pinned").length;
  const unknown = updates.filter(u => u.status === "unknown").length;

  console.log();

  // Show providers with updates
  for (const [providerId, providerUpdates] of Object.entries(grouped)) {
    const provider = providers[providerId];
    const icon = provider?.icon || "📦";
    const name = provider?.name || providerId;

    console.log(pc.bold(`${icon} ${name}`));

    for (const update of providerUpdates) {
      const statusBadge = update.status !== "available" ? ` ${formatStatus(update.status)}` : "";
      const source = update.source ? pc.dim(` [${update.source}]`) : "";

      console.log(
        `   ${pc.dim("•")} ${update.name} ${pc.dim(update.currentVersion)} ${pc.yellow("→")} ${pc.green(update.newVersion)}${statusBadge}${source}`
      );
    }
  }

  // Show providers without updates
  if (providersWithoutUpdates.length > 0) {
    for (const providerId of providersWithoutUpdates) {
      const provider = providers[providerId];
      const icon = provider?.icon || "📦";
      const name = provider?.name || providerId;
      console.log(`${icon} ${pc.dim(name)} ${pc.green("✓")}`);
    }
  }

  console.log();

  // Summary
  if (updates.length === 0) {
    p.log.success(pc.green("Everything is up to date!"));
    return;
  }

  const parts: string[] = [];
  if (available > 0) parts.push(pc.green(`${available} available`));
  if (pinned > 0) parts.push(pc.yellow(`${pinned} pinned`));
  if (unknown > 0) parts.push(pc.magenta(`${unknown} unknown`));

  if (parts.length > 0) {
    p.log.info(`Summary: ${parts.join(" | ")}`);
  }
}

async function selectUpdates(updates: PackageUpdate[]): Promise<PackageUpdate[] | null> {
  if (updates.length === 0) return [];

  // Group by provider for better display
  const options = updates.map(u => {
    const provider = providers[u.provider];
    const icon = provider?.icon || "📦";
    const statusBadge = u.status !== "available" ? ` ${formatStatus(u.status)}` : "";

    return {
      value: u.id,
      label: `${icon} ${u.name} ${pc.dim(u.currentVersion)} → ${pc.green(u.newVersion)}${statusBadge}`,
      hint: u.provider,
    };
  });

  const selected = await p.multiselect({
    message: "Select packages to update (space to toggle, enter to confirm)",
    options,
    initialValues: updates.map(u => u.id),
    required: false,
  });

  if (p.isCancel(selected)) return null;

  const selectedIds = new Set(selected as string[]);
  return updates.filter(u => selectedIds.has(u.id));
}

async function updateInteractive() {
  const { updates } = await checkAllProviders();

  if (updates.length === 0) {
    return;
  }

  const selectedUpdates = await selectUpdates(updates);
  if (!selectedUpdates || selectedUpdates.length === 0) {
    p.log.info("Update cancelled");
    return;
  }

  await performUpdates(selectedUpdates);
}

async function updateCommand(providerId?: string, skipConfirm = false) {
  p.intro(pc.bgCyan(pc.black(" Updating packages ")));

  let updates: PackageUpdate[];
  let checkedProviders: string[];

  if (providerId) {
    const provider = providers[providerId];
    if (!provider) {
      p.log.error(`Provider "${providerId}" not found`);
      return;
    }

    const spinner = p.spinner();
    spinner.start(`Checking ${provider.name}...`);
    updates = await provider.checkUpdates();
    checkedProviders = [providerId];
    spinner.stop(`Found ${updates.length} update(s)`);
  } else {
    const result = await checkAllProviders();
    updates = result.updates;
    checkedProviders = result.checkedProviders;
  }

  if (updates.length === 0) {
    p.outro(pc.dim("Done"));
    return;
  }

  displayUpdates(updates, checkedProviders);

  let selectedUpdates = updates;

  if (!skipConfirm) {
    const selection = await selectUpdates(updates);
    if (!selection || selection.length === 0) {
      p.log.info("Update cancelled");
      p.outro(pc.dim("Cancelled"));
      return;
    }
    selectedUpdates = selection;
  }

  await performUpdates(selectedUpdates);
  p.outro(pc.dim("Done"));
}

async function performUpdates(updates: PackageUpdate[]) {
  // Separate by status
  const toUpdate = updates.filter(u => u.status === "available");
  const skippable = updates.filter(u => u.status === "pinned" || u.status === "unknown");

  // Track packages to force update
  let forceUpdates: PackageUpdate[] = [];
  let finalSkipped = skippable;

  // Show skipped packages and ask if user wants to force
  if (skippable.length > 0) {
    console.log();
    p.log.warn(`Found ${skippable.length} package(s) that require force:`);
    for (const pkg of skippable) {
      const reason = pkg.status === "pinned" ? "pinned" : "unknown version";
      console.log(`   ${pc.dim("•")} ${pkg.name} ${pc.dim(`(${reason})`)}`);
    }

    // Only ask for WinGet packages (they support --force)
    const wingetSkippable = skippable.filter(u => u.provider === "winget");
    if (wingetSkippable.length > 0) {
      // Check if gsudo is available for elevation
      const hasGsudo = await commandExists("gsudo");

      if (!hasGsudo) {
        const installGsudo = await p.confirm({
          message: `gsudo not found. Install it for admin elevation?`,
        });

        if (!p.isCancel(installGsudo) && installGsudo) {
          const spinner = p.spinner();
          spinner.start("Installing gsudo...");
          const result = await runCommand(
            ["winget", "install", "gerardog.gsudo", "--silent", "--accept-package-agreements"],
            { timeout: 120000 }
          );
          if (result.success) {
            spinner.stop(pc.green("gsudo installed"));
          } else {
            spinner.stop(pc.red("Failed to install gsudo"));
          }
        }
      }

      const forceConfirm = await p.confirm({
        message: `Force update ${wingetSkippable.length} WinGet package(s)?`,
      });

      if (!p.isCancel(forceConfirm) && forceConfirm) {
        forceUpdates = wingetSkippable;
        finalSkipped = skippable.filter(u => u.provider !== "winget");
      }
    }
  }

  const allToUpdate = [...toUpdate, ...forceUpdates];

  if (allToUpdate.length === 0) {
    p.log.info("No packages to update");
    return;
  }

  console.log();
  p.log.step(`Updating ${allToUpdate.length} package(s)...`);
  console.log();

  // Group by provider, tracking which need force
  const grouped = allToUpdate.reduce(
    (acc, update) => {
      if (!acc[update.provider]) {
        acc[update.provider] = [];
      }
      acc[update.provider].push({
        update,
        force: forceUpdates.includes(update),
      });
      return acc;
    },
    {} as Record<string, { update: PackageUpdate; force: boolean }[]>
  );

  let successCount = 0;
  let failCount = 0;

  for (const [providerId, providerUpdates] of Object.entries(grouped)) {
    const provider = providers[providerId];
    if (!provider) continue;

    // Show provider header
    console.log(pc.dim(`  ${provider.icon} ${provider.name}`));

    for (const { update, force } of providerUpdates) {
      const spinner = p.spinner();
      const versionInfo = `${pc.dim(update.currentVersion)} → ${pc.green(update.newVersion)}`;
      const forceLabel = force ? pc.yellow(" (force)") : "";
      spinner.start(`${update.name} ${versionInfo}${forceLabel}`);

      try {
        const success = await provider.updatePackage(update.id, { force });
        if (success) {
          spinner.stop(pc.green(`  ✓ ${update.name} ${versionInfo}`));
          successCount++;
          // Save installed version to handle packages with version mismatch issues
          await setInstalledVersion(update.id, update.newVersion);
        } else {
          spinner.stop(pc.red(`  ✗ ${update.name} failed`));
          failCount++;
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : "Unknown error";
        spinner.stop(pc.red(`  ✗ ${update.name} ${pc.dim(errorMsg)}`));
        failCount++;
      }
    }

    console.log();
  }

  // Final summary
  const summaryParts: string[] = [];
  if (successCount > 0) summaryParts.push(pc.green(`✓ ${successCount} updated`));
  if (failCount > 0) summaryParts.push(pc.red(`✗ ${failCount} failed`));
  if (finalSkipped.length > 0) summaryParts.push(pc.yellow(`⊘ ${finalSkipped.length} skipped`));

  p.log.info(`Result: ${summaryParts.join(" | ")}`);
}

async function updateByProviderInteractive() {
  const enabledIds = await getEnabledProviders();
  const availableProviders: UpdateProvider[] = [];

  for (const id of enabledIds) {
    const provider = providers[id];
    if (provider && (await provider.isAvailable())) {
      availableProviders.push(provider);
    }
  }

  if (availableProviders.length === 0) {
    p.log.warn("No providers available");
    return;
  }

  const selected = await p.select({
    message: "Select provider to update",
    options: availableProviders.map((p) => ({
      value: p.id,
      label: `${p.icon} ${p.name}`,
    })),
  });

  if (p.isCancel(selected)) return;

  const provider = providers[selected as string];
  if (!provider) return;

  const spinner = p.spinner();
  spinner.start(`Checking ${provider.name}...`);

  const updates = await provider.checkUpdates();
  spinner.stop(`Found ${updates.length} update(s)`);

  if (updates.length === 0) {
    p.log.success(`${provider.name} is up to date!`);
    return;
  }

  displayUpdates(updates, [selected as string]);

  const selectedUpdates = await selectUpdates(updates);
  if (!selectedUpdates || selectedUpdates.length === 0) return;

  await performUpdates(selectedUpdates);
}

async function providersInteractive() {
  const config = await loadConfig();
  const available = await getAvailableProviders();
  const availableIds = new Set(available.map((p) => p.id));

  const options = Object.entries(providers).map(([id, provider]) => {
    const isEnabled = config.providers[id]?.enabled ?? false;
    const isInstalled = availableIds.has(id);
    const status = !isInstalled
      ? pc.dim("(not installed)")
      : isEnabled
        ? pc.green("(enabled)")
        : pc.dim("(disabled)");

    return {
      value: id,
      label: `${provider.icon} ${provider.name} ${status}`,
      hint: isInstalled ? undefined : "not available",
    };
  });

  const selected = await p.multiselect({
    message: "Toggle providers (space to select, enter to confirm)",
    options,
    initialValues: Object.entries(config.providers)
      .filter(([_, v]) => v.enabled)
      .map(([k]) => k),
  });

  if (p.isCancel(selected)) return;

  // Update config
  for (const id of Object.keys(providers)) {
    const shouldEnable = (selected as string[]).includes(id);
    await toggleProvider(id, shouldEnable);
  }

  p.log.success("Providers updated");
}

async function providersCommand(action?: string, providerId?: string) {
  if (!action) {
    // List providers
    const config = await loadConfig();
    const available = await getAvailableProviders();
    const availableIds = new Set(available.map((p) => p.id));

    console.log(pc.bold("\nProviders:\n"));

    for (const [id, provider] of Object.entries(providers)) {
      const isEnabled = config.providers[id]?.enabled ?? false;
      const isInstalled = availableIds.has(id);

      const status = !isInstalled
        ? pc.dim("not installed")
        : isEnabled
          ? pc.green("enabled")
          : pc.dim("disabled");

      console.log(`  ${provider.icon} ${provider.name.padEnd(20)} ${status}`);
    }

    console.log();
    return;
  }

  if (action === "enable" && providerId) {
    await toggleProvider(providerId, true);
    console.log(pc.green(`✓ ${providerId} enabled`));
    return;
  }

  if (action === "disable" && providerId) {
    await toggleProvider(providerId, false);
    console.log(pc.dim(`✓ ${providerId} disabled`));
    return;
  }

  console.log(`Unknown action: ${action}`);
}

async function ignoreCommand(packageId?: string) {
  if (!packageId) {
    console.log(pc.red("Usage: um ignore <package-id>"));
    console.log(pc.dim("Example: um ignore Google.GooglePlayGames"));
    return;
  }

  await addIgnoredPackage(packageId);
  console.log(pc.green(`✓ ${packageId} added to ignore list`));
}

async function unignoreCommand(packageId?: string) {
  if (!packageId) {
    console.log(pc.red("Usage: um unignore <package-id>"));
    return;
  }

  await removeIgnoredPackage(packageId);
  console.log(pc.green(`✓ ${packageId} removed from ignore list`));
}

async function listIgnoredCommand() {
  const ignored = await getIgnoredPackages();

  if (ignored.length === 0) {
    console.log(pc.dim("No packages ignored"));
    return;
  }

  console.log(pc.bold("\nIgnored packages:\n"));
  for (const pkg of ignored) {
    console.log(`  ${pc.dim("•")} ${pkg}`);
  }
  console.log();
}

// Handle Ctrl+C gracefully
process.on("SIGINT", () => {
  console.log(pc.dim("\nCancelled"));
  process.exit(0);
});

main().catch(console.error);
