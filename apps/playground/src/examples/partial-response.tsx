import React, { useMemo, useRef, useState } from "react";
import { DataTable } from "@advanced-datatable/ui";
import type { BatchResponse, IOperationTransport } from "@advanced-datatable/api-client";
import type { BulkUpdateOperation, Operation, SetCellOperation } from "@advanced-datatable/core";
import { Alert, Card, Group, List, Slider, Stack, Text, Title } from "@mantine/core";
import { resilienceState } from "../mocks/data";

export function PartialResponseExample(): React.ReactElement {
  const [dropRate, setDropRate] = useState(0);
  const [lastBatchSize, setLastBatchSize] = useState(0);
  const [droppedOps, setDroppedOps] = useState<string[]>([]);
  const [failedOps, setFailedOps] = useState<string[]>([]);
  const dropRateRef = useRef(0);
  const dispatchRef = useRef<((op: Operation) => void) | null>(null);

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

        // Schedule Processed = Value × 2 only for confirmed ops (~1.2 s delay).
        // Dropped ops get no confirmation so Processed stays unchanged.
        for (const op of confirmedOps) {
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
      <Title order={2}>Partial Response Handling</Title>
      <Text mb="md">
        The transport intentionally omits results for some ops. The manager marks missing results as
        failed. Edit <strong>Value</strong>: if the op is confirmed the mock server computes{" "}
        <strong>Processed = Value × 2</strong> (~1.2 s delay). Dropped ops leave{" "}
        <strong>Processed</strong> unchanged.
      </Text>

      <Alert color="blue" variant="light" mb="md">
        <Stack gap="sm">
          <div>
            <Text fw={600} mb={4}>Drop rate: {dropRate}%</Text>
            <Slider
              min={0}
              max={100}
              step={10}
              label={(v) => `${v}%`}
              value={dropRate}
              onChange={(next) => {
                dropRateRef.current = next;
                setDropRate(next);
              }}
            />
          </div>
          <Group gap="md">
            <Text size="sm">Last batch: {lastBatchSize}</Text>
            <Text size="sm">Dropped results: {droppedOps.length}</Text>
            <Text size="sm">Failed in manager: {failedOps.length}</Text>
          </Group>
        </Stack>
      </Alert>

      {(droppedOps.length > 0 || failedOps.length > 0) && (
        <Group grow align="start" mb="md">
          <Card withBorder radius="md" bg="yellow.0">
            <Title order={4} mb="xs">Dropped From Response</Title>
            <List spacing={4} size="sm">
              {droppedOps.map((opId) => (
                <List.Item key={opId}>{opId}</List.Item>
              ))}
            </List>
          </Card>
          <Card withBorder radius="md" bg="red.0">
            <Title order={4} mb="xs">Failed In Manager</Title>
            <List spacing={4} size="sm">
              {failedOps.map((opId) => (
                <List.Item key={opId}>{opId}</List.Item>
              ))}
            </List>
          </Card>
        </Group>
      )}

      <DataTable
        transport={transport}
        initialState={resilienceState}
        onReady={({ manager, store }) => {
          dispatchRef.current = store.getState().dispatch;
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

