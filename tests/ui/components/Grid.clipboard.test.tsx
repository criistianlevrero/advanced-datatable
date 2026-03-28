import React from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { DataTable } from "@advanced-datatable/ui";
import type { IOperationTransport } from "@advanced-datatable/api-client";

const transport: IOperationTransport = {
  send: vi.fn().mockResolvedValue({ results: [] }),
  loadTable: vi.fn(),
};

afterEach(() => {
  cleanup();
});

function renderTable() {
  return render(
    <DataTable
      transport={transport}
      initialState={{
        schema: {
          columns: {
            label: { id: "label", type: "string", title: "Label" },
            qty: { id: "qty", type: "number", title: "Qty" },
          },
          columnOrder: ["label", "qty"],
          version: 1,
        },
        rows: new Map([
          ["r1", { id: "r1", cells: { label: { value: "A1" }, qty: { value: 1 } } }],
          ["r2", { id: "r2", cells: { label: { value: "A2" }, qty: { value: 2 } } }],
          ["r3", { id: "r3", cells: { label: { value: "A3" }, qty: { value: 3 } } }],
        ]),
        rowOrder: ["r1", "r2", "r3"],
      }}
    />,
  );
}

function renderTableWithReadOnlyQty() {
  return render(
    <DataTable
      transport={transport}
      initialState={{
        schema: {
          columns: {
            label: { id: "label", type: "string", title: "Label" },
            qty: { id: "qty", type: "number", title: "Qty", meta: { readOnly: true } },
          },
          columnOrder: ["label", "qty"],
          version: 1,
        },
        rows: new Map([
          ["r1", { id: "r1", cells: { label: { value: "A1" }, qty: { value: 1 } } }],
          ["r2", { id: "r2", cells: { label: { value: "A2" }, qty: { value: 2 } } }],
          ["r3", { id: "r3", cells: { label: { value: "A3" }, qty: { value: 3 } } }],
        ]),
        rowOrder: ["r1", "r2", "r3"],
      }}
    />,
  );
}

function renderTableWithReadOnlyCell() {
  return render(
    <DataTable
      transport={transport}
      initialState={{
        schema: {
          columns: {
            label: { id: "label", type: "string", title: "Label" },
            qty: { id: "qty", type: "number", title: "Qty" },
          },
          columnOrder: ["label", "qty"],
          version: 1,
        },
        rows: new Map([
          ["r1", { id: "r1", cells: { label: { value: "A1" }, qty: { value: 1 } } }],
          ["r2", { id: "r2", cells: { label: { value: "A2", meta: { readOnly: true } }, qty: { value: 2 } } }],
          ["r3", { id: "r3", cells: { label: { value: "A3" }, qty: { value: 3 } } }],
        ]),
        rowOrder: ["r1", "r2", "r3"],
      }}
    />,
  );
}

function renderTableWithPendingTransport() {
  const pendingTransport: IOperationTransport = {
    send: vi.fn(() => new Promise(() => {})),
    loadTable: vi.fn(),
  };

  return render(
    <DataTable
      transport={pendingTransport}
      initialState={{
        schema: {
          columns: {
            label: { id: "label", type: "string", title: "Label" },
            qty: { id: "qty", type: "number", title: "Qty" },
          },
          columnOrder: ["label", "qty"],
          version: 1,
        },
        rows: new Map([
          ["r1", { id: "r1", cells: { label: { value: "A1" }, qty: { value: 1 } } }],
          ["r2", { id: "r2", cells: { label: { value: "A2" }, qty: { value: 2 } } }],
          ["r3", { id: "r3", cells: { label: { value: "A3" }, qty: { value: 3 } } }],
        ]),
        rowOrder: ["r1", "r2", "r3"],
      }}
    />,
  );
}

