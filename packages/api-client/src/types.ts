import type { Operation } from "@advanced-datatable/core";

export interface OperationResult {
  opId: string;
  status: "confirmed" | "error";
  error?: string;
}

export interface BatchResponse {
  results: OperationResult[];
}

export interface TableLoadResponse {
  schema: {
    columns: Record<string, unknown>;
    columnOrder: string[];
    version: number;
  };
  rows: Array<{ id: string; cells: Record<string, { value: unknown }> }>;
  rowOrder: string[];
}
