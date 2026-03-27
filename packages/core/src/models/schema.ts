export interface ColumnSchema {
  id: string;
  type: "string" | "number" | "boolean" | "date" | "custom";
  title?: string;
  width?: number;
  default?: unknown;
  meta?: Record<string, unknown>;
}

export interface TableSchema {
  columns: Record<string, ColumnSchema>;
  columnOrder: string[];
  version: number;
}
