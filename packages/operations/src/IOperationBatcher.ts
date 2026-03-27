import type { Operation } from "@advanced-datatable/core";

export interface IBatchResult {
  opId: string;
  status: "confirmed" | "error";
  error?: unknown;
}

export interface IOperationBatcher {
  /** Enqueue an operation. Starts debounce timer if not already running. */
  enqueue(op: Operation): void;
  /** Flush the queue immediately, cancelling any pending timer. */
  flush(): void;
}
