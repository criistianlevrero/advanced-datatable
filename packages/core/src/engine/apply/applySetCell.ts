import type { SetCellOperation } from "../../models/operations";
import type { TableState } from "../../models/state";
import { ensureRow } from "../utils";

export function applySetCell(state: TableState, op: SetCellOperation): void {
  const row = ensureRow(state, op.rowId);
  row.cells[op.colId] = { value: op.value };
}
