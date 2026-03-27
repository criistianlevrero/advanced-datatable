import { describe, it, expect } from "vitest";
import { TargetIndexImpl } from "@advanced-datatable/operations";

describe("TargetIndexImpl", () => {
  it("adds and retrieves op IDs by target", () => {
    const idx = new TargetIndexImpl();
    idx.add({ type: "cell", rowId: "r1", colId: "A" }, "op1");
    expect(idx.getByTarget({ type: "cell", rowId: "r1", colId: "A" })).toContain("op1");
  });

  it("returns empty array for target with no ops", () => {
    const idx = new TargetIndexImpl();
    expect(idx.getByTarget({ type: "row", rowId: "r99" })).toEqual([]);
  });

  it("removes an op ID and cleans up the bucket", () => {
    const idx = new TargetIndexImpl();
    idx.add({ type: "column", colId: "A" }, "op1");
    idx.remove("op1");
    expect(idx.getByTarget({ type: "column", colId: "A" })).toEqual([]);
  });

  it("supports multiple op IDs for the same target", () => {
    const idx = new TargetIndexImpl();
    idx.add({ type: "row", rowId: "r1" }, "op1");
    idx.add({ type: "row", rowId: "r1" }, "op2");
    const result = idx.getByTarget({ type: "row", rowId: "r1" });
    expect(result).toContain("op1");
    expect(result).toContain("op2");
  });

  it("removing unknown op ID is a no-op", () => {
    const idx = new TargetIndexImpl();
    expect(() => idx.remove("not-exists")).not.toThrow();
  });
});
