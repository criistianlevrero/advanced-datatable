import React, { useContext } from "react";
import { DataTable, Grid } from "@advanced-datatable/ui";
import { DataTableContext, useDataTable } from "@advanced-datatable/react";
import { basicState } from "../mocks/data";
import { mockTransport } from "../mocks/mockTransport";
import { Title } from "@mantine/core";

function BulkControls() {
  const store = useContext(DataTableContext);
  const rowOrder = useDataTable((s) => s.getRowOrder());

  const handleBulkUpdate = () => {
    store?.getState().dispatch({
      id: `bulk-${Date.now()}`,
      type: "bulk_update",
      source: "client",
      updates: rowOrder.map((rowId) => ({ rowId, colId: "active", value: true })),
    });
  };

  return (
    <div style={{ marginBottom: 8 }}>
      <button onClick={handleBulkUpdate}>Set all Active = true</button>
    </div>
  );
}

export function BulkEditExample(): React.ReactElement {
  return (
    <section>
      <Title order={2}>Bulk Edit</Title>
      <p style={{ marginTop: 0, color: "#475569" }}>
        Click a cell to select it, use Shift or Ctrl/Cmd for ranges, then copy and paste TSV data.
      </p>
      <DataTable transport={mockTransport} initialState={basicState}>
        <BulkControls />
        <Grid />
      </DataTable>
    </section>
  );
}
