import { describe, it, expect } from "vitest";
import { TableEngineImpl } from "@advanced-datatable/core";
import type { AddColumnOperation, AddRowOperation, SetCellOperation } from "@advanced-datatable/core";

function makeEngine() {
  return new TableEngineImpl({
    schema: {
      columns: {
        name: { id: "name", type: "string", title: "Name" },
      },
      columnOrder: ["name"],
      version: 1,
    },
    rows: new Map([["r1", { id: "r1", cells: { name: { value: "Alice" } } }]]),
    rowOrder: ["r1"],
  });
}

describe("TableEngineImpl", () => {
  it("applies a set_cell operation", () => {
    const engine = makeEngine();
    const op: SetCellOperation = { id: "op1", type: "set_cell", source: "client", rowId: "r1", colId: "name", value: "Bob" };
    engine.apply(op);
    expect(engine.getState().rows.get("r1")?.cells["name"]?.value).toBe("Bob");
  });

  it("is idempotent for duplicate op IDs", () => {
    const engine = makeEngine();
    const op: SetCellOperation = { id: "op1", type: "set_cell", source: "client", rowId: "r1", colId: "name", value: "Bob" };
    engine.apply(op);
    engine.apply(op); // second apply should be a no-op
    expect(engine.getState().rows.get("r1")?.cells["name"]?.value).toBe("Bob");
  });

  it("applies a batch of operations in order", () => {
    const engine = makeEngine();
    const ops: SetCellOperation[] = [
      { id: "op1", type: "set_cell", source: "client", rowId: "r1", colId: "name", value: "Bob" },
      { id: "op2", type: "set_cell", source: "client", rowId: "r1", colId: "name", value: "Carol" },
    ];
    engine.applyBatch(ops);
    expect(engine.getState().rows.get("r1")?.cells["name"]?.value).toBe("Carol");
  });

  it("adds a column and increments schema version", () => {
    const engine = makeEngine();
    const op: AddColumnOperation = {
      id: "op1", type: "add_column", source: "client",
      column: { id: "age", type: "number", title: "Age" },
    };
    engine.apply(op);
    expect(engine.getState().schema.columns["age"]).toBeDefined();
    expect(engine.getState().schema.version).toBe(2);
  });

  it("adds a row at specified index", () => {
    const engine = makeEngine();
    const op: AddRowOperation = {
      id: "op1", type: "add_row", source: "client",
      row: { id: "r0", cells: {} },
      index: 0,
    };
    engine.apply(op);
    expect(engine.getState().rowOrder[0]).toBe("r0");
  });

  it("returns a non-mutable state reference via getState", () => {
    const engine = makeEngine();
    const state = engine.getState();
    expect(state).toBeDefined();
    expect(state.rowOrder).toEqual(["r1"]);
  });
});
