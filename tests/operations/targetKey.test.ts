import { describe, expect, it } from "vitest";
import { serializeTarget } from "@advanced-datatable/operations";

describe("serializeTarget", () => {
  it("serializes cell targets", () => {
    expect(serializeTarget({ type: "cell", rowId: "r1", colId: "A" })).toBe("cell:r1:A");
  });

  it("serializes row targets", () => {
    expect(serializeTarget({ type: "row", rowId: "r1" })).toBe("row:r1");
  });

  it("serializes column targets", () => {
    expect(serializeTarget({ type: "column", colId: "A" })).toBe("column:A");
  });

  it("normalizes range targets with sort+unique for stable keys", () => {
    const key = serializeTarget({
      type: "range",
      rowIds: ["r2", "r1", "r2"],
      colIds: ["B", "A", "B"]
    });

    expect(key).toBe("range:r1,r2:A,B");
  });

  it("produces same key for equivalent semantic range", () => {
    const a = serializeTarget({ type: "range", rowIds: ["r2", "r1"], colIds: ["B", "A"] });
    const b = serializeTarget({ type: "range", rowIds: ["r1", "r2"], colIds: ["A", "B"] });
    expect(a).toBe(b);
  });
});
