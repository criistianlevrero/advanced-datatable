import type { BulkUpdateOperation } from "../../models/operations";
import type { TableState } from "../../models/state";
import { ensureRow } from "../utils";

export function applyBulkUpdate(state: TableState, op: BulkUpdateOperation): void {
  for (const { rowId, colId, value } of op.updates) {
    const row = ensureRow(state, rowId);
    row.cells[colId] = { value };
  }
}
