import type { PackageUpdate, PackageStatus, UpdateResult, UpdateProvider, UpdateOptions } from "../types";

export interface CreateUpdateOptions {
  status?: PackageStatus;
  source?: string;
  notes?: string;
}

export abstract class BaseProvider implements UpdateProvider {
  abstract id: string;
  abstract name: string;
  abstract icon: string;
  requiresAdmin?: boolean = false;

  abstract isAvailable(): Promise<boolean>;
  abstract checkUpdates(): Promise<PackageUpdate[]>;
  abstract updatePackage(packageId: string, options?: UpdateOptions): Promise<boolean>;

  async updateAll(): Promise<UpdateResult> {
    const updates = await this.checkUpdates();
    const result: UpdateResult = {
      success: true,
      updated: [],
      failed: [],
      skipped: [],
    };

    for (const update of updates) {
      // Skip pinned packages
      if (update.status === "pinned") {
        result.skipped.push(update.id);
        continue;
      }

      try {
        const success = await this.updatePackage(update.id);
        if (success) {
          result.updated.push(update.id);
        } else {
          result.failed.push(update.id);
          result.success = false;
        }
      } catch {
        result.failed.push(update.id);
        result.success = false;
      }
    }

    return result;
  }

  protected createUpdate(
    id: string,
    name: string,
    currentVersion: string,
    newVersion: string,
    options: CreateUpdateOptions = {}
  ): PackageUpdate {
    return {
      id,
      name,
      currentVersion,
      newVersion,
      provider: this.id,
      status: options.status ?? "available",
      source: options.source,
      notes: options.notes,
    };
  }
}

export type { UpdateProvider };
