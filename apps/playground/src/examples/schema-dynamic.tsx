import React, { useContext } from "react";
import { DataTable, Grid } from "@advanced-datatable/ui";
import { DataTableContext, useDataTable } from "@advanced-datatable/react";
import { mockTransport } from "../mocks/mockTransport";
import { Button, Group, Title } from "@mantine/core";

function SchemaControls() {
  const store = useContext(DataTableContext);
  const schema = useDataTable((s) => s.getSchema());
  const rowOrder = useDataTable((s) => s.getRowOrder());

  const handleAddColumn = () => {
    const isFirstColumn = schema.columnOrder.length === 0;
    const id = isFirstColumn ? "label" : `col_${Date.now()}`;
    const title = isFirstColumn ? "Label" : `Column ${Object.keys(schema.columns).length + 1}`;

    store?.getState().dispatch({
      id: `add-col-${id}`,
      type: "add_column",
      source: "client",
      column: { id, type: "string", title },
    });

    if (id === "label" && rowOrder.length > 0) {
      store?.getState().dispatch({
        id: `fill-label-${Date.now()}`,
        type: "bulk_update",
        source: "client",
        updates: rowOrder.map((rowId, index) => ({
          rowId,
          colId: "label",
          value: `row ${index + 1}`,
        })),
      });
    }
  };

  const handleRemoveLast = () => {
    const lastId = schema.columnOrder.at(-1);
    if (!lastId) return;
    store?.getState().dispatch({
      id: `rm-col-${lastId}-${Date.now()}`,
      type: "remove_column",
      source: "client",
      columnId: lastId,
    });
  };

  const handleAddRow = () => {
    const id = `r${Date.now()}`;
    const nextRowNumber = rowOrder.length + 1;
    const cells = Object.fromEntries(
      schema.columnOrder.map((colId) => [colId, { value: colId === "label" ? `row ${nextRowNumber}` : "" }]),
    ) as Record<string, { value: string }>;

    store?.getState().dispatch({
      id: `add-row-${id}`,
      type: "add_row",
      source: "client",
      row: { id, cells },
    });
  };

  const handleRemoveLastRow = () => {
    const lastRowId = rowOrder.at(-1);
    if (!lastRowId) return;

    store?.getState().dispatch({
      id: `rm-row-${lastRowId}-${Date.now()}`,
      type: "remove_row",
      source: "client",
      rowId: lastRowId,
    });
  };

  return (
    <Group mb="sm">
      <Button variant="default" onClick={handleAddColumn}>Add column</Button>
      <Button variant="default" onClick={handleRemoveLast}>Remove last column</Button>
      <Button variant="default" onClick={handleAddRow}>Add row</Button>
      <Button variant="default" onClick={handleRemoveLastRow}>Remove last row</Button>
    </Group>
  );
}

export function SchemaDynamicExample(): React.ReactElement {
  return (
    <section>
      <Title order={2}>Dynamic Schema</Title>
      <DataTable
        transport={mockTransport}
        initialState={{
          schema: {
            columns: {
              label: { id: "label", type: "string", title: "Label" },
            },
            columnOrder: ["label"],
            version: 1,
          },
          rows: new Map([["r1", { id: "r1", cells: { label: { value: "Row 1" } } }]]),
          rowOrder: ["r1"],
        }}
      >
        <SchemaControls />
        <Grid />
      </DataTable>
    </section>
  );
}
