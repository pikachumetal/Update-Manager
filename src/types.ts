import { z } from "zod";

// Schemas
export const ProviderConfigSchema = z.object({
  enabled: z.boolean(),
});

export const ConfigSchema = z.object({
  providers: z.record(z.string(), ProviderConfigSchema),
  lastCheck: z.string().optional(),
  ignoredPackages: z.array(z.string()).optional(),
  // Track installed versions to detect real updates (useful for packages with version mismatches)
  installedVersions: z.record(z.string(), z.string()).optional(),
});

// Types
export type ProviderConfig = z.infer<typeof ProviderConfigSchema>;
export type Config = z.infer<typeof ConfigSchema>;

export type PackageStatus = "available" | "pinned" | "unknown" | "error";

export interface PackageUpdate {
  id: string;
  name: string;
  currentVersion: string;
  newVersion: string;
  provider: string;
  status: PackageStatus;
  source?: string;
  notes?: string;
}

export interface UpdateResult {
  success: boolean;
  updated: string[];
  failed: string[];
  skipped: string[];
}

export interface UpdateOptions {
  force?: boolean;
}

export interface UpdateProvider {
  id: string;
  name: string;
  icon: string;
  requiresAdmin?: boolean;

  isAvailable(): Promise<boolean>;
  checkUpdates(): Promise<PackageUpdate[]>;
  updatePackage(packageId: string, options?: UpdateOptions): Promise<boolean>;
  updateAll(): Promise<UpdateResult>;
}

// Default provider states
export const DEFAULT_PROVIDERS: Record<string, ProviderConfig> = {
  winget: { enabled: true },
  proto: { enabled: true },
  moonrepo: { enabled: true },
  psmodules: { enabled: true },
  bun: { enabled: true },
  npm: { enabled: true },
  pnpm: { enabled: true },
  claude: { enabled: true },
  chocolatey: { enabled: false },
  scoop: { enabled: false },
};
