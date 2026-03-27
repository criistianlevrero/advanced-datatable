import React, { useMemo, useRef, useState } from "react";
import { DataTable } from "@advanced-datatable/ui";
import type { BatchResponse, IOperationTransport } from "@advanced-datatable/api-client";
import type { Operation } from "@advanced-datatable/core";
import { basicState } from "../mocks/data";

export function PartialResponseExample(): React.ReactElement {
  const [dropRate, setDropRate] = useState(0);
  const [lastBatchSize, setLastBatchSize] = useState(0);
  const [droppedOps, setDroppedOps] = useState<string[]>([]);
  const [failedOps, setFailedOps] = useState<string[]>([]);
  const dropRateRef = useRef(0);

  const transport = useMemo<IOperationTransport>(
    () => ({
      async send(ops: Operation[]): Promise<BatchResponse> {
        setLastBatchSize(ops.length);
        await new Promise((resolve) => setTimeout(resolve, 200));

        const currentDropRate = dropRateRef.current;
        const dropCount = Math.min(ops.length, Math.ceil(ops.length * (currentDropRate / 100)));
        const confirmedOps = ops.slice(0, Math.max(0, ops.length - dropCount));
        const dropped = ops.slice(ops.length - dropCount).map((op) => op.id);
        setDroppedOps(dropped);

        return {
          results: confirmedOps.map((op) => ({ opId: op.id, status: "confirmed" })),
        };
      },
      async loadTable() {
        return { schema: { columns: {}, columnOrder: [], version: 0 }, rows: [], rowOrder: [] };
      },
    }),
    [],
  );

  return (
    <section>
      <h2>Partial Response Handling</h2>
      <p>
        The transport returns only part of the batch response. Missing operation results are treated
        as failures by the manager, which makes the gap visible immediately.
      </p>

      <div style={{ marginBottom: 16, padding: 16, backgroundColor: "#e7f3ff", borderRadius: 6 }}>
        <label style={{ display: "block", marginBottom: 8 }}>
          Drop rate: <strong>{dropRate}%</strong>
        </label>
        <input
          type="range"
          min="0"
          max="100"
          step="10"
          value={dropRate}
          onChange={(event) => {
            const next = Number(event.target.value);
            dropRateRef.current = next;
            setDropRate(next);
          }}
          style={{ width: "100%" }}
        />
        <p style={{ marginTop: 12, marginBottom: 0 }}>
          Last batch size: {lastBatchSize} | Dropped results: {droppedOps.length} | Failed ops: {failedOps.length}
        </p>
      </div>

      {(droppedOps.length > 0 || failedOps.length > 0) && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(240px, 1fr))", gap: 12, marginBottom: 16 }}>
          <div style={{ padding: 16, backgroundColor: "#fff3cd", borderRadius: 6 }}>
            <h4>Dropped From Response</h4>
            <ul>
              {droppedOps.map((opId) => (
                <li key={opId}>{opId}</li>
              ))}
            </ul>
          </div>
          <div style={{ padding: 16, backgroundColor: "#fde2e1", borderRadius: 6 }}>
            <h4>Failed In Manager</h4>
            <ul>
              {failedOps.map((opId) => (
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
          manager.subscribe((event) => {
            if (event.type === "failed") {
              setFailedOps((prev) => (prev.includes(event.opId) ? prev : [...prev, event.opId]));
            }
            if (event.type === "confirmed") {
              setFailedOps((prev) => prev.filter((opId) => opId !== event.opId));
            }
          });
        }}
      />
    </section>
  );
}
