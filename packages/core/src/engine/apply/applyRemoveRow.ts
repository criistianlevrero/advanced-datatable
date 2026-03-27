import type { RemoveRowOperation } from "../../models/operations";
import type { TableState } from "../../models/state";
import { removeFromOrder } from "../utils";

export function applyRemoveRow(state: TableState, op: RemoveRowOperation): void {
  // no-op: row does not exist
  if (!state.rows.has(op.rowId)) return;

  state.rows.delete(op.rowId);
  removeFromOrder(state.rowOrder, op.rowId);
}
