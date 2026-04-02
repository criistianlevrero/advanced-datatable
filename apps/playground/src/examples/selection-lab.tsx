import React from "react";
import { Alert, Card, Group, List, Stack, Text, Title } from "@mantine/core";
import { IconInfoCircle } from "@tabler/icons-react";
import { DataTable, Grid } from "@advanced-datatable/ui";
import { mockTransport } from "../mocks/mockTransport";
import { selectionLabState } from "../mocks/selection-lab-data";

export function SelectionLabExample(): React.ReactElement {
  return (
    <section>
      <Stack gap="md">
        <div>
          <Title order={3} className="text-red-500">Selection and Paste Lab (10 x 30)</Title>
          <Text c="dimmed" size="sm">
            Test table for range selection, copy/paste, and behavior with read-only columns and cells.
          </Text>
        </div>

        <Card withBorder radius="md" padding="md">
          <Group mb="xs">
            <IconInfoCircle size={18} />
            <Title order={5}>Keyboard navigation instructions</Title>
          </Group>
          <List size="sm" spacing={4}>
            <List.Item>Click to select the active cell</List.Item>
            <List.Item>Shift + click or Shift + arrows to extend selection</List.Item>
            <List.Item>Ctrl/Cmd + click to add an independent range</List.Item>
            <List.Item>Use arrows to move focus</List.Item>
            <List.Item>Tab and Shift + Tab to navigate horizontally</List.Item>
            <List.Item>Ctrl/Cmd + A to select the full visible range</List.Item>
            <List.Item>Ctrl/Cmd + C and Ctrl/Cmd + V to copy/paste TSV</List.Item>
            <List.Item>Enter to edit the active cell (if not read-only)</List.Item>
            <List.Item>Escape to clear cell selection</List.Item>
          </List>
        </Card>

        <Alert color="gray" variant="light" title="Read-only setup for testing">
          <Text size="sm">Read-only columns: ID and Status.</Text>
          <Text size="sm">Read-only cells: some cells in Notes (every 5 rows).</Text>
          <Text size="sm">Non-resizable columns: ID and Status. The rest can be resized from the header.</Text>
        </Alert>
          <DataTable
            transport={mockTransport}
            initialState={selectionLabState}
            viewStatePersistence={{ key: "selection-lab", includeCellSelection: true }}
          >
          <Grid showFilters resizableColumns />
        </DataTable>
      </Stack>
    </section>
  );
}
