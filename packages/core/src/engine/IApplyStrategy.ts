import type { Operation } from "../models/operations";
import type { TableState } from "../models/state";

/**
 * A strategy that mutates TableState in-place to reflect a given operation.
 * All implementations follow no-op policy: invalid operations (referencing
 * non-existent columns or rows) are silently ignored.
 */
export type IApplyStrategy<T extends Operation = Operation> = (
  state: TableState,
  op: T,
) => void;
