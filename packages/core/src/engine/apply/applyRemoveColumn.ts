import type { RemoveColumnOperation } from "../../models/operations";
import type { TableState } from "../../models/state";
import { removeFromOrder } from "../utils";

export function applyRemoveColumn(state: TableState, op: RemoveColumnOperation): void {
  // no-op: column does not exist
  if (!state.schema.columns[op.columnId]) return;

  delete state.schema.columns[op.columnId];
  removeFromOrder(state.schema.columnOrder, op.columnId);
  state.schema.version += 1;
  // Cell data in rows is left in place (lazy cleanup).
}
