import type { IOperationTransport } from "@advanced-datatable/api-client";
import type { BatchResponse, TableLoadResponse } from "@advanced-datatable/api-client";
import type { Operation } from "@advanced-datatable/core";

/** Simulates a successful server that confirms all operations immediately. */
export const mockTransport: IOperationTransport = {
  async send(ops: Operation[]): Promise<BatchResponse> {
    await new Promise((r) => setTimeout(r, 200));
    return {
      results: ops.map((op) => ({ opId: op.id, status: "confirmed" })),
    };
  },
  async loadTable(): Promise<TableLoadResponse> {
    return { schema: { columns: {}, columnOrder: [], version: 0 }, rows: [], rowOrder: [] };
  },
};
