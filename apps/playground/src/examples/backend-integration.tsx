import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, Badge, Button, Card, Code, Group, Stack, Text, Title } from "@mantine/core";
import { DataTable, Grid } from "@advanced-datatable/ui";
import type { BatchResponse, IOperationTransport, TableLoadResponse } from "@advanced-datatable/api-client";
import type { ColumnSchema, Operation, TableState } from "@advanced-datatable/core";
import { BACKEND_URL, useBackendConfig } from "../backend/BackendConfigContext";

type LoadedState = {
  schema: TableState["schema"];
  rows: TableState["rows"];
  rowOrder: string[];
};

type ReadyApi = {
  manager: {
    getPendingOperations: () => Array<unknown>;
    subscribe: (listener: () => void) => () => void;
  };
  store: {
    getState: () => {
      dispatch: (operation: Operation) => void;
    };
  };
};

interface PullResponse {
  cursor: number;
  operations: Operation[];
}

interface BackendIntegrationTransportOptions {
  baseUrl: string;
}

class BackendIntegrationTransport implements IOperationTransport {
  private readonly baseUrl: string;

  constructor(options: BackendIntegrationTransportOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, "");
  }

  async send(ops: Operation[]): Promise<BatchResponse> {
    // Server-originated pull operations are confirmed locally and never posted back.
    const serverOps = ops.filter((op) => op.source === "server");
    const clientOps = ops.filter((op) => op.source !== "server");

    const localResults = serverOps.map((op) => ({ opId: op.id, status: "confirmed" as const }));

    if (clientOps.length === 0) {
      return { results: localResults };
    }

    // Send only partial operations; never send full table snapshots.
    const payload = {
      operations: clientOps,
    };

    const response = await fetch(`${this.baseUrl}/backend-integration/operations`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Backend integration send failed: ${response.status} ${response.statusText}`);
    }

    const remote = (await response.json()) as BatchResponse;
    return { results: [...localResults, ...remote.results] };
  }

  async loadTable(): Promise<TableLoadResponse> {
    const response = await fetch(`${this.baseUrl}/backend-integration/table`);

    if (!response.ok) {
      throw new Error(`Backend integration loadTable failed: ${response.status} ${response.statusText}`);
    }

    return response.json() as Promise<TableLoadResponse>;
  }
}

function toPartialInitialState(table: TableLoadResponse): LoadedState {
  return {
    schema: {
      columns: table.schema.columns as Record<string, ColumnSchema>,
      columnOrder: table.schema.columnOrder,
      version: table.schema.version,
    },
    rows: new Map(table.rows.map((row) => [row.id, row] as const)),
    rowOrder: table.rowOrder,
  };
}

export function BackendIntegrationExample(): React.ReactElement {
  const { backendStatus, refreshStatus } = useBackendConfig();
  const [initialState, setInitialState] = useState<LoadedState | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [pullCursor, setPullCursor] = useState(0);
  const [lastPullCount, setLastPullCount] = useState(0);
  const [lastPullAt, setLastPullAt] = useState<number | null>(null);
  const [pendingOps, setPendingOps] = useState(0);
  const apiRef = useRef<ReadyApi | null>(null);
  const pullInFlightRef = useRef(false);

  const transport = useMemo(() => new BackendIntegrationTransport({ baseUrl: BACKEND_URL }), []);

  const loadTable = useCallback(async () => {
    setLoading(true);
    setLoadError(null);

    try {
      const table = await transport.loadTable();
      setInitialState(toPartialInitialState(table));
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : String(error));
    } finally {
      setLoading(false);
    }
  }, [transport]);

  const pullChanges = useCallback(async () => {
    if (!apiRef.current || pullInFlightRef.current) {
      return;
    }

    pullInFlightRef.current = true;

    try {
      // Pull only delta operations since the last cursor.
      const response = await fetch(`${BACKEND_URL}/backend-integration/pull?since=${pullCursor}`);
      if (!response.ok) {
        throw new Error(`Pull failed: ${response.status} ${response.statusText}`);
      }

      const payload = (await response.json()) as PullResponse;
      setPullCursor(payload.cursor);
      setLastPullCount(payload.operations.length);
      setLastPullAt(Date.now());

      // Apply each server delta as a partial operation.
      for (const operation of payload.operations) {
        apiRef.current.store.getState().dispatch(operation);
      }
    } catch (error) {
      console.warn("[BackendIntegrationExample] pull failed", error);
    } finally {
      pullInFlightRef.current = false;
    }
  }, [pullCursor]);

  useEffect(() => {
    void refreshStatus();
    void loadTable();
  }, [loadTable, refreshStatus]);

  useEffect(() => {
    if (!initialState) {
      return;
    }

    const intervalId = window.setInterval(() => {
      void pullChanges();
    }, 1500);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [initialState, pullChanges]);

  return (
    <Stack gap="lg">
      <div>
        <Title order={3}>Backend Integration (Partial Ops + Polling)</Title>
        <Text c="dimmed" mt="sm">
          Edit only column <Code>value</Code>. Backend computes <Code>processed = value * 2</Code> asynchronously and frontend
          receives it via polling deltas.
        </Text>
      </div>

      <Group>
        <Badge color={backendStatus === "online" ? "teal" : backendStatus === "offline" ? "red" : "gray"}>
          backend {backendStatus}
        </Badge>
        <Badge variant="light">pending ops {pendingOps}</Badge>
        <Badge variant="light" color="blue">pull cursor {pullCursor}</Badge>
        <Badge variant="light" color="grape">last pull changes {lastPullCount}</Badge>
        <Button variant="default" onClick={() => void pullChanges()}>
          Pull now
        </Button>
        <Button variant="light" onClick={() => void loadTable()}>
          Reload table
        </Button>
      </Group>

      <Alert color="blue" variant="light">
        Outbound payloads are partial operations only. Poll responses are also partial operation deltas; no full-table sync is used after initial load.
      </Alert>

      {lastPullAt ? (
        <Text size="sm" c="dimmed">
          Last pull at {new Date(lastPullAt).toLocaleTimeString()}.
        </Text>
      ) : null}

      {backendStatus === "offline" ? (
        <Alert color="yellow">
          Backend is offline. Start it with <Code>npm run mock-backend</Code>.
        </Alert>
      ) : null}

      {loadError ? (
        <Alert color="red">
          Failed to load table from backend: <Code>{loadError}</Code>
        </Alert>
      ) : null}

      <Card withBorder radius="md" padding="md">
        <Text size="sm" c="dimmed">
          Columns <Code>id</Code>, <Code>name</Code>, <Code>team</Code>, and <Code>processed</Code> are read-only.
          Only <Code>value</Code> is editable to trigger backend processing.
        </Text>
      </Card>

      {initialState && !loading ? (
        <DataTable
          key={JSON.stringify({ rowCount: initialState.rowOrder.length, version: initialState.schema.version })}
          transport={transport}
          initialState={initialState}
          onReady={(api) => {
            apiRef.current = api;
            setPendingOps(api.manager.getPendingOperations().length);
            api.manager.subscribe(() => {
              setPendingOps(api.manager.getPendingOperations().length);
            });
          }}
        >
          <Grid showFilters resizableColumns />
        </DataTable>
      ) : (
        <Alert color="gray">Loading backend table...</Alert>
      )}
    </Stack>
  );
}
