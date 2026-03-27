import { describe, it, expect } from "vitest";
import { getCell, getColumn, getRow } from "@advanced-datatable/core";
import type { TableState } from "@advanced-datatable/core";

function makeState(): TableState {
  return {
    schema: {
      columns: {
        name: { id: "name", type: "string", title: "Name" },
      },
      columnOrder: ["name"],
      version: 1,
    },
    rows: new Map([
      ["r1", { id: "r1", cells: { name: { value: "Alice" } } }],
    ]),
    rowOrder: ["r1"],
  };
}

describe("getCell", () => {
  it("returns the cell when it exists", () => {
    const state = makeState();
    expect(getCell(state, "r1", "name").value).toBe("Alice");
  });

  it("returns a null-valued default cell for unknown row", () => {
    const state = makeState();
    expect(getCell(state, "missing-row", "name").value).toBeNull();
  });

  it("returns a null-valued default cell for unknown col in existing row", () => {
    const state = makeState();
    expect(getCell(state, "r1", "missing-col").value).toBeNull();
  });
});

describe("getColumn", () => {
  it("returns the column schema when it exists", () => {
    const state = makeState();
    expect(getColumn(state, "name")?.id).toBe("name");
  });

  it("returns undefined for unknown column", () => {
    const state = makeState();
    expect(getColumn(state, "unknown")).toBeUndefined();
  });
});

describe("getRow", () => {
  it("returns the row when it exists", () => {
    const state = makeState();
    expect(getRow(state, "r1")?.id).toBe("r1");
  });

  it("returns undefined for unknown row", () => {
    const state = makeState();
    expect(getRow(state, "missing")).toBeUndefined();
  });
});
