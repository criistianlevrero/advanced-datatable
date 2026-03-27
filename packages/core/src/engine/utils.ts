import type { Row, TableState } from "../models";

export function insertIntoOrder(order: string[], id: string, index?: number): void {
  if (index === undefined || index < 0 || index >= order.length) {
    order.push(id);
    return;
  }

  order.splice(index, 0, id);
}

export function removeFromOrder(order: string[], id: string): void {
  const next = order.filter((candidate) => candidate !== id);
  order.length = 0;
  order.push(...next);
}

export function ensureRow(state: TableState, rowId: string): Row {
  const existing = state.rows.get(rowId);
  if (existing) {
    return existing;
  }

  const created: Row = { id: rowId, cells: {} };
  state.rows.set(rowId, created);
  if (!state.rowOrder.includes(rowId)) {
    state.rowOrder.push(rowId);
  }
  return created;
}
