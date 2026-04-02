import React, { useMemo, useRef, useState } from "react";
import { DataTable } from "@advanced-datatable/ui";
import type { BatchResponse, IOperationTransport } from "@advanced-datatable/api-client";
import type { Operation } from "@advanced-datatable/core";
import type { IOperationManager } from "@advanced-datatable/operations";
import { Alert, Button, Card, Group, List, SimpleGrid, Stack, Text, Title } from "@mantine/core";
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
      <Title order={2}>Error Recovery</Title>
      <Text mb="md">
        This example demonstrates non-retryable failures versus retryable transport failures that
        recover automatically on the next attempt.
      </Text>

      <Alert color="yellow" mb="md">
        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="xs">
          <Button variant="default" onClick={() => updateMode("none")}>Normal</Button>
          <Button variant="default" onClick={() => updateMode("4xx")}>400 Non-Retryable</Button>
          <Button variant="default" onClick={() => updateMode("5xx")}>503 Retry Once</Button>
          <Button variant="default" onClick={() => updateMode("timeout")}>Timeout Retry Once</Button>
        </SimpleGrid>
        <Text mt="sm" fw={600}>Current mode: {errorMode}</Text>
      </Alert>

      {(failedOps.length > 0 || recoveredOps.length > 0) && (
        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md" mb="md">
          <Card withBorder radius="md" bg="red.0">
            <Title order={4} mb="xs">Failed Operations</Title>
            <List spacing={4} size="sm">
              {failedOps.map((opId) => (
                <List.Item key={opId}>{opId}</List.Item>
              ))}
            </List>
          </Card>
          <Card withBorder radius="md" bg="green.0">
            <Title order={4} mb="xs">Recovered After Retry</Title>
            <List spacing={4} size="sm">
              {recoveredOps.map((opId) => (
                <List.Item key={opId}>{opId}</List.Item>
              ))}
            </List>
          </Card>
        </SimpleGrid>
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
