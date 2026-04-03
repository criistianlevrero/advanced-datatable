import React, { useMemo, useRef, useState } from "react";
import { DataTable } from "@advanced-datatable/ui";
import type { BatchResponse, IOperationTransport } from "@advanced-datatable/api-client";
import type { BulkUpdateOperation, Operation, SetCellOperation } from "@advanced-datatable/core";
import type { IOperationManager } from "@advanced-datatable/operations";
import { Alert, Button, Card, Group, List, SimpleGrid, Text, Title } from "@mantine/core";
import { resilienceState } from "../mocks/data";

type ErrorMode = "none" | "4xx" | "5xx" | "timeout";

export function ErrorRecoveryExample(): React.ReactElement {
  const [errorMode, setErrorMode] = useState<ErrorMode>("none");
  const [retryingOps, setRetryingOps] = useState<string[]>([]);
  const [failedOps, setFailedOps] = useState<string[]>([]);
  const [recoveredOps, setRecoveredOps] = useState<string[]>([]);
  const errorModeRef = useRef<ErrorMode>("none");
  const attemptMapRef = useRef(new Map<string, number>());
  const retryingSetRef = useRef(new Set<string>());
  const failedSetRef = useRef(new Set<string>());
  const managerRef = useRef<IOperationManager | null>(null);
  const dispatchRef = useRef<((op: Operation) => void) | null>(null);

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
            const nextAttempt = (attemptMapRef.current.get(op.id) ?? 0) + 1;
            attemptMapRef.current.set(op.id, nextAttempt);
          }
          if (firstAttemptHasToFail) {
            const retryingOpIds = ops.map((op) => op.id);
            for (const opId of retryingOpIds) {
              retryingSetRef.current.add(opId);
            }
            setRetryingOps(Array.from(retryingSetRef.current));

            const error = new Error(
              errorModeRef.current === "5xx" ? "Temporary server error" : "Request timeout",
            ) as Error & { status?: number; retryable: boolean };
            if (errorModeRef.current === "5xx") {
              error.status = 503;
            }
            error.retryable = true;
            throw error;
          }

          const recoveredOpIds = ops
            .filter((op) => (attemptMapRef.current.get(op.id) ?? 0) > 1)
            .map((op) => op.id);

          if (recoveredOpIds.length > 0) {
            for (const opId of recoveredOpIds) {
              retryingSetRef.current.delete(opId);
              failedSetRef.current.delete(opId);
            }
            setRetryingOps(Array.from(retryingSetRef.current));
            setFailedOps(Array.from(failedSetRef.current));
            setRecoveredOps((prev) => Array.from(new Set([...prev, ...recoveredOpIds])));
          }
        }

        // Simulate async server computation: Processed = Value × 2 (~1.2 s delay)
        for (const op of ops) {
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
    setRetryingOps([]);
    setFailedOps([]);
    setRecoveredOps([]);
    retryingSetRef.current.clear();
    failedSetRef.current.clear();
    attemptMapRef.current.clear();
  };

  return (
    <section>
      <Title order={2}>Error Recovery</Title>
      <Text mb="md">
        Edit <strong>Value</strong> under different error modes. On success the mock server asynchronously
        computes <strong>Processed = Value × 2</strong> (~1.2 s delay). Non-retryable errors (4xx) discard the
        op; retryable ones (5xx, timeout) recover automatically on the next attempt.
      </Text>

      <Alert color="yellow" mb="md">
        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="xs">
          <Button variant="default" onClick={() => updateMode("none")}>Normal</Button>
          <Button variant="default" onClick={() => updateMode("4xx")}>400 Non-Retryable</Button>
          <Button variant="default" onClick={() => updateMode("5xx")}>503 Retry Once</Button>
          <Button variant="default" onClick={() => updateMode("timeout")}>Timeout Retry Once</Button>
        </SimpleGrid>
        <Text mt="sm" fw={600}>Current mode: {errorMode}</Text>
        <Text mt="xs" size="sm" c="dimmed">
          <strong>Normal:</strong> confirms immediately and updates <strong>Processed</strong> after ~1.2s. {" "}
          <strong>400:</strong> final failure, appears in <strong>Failed Operations</strong>. {" "}
          <strong>503 / timeout:</strong> appears briefly in <strong>Retrying...</strong>, then moves to {" "}
          <strong>Recovered After Retry</strong> if the second attempt succeeds.
        </Text>
      </Alert>

      {(retryingOps.length > 0 || failedOps.length > 0 || recoveredOps.length > 0) && (
        <SimpleGrid cols={{ base: 1, md: 3 }} spacing="md" mb="md">
          <Card withBorder radius="md" bg="yellow.0">
            <Title order={4} mb="xs">Retrying...</Title>
            <List spacing={4} size="sm">
              {retryingOps.length > 0 ? (
                retryingOps.map((opId) => <List.Item key={opId}>{opId}</List.Item>)
              ) : (
                <List.Item c="dimmed">No retrying operations</List.Item>
              )}
            </List>
          </Card>
          <Card withBorder radius="md" bg="red.0">
            <Title order={4} mb="xs">Failed Operations</Title>
            <List spacing={4} size="sm">
              {failedOps.length > 0 ? (
                failedOps.map((opId) => <List.Item key={opId}>{opId}</List.Item>)
              ) : (
                <List.Item c="dimmed">No final failures</List.Item>
              )}
            </List>
          </Card>
          <Card withBorder radius="md" bg="green.0">
            <Title order={4} mb="xs">Recovered After Retry</Title>
            <List spacing={4} size="sm">
              {recoveredOps.length > 0 ? (
                recoveredOps.map((opId) => <List.Item key={opId}>{opId}</List.Item>)
              ) : (
                <List.Item c="dimmed">No recovered operations yet</List.Item>
              )}
            </List>
          </Card>
        </SimpleGrid>
      )}

      <DataTable
        transport={transport}
        initialState={resilienceState}
        batcherOptions={{ debounceMs: 50, maxRetries: 1, baseRetryDelayMs: 250, jitterRatio: 0 }}
        onReady={({ manager, store }) => {
          managerRef.current = manager;
          dispatchRef.current = store.getState().dispatch;
          manager.subscribe((event) => {
            if (event.type === "failed") {
              if (errorModeRef.current === "4xx") {
                failedSetRef.current.add(event.opId);
                setFailedOps(Array.from(failedSetRef.current));
              }
            }
            if (event.type === "confirmed") {
              if (retryingSetRef.current.has(event.opId)) {
                retryingSetRef.current.delete(event.opId);
                setRetryingOps(Array.from(retryingSetRef.current));
                setRecoveredOps((prev) => (prev.includes(event.opId) ? prev : [...prev, event.opId]));
              }

              if (failedSetRef.current.has(event.opId)) {
                failedSetRef.current.delete(event.opId);
                setFailedOps(Array.from(failedSetRef.current));
              }
            }
          });
        }}
      />
    </section>
  );
}

