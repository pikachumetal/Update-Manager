import type { UpdateProvider } from "../types";
import { WingetProvider } from "./winget";
import { ProtoProvider } from "./proto";
import { MoonrepoProvider } from "./moonrepo";
import { ClaudeProvider } from "./claude";
import { BunProvider } from "./bun";
import { NpmProvider } from "./npm";
import { PnpmProvider } from "./pnpm";
import { PsModulesProvider } from "./psmodules";
import { ChocolateyProvider } from "./chocolatey";
import { ScoopProvider } from "./scoop";

export const providers: Record<string, UpdateProvider> = {
  winget: new WingetProvider(),
  proto: new ProtoProvider(),
  moonrepo: new MoonrepoProvider(),
  claude: new ClaudeProvider(),
  bun: new BunProvider(),
  npm: new NpmProvider(),
  pnpm: new PnpmProvider(),
  psmodules: new PsModulesProvider(),
  chocolatey: new ChocolateyProvider(),
  scoop: new ScoopProvider(),
};

export async function getAvailableProviders(): Promise<UpdateProvider[]> {
  const available: UpdateProvider[] = [];

  for (const provider of Object.values(providers)) {
    if (await provider.isAvailable()) {
      available.push(provider);
    }
  }

  return available;
}

export function getProvider(id: string): UpdateProvider | undefined {
  return providers[id];
}

export {
  WingetProvider,
  ProtoProvider,
  MoonrepoProvider,
  ClaudeProvider,
  BunProvider,
  NpmProvider,
  PnpmProvider,
  PsModulesProvider,
  ChocolateyProvider,
  ScoopProvider,
};
