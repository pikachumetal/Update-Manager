#!/usr/bin/env bun
import * as p from "@clack/prompts";
import pc from "picocolors";
import { loadConfig, toggleProvider, updateLastCheck, getEnabledProviders } from "./config";
import { providers, getAvailableProviders } from "./providers";
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

${pc.dim("Options:")}
  -y, --yes             Skip confirmation
  -v, --version         Show version
  -h, --help            Show help

${pc.dim("Examples:")}
  um check              Check all providers
  um check winget       Check only WinGet
  um update --yes       Update all without confirmation
  um providers enable chocolatey
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
      p.outro(pc.dim("Goodbye!"));
      break;
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
  const updates = await checkAllProviders();
  displayUpdates(updates);
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

    displayUpdates(updates);
  } else {
    const updates = await checkAllProviders();
    displayUpdates(updates);
  }

  await updateLastCheck();
  p.outro(pc.dim("Done"));
}

async function checkAllProviders(): Promise<PackageUpdate[]> {
  const enabledIds = await getEnabledProviders();
  const allUpdates: PackageUpdate[] = [];

  const spinner = p.spinner();
  spinner.start("Checking for updates...");

  // Check all providers in parallel
  const checks = enabledIds.map(async (id) => {
    const provider = providers[id];
    if (!provider) return [];

    const isAvailable = await provider.isAvailable();
    if (!isAvailable) return [];

    try {
      return await provider.checkUpdates();
    } catch {
      return [];
    }
  });

  const results = await Promise.all(checks);

  for (const updates of results) {
    allUpdates.push(...updates);
  }

  spinner.stop(`Found ${allUpdates.length} update(s)`);
  return allUpdates;
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

function displayUpdates(updates: PackageUpdate[]) {
  if (updates.length === 0) {
    p.log.success(pc.green("Everything is up to date!"));
    return;
  }

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

  // Count by status
  const available = updates.filter(u => u.status === "available").length;
  const pinned = updates.filter(u => u.status === "pinned").length;
  const unknown = updates.filter(u => u.status === "unknown").length;

  console.log();

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

    console.log();
  }

  // Summary
  const parts: string[] = [];
  if (available > 0) parts.push(pc.green(`${available} available`));
  if (pinned > 0) parts.push(pc.yellow(`${pinned} pinned`));
  if (unknown > 0) parts.push(pc.magenta(`${unknown} unknown`));

  if (parts.length > 0) {
    p.log.info(`Summary: ${parts.join(" | ")}`);
  }
}

async function updateInteractive() {
  const updates = await checkAllProviders();

  if (updates.length === 0) {
    return;
  }

  const available = updates.filter(u => u.status === "available").length;
  const skipped = updates.filter(u => u.status !== "available").length;

  let message = `Update ${available} package(s)?`;
  if (skipped > 0) {
    message += pc.dim(` (${skipped} will be skipped)`);
  }

  const confirm = await p.confirm({ message });

  if (p.isCancel(confirm) || !confirm) {
    p.log.info("Update cancelled");
    return;
  }

  await performUpdates(updates);
}

async function updateCommand(providerId?: string, skipConfirm = false) {
  p.intro(pc.bgCyan(pc.black(" Updating packages ")));

  let updates: PackageUpdate[];

  if (providerId) {
    const provider = providers[providerId];
    if (!provider) {
      p.log.error(`Provider "${providerId}" not found`);
      return;
    }

    const spinner = p.spinner();
    spinner.start(`Checking ${provider.name}...`);
    updates = await provider.checkUpdates();
    spinner.stop(`Found ${updates.length} update(s)`);
  } else {
    updates = await checkAllProviders();
  }

  if (updates.length === 0) {
    p.outro(pc.dim("Done"));
    return;
  }

  displayUpdates(updates);

  if (!skipConfirm) {
    const available = updates.filter(u => u.status === "available").length;
    const skippedCount = updates.filter(u => u.status !== "available").length;

    let message = `Update ${available} package(s)?`;
    if (skippedCount > 0) {
      message += pc.dim(` (${skippedCount} will be skipped)`);
    }

    const confirm = await p.confirm({ message });

    if (p.isCancel(confirm) || !confirm) {
      p.log.info("Update cancelled");
      p.outro(pc.dim("Cancelled"));
      return;
    }
  }

  await performUpdates(updates);
  p.outro(pc.dim("Done"));
}

async function performUpdates(updates: PackageUpdate[]) {
  // Separate by status
  const toUpdate = updates.filter(u => u.status === "available");
  const skipped = updates.filter(u => u.status === "pinned" || u.status === "unknown");

  // Show skipped packages
  if (skipped.length > 0) {
    console.log();
    p.log.warn(`Skipping ${skipped.length} package(s):`);
    for (const pkg of skipped) {
      const reason = pkg.status === "pinned" ? "pinned" : "unknown version";
      console.log(`   ${pc.dim("•")} ${pkg.name} ${pc.dim(`(${reason})`)}`);
    }
  }

  if (toUpdate.length === 0) {
    p.log.info("No packages to update");
    return;
  }

  console.log();
  p.log.step(`Updating ${toUpdate.length} package(s)...`);
  console.log();

  const grouped = toUpdate.reduce(
    (acc, update) => {
      if (!acc[update.provider]) {
        acc[update.provider] = [];
      }
      acc[update.provider].push(update);
      return acc;
    },
    {} as Record<string, PackageUpdate[]>
  );

  let successCount = 0;
  let failCount = 0;

  for (const [providerId, providerUpdates] of Object.entries(grouped)) {
    const provider = providers[providerId];
    if (!provider) continue;

    // Show provider header
    console.log(pc.dim(`  ${provider.icon} ${provider.name}`));

    for (const update of providerUpdates) {
      const spinner = p.spinner();
      const versionInfo = `${pc.dim(update.currentVersion)} → ${pc.green(update.newVersion)}`;
      spinner.start(`${update.name} ${versionInfo}`);

      try {
        const success = await provider.updatePackage(update.id);
        if (success) {
          spinner.stop(pc.green(`  ✓ ${update.name} ${versionInfo}`));
          successCount++;
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
  if (skipped.length > 0) summaryParts.push(pc.yellow(`⊘ ${skipped.length} skipped`));

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

  displayUpdates(updates);

  const confirm = await p.confirm({
    message: `Update ${updates.length} package(s) from ${provider.name}?`,
  });

  if (p.isCancel(confirm) || !confirm) return;

  await performUpdates(updates);
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

// Handle Ctrl+C gracefully
process.on("SIGINT", () => {
  console.log(pc.dim("\nCancelled"));
  process.exit(0);
});

main().catch(console.error);
