export interface MockOperation {
  id: string;
  type: string;
  [key: string]: unknown;
}

export interface OperationBatchRequest {
  operations: MockOperation[];
  clientId?: string;
  timestamp?: number;
}

export interface OperationResult {
  opId: string;
  status: "confirmed" | "error";
  error?: string;
}

export interface OperationBatchResponse {
  results: OperationResult[];
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
