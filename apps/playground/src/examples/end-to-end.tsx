import React, { useCallback, useContext, useMemo, useState } from "react";
import { Alert, Badge, Button, Card, Code, Group, ScrollArea, Stack, Text, Title } from "@mantine/core";
import { DataTable, Grid } from "@advanced-datatable/ui";
import { HttpTransport } from "@advanced-datatable/api-client";
import { BrowserConnectivityMonitor, LocalStorageOperationPersistence } from "@advanced-datatable/operations";
import { DataTableContext } from "@advanced-datatable/react";
import { BACKEND_URL, CONFLICT_OP_ID, useBackendConfig } from "../backend/BackendConfigContext";

interface OpLogEntry {
  opId: string;
  type: "applied" | "confirmed" | "failed";
  timestamp: number;
}

function StatusBadge({ status }: { status: "checking" | "online" | "offline" }) {
  const colors: Record<string, string> = {
    checking: "#888",
    online: "#1f8f5f",
    offline: "#c0392b",
  };
  const labels: Record<string, string> = {
    checking: "Checking…",
    online: "Online",
    offline: "Offline",
  };
  return (
    <span
      style={{
        display: "inline-block",
        padding: "2px 10px",
        borderRadius: 12,
        fontSize: 13,
        fontWeight: 600,
        color: "#fff",
        backgroundColor: colors[status],
      }}
    >
      {labels[status]}
    </span>
  );
}

function EndToEndControls(): React.ReactElement {
  const store = useContext(DataTableContext);

  const dispatchConflictOp = () => {
    store?.getState().dispatch({
      id: CONFLICT_OP_ID,
      type: "set_cell",
      source: "client",
      rowId: "r1",
      colId: "name",
      value: `Conflict-${Date.now()}`,
      target: { type: "cell", rowId: "r1", colId: "name" },
    });
  };

  const dispatchRegularOp = () => {
    store?.getState().dispatch({
      id: `playground-regular-${Date.now()}`,
      type: "set_cell",
      source: "client",
      rowId: "r2",
      colId: "name",
      value: `Normal-${Date.now()}`,
      target: { type: "cell", rowId: "r2", colId: "name" },
    });
  };

  return (
    <Card withBorder radius="md" mb="md">
      <Group justify="space-between" align="center">
        <div>
          <Title order={4}>Manual Operations</Title>
          <Text size="sm" c="dimmed">
            Useful for validating normal confirmations and the controlled conflict by opId.
          </Text>
        </div>
        <Badge variant="light" color="orange">{CONFLICT_OP_ID}</Badge>
      </Group>
      <Group mt="md">
        <Button variant="default" onClick={dispatchRegularOp}>Dispatch regular operation</Button>
        <Button color="red" onClick={dispatchConflictOp}>Dispatch conflict operation</Button>
      </Group>
    </Card>
  );
}

export function EndToEndExample(): React.ReactElement {
  const { backendStatus, appliedConfig, refreshStatus } = useBackendConfig();
  const [pendingOps, setPendingOps] = useState(0);
  const [opLog, setOpLog] = useState<OpLogEntry[]>([]);

  const transport = useMemo(() => new HttpTransport({ baseUrl: BACKEND_URL }), []);
  const persistence = useMemo(
    () => new LocalStorageOperationPersistence("advanced-datatable.playground.e2e"),
    [],
  );
  const connectivityMonitor = useMemo(() => new BrowserConnectivityMonitor(), []);

  const addToLog = useCallback((entry: OpLogEntry) => {
    setOpLog((prev) => [entry, ...prev].slice(0, 30));
  }, []);

  return (
    <Stack gap="lg">
      <div>
        <Title order={3}>End-to-End HTTP Demo</Title>
        <Text c="dimmed" mt="sm">
          This view uses <Code>HttpTransport</Code> against the real backend. Configuration is shared from the global drawer.
        </Text>
      </div>

      <Group>
        <Badge color={backendStatus === "online" ? "teal" : backendStatus === "offline" ? "red" : "gray"}>
          backend {backendStatus}
        </Badge>
        <Badge variant="light">pending ops {pendingOps}</Badge>
        {appliedConfig ? (
          <Badge variant="light" color="blue">
            latency {appliedConfig.latencyMs} ms | errors {(appliedConfig.errorRate * 100).toFixed(0)}%
          </Badge>
        ) : null}
        <Button variant="default" onClick={() => void refreshStatus()}>
          Refresh status
        </Button>
      </Group>

      {backendStatus === "offline" ? (
        <Alert color="yellow">
          The backend is not running. Run <Code>npm run mock-backend</Code> and then refresh status.
        </Alert>
      ) : null}

      {appliedConfig ? (
        <Alert color="blue">
          Current config: latency {appliedConfig.latencyMs} ms, errors {(appliedConfig.errorRate * 100).toFixed(0)}%,
          partial {appliedConfig.partialResponseMode ? "on" : "off"}, conflicts {appliedConfig.conflictOpIds.length}.
        </Alert>
      ) : null}

      <EndToEndControls />

      {opLog.length > 0 ? (
        <Card withBorder radius="md">
          <Group justify="space-between" mb="sm">
            <Title order={4}>Operation Log</Title>
            <Button variant="subtle" size="compact-sm" onClick={() => setOpLog([])}>
              Clear
            </Button>
          </Group>
          <ScrollArea h={180} offsetScrollbars>
            <Stack gap={4}>
              {opLog.map((entry, index) => {
                const color = entry.type === "confirmed" ? "teal" : entry.type === "failed" ? "red" : "blue";
                return (
                  <Group key={`${entry.opId}-${entry.timestamp}-${index}`} gap="xs">
                    <Text ff="monospace" size="xs" c="dimmed">
                      {new Date(entry.timestamp).toLocaleTimeString()}
                    </Text>
                    <Badge size="xs" color={color} variant="light">
                      {entry.type}
                    </Badge>
                    <Code>{entry.opId}</Code>
                  </Group>
                );
              })}
            </Stack>
          </ScrollArea>
        </Card>
      ) : null}

      <DataTable
        transport={transport}
        persistence={persistence}
        connectivityMonitor={connectivityMonitor}
        onReady={({ manager }) => {
          setPendingOps(manager.getPendingOperations().length);
          manager.subscribe((event) => {
            setPendingOps(manager.getPendingOperations().length);
            const type =
              event.type === "applied"
                ? "applied"
                : event.type === "confirmed"
                  ? "confirmed"
                  : "failed";
            addToLog({ opId: event.opId, type, timestamp: Date.now() });
          });
        }}
      >
        <Grid />
      </DataTable>
    </Stack>
  );
}
