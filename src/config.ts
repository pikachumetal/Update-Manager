import { join } from "path";
import { homedir } from "os";
import { Config, ConfigSchema, DEFAULT_PROVIDERS, ProviderConfig } from "./types";

const CONFIG_DIR = join(homedir(), ".config", "update-manager");
const CONFIG_FILE = join(CONFIG_DIR, "config.json");

export function getConfigPath(): string {
  return CONFIG_FILE;
}

export async function ensureConfigDir(): Promise<void> {
  const fs = await import("fs/promises");
  try {
    await fs.mkdir(CONFIG_DIR, { recursive: true });
  } catch {
    // Directory already exists
  }
}

export async function loadConfig(): Promise<Config> {
  const fs = await import("fs/promises");

  try {
    const data = await fs.readFile(CONFIG_FILE, "utf-8");
    const parsed = JSON.parse(data);
    const config = ConfigSchema.parse(parsed);

    // Merge with defaults to ensure new providers are included
    const providers = { ...DEFAULT_PROVIDERS };
    for (const [key, value] of Object.entries(config.providers)) {
      providers[key] = value;
    }

    return { ...config, providers };
  } catch {
    // Return default config if file doesn't exist or is invalid
    return {
      providers: { ...DEFAULT_PROVIDERS },
    };
  }
}

export async function saveConfig(config: Config): Promise<void> {
  const fs = await import("fs/promises");

  await ensureConfigDir();
  await fs.writeFile(CONFIG_FILE, JSON.stringify(config, null, 2));
}

export async function getEnabledProviders(): Promise<string[]> {
  const config = await loadConfig();
  return Object.entries(config.providers)
    .filter(([_, value]) => value.enabled)
    .map(([key]) => key);
}

export async function toggleProvider(
  id: string,
  enabled: boolean
): Promise<void> {
  const config = await loadConfig();

  if (!config.providers[id]) {
    config.providers[id] = { enabled };
  } else {
    config.providers[id].enabled = enabled;
  }

  await saveConfig(config);
}

export async function getProviderConfig(
  id: string
): Promise<ProviderConfig | undefined> {
  const config = await loadConfig();
  return config.providers[id];
}

export async function updateLastCheck(): Promise<void> {
  const config = await loadConfig();
  config.lastCheck = new Date().toISOString();
  await saveConfig(config);
}

export async function getIgnoredPackages(): Promise<string[]> {
  const config = await loadConfig();
  return config.ignoredPackages ?? [];
}

export async function addIgnoredPackage(packageId: string): Promise<void> {
  const config = await loadConfig();
  const ignored = config.ignoredPackages ?? [];
  if (!ignored.includes(packageId)) {
    ignored.push(packageId);
    config.ignoredPackages = ignored;
    await saveConfig(config);
  }
}

export async function removeIgnoredPackage(packageId: string): Promise<void> {
  const config = await loadConfig();
  const ignored = config.ignoredPackages ?? [];
  const index = ignored.indexOf(packageId);
  if (index !== -1) {
    ignored.splice(index, 1);
    config.ignoredPackages = ignored;
    await saveConfig(config);
  }
}

export async function getInstalledVersions(): Promise<Record<string, string>> {
  const config = await loadConfig();
  return config.installedVersions ?? {};
}

export async function getInstalledVersion(packageId: string): Promise<string | undefined> {
  const versions = await getInstalledVersions();
  return versions[packageId];
}

export async function setInstalledVersion(packageId: string, version: string): Promise<void> {
  const config = await loadConfig();
  const versions = config.installedVersions ?? {};
  versions[packageId] = version;
  config.installedVersions = versions;
  await saveConfig(config);
}

export async function removeInstalledVersion(packageId: string): Promise<void> {
  const config = await loadConfig();
  const versions = config.installedVersions ?? {};
  delete versions[packageId];
  config.installedVersions = versions;
  await saveConfig(config);
}
