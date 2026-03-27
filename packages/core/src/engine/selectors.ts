import type { Cell } from "../models/cell";
import type { ColumnSchema } from "../models/schema";
import type { Row } from "../models/row";
import type { TableState } from "../models/state";

const DEFAULT_CELL: Cell = { value: null };

export function getCell(state: TableState, rowId: string, colId: string): Cell {
  return state.rows.get(rowId)?.cells[colId] ?? DEFAULT_CELL;
}

export function getColumn(state: TableState, colId: string): ColumnSchema | undefined {
  return state.schema.columns[colId];
}

export function getRow(state: TableState, rowId: string): Row | undefined {
  return state.rows.get(rowId);
}
