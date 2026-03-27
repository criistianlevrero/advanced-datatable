import React, { useContext } from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { DataTable, Grid } from "@advanced-datatable/ui";
import { DataTableContext } from "@advanced-datatable/react";
import type { IOperationTransport } from "@advanced-datatable/api-client";

const transport: IOperationTransport = {
  send: vi.fn().mockResolvedValue({ results: [] }),
  loadTable: vi.fn(),
};

afterEach(() => {
  cleanup();
});

function SchemaControls(): React.ReactElement {
  const store = useContext(DataTableContext);

  const addColumn = () => {
    store?.getState().dispatch({
      id: "add-col-ui-test",
      type: "add_column",
      source: "client",
      column: { id: "extra", type: "string", title: "Extra" },
    });
  };

  const removeColumn = () => {
    store?.getState().dispatch({
      id: "remove-col-ui-test",
      type: "remove_column",
      source: "client",
      columnId: "label",
    });
  };

  return (
    <div>
      <button onClick={addColumn}>Add column</button>
      <button onClick={removeColumn}>Remove label</button>
    </div>
  );
}

function renderDynamicSchemaTable() {
  return render(
    <DataTable
      transport={transport}
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
    </DataTable>,
  );
}

describe("DataTable schema reactivity", () => {
  it("renders initial schema and row values", () => {
    renderDynamicSchemaTable();

    expect(screen.getByRole("columnheader", { name: "Label" })).toBeInTheDocument();
    expect(screen.getByText("Row 1")).toBeInTheDocument();
  });

  it("reflects add_column operation in DOM", () => {
    renderDynamicSchemaTable();

    fireEvent.click(screen.getByRole("button", { name: "Add column" }));

    expect(screen.getByRole("columnheader", { name: "Extra" })).toBeInTheDocument();
  });

  it("reflects remove_column operation in DOM", () => {
    renderDynamicSchemaTable();

    fireEvent.click(screen.getByRole("button", { name: "Remove label" }));

    expect(screen.queryByRole("columnheader", { name: "Label" })).not.toBeInTheDocument();
  });
});
