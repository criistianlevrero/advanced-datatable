import type { ReorderRowsOperation } from "../../models/operations";
import type { TableState } from "../../models/state";

export function applyReorderRows(state: TableState, op: ReorderRowsOperation): void {
  // Keep only IDs that actually exist; ignore unknown IDs silently.
  const filtered = op.rowOrder.filter((id) => state.rows.has(id));

  // Add any existing rows that are missing from the provided order (append at end).
  for (const id of state.rows.keys()) {
    if (!filtered.includes(id)) {
      filtered.push(id);
    }
  }

  state.rowOrder.length = 0;
  state.rowOrder.push(...filtered);
}
