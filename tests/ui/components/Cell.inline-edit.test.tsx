import React from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { DataTable } from "@advanced-datatable/ui";
import type { IOperationTransport } from "@advanced-datatable/api-client";

afterEach(() => {
  cleanup();
});

const transport: IOperationTransport = {
  send: vi.fn().mockResolvedValue({ results: [] }),
  loadTable: vi.fn(),
};

function renderEditableTable() {
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
    />,
  );
}

function renderTypedTable() {
  return render(
    <DataTable
      transport={transport}
      initialState={{
        schema: {
          columns: {
            qty: { id: "qty", type: "number", title: "Qty" },
            active: { id: "active", type: "boolean", title: "Active" },
          },
          columnOrder: ["qty", "active"],
          version: 1,
        },
        rows: new Map([["r1", { id: "r1", cells: { qty: { value: 2 }, active: { value: false } } }]]),
        rowOrder: ["r1"],
      }}
    />,
  );
}

describe("Cell inline editing", () => {
  it("enters edit mode on double click", () => {
    renderEditableTable();

    const cell = screen.getByText("Row 1");
    fireEvent.doubleClick(cell);

    expect(screen.getByDisplayValue("Row 1")).toBeInTheDocument();
  });

  it("commits new value with Enter", () => {
    renderEditableTable();

    fireEvent.doubleClick(screen.getByText("Row 1"));
    const input = screen.getByDisplayValue("Row 1");
    fireEvent.change(input, { target: { value: "Row 1 edited" } });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(screen.getByText("Row 1 edited")).toBeInTheDocument();
  });

  it("cancels editing with Escape", () => {
    renderEditableTable();

    fireEvent.doubleClick(screen.getByText("Row 1"));
    const input = screen.getByDisplayValue("Row 1");
    fireEvent.change(input, { target: { value: "Should not persist" } });
    fireEvent.keyDown(input, { key: "Escape" });

    expect(screen.getByText("Row 1")).toBeInTheDocument();
    expect(screen.queryByText("Should not persist")).not.toBeInTheDocument();
  });

  it("commits new value on blur", () => {
    renderEditableTable();

    fireEvent.doubleClick(screen.getByText("Row 1"));
    const input = screen.getByDisplayValue("Row 1");
    fireEvent.change(input, { target: { value: "Blur commit" } });
    fireEvent.blur(input);

    expect(screen.getByText("Blur commit")).toBeInTheDocument();
  });

  it("parses number values when editing numeric columns", () => {
    renderTypedTable();

    fireEvent.doubleClick(screen.getByText("2"));
    const input = screen.getByDisplayValue("2");
    fireEvent.change(input, { target: { value: "10" } });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(screen.getByText("10")).toBeInTheDocument();
  });

  it("keeps previous number when numeric input is invalid", () => {
    renderTypedTable();

    fireEvent.doubleClick(screen.getByText("2"));
    const input = screen.getByDisplayValue("2");
    fireEvent.change(input, { target: { value: "not-a-number" } });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("parses boolean values from select editor", () => {
    renderTypedTable();

    fireEvent.doubleClick(screen.getByText("false"));
    const select = screen.getByDisplayValue("false");
    fireEvent.change(select, { target: { value: "true" } });
    fireEvent.blur(select);

    expect(screen.getByText("true")).toBeInTheDocument();
  });
});
