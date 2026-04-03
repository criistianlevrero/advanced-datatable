import React, { useMemo, useRef, useState } from "react";
import { DataTable } from "@advanced-datatable/ui";
import type { BatchResponse, IOperationTransport } from "@advanced-datatable/api-client";
import type { BulkUpdateOperation, Operation, SetCellOperation } from "@advanced-datatable/core";
import { LocalStorageOperationPersistence } from "@advanced-datatable/operations";
import type { IConnectivityMonitor, IOperationManager } from "@advanced-datatable/operations";
import { Alert, Button, Group, Text, Title } from "@mantine/core";
import { resilienceState } from "../mocks/data";

/** Schedule a server-side `processed = value * 2` update for a confirmed set_cell/bulk_update. */
function scheduleProcessedUpdate(
  dispatchRef: React.MutableRefObject<((op: Operation) => void) | null>,
  op: Operation,
): void {
  if (op.type === "set_cell") {
    const setCellOp = op as SetCellOperation;
    if (setCellOp.colId === "value" && typeof setCellOp.value === "number") {
      const { rowId, value } = setCellOp;
      window.setTimeout(() => {
        dispatchRef.current?.({
          id: `${op.id}:processed`,
          type: "set_cell",
          source: "server",
          rowId,
          colId: "processed",
          value: (value as number) * 2,
          target: { type: "cell", rowId, colId: "processed" },
          ts: Date.now(),
        });
      }, 1200);
    }
  } else if (op.type === "bulk_update") {
    const bulkOp = op as BulkUpdateOperation;
    for (const update of bulkOp.updates) {
      if (update.colId === "value" && typeof update.value === "number") {
        const { rowId, value } = update;
        window.setTimeout(() => {
          dispatchRef.current?.({
            id: `${op.id}:processed:${rowId}`,
            type: "set_cell",
            source: "server",
            rowId,
            colId: "processed",
            value: (value as number) * 2,
            target: { type: "cell", rowId, colId: "processed" },
            ts: Date.now(),
          });
        }, 1200);
      }
    }
  }
}

export function ReplayOnReconnectExample(): React.ReactElement {
  const [isOnline, setIsOnline] = useState(true);
  const [pendingOps, setPendingOps] = useState(0);
  const [statusMessage, setStatusMessage] = useState("Online");
  const isOnlineRef = useRef(true);
  const listenersRef = useRef(new Set<(isOnlineValue: boolean) => void>());
  const managerRef = useRef<IOperationManager | null>(null);
  const dispatchRef = useRef<((op: Operation) => void) | null>(null);
  const pendingTransportSendsRef = useRef<
    Array<{
      ops: Operation[];
      resolve: (response: BatchResponse) => void;
    }>
  >([]);

  const buildConfirmedBatchResponse = (ops: Operation[]): BatchResponse => {
    // Simulate async server computation: Processed = Value * 2 (~1.2 s delay)
    for (const op of ops) {
      scheduleProcessedUpdate(dispatchRef, op);
    }

    return {
      results: ops.map((op) => ({ opId: op.id, status: "confirmed" })),
    };
  };

  const persistence = useMemo(
    () => new LocalStorageOperationPersistence("advanced-datatable.playground.replay"),
    [],
  );

  const connectivityMonitor = useMemo<IConnectivityMonitor>(
    () => ({
      isOnline: () => isOnlineRef.current,
      subscribe: (listener: (isOnlineValue: boolean) => void) => {
        listenersRef.current.add(listener);
        return () => {
          listenersRef.current.delete(listener);
        };
      },
    }),
    [],
  );

  const transport = useMemo<IOperationTransport>(
    () => ({
      async send(ops: Operation[]): Promise<BatchResponse> {
        await new Promise((resolve) => setTimeout(resolve, 250));
        if (!isOnlineRef.current) {
          // Keep sends pending while offline so manager records remain pending.
          return new Promise<BatchResponse>((resolve) => {
            pendingTransportSendsRef.current.push({ ops, resolve });
          });
        }

        return buildConfirmedBatchResponse(ops);
      },
      async loadTable() {
        return { schema: { columns: {}, columnOrder: [], version: 0 }, rows: [], rowOrder: [] };
      },
    }),
    [],
  );

  const toggleConnectivity = async () => {
    if (isOnlineRef.current) {
      isOnlineRef.current = false;
      setIsOnline(false);
      setStatusMessage("Offline — edits stay local and pending");
      return;
    }

    isOnlineRef.current = true;
    setIsOnline(true);
    setStatusMessage("Back online — replaying pending operations…");

    // First unblock sends that were waiting during offline mode.
    const queuedSends = pendingTransportSendsRef.current.splice(0);
    for (const queued of queuedSends) {
      queued.resolve(buildConfirmedBatchResponse(queued.ops));
    }

    // Let pending confirmations settle before triggering auto-replay listeners.
    await Promise.resolve();

    for (const listener of listenersRef.current) {
      listener(true);
    }
    await new Promise((resolve) => setTimeout(resolve, 600));
    setStatusMessage("Online");
  };

  const clearPersistedQueue = async () => {
    await persistence.clear();
    await managerRef.current?.replayPendingOperations();
    setPendingOps(managerRef.current?.getPendingOperations().length ?? 0);
  };

  return (
    <section>
      <Title order={2}>Replay On Reconnect</Title>
      <Text mb="md">
        Edit <strong>Value</strong> while offline — changes are queued locally and persisted. When connectivity
        returns the manager replays them automatically. The mock server then asynchronously computes{" "}
        <strong>Processed = Value × 2</strong> (~1.2 s after each confirmed op).
      </Text>

      <Alert color={isOnline ? "teal" : "red"} mb="md">
        <Text fw={600}>Status: {statusMessage}</Text>
        <Text>Connection: {isOnline ? "Online" : "Offline"}</Text>
        <Text mb="sm">Pending operations: {pendingOps}</Text>
        <Group gap="xs">
          <Button variant="default" onClick={() => void toggleConnectivity()}>
            {isOnline ? "Go Offline" : "Come Back Online"}
          </Button>
          <Button variant="default" onClick={() => void clearPersistedQueue()}>Clear Persisted Queue</Button>
        </Group>
      </Alert>

      <DataTable
        transport={transport}
        initialState={resilienceState}
        persistence={persistence}
        connectivityMonitor={connectivityMonitor}
        onReady={({ manager, store }) => {
          managerRef.current = manager;
          dispatchRef.current = store.getState().dispatch;
          setPendingOps(manager.getPendingOperations().length);
          manager.subscribe(() => {
            setPendingOps(manager.getPendingOperations().length);
          });
        }}
      />
    </section>
  );
}

