import React from "react";
import { DataTable, GridVirtualized } from "@advanced-datatable/ui";
import { Title, Text, Group, Badge } from "@mantine/core";
import { mockTransport } from "../mocks/mockTransport";
import type { TableSchema, TableState, Row } from "@advanced-datatable/core";
import type { GridProps } from "@advanced-datatable/ui";

// Generate 10,000 rows for virtualization demo
function generateLargeDataset(): { schema: TableSchema; state: TableState } {
  const schema: TableSchema = {
    columns: {
      id: { id: "id", title: "ID", type: "string", width: 80 },
      name: { id: "name", title: "Name", type: "string", width: 150 },
      email: { id: "email", title: "Email", type: "string", width: 200 },
      value: { id: "value", title: "Value", type: "number", width: 100 },
      active: { id: "active", title: "Active", type: "boolean", width: 80 },
      created: { id: "created", title: "Created", type: "date", width: 130 },
    },
    columnOrder: ["id", "name", "email", "value", "active", "created"],
    version: 1,
  };

  const rows: Map<string, Row> = new Map();
  const rowOrder: string[] = [];

  for (let i = 1; i <= 10000; i++) {
    const id = `row-${i}`;
    rowOrder.push(id);
    rows.set(id, {
      id,
      cells: {
        id: { value: id },
        name: { value: `User ${i}` },
        email: { value: `user${i}@example.com` },
        value: { value: Math.floor(Math.random() * 10000) },
        active: { value: Math.random() > 0.5 },
        created: { 
          value: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000)
            .toISOString()
            .split("T")[0] 
        },
      },
    });
  }

  return {
    schema,
    state: {
      schema,
      rows,
      rowOrder,
    },
  };
}

export function VirtualizationExample(): React.ReactElement {
  const { schema, state } = React.useMemo(() => generateLargeDataset(), []);
  const VirtualizedGridComponent = React.useCallback(
    (props: GridProps) => (
      <GridVirtualized
        {...props}
        height="600px"
        estimateSize={40}
        overscan={6}
        selectable={true}
        showFilters={true}
        stickyHeader={true}
        resizableColumns={true}
      />
    ),
    [],
  );

  return (
    <section className="space-y-4">
      <div>
        <Title order={2}>Virtualization Demo - 10,000 Rows</Title>
        <Group mb="md">
          <Badge size="lg" variant="light">
            10,000 rows
          </Badge>
          <Badge size="lg" variant="light" color="blue">
            {schema.columnOrder.length} columns
          </Badge>
          <Badge size="lg" variant="light" color="green">
            @tanstack/react-virtual
          </Badge>
        </Group>
        <Text mb="md" size="sm" color="dimmed">
          This demo uses <code>@tanstack/react-virtual</code> to efficiently render only visible rows. 
          Scroll smoothly through 10,000 rows without performance degradation. Try sorting, filtering, 
          selecting cells, and editing—all virtualized features work seamlessly.
        </Text>
      </div>

      <DataTable
        transport={mockTransport}
        initialState={state}
        GridComponent={VirtualizedGridComponent}
      />
    </section>
  );
}
