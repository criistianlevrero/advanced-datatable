import type { OperationRecord } from "./types";

/**
 * Persistence layer for operation records.
 * Handles loading/saving operation state for recovery across session boundaries.
 */
export interface IOperationPersistence {
  /**
   * Save all operation records.
   * Implementations should handle serialization and error recovery gracefully.
   */
  save(records: Map<string, OperationRecord>): Promise<void>;

  /**
   * Load all saved operation records.
   * Returns empty map if no records exist or on error.
   */
  load(): Promise<Map<string, OperationRecord>>;

  /**
   * Clear all saved operation records.
   * Called after operations are confirmed or after recovery is complete.
   */
  clear(): Promise<void>;
}
