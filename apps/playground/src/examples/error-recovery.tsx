import React, { useMemo, useRef, useState } from "react";
import { DataTable } from "@advanced-datatable/ui";
import type { BatchResponse, IOperationTransport } from "@advanced-datatable/api-client";
import type { Operation } from "@advanced-datatable/core";
import type { IOperationManager } from "@advanced-datatable/operations";
import { basicState } from "../mocks/data";

type ErrorMode = "none" | "4xx" | "5xx" | "timeout";

export function ErrorRecoveryExample(): React.ReactElement {
  const [errorMode, setErrorMode] = useState<ErrorMode>("none");
  const [failedOps, setFailedOps] = useState<string[]>([]);
  const [recoveredOps, setRecoveredOps] = useState<string[]>([]);
  const errorModeRef = useRef<ErrorMode>("none");
  const attemptMapRef = useRef(new Map<string, number>());
  const failedSetRef = useRef(new Set<string>());
  const managerRef = useRef<IOperationManager | null>(null);

  const transport = useMemo<IOperationTransport>(
    () => ({
      async send(ops: Operation[]): Promise<BatchResponse> {
        await new Promise((resolve) => setTimeout(resolve, 200));

        if (errorModeRef.current === "4xx") {
          const error = new Error("Invalid operation format") as Error & {
            status: number;
            retryable: boolean;
          };
          error.status = 400;
          error.retryable = false;
          throw error;
        }

        if (errorModeRef.current === "5xx" || errorModeRef.current === "timeout") {
          const firstAttemptHasToFail = ops.some((op) => (attemptMapRef.current.get(op.id) ?? 0) === 0);
          for (const op of ops) {
            attemptMapRef.current.set(op.id, (attemptMapRef.current.get(op.id) ?? 0) + 1);
          }
          if (firstAttemptHasToFail) {
            const error = new Error(
              errorModeRef.current === "5xx" ? "Temporary server error" : "Request timeout",
            ) as Error & { status?: number; retryable: boolean };
            if (errorModeRef.current === "5xx") {
              error.status = 503;
            }
            error.retryable = true;
            throw error;
          }
        }

        return {
          results: ops.map((op) => ({ opId: op.id, status: "confirmed" })),
        };
      },
      async loadTable() {
        return { schema: { columns: {}, columnOrder: [], version: 0 }, rows: [], rowOrder: [] };
      },
    }),
    [],
  );

  const updateMode = (mode: ErrorMode) => {
    errorModeRef.current = mode;
    setErrorMode(mode);
    setFailedOps([]);
    setRecoveredOps([]);
    failedSetRef.current.clear();
    attemptMapRef.current.clear();
  };

  return (
    <section>
      <h2>Error Recovery</h2>
      <p>
        This example demonstrates non-retryable failures versus retryable transport failures that
        recover automatically on the next attempt.
      </p>

      <div style={{ marginBottom: 16, padding: 16, backgroundColor: "#fff3cd", borderRadius: 6 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(220px, 1fr))", gap: 8 }}>
          <button onClick={() => updateMode("none")}>Normal</button>
          <button onClick={() => updateMode("4xx")}>400 Non-Retryable</button>
          <button onClick={() => updateMode("5xx")}>503 Retry Once</button>
          <button onClick={() => updateMode("timeout")}>Timeout Retry Once</button>
        </div>
        <p style={{ marginTop: 12, marginBottom: 0 }}>
          <strong>Current mode:</strong> {errorMode}
        </p>
      </div>

      {(failedOps.length > 0 || recoveredOps.length > 0) && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(240px, 1fr))", gap: 12, marginBottom: 16 }}>
          <div style={{ padding: 16, backgroundColor: "#fde2e1", borderRadius: 6 }}>
            <h4>Failed Operations</h4>
            <ul>
              {failedOps.map((opId) => (
                <li key={opId}>{opId}</li>
              ))}
            </ul>
          </div>
          <div style={{ padding: 16, backgroundColor: "#d9f5e5", borderRadius: 6 }}>
            <h4>Recovered After Retry</h4>
            <ul>
              {recoveredOps.map((opId) => (
                <li key={opId}>{opId}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      <DataTable
        transport={transport}
        initialState={basicState}
        onReady={({ manager }) => {
          managerRef.current = manager;
          manager.subscribe((event) => {
            if (event.type === "failed") {
              failedSetRef.current.add(event.opId);
              setFailedOps(Array.from(failedSetRef.current));
            }
            if (event.type === "confirmed" && failedSetRef.current.has(event.opId)) {
              failedSetRef.current.delete(event.opId);
              setFailedOps(Array.from(failedSetRef.current));
              setRecoveredOps((prev) => (prev.includes(event.opId) ? prev : [...prev, event.opId]));
            }
          });
        }}
      />
    </section>
  );
}
