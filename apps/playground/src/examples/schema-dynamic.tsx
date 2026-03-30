import React, { useContext } from "react";
import { DataTable, Grid } from "@advanced-datatable/ui";
import { DataTableContext, useDataTable } from "@advanced-datatable/react";
import { mockTransport } from "../mocks/mockTransport";
import { Title } from "@mantine/core";

function SchemaControls() {
  const store = useContext(DataTableContext);
  const schema = useDataTable((s) => s.getSchema());

  const handleAddColumn = () => {
    const id = `col_${Date.now()}`;
    store?.getState().dispatch({
      id: `add-col-${id}`,
      type: "add_column",
      source: "client",
      column: { id, type: "string", title: `Column ${Object.keys(schema.columns).length + 1}` },
    });
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

  return (
    <div style={{ marginBottom: 8, display: "flex", gap: 8 }}>
      <button onClick={handleAddColumn}>Add column</button>
      <button onClick={handleRemoveLast}>Remove last column</button>
    </div>
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
