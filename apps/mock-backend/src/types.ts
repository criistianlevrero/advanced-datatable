import type { Operation, TableState } from "@advanced-datatable/core";

export type OperationBatchRequest = {
  operations: Operation[];
  clientId?: string;
  timestamp?: number;
};

export interface OperationResult {
  opId: string;
  status: "confirmed" | "error";
  error?: string;
}

export interface OperationBatchResponse {
  results: OperationResult[];
  state: TableState;
  timestamp?: number;
  conflictCount?: number;
}

export interface MockTableResponse {
  schema: {
    columns: Record<string, { id: string; type: string; title: string }>;
    columnOrder: string[];
    version: number;
  };
  rows: Array<{ id: string; cells: Record<string, { value: unknown }> }>;
  rowOrder: string[];
}

export interface BackendIntegrationPullResponse {
  cursor: number;
  operations: Operation[];
}
