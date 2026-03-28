import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { TableEngineImpl } from "@advanced-datatable/core";
import { OperationManagerImpl } from "@advanced-datatable/operations";
import { createTableStore } from "@advanced-datatable/store";
import type { IOperationTransport } from "@advanced-datatable/api-client";

function makeStore() {
  const engine = new TableEngineImpl({
    schema: {
      columns: {
        label: { id: "label", type: "string", title: "Label" },
        status: { id: "status", type: "string", title: "Status" },
      },
      columnOrder: ["label", "status"],
      version: 1,
    },
    rows: new Map([
      ["r1", { id: "r1", cells: { label: { value: "Row 1" }, status: { value: "todo" } } }],
      ["r2", { id: "r2", cells: { label: { value: "Row 2" }, status: { value: "doing" } } }],
      ["r3", { id: "r3", cells: { label: { value: "Row 3" }, status: { value: "done" } } }],
    ]),
    rowOrder: ["r1", "r2", "r3"],
  });

  const transport: IOperationTransport = {
    send: vi.fn().mockResolvedValue({ results: [] }),
    loadTable: vi.fn(),
  };

  const manager = new OperationManagerImpl(engine, transport, 0);
  return createTableStore(engine, manager);
}

describe("createTableStore", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("updates schema snapshot after add_column dispatch", () => {
    const store = makeStore();
    const before = store.getState().getSchema();

    store.getState().dispatch({
      id: "add-col-1",
      type: "add_column",
      source: "client",
      column: { id: "extra", type: "string", title: "Extra" },
    });

    const after = store.getState().getSchema();
    expect(after.columns.extra).toBeDefined();
    expect(after.columnOrder).toContain("extra");
    expect(after.version).toBe(2);
    expect(after).not.toBe(before);
  });

  it("updates schema snapshot after remove_column dispatch", () => {
    const store = makeStore();

    store.getState().dispatch({
      id: "rm-col-1",
      type: "remove_column",
      source: "client",
      columnId: "label",
    });

    const schema = store.getState().getSchema();
    expect(schema.columns.label).toBeUndefined();
    expect(schema.columnOrder).toEqual(["status"]);
  });

  it("keeps no-op behavior for invalid schema operations", () => {
    const store = makeStore();
    const before = store.getState().getSchema();

    store.getState().dispatch({
      id: "rm-missing",
      type: "remove_column",
      source: "client",
      columnId: "missing",
    });

    const after = store.getState().getSchema();
    expect(after.version).toBe(before.version);
    expect(after.columnOrder).toEqual(before.columnOrder);
  });

  it("emits an extra store update after async confirm/fail lifecycle events", async () => {
    const engine = new TableEngineImpl({
      schema: {
        columns: {
          label: { id: "label", type: "string", title: "Label" },
        },
        columnOrder: ["label"],
        version: 1,
      },
      rows: new Map([["r1", { id: "r1", cells: { label: { value: "Row 1" } } }]]),
      rowOrder: ["r1"],
    });

    const transport: IOperationTransport = {
      send: vi.fn().mockResolvedValue({
        results: [{ opId: "op-async", status: "confirmed" }],
      }),
      loadTable: vi.fn(),
    };

    const manager = new OperationManagerImpl(engine, transport, 10);
    const store = createTableStore(engine, manager);
    let updates = 0;

    const unsubscribe = store.subscribe(() => {
      updates += 1;
    });

    store.getState().dispatch({
      id: "op-async",
      type: "set_cell",
      source: "client",
      rowId: "r1",
      colId: "label",
      value: "Row 1 updated",
      target: { type: "cell", rowId: "r1", colId: "label" },
    });

    // One update from apply lifecycle.
    expect(updates).toBeGreaterThanOrEqual(1);

    await vi.advanceTimersByTimeAsync(10);
    await Promise.resolve();

    // Second update from confirm lifecycle.
    expect(updates).toBeGreaterThanOrEqual(2);
    unsubscribe();
  });

  it("selects a single cell on simple click semantics", () => {
    const store = makeStore();

    store.getState().selectCell({ rowId: "r2", colId: "status" });

    expect(store.getState().getCellSelection()).toEqual({
      anchor: { rowId: "r2", colId: "status" },
      focus: { rowId: "r2", colId: "status" },
      ranges: [
        {
          start: { rowId: "r2", colId: "status" },
          end: { rowId: "r2", colId: "status" },
        },
      ],
      activeRangeIndex: 0,
    });
    expect(store.getState().isCellSelected("r2", "status")).toBe(true);
    expect(store.getState().isCellSelected("r1", "status")).toBe(false);
  });

  it("extends from the original anchor on shift selection", () => {
    const store = makeStore();

    store.getState().selectCell({ rowId: "r1", colId: "label" });
    store.getState().selectCell({ rowId: "r3", colId: "status" }, { extend: true });

    expect(store.getState().getCellSelection().ranges).toEqual([
      {
        start: { rowId: "r1", colId: "label" },
        end: { rowId: "r3", colId: "status" },
      },
    ]);
    expect(store.getState().isCellSelected("r2", "status")).toBe(true);
    expect(store.getState().isCellSelected("r3", "label")).toBe(true);
  });

  it("appends an independent range on ctrl or cmd selection semantics", () => {
    const store = makeStore();

    store.getState().selectCell({ rowId: "r1", colId: "label" });
    store.getState().selectCell({ rowId: "r3", colId: "status" }, { append: true });

    expect(store.getState().getCellSelection().ranges).toEqual([
      {
        start: { rowId: "r1", colId: "label" },
        end: { rowId: "r1", colId: "label" },
      },
      {
        start: { rowId: "r3", colId: "status" },
        end: { rowId: "r3", colId: "status" },
      },
    ]);
  });

  it("updates the active range while dragging and keeps it normalized", () => {
    const store = makeStore();

    store.getState().selectCell({ rowId: "r3", colId: "status" });
    store.getState().updateCellSelectionFocus({ rowId: "r1", colId: "label" });

    expect(store.getState().getCellSelection()).toEqual({
      anchor: { rowId: "r3", colId: "status" },
      focus: { rowId: "r1", colId: "label" },
      ranges: [
        {
          start: { rowId: "r1", colId: "label" },
          end: { rowId: "r3", colId: "status" },
        },
      ],
      activeRangeIndex: 0,
    });
  });

  it("initializes and restores column widths from schema", () => {
    const engine = new TableEngineImpl({
      schema: {
        columns: {
          name: { id: "name", type: "string", title: "Name", width: 120 },
          qty: { id: "qty", type: "number", title: "Qty", width: 65 },
        },
        columnOrder: ["name", "qty"],
        version: 1,
      },
      rows: new Map([["r1", { id: "r1", cells: { name: { value: "A" }, qty: { value: 1 } } }]]),
      rowOrder: ["r1"],
    });

    const transport: IOperationTransport = {
      send: vi.fn().mockResolvedValue({ results: [] }),
      loadTable: vi.fn(),
    };

    const manager = new OperationManagerImpl(engine, transport, 0);
    const store = createTableStore(engine, manager);

    expect(store.getState().getColumnWidth("name")).toBe(120);
    expect(store.getState().getColumnWidth("qty")).toBe(65);

    store.getState().setColumnWidth("name", 260);
    expect(store.getState().getColumnWidth("name")).toBe(260);

    store.getState().resetColumnWidth("name");
    expect(store.getState().getColumnWidth("name")).toBe(120);
  });

  it("applies inverted number, boolean and date filters", () => {
    const engine = new TableEngineImpl({
      schema: {
        columns: {
          name: { id: "name", type: "string", title: "Name" },
          qty: { id: "qty", type: "number", title: "Qty" },
          active: { id: "active", type: "boolean", title: "Active" },
          due: { id: "due", type: "date", title: "Due" },
        },
        columnOrder: ["name", "qty", "active", "due"],
        version: 1,
      },
      rows: new Map([
        [
          "r1",
          {
            id: "r1",
            cells: {
              name: { value: "Alpha" },
              qty: { value: 10 },
              active: { value: true },
              due: { value: "2024-01-10" },
            },
          },
        ],
        [
          "r2",
          {
            id: "r2",
            cells: {
              name: { value: "Beta" },
              qty: { value: 20 },
              active: { value: false },
              due: { value: "2024-02-15" },
            },
          },
        ],
        [
          "r3",
          {
            id: "r3",
            cells: {
              name: { value: "Gamma" },
              qty: { value: 35 },
              active: { value: true },
              due: { value: "2024-03-20" },
            },
          },
        ],
      ]),
      rowOrder: ["r1", "r2", "r3"],
    });

    const transport: IOperationTransport = {
      send: vi.fn().mockResolvedValue({ results: [] }),
      loadTable: vi.fn(),
    };

    const manager = new OperationManagerImpl(engine, transport, 0);
    const store = createTableStore(engine, manager);

    store.getState().setFilter("qty", { type: "number", min: 20, invert: true });
    expect(store.getState().getRowOrder()).toEqual(["r1"]);

    store.getState().setFilter("active", { type: "boolean", value: "true", invert: true });
    expect(store.getState().getRowOrder()).toEqual([]);

    store.getState().clearAllFilters();
    store.getState().setFilter("due", { type: "date", from: "2024-02-01", to: "2024-03-01", invert: true });
    expect(store.getState().getRowOrder()).toEqual(["r1", "r3"]);
  });
});
