import type { Operation } from "@advanced-datatable/core";
import type { IOperationPersistence } from "./IOperationPersistence";
import type { OperationRecord } from "./types";

/** Serializable version of OperationRecord for storage. */
interface SerializedOperationRecord {
  op: Operation;
  status: "pending" | "applying" | "confirmed" | "error";
  error?: string; // Serialize error as string for storage
}

/**
 * localStorage-based persistence for operation records.
 * Stores records as JSON in browser localStorage.
 */
export class LocalStorageOperationPersistence implements IOperationPersistence {
  private readonly key: string;

  constructor(key: string = "advanced-datatable.operations") {
    this.key = key;
  }

  async save(records: Map<string, OperationRecord>): Promise<void> {
    try {
      // Filter out confirmed/error records as they're not needed for recovery
      const pendingRecords = Array.from(records.entries())
        .filter(([, record]) => record.status === "pending")
        .map(([id, record]) => [
          id,
          {
            op: record.op,
            status: record.status,
            error: record.error ? String(record.error) : undefined,
          } as SerializedOperationRecord,
        ]);

      const data = Object.fromEntries(pendingRecords);
      localStorage.setItem(this.key, JSON.stringify(data));
    } catch (err) {
      // Safari private mode and other environments may throw
      console.warn("[OperationPersistence] Failed to save records:", err);
    }
  }

  async load(): Promise<Map<string, OperationRecord>> {
    try {
      const json = localStorage.getItem(this.key);
      if (!json) return new Map();

      const data = JSON.parse(json) as Record<string, SerializedOperationRecord>;
      const records = new Map<string, OperationRecord>();

      for (const [id, record] of Object.entries(data)) {
        records.set(id, {
          op: record.op,
          status: "pending", // All loaded records are pending
          error: record.error ? new Error(record.error) : undefined,
        });
      }

      return records;
    } catch (err) {
      console.warn("[OperationPersistence] Failed to load records:", err);
      return new Map();
    }
  }

  async clear(): Promise<void> {
    try {
      localStorage.removeItem(this.key);
    } catch (err) {
      console.warn("[OperationPersistence] Failed to clear records:", err);
    }
  }
}

/**
 * No-op persistence for environments without localStorage support.
 */
export class NoOpOperationPersistence implements IOperationPersistence {
  async save(): Promise<void> {
    // no-op
  }

  async load(): Promise<Map<string, OperationRecord>> {
    return new Map();
  }

  async clear(): Promise<void> {
    // no-op
  }
}
