import type { Operation } from "@advanced-datatable/core";

export interface OperationRecord {
  op: Operation;
  status: "pending" | "applying" | "confirmed" | "error";
  error?: unknown;
}

export type OperationManagerEvent =
  | { type: "applied"; opId: string }
  | { type: "confirmed"; opId: string }
  | { type: "failed"; opId: string; error: unknown };

export type OperationManagerListener = (event: OperationManagerEvent) => void;
