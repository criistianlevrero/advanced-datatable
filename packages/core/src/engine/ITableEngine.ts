import type { Operation } from "../models/operations";
import type { TableState } from "../models/state";

export interface ITableEngine {
  /** Apply a single operation. Idempotent: same op.id applied twice is a no-op. */
  apply(op: Operation): void;
  /** Apply a sequence of operations in order. */
  applyBatch(ops: Operation[]): void;
  /** Returns a snapshot of the current state. */
  getState(): Readonly<TableState>;
}
