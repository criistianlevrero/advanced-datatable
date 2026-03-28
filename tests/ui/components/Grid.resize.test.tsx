import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "@testing-library/react";
import { DataTable } from "@advanced-datatable/ui";
import type { IOperationTransport } from "@advanced-datatable/api-client";

const transport: IOperationTransport = {
  send: vi.fn().mockResolvedValue({ results: [] }),
  loadTable: vi.fn(),
};

afterEach(() => {
  cleanup();
});

function renderTable(resizableColumns: boolean) {
  return render(
    <DataTable
      transport={transport}
      resizableColumns={resizableColumns}
      initialState={{
        schema: {
          columns: {
            id: { id: "id", type: "string", title: "ID", meta: { resizable: false } },
            name: { id: "name", type: "string", title: "Name", meta: { resizable: true } },
            qty: { id: "qty", type: "number", title: "Qty" },
          },
          columnOrder: ["id", "name", "qty"],
          version: 1,
        },
        rows: new Map([["r1", { id: "r1", cells: { id: { value: "r1" }, name: { value: "A" }, qty: { value: 2 } } }]]),
        rowOrder: ["r1"],
      }}
    />,
  );
}

describe("Grid column resize rules", () => {
  it("does not render resize handles when table-level resize is disabled", () => {
    const { container } = renderTable(false);

    expect(container.querySelectorAll("th > div[data-column-resize-handle='true']")).toHaveLength(0);
  });

  it("renders resize handles only for columns allowed by column-level meta when table resize is enabled", () => {
    const { container } = renderTable(true);

    // 3 columns total: id is opt-out (meta.resizable=false), name and qty are resizable.
    expect(container.querySelectorAll("th > div[data-column-resize-handle='true']")).toHaveLength(2);
  });
});
