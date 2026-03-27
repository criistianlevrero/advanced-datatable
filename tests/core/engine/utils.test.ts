import { describe, expect, it } from "vitest";
import { ensureRow, insertIntoOrder, removeFromOrder, type TableState } from "@advanced-datatable/core";

function makeState(): TableState {
  return {
    schema: {
      columns: {},
      columnOrder: [],
      version: 0
    },
    rows: new Map(),
    rowOrder: []
  };
}

describe("insertIntoOrder", () => {
  it("appends when index is undefined", () => {
    const order = ["a", "b"];
    insertIntoOrder(order, "c");
    expect(order).toEqual(["a", "b", "c"]);
  });

  it("inserts at valid index", () => {
    const order = ["a", "c"];
    insertIntoOrder(order, "b", 1);
    expect(order).toEqual(["a", "b", "c"]);
  });

  it("appends when index is out of range", () => {
    const order = ["a"];
    insertIntoOrder(order, "b", 10);
    expect(order).toEqual(["a", "b"]);
  });
});

describe("removeFromOrder", () => {
  it("removes all occurrences of id", () => {
    const order = ["a", "b", "a", "c"];
    removeFromOrder(order, "a");
    expect(order).toEqual(["b", "c"]);
  });

  it("is no-op if id is missing", () => {
    const order = ["a", "b"];
    removeFromOrder(order, "x");
    expect(order).toEqual(["a", "b"]);
  });
});

describe("ensureRow", () => {
  it("returns existing row when row exists", () => {
    const state = makeState();
    state.rows.set("r1", { id: "r1", cells: {} });
    state.rowOrder.push("r1");

    const row = ensureRow(state, "r1");
    expect(row.id).toBe("r1");
    expect(state.rows.size).toBe(1);
  });

  it("creates row and updates rowOrder when missing", () => {
    const state = makeState();
    const row = ensureRow(state, "r2");

    expect(row.id).toBe("r2");
    expect(state.rows.has("r2")).toBe(true);
    expect(state.rowOrder).toEqual(["r2"]);
  });
});
