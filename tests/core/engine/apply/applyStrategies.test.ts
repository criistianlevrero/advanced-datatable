import { describe, it, expect } from "vitest";
import type { TableState } from "@advanced-datatable/core";
import { applySetCell } from "../../../../packages/core/src/engine/apply/applySetCell";
import { applyBulkUpdate } from "../../../../packages/core/src/engine/apply/applyBulkUpdate";
import { applyUpdateColumn } from "../../../../packages/core/src/engine/apply/applyUpdateColumn";
import { applyAddColumn } from "../../../../packages/core/src/engine/apply/applyAddColumn";
import { applyRemoveColumn } from "../../../../packages/core/src/engine/apply/applyRemoveColumn";
import { applyReorderColumns } from "../../../../packages/core/src/engine/apply/applyReorderColumns";
import { applyAddRow } from "../../../../packages/core/src/engine/apply/applyAddRow";
import { applyRemoveRow } from "../../../../packages/core/src/engine/apply/applyRemoveRow";
import { applyReorderRows } from "../../../../packages/core/src/engine/apply/applyReorderRows";

function makeState(): TableState {
  return {
    schema: {
      columns: {
        A: { id: "A", type: "string", title: "A" },
        B: { id: "B", type: "number", title: "B" },
      },
      columnOrder: ["A", "B"],
      version: 1,
    },
    rows: new Map([
      ["r1", { id: "r1", cells: { A: { value: "hello" } } }],
      ["r2", { id: "r2", cells: {} }],
    ]),
    rowOrder: ["r1", "r2"],
  };
}

// --- applySetCell ---
describe("applySetCell", () => {
  it("sets a cell value on an existing row", () => {
    const state = makeState();
    applySetCell(state, { id: "x", type: "set_cell", source: "client", rowId: "r1", colId: "A", value: "world" });
    expect(state.rows.get("r1")?.cells["A"]?.value).toBe("world");
  });

  it("creates the row if it does not exist", () => {
    const state = makeState();
    applySetCell(state, { id: "x", type: "set_cell", source: "client", rowId: "r99", colId: "A", value: 42 });
    expect(state.rows.get("r99")?.cells["A"]?.value).toBe(42);
    expect(state.rowOrder).toContain("r99");
  });
});

// --- applyBulkUpdate ---
describe("applyBulkUpdate", () => {
  it("updates multiple cells at once", () => {
    const state = makeState();
    applyBulkUpdate(state, {
      id: "x", type: "bulk_update", source: "client",
      updates: [
        { rowId: "r1", colId: "A", value: "x" },
        { rowId: "r2", colId: "B", value: 99 },
      ],
    });
    expect(state.rows.get("r1")?.cells["A"]?.value).toBe("x");
    expect(state.rows.get("r2")?.cells["B"]?.value).toBe(99);
  });
});

// --- applyUpdateColumn ---
describe("applyUpdateColumn", () => {
  it("merges values into existing column", () => {
    const state = makeState();
    applyUpdateColumn(state, { id: "x", type: "update_column", source: "client", colId: "A", values: { title: "Alpha" } });
    expect(state.schema.columns["A"]?.title).toBe("Alpha");
  });

  it("is a no-op if column does not exist", () => {
    const state = makeState();
    const versionBefore = state.schema.version;
    applyUpdateColumn(state, { id: "x", type: "update_column", source: "client", colId: "NOPE", values: { title: "X" } });
    expect(state.schema.version).toBe(versionBefore);
  });
});

// --- applyAddColumn ---
describe("applyAddColumn", () => {
  it("adds a new column at the end", () => {
    const state = makeState();
    applyAddColumn(state, { id: "x", type: "add_column", source: "client", column: { id: "C", type: "boolean", title: "C" } });
    expect(state.schema.columns["C"]).toBeDefined();
    expect(state.schema.columnOrder).toContain("C");
    expect(state.schema.version).toBe(2);
  });

  it("adds a column at a specific index", () => {
    const state = makeState();
    applyAddColumn(state, { id: "x", type: "add_column", source: "client", column: { id: "C", type: "boolean" }, index: 0 });
    expect(state.schema.columnOrder[0]).toBe("C");
  });

  it("is a no-op if column already exists", () => {
    const state = makeState();
    const versionBefore = state.schema.version;
    applyAddColumn(state, { id: "x", type: "add_column", source: "client", column: { id: "A", type: "string" } });
    expect(state.schema.version).toBe(versionBefore);
    expect(state.schema.columnOrder.filter((c) => c === "A").length).toBe(1);
  });
});

