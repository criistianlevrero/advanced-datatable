import type { AddRowOperation } from "../../models/operations";
import type { TableState } from "../../models/state";
import { insertIntoOrder } from "../utils";

export function applyAddRow(state: TableState, op: AddRowOperation): void {
  // no-op: row already exists
  if (state.rows.has(op.row.id)) return;

  state.rows.set(op.row.id, op.row);
  insertIntoOrder(state.rowOrder, op.row.id, op.index);
}
