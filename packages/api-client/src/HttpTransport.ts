import type { Operation } from "@advanced-datatable/core";
import type { BatchResponse, TableLoadResponse } from "./types";
import type { IOperationTransport } from "./IOperationTransport";

export class HttpTransport implements IOperationTransport {
  private readonly baseUrl: string;

  constructor({ baseUrl }: { baseUrl: string }) {
    this.baseUrl = baseUrl.replace(/\/$/, "");
  }

  async send(ops: Operation[]): Promise<BatchResponse> {
    const res = await fetch(`${this.baseUrl}/operations`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ operations: ops }),
    });

    if (!res.ok) {
      throw createHttpTransportError("send", res.status, res.statusText);
    }

    return res.json() as Promise<BatchResponse>;
  }

  async loadTable(): Promise<TableLoadResponse> {
    const res = await fetch(`${this.baseUrl}/table`);

    if (!res.ok) {
      throw createHttpTransportError("loadTable", res.status, res.statusText);
    }

    return res.json() as Promise<TableLoadResponse>;
  }
}

function createHttpTransportError(
  action: "send" | "loadTable",
  status: number,
  statusText: string,
): Error & { status: number; retryable: boolean } {
  const error = new Error(`HttpTransport.${action} failed: ${status} ${statusText}`) as Error & {
    status: number;
    retryable: boolean;
  };
  error.status = status;
  error.retryable = status >= 500 || status === 429;
  return error;
}