// --- applyRemoveColumn ---
describe("applyRemoveColumn", () => {
  it("removes an existing column", () => {
    const state = makeState();
    applyRemoveColumn(state, { id: "x", type: "remove_column", source: "client", columnId: "A" });
    expect(state.schema.columns["A"]).toBeUndefined();
    expect(state.schema.columnOrder).not.toContain("A");
    expect(state.schema.version).toBe(2);
  });

  it("is a no-op if column does not exist", () => {
    const state = makeState();
    const versionBefore = state.schema.version;
    applyRemoveColumn(state, { id: "x", type: "remove_column", source: "client", columnId: "NOPE" });
    expect(state.schema.version).toBe(versionBefore);
  });

  it("leaves cell data in rows (lazy cleanup)", () => {
    const state = makeState();
    applyRemoveColumn(state, { id: "x", type: "remove_column", source: "client", columnId: "A" });
    // Row r1 still has cell data for column A even after removal
    expect(state.rows.get("r1")?.cells["A"]).toBeDefined();
  });
});

// --- applyReorderColumns ---
describe("applyReorderColumns", () => {
  it("reorders columns to the provided order", () => {
    const state = makeState();
    applyReorderColumns(state, { id: "x", type: "reorder_columns", source: "client", columnOrder: ["B", "A"] });
    expect(state.schema.columnOrder).toEqual(["B", "A"]);
  });

  it("ignores unknown column IDs silently", () => {
    const state = makeState();
    applyReorderColumns(state, { id: "x", type: "reorder_columns", source: "client", columnOrder: ["B", "UNKNOWN", "A"] });
    expect(state.schema.columnOrder).toEqual(["B", "A"]);
  });

  it("appends missing existing columns at end", () => {
    const state = makeState();
    applyReorderColumns(state, { id: "x", type: "reorder_columns", source: "client", columnOrder: ["A"] });
    expect(state.schema.columnOrder).toEqual(["A", "B"]);
  });
});

// --- applyAddRow ---
describe("applyAddRow", () => {
  it("adds a new row at the end by default", () => {
    const state = makeState();
    applyAddRow(state, { id: "x", type: "add_row", source: "client", row: { id: "r3", cells: {} } });
    expect(state.rows.has("r3")).toBe(true);
    expect(state.rowOrder.at(-1)).toBe("r3");
  });

  it("adds a row at a specific index", () => {
    const state = makeState();
    applyAddRow(state, { id: "x", type: "add_row", source: "client", row: { id: "r0", cells: {} }, index: 0 });
    expect(state.rowOrder[0]).toBe("r0");
  });

  it("is a no-op if row already exists", () => {
    const state = makeState();
    const len = state.rowOrder.length;
    applyAddRow(state, { id: "x", type: "add_row", source: "client", row: { id: "r1", cells: {} } });
    expect(state.rowOrder.length).toBe(len);
  });
});

// --- applyRemoveRow ---
describe("applyRemoveRow", () => {
  it("removes an existing row from state and rowOrder", () => {
    const state = makeState();
    applyRemoveRow(state, { id: "x", type: "remove_row", source: "client", rowId: "r1" });
    expect(state.rows.has("r1")).toBe(false);
    expect(state.rowOrder).not.toContain("r1");
  });

  it("is a no-op if row does not exist", () => {
    const state = makeState();
    const len = state.rowOrder.length;
    applyRemoveRow(state, { id: "x", type: "remove_row", source: "client", rowId: "NOPE" });
    expect(state.rowOrder.length).toBe(len);
  });
});

// --- applyReorderRows ---
describe("applyReorderRows", () => {
  it("reorders rows to the provided order", () => {
    const state = makeState();
    applyReorderRows(state, { id: "x", type: "reorder_rows", source: "client", rowOrder: ["r2", "r1"] });
    expect(state.rowOrder).toEqual(["r2", "r1"]);
  });

  it("ignores unknown row IDs silently", () => {
    const state = makeState();
    applyReorderRows(state, { id: "x", type: "reorder_rows", source: "client", rowOrder: ["r2", "UNKNOWN", "r1"] });
    expect(state.rowOrder).toEqual(["r2", "r1"]);
  });

  it("appends missing existing rows at end", () => {
    const state = makeState();
    applyReorderRows(state, { id: "x", type: "reorder_rows", source: "client", rowOrder: ["r2"] });
    expect(state.rowOrder).toEqual(["r2", "r1"]);
  });
});
