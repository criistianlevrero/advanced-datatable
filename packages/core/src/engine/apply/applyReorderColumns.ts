import type { ReorderColumnsOperation } from "../../models/operations";
import type { TableState } from "../../models/state";

export function applyReorderColumns(state: TableState, op: ReorderColumnsOperation): void {
  // Keep only IDs that actually exist in the schema; ignore unknown IDs silently.
  const existing = new Set(Object.keys(state.schema.columns));
  const filtered = op.columnOrder.filter((id) => existing.has(id));

  // Add any existing columns that are missing from the provided order (append at end).
  for (const id of existing) {
    if (!filtered.includes(id)) {
      filtered.push(id);
    }
  }

  state.schema.columnOrder.length = 0;
  state.schema.columnOrder.push(...filtered);
}
