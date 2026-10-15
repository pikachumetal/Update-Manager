#!/usr/bin/env bun
import {
  loadConfig,
  toggleProvider,
  updateLastCheck,
  getEnabledProviders,
  getIgnoredPackages,
  addIgnoredPackage,
  removeIgnoredPackage,
  getInstalledVersions,
  setInstalledVersion,
} from "./config";
import { providers, getAvailableProviders } from "./providers";
import { commandExists, runCommand } from "./runner";
import type { CheckFailure, CheckResult, PackageUpdate, UpdateProvider } from "./types";
import { printCheckError, runCheckView } from "./ui/CheckApp";
import {
  IGNORED_TITLE,
  printErrorLine,
  printHelp,
  printIgnored,
  printNotice,
  printProviders,
  printProvidersNotice,
  printText,
} from "./ui/commands";
import {
  printIntro,
  printLog,
  printOutro,
  runMenu,
  runProviderSelect,
  runProvidersToggle,
  type MenuAction,
} from "./ui/menu";
import { runUpdateView, type UpdateViewOptions } from "./ui/UpdateApp";

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
    printText(`um v${VERSION}`);
    return;
  }

  if (command === "--help" || command === "-h") {
    printHelp(VERSION);
    return;
  }

  // Interactive mode
  await interactiveMode();
}

async function interactiveMode() {
  if (!isInteractive()) {
    printErrorLine("Interactive terminal required (see um --help)");
    process.exitCode = 1;
    return;
  }

  console.clear();
  printIntro("Update Manager");

  while (true) {
    const action = await runMenu();
    if (action === undefined) cancel();
    if (action === "exit") {
      printOutro("Bye! 👋");
      process.exit(0);
    }
    await runMenuAction(action);
  }
}

async function runMenuAction(action: Exclude<MenuAction, "exit">) {
  switch (action) {
    case "check":
      return checkCommand();
    case "update":
      return updateCommand();
    case "updateProvider":
      return updateByProviderInteractive();
    case "providers":
      return providersInteractive();
  }
}

function isInteractive(): boolean {
  return Boolean(process.stdin.isTTY && process.stdout.isTTY);
}

async function checkCommand(providerId?: string) {
  if (providerId) {
    const provider = providers[providerId];
    if (!provider) {
      printCheckError(`Provider "${providerId}" not found`);
      return;
    }

    await runCheckView({
      spinnerLabel: `Checking ${provider.name}...`,
      load: async () => ({
        updates: await provider.checkUpdates(),
        checkedProviders: [providerId],
        failures: [],
      }),
      doneMessage: (result) => `${provider.name}: ${result.updates.length} update(s)`,
    });
  } else {
    await runCheckView({
      spinnerLabel: "Checking for updates...",
      load: collectUpdates,
      doneMessage: (result) => `Found ${result.updates.length} update(s)`,
    });
  }

  await updateLastCheck();
}

async function collectUpdates(): Promise<CheckResult> {
  const enabledIds = await getEnabledProviders();
  const ignoredPackages = await getIgnoredPackages();
  const installedVersions = await getInstalledVersions();
  const allUpdates: PackageUpdate[] = [];
  const checkedProviders: string[] = [];
  const failures: CheckFailure[] = [];

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
      failures.push({
        providerName: provider.name,
        message: error instanceof Error ? error.message : "check failed",
      });
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

  return { updates: allUpdates, checkedProviders, failures };
}

async function updateCommand(providerId?: string, skipConfirm = false) {
  const interactive = isInteractive();
  if (!skipConfirm && !interactive) {
    printErrorLine("Interactive terminal required (use --yes)");
    process.exitCode = 1;
    return;
  }

  const provider = providerId ? providers[providerId] : undefined;
  if (providerId && !provider) {
    printCheckError(`Provider "${providerId}" not found`, "Updating packages");
    return;
  }

  const outcome = await runUpdateView(updateViewOptions(provider, interactive, skipConfirm));
  if (outcome === "cancelled") cancel();
}