describe("Grid clipboard", () => {
  it("copies the primary selected range as TSV", () => {
    renderTable();

    fireEvent.mouseDown(screen.getByText("A1"));
    fireEvent.mouseEnter(screen.getByText("2"));
    fireEvent.mouseUp(screen.getByText("2"));

    const clipboardData = {
      setData: vi.fn(),
      getData: vi.fn(),
    };

    fireEvent.copy(screen.getByLabelText("Data grid clipboard region"), { clipboardData });

    expect(clipboardData.setData).toHaveBeenCalledWith("text/plain", "A1\t1\nA2\t2");
  });

  it("pastes a TSV matrix starting from a single selected cell", () => {
    renderTable();

    fireEvent.mouseDown(screen.getByText("A2"));
    fireEvent.mouseUp(screen.getByText("A2"));

    const clipboardData = {
      getData: vi.fn().mockReturnValue("B1\t10\nB2\t20"),
      setData: vi.fn(),
    };

    fireEvent.paste(screen.getByLabelText("Data grid clipboard region"), { clipboardData });

    expect(screen.getByText("B1")).toBeInTheDocument();
    expect(screen.getByText("10")).toBeInTheDocument();
    expect(screen.getByText("B2")).toBeInTheDocument();
    expect(screen.getByText("20")).toBeInTheDocument();
  });

  it("tiles the pasted pattern over a larger selected range", () => {
    renderTable();

    fireEvent.mouseDown(screen.getByText("A1"));
    fireEvent.mouseEnter(screen.getByText("3"));
    fireEvent.mouseUp(screen.getByText("3"));

    const clipboardData = {
      getData: vi.fn().mockReturnValue("X\t9\nY\t8"),
      setData: vi.fn(),
    };

    fireEvent.paste(screen.getByLabelText("Data grid clipboard region"), { clipboardData });

    expect(screen.getAllByText("X")).toHaveLength(2);
    expect(screen.getAllByText("Y")).toHaveLength(1);
    expect(screen.getAllByText("9")).toHaveLength(2);
    expect(screen.getAllByText("8")).toHaveLength(1);
  });

  it("moves focused cell with arrow keys", () => {
    renderTable();

    const region = screen.getByLabelText("Data grid clipboard region");
    region.focus();

    fireEvent.keyDown(region, { key: "ArrowDown" });
    fireEvent.keyDown(region, { key: "ArrowRight" });

    expect(screen.getByText("2")).toHaveAttribute("data-cell-focused", "true");
  });

  it("extends selection range with Shift + arrow keys", () => {
    renderTable();

    const region = screen.getByLabelText("Data grid clipboard region");
    region.focus();

    fireEvent.keyDown(region, { key: "ArrowDown" });
    fireEvent.keyDown(region, { key: "ArrowRight", shiftKey: true });

    expect(screen.getByText("A2")).toHaveAttribute("data-cell-selected", "true");
    expect(screen.getByText("2")).toHaveAttribute("data-cell-selected", "true");
    expect(screen.getByText("2")).toHaveAttribute("data-cell-focused", "true");
  });

  it("starts inline editing on Enter for the focused cell", () => {
    renderTable();

    const region = screen.getByLabelText("Data grid clipboard region");
    region.focus();

    fireEvent.keyDown(region, { key: "ArrowDown" });
    fireEvent.keyDown(region, { key: "Enter" });

    expect(screen.getByDisplayValue("A2")).toBeInTheDocument();
  });

  it("moves focus with Tab and Shift+Tab", () => {
    renderTable();

    const region = screen.getByLabelText("Data grid clipboard region");
    region.focus();

    fireEvent.keyDown(region, { key: "Tab" });
    expect(screen.getByText("1")).toHaveAttribute("data-cell-focused", "true");

    fireEvent.keyDown(region, { key: "Tab" });
    expect(screen.getByText("A2")).toHaveAttribute("data-cell-focused", "true");

    fireEvent.keyDown(region, { key: "Tab", shiftKey: true });
    expect(screen.getByText("1")).toHaveAttribute("data-cell-focused", "true");
  });

  it("selects full visible range with Ctrl+A", () => {
    renderTable();

    const region = screen.getByLabelText("Data grid clipboard region");
    region.focus();

    fireEvent.keyDown(region, { key: "a", ctrlKey: true });

    expect(screen.getByText("A1")).toHaveAttribute("data-cell-selected", "true");
    expect(screen.getByText("3")).toHaveAttribute("data-cell-selected", "true");
    expect(screen.getByText("3")).toHaveAttribute("data-cell-focused", "true");
  });

  it("clears cell selection with Escape", () => {
    renderTable();

    fireEvent.mouseDown(screen.getByText("A1"));
    fireEvent.mouseEnter(screen.getByText("2"));
    fireEvent.mouseUp(screen.getByText("2"));

    const region = screen.getByLabelText("Data grid clipboard region");
    region.focus();
    fireEvent.keyDown(region, { key: "Escape" });

    expect(region.querySelectorAll("td[data-cell-selected='true']")).toHaveLength(0);
    expect(region.querySelectorAll("td[data-cell-focused='true']")).toHaveLength(0);
  });

  it("skips read-only columns when pasting", () => {
    renderTableWithReadOnlyQty();

    fireEvent.mouseDown(screen.getByText("A1"));
    fireEvent.mouseEnter(screen.getByText("2"));
    fireEvent.mouseUp(screen.getByText("2"));

    const clipboardData = {
      getData: vi.fn().mockReturnValue("Z\t99\nW\t88"),
      setData: vi.fn(),
    };

    fireEvent.paste(screen.getByLabelText("Data grid clipboard region"), { clipboardData });

    expect(screen.getByText("Z")).toBeInTheDocument();
    expect(screen.getByText("W")).toBeInTheDocument();
    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.queryByText("99")).not.toBeInTheDocument();
  });

  it("does not enter inline edit on read-only cells", () => {
    renderTableWithReadOnlyQty();

    fireEvent.doubleClick(screen.getByText("1"));

    expect(screen.queryByDisplayValue("1")).not.toBeInTheDocument();
  });

  it("skips read-only cells when pasting", () => {
    renderTableWithReadOnlyCell();

    fireEvent.mouseDown(screen.getByText("A1"));
    fireEvent.mouseEnter(screen.getByText("A3"));
    fireEvent.mouseUp(screen.getByText("A3"));

    const clipboardData = {
      getData: vi.fn().mockReturnValue("X\nY\nZ"),
      setData: vi.fn(),
    };

    fireEvent.paste(screen.getByLabelText("Data grid clipboard region"), { clipboardData });

    expect(screen.getByText("X")).toBeInTheDocument();
    expect(screen.getByText("A2")).toBeInTheDocument();
    expect(screen.getByText("Z")).toBeInTheDocument();
  });

  it("shows pending visual feedback while paste is in flight", () => {
    renderTableWithPendingTransport();

    fireEvent.mouseDown(screen.getByText("A1"));
    fireEvent.mouseUp(screen.getByText("A1"));

    const clipboardData = {
      getData: vi.fn().mockReturnValue("B1\t10\nB2\t20"),
      setData: vi.fn(),
    };

    const region = screen.getByLabelText("Data grid clipboard region");
    fireEvent.paste(region, { clipboardData });

    expect(region).toHaveAttribute("aria-busy", "true");
    expect(screen.getByText("Applying paste operation...")).toBeInTheDocument();
    expect(region.querySelectorAll("td[data-cell-pending='true']").length).toBeGreaterThan(0);
  });
});