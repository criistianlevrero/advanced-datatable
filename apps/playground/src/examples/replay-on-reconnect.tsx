import React, { useMemo, useRef, useState } from "react";
import { DataTable } from "@advanced-datatable/ui";
import type { BatchResponse, IOperationTransport } from "@advanced-datatable/api-client";
import type { Operation } from "@advanced-datatable/core";
import { LocalStorageOperationPersistence } from "@advanced-datatable/operations";
import type { IConnectivityMonitor, IOperationManager } from "@advanced-datatable/operations";
import { Alert, Button, Group, Text, Title } from "@mantine/core";
import { basicState } from "../mocks/data";

export function ReplayOnReconnectExample(): React.ReactElement {
  const [isOnline, setIsOnline] = useState(true);
  const [pendingOps, setPendingOps] = useState(0);
  const [statusMessage, setStatusMessage] = useState("Online");
  const isOnlineRef = useRef(true);
  const listenersRef = useRef(new Set<(isOnlineValue: boolean) => void>());
  const managerRef = useRef<IOperationManager | null>(null);

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
          const error = new Error("Offline: request queued for replay") as Error & {
            status: number;
            retryable: boolean;
          };
          error.status = 503;
          error.retryable = true;
          throw error;
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

  const toggleConnectivity = async () => {
    if (isOnlineRef.current) {
      isOnlineRef.current = false;
      setIsOnline(false);
      setStatusMessage("Offline - edits stay local and pending");
      return;
    }

    isOnlineRef.current = true;
    setIsOnline(true);
    setStatusMessage("Back online - replaying pending operations...");
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
        This example simulates offline edits. While disconnected, operations remain pending and are
        persisted locally. When connectivity returns, the manager replays them automatically.
      </Text>

      <Alert color={isOnline ? "teal" : "red"} mb="md">
        <Text fw={600}>Status: {statusMessage}</Text>
        <Text>Connection: {isOnline ? "Online" : "Offline"}</Text>
        <Text mb="sm">Pending operations: {pendingOps}</Text>
        <Group gap="xs">
          <Button variant="default" onClick={toggleConnectivity}>
            {isOnline ? "Go Offline" : "Come Back Online"}
          </Button>
          <Button variant="default" onClick={() => void clearPersistedQueue()}>Clear Persisted Queue</Button>
        </Group>
      </Alert>

      <DataTable
        transport={transport}
        initialState={basicState}
        persistence={persistence}
        connectivityMonitor={connectivityMonitor}
        onReady={({ manager }) => {
          managerRef.current = manager;
          setPendingOps(manager.getPendingOperations().length);
          manager.subscribe(() => {
            setPendingOps(manager.getPendingOperations().length);
          });
        }}
      />
    </section>
  );
}
