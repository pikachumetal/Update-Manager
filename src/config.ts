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
