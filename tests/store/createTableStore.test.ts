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
      },
      columnOrder: ["label"],
      version: 1,
    },
    rows: new Map([["r1", { id: "r1", cells: { label: { value: "Row 1" } } }]]),
    rowOrder: ["r1"],
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
    expect(schema.columnOrder).toEqual([]);
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
});
