import type { UpdateColumnOperation } from "../../models/operations";
import type { TableState } from "../../models/state";

export function applyUpdateColumn(state: TableState, op: UpdateColumnOperation): void {
  const col = state.schema.columns[op.colId];
  // no-op: column does not exist
  if (!col) return;

  Object.assign(col, op.values);
}
