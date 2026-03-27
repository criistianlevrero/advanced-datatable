import type { ColumnSchema } from "./schema";
import type { Row } from "./row";

export type TargetDescriptor =
  | { type: "cell"; rowId: string; colId: string }
  | { type: "row"; rowId: string }
  | { type: "column"; colId: string }
  | { type: "range"; rowIds: string[]; colIds: string[] };

export interface BaseOperation {
  id: string;
  type: string;
  ts?: number;
  source: "client" | "server";
  status?: "pending" | "applying" | "confirmed" | "error";
  target?: TargetDescriptor;
  meta?: Record<string, unknown>;
}

export interface SetCellOperation extends BaseOperation {
  type: "set_cell";
  rowId: string;
  colId: string;
  value: unknown;
}

export interface BulkUpdateOperation extends BaseOperation {
  type: "bulk_update";
  updates: Array<{ rowId: string; colId: string; value: unknown }>;
}

export interface UpdateColumnOperation extends BaseOperation {
  type: "update_column";
  colId: string;
  values: Record<string, unknown>;
}

export interface AddColumnOperation extends BaseOperation {
  type: "add_column";
  column: ColumnSchema;
  index?: number;
}

export interface RemoveColumnOperation extends BaseOperation {
  type: "remove_column";
  columnId: string;
}

export interface ReorderColumnsOperation extends BaseOperation {
  type: "reorder_columns";
  columnOrder: string[];
}

export interface AddRowOperation extends BaseOperation {
  type: "add_row";
  row: Row;
  index?: number;
}

export interface RemoveRowOperation extends BaseOperation {
  type: "remove_row";
  rowId: string;
}

export interface ReorderRowsOperation extends BaseOperation {
  type: "reorder_rows";
  rowOrder: string[];
}

export type DataOperation = SetCellOperation | BulkUpdateOperation | UpdateColumnOperation;

export type SchemaOperation =
  | AddColumnOperation
  | RemoveColumnOperation
  | ReorderColumnsOperation
  | AddRowOperation
  | RemoveRowOperation
  | ReorderRowsOperation;

export type Operation = DataOperation | SchemaOperation;