function updateViewOptions(
  provider: UpdateProvider | undefined,
  interactive: boolean,
  skipConfirm: boolean
): UpdateViewOptions {
  return {
    spinnerLabel: provider ? `Checking ${provider.name}...` : "Checking for updates...",
    load: provider
      ? async () => ({
          updates: await provider.checkUpdates(),
          checkedProviders: [provider.id],
          failures: [],
        })
      : collectUpdates,
    interactive,
    skipSelection: skipConfirm,
    hasGsudo: () => commandExists("gsudo"),
    installGsudo,
    updatePackage: updateOnePackage,
  };
}

async function installGsudo(): Promise<boolean> {
  const result = await runCommand(
    ["winget", "install", "gerardog.gsudo", "--silent", "--accept-package-agreements"],
    { timeout: 120000 }
  );
  return result.success;
}

async function updateOnePackage(update: PackageUpdate, force: boolean): Promise<boolean> {
  const success = await providers[update.provider].updatePackage(update.id, { force });
  // Se guarda la versión para no volver a ofrecer paquetes cuya versión el gestor reporta mal
  if (success) await setInstalledVersion(update.id, update.newVersion);
  return success;
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
    printLog("warn", "No providers available");
    return;
  }

  const provider = await runProviderSelect(availableProviders);
  if (!provider) cancel();
  await updateCommand(provider.id);
}

async function providersInteractive() {
  const config = await loadConfig();
  const available = await getAvailableProviders();
  const availableIds = new Set(available.map((p) => p.id));

  const ids = await runProvidersToggle(
    Object.entries(providers).map(([id, provider]) => ({
      provider,
      enabled: config.providers[id]?.enabled ?? false,
      installed: availableIds.has(id),
    }))
  );
  if (!ids) cancel();

  for (const id of Object.keys(providers)) {
    await toggleProvider(id, ids.includes(id));
  }

  printLog("success", "Providers updated");
}

async function providersCommand(action?: string, providerId?: string) {
  if (!action) {
    // List providers
    const config = await loadConfig();
    const available = await getAvailableProviders();
    const availableIds = new Set(available.map((p) => p.id));

    printProviders(
      Object.entries(providers).map(([id, provider]) => ({
        provider,
        enabled: config.providers[id]?.enabled ?? false,
        installed: availableIds.has(id),
      }))
    );
    return;
  }

  if (action === "enable" && providerId) {
    await toggleProvider(providerId, true);
    printProvidersNotice("success", `${providerId} enabled`);
    return;
  }

  if (action === "disable" && providerId) {
    await toggleProvider(providerId, false);
    printProvidersNotice("success", `${providerId} disabled`);
    return;
  }

  printProvidersNotice("error", `Unknown action: ${action}`);
}

async function ignoreCommand(packageId?: string) {
  if (!packageId) {
    printNotice({
      title: IGNORED_TITLE,
      kind: "error",
      text: "Usage: um ignore <package-id>",
      hint: "Example: um ignore Google.GooglePlayGames",
    });
    return;
  }

  await addIgnoredPackage(packageId);
  printNotice({ title: IGNORED_TITLE, kind: "success", text: `${packageId} added to ignore list` });
}

async function unignoreCommand(packageId?: string) {
  if (!packageId) {
    printNotice({ title: IGNORED_TITLE, kind: "error", text: "Usage: um unignore <package-id>" });
    return;
  }

  await removeIgnoredPackage(packageId);
  printNotice({
    title: IGNORED_TITLE,
    kind: "success",
    text: `${packageId} removed from ignore list`,
  });
}

async function listIgnoredCommand() {
  printIgnored(await getIgnoredPackages());
}

function cancel(): never {
  printOutro("Cancelled");
  process.exit(0);
}

// Handle Ctrl+C gracefully
process.on("SIGINT", cancel);

main().catch((error) =>
  printErrorLine(error instanceof Error ? (error.stack ?? String(error)) : String(error))
);
