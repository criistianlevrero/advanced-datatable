import type { AddColumnOperation } from "../../models/operations";
import type { TableState } from "../../models/state";
import { insertIntoOrder } from "../utils";

export function applyAddColumn(state: TableState, op: AddColumnOperation): void {
  // no-op: column already exists
  if (state.schema.columns[op.column.id]) return;

  state.schema.columns[op.column.id] = op.column;
  insertIntoOrder(state.schema.columnOrder, op.column.id, op.index);
  state.schema.version += 1;
}
