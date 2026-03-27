import type { Operation } from "@advanced-datatable/core";
import type { BatchResponse, TableLoadResponse } from "./types";

export interface IOperationTransport {
  /** Send a batch of operations to the server. Returns per-op results. */
  send(ops: Operation[]): Promise<BatchResponse>;
  /** Load the full table state from the server. */
  loadTable(): Promise<TableLoadResponse>;
}
