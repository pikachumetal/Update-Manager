import { BaseProvider } from "./base";
import type { PackageUpdate } from "../types";
import { commandExists, runCommand } from "../runner";
import { isNewerVersion, parseAgyChangelogLatest, parseFirstVersion } from "./parsers";

interface Agent {
  id: string;
  latestVersion: () => Promise<string | null>;
  updateTimeout: number;
}

async function npmLatest(pkg: string): Promise<string | null> {
  try {
    // /latest trae solo la versión publicada (el documento completo de @openai/codex pesa ~18 MB)
    const response = await fetch(`https://registry.npmjs.org/${pkg}/latest`, {
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) return null;
    const data = (await response.json()) as { version?: string };
    return data.version ?? null;
  } catch {
    return null;
  }
}

async function agyLatest(): Promise<string | null> {
  const result = await runCommand(["agy", "changelog"], { timeout: 30000 });
  return parseAgyChangelogLatest(result.stdout);
}

// Agentes que se actualizan solos con `<id> update`; los que vienen de npm ya los cubre el provider npm
const AGENTS: Agent[] = [
  {
    id: "claude",
    latestVersion: () => npmLatest("@anthropic-ai/claude-code"),
    updateTimeout: 120000,
  },
  { id: "agy", latestVersion: agyLatest, updateTimeout: 300000 },
  { id: "codex", latestVersion: () => npmLatest("@openai/codex"), updateTimeout: 300000 },
];

export class AgentsProvider extends BaseProvider {
  id = "agents";
  name = "AI agents";
  icon = "🤖";

  async isAvailable(): Promise<boolean> {
    return (await this.installedAgents()).length > 0;
  }

  async checkUpdates(): Promise<PackageUpdate[]> {
    const checks = (await this.installedAgents()).map((agent) => this.checkAgent(agent));
    return (await Promise.all(checks)).filter((update) => update !== null);
  }

  async updatePackage(packageId: string, _options?: unknown): Promise<boolean> {
    const agent = AGENTS.find((a) => a.id === packageId);
    if (!agent) return false;
    const result = await runCommand([agent.id, "update"], { timeout: agent.updateTimeout });
    return result.success;
  }

  private async installedAgents(): Promise<Agent[]> {
    const installed = await Promise.all(AGENTS.map((agent) => commandExists(agent.id)));
    return AGENTS.filter((_, index) => installed[index]);
  }

  private async checkAgent(agent: Agent): Promise<PackageUpdate | null> {
    const versionResult = await runCommand([agent.id, "--version"], { timeout: 10000 });
    const current = versionResult.success ? parseFirstVersion(versionResult.stdout) : null;
    const latest = current ? await agent.latestVersion() : null;
    if (!current || !latest || !isNewerVersion(current, latest)) return null;
    return this.createUpdate(agent.id, agent.id, current, latest);
  }
}
