import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import type { ITableEngine, Operation } from "@advanced-datatable/core";
import { TableEngineImpl } from "@advanced-datatable/core";
import type { IOperationTransport } from "@advanced-datatable/api-client";
import { OperationManagerImpl, LocalStorageOperationPersistence, NoOpOperationPersistence } from "@advanced-datatable/operations";
import type { IOperationPersistence } from "@advanced-datatable/operations";

function makeEngine(): ITableEngine {
  return new TableEngineImpl({
    schema: {
      columns: { c1: { id: "c1", type: "string", title: "Col1" } },
      columnOrder: ["c1"],
      version: 1,
    },
    rows: new Map([["r1", { id: "r1", cells: { c1: { value: "" } } }]]),
    rowOrder: ["r1"],
  });
}

describe("LocalStorageOperationPersistence", () => {
  let persistence: LocalStorageOperationPersistence;

  beforeEach(() => {
    localStorage.clear();
    persistence = new LocalStorageOperationPersistence("test.operations");
  });

  afterEach(() => {
    localStorage.clear();
  });

  it("saves pending operations", async () => {
    const op: Operation = {
      id: "op1",
      type: "set_cell",
      rowId: "r1",
      colId: "c1",
      value: 42,
      source: "client",
      target: { type: "cell", rowId: "r1", colId: "c1" },
    };
    const records = new Map([["op1", { op, status: "pending" as const }]]);

    await persistence.save(records);

    const stored = localStorage.getItem("test.operations");
    expect(stored).toBeDefined();
    const data = JSON.parse(stored!);
    expect(data.op1).toBeDefined();
    expect(data.op1.op).toEqual(op);
    expect(data.op1.status).toBe("pending");
  });

  it("ignores confirmed/error operations", async () => {
    const op1: Operation = {
      id: "op1",
      type: "set_cell",
      rowId: "r1",
      colId: "c1",
      value: 42,
      source: "client",
      target: { type: "cell", rowId: "r1", colId: "c1" },
    };
    const op2: Operation = {
      id: "op2",
      type: "set_cell",
      rowId: "r2",
      colId: "c1",
      value: 99,
      source: "client",
      target: { type: "cell", rowId: "r2", colId: "c1" },
    };
    const records = new Map([
      ["op1", { op: op1, status: "pending" as const }],
      ["op2", { op: op2, status: "confirmed" as const }],
    ]);

    await persistence.save(records);

    const stored = localStorage.getItem("test.operations");
    const data = JSON.parse(stored!);
    expect(data.op1).toBeDefined();
    expect(data.op2).toBeUndefined();
  });

  it("loads operations as pending", async () => {
    const op: Operation = {
      id: "op1",
      type: "set_cell",
      rowId: "r1",
      colId: "c1",
      value: 42,
      source: "client",
      target: { type: "cell", rowId: "r1", colId: "c1" },
    };
    localStorage.setItem(
      "test.operations",
      JSON.stringify({
        op1: { op, status: "pending" },
      }),
    );

    const loaded = await persistence.load();

    expect(loaded.size).toBe(1);
    const record = loaded.get("op1");
    expect(record).toBeDefined();
    expect(record!.status).toBe("pending");
    expect(record!.op).toEqual(op);
  });

  it("returns empty map if no stored records", async () => {
    const loaded = await persistence.load();
    expect(loaded.size).toBe(0);
  });

  it("handles corrupted localStorage gracefully", async () => {
    localStorage.setItem("test.operations", "invalid json");

    const loaded = await persistence.load();

    expect(loaded.size).toBe(0);
  });

  it("clears stored operations", async () => {
    const op: Operation = { id: "op1", type: "set_cell", rowId: "r1", colId: "c1", value: 42 };
    const records = new Map([["op1", { op, status: "pending" as const }]]);

    await persistence.save(records);
    expect(localStorage.getItem("test.operations")).toBeDefined();

    await persistence.clear();

    expect(localStorage.getItem("test.operations")).toBeNull();
  });

  it("serializes errors as strings", async () => {
    const op: Operation = {
      id: "op1",
      type: "set_cell",
      rowId: "r1",
      colId: "c1",
      value: 42,
      source: "client",
      target: { type: "cell", rowId: "r1", colId: "c1" },
    };
    const records = new Map([
      ["op1", { op, status: "pending" as const, error: new Error("test error") }],
    ]);

    await persistence.save(records);

    const stored = localStorage.getItem("test.operations");
    const data = JSON.parse(stored!);
    expect(typeof data.op1.error).toBe("string");
    expect(data.op1.error).toContain("test error");
  });
});

describe("NoOpOperationPersistence", () => {
  it("does nothing", async () => {
    const persistence = new NoOpOperationPersistence();

    const records = new Map([["op1", { op: {} as Operation, status: "pending" as const }]]);
    await persistence.save(records);
    const loaded = await persistence.load();
    await persistence.clear();

    expect(loaded.size).toBe(0);
  });
});

describe("OperationManager with persistence", () => {
  let engine: ITableEngine;
  let transport: IOperationTransport;
  let persistence: IOperationPersistence;

  beforeEach(() => {
    localStorage.clear();
    engine = makeEngine();
    persistence = new LocalStorageOperationPersistence("test.ops");
    transport = {
      send: vi.fn(async () => ({ results: [] })),
    };
  });

  afterEach(() => {
    localStorage.clear();
  });

  it("persists new operations", async () => {
    const manager = new OperationManagerImpl(engine, transport, 50, persistence);
    const op: Operation = {
      id: "op1",
      type: "set_cell",
      rowId: "r1",
      colId: "c1",
      value: 42,
      source: "client",
      target: { type: "cell", rowId: "r1", colId: "c1" },
    };

    manager.apply(op);
    await new Promise((r) => setTimeout(r, 10)); // Wait for async save

    const stored = localStorage.getItem("test.ops");
    expect(stored).toBeDefined();
    const data = JSON.parse(stored!);
    expect(data.op1).toBeDefined();
  });

  it("loads persisted operations on initialization", async () => {
    // Pre-populate localStorage with a pending operation
    const op: Operation = {
      id: "persisted-op",
      type: "set_cell",
      rowId: "r1",
      colId: "c1",
      value: 42,
      source: "client",
      target: { type: "cell", rowId: "r1", colId: "c1" },
    };
    const persistence1 = new LocalStorageOperationPersistence("test.ops");
    const records = new Map([["persisted-op", { op, status: "pending" as const }]]);
    await persistence1.save(records);

    // Create new manager and load persisted ops
    const manager = new OperationManagerImpl(engine, transport, 50, persistence);
    await manager.loadPersistedOperations();

    // Verify pending operations are restored
    const pending = manager.getPendingByTarget({ type: "cell", rowId: "r1", colId: "c1" });
    expect(pending.length).toBe(1);
    expect(pending[0].op.id).toBe("persisted-op");
  });

  it("re-applies persisted operations to engine", async () => {
    const op: Operation = {
      id: "op1",
      type: "set_cell",
      rowId: "r1",
      colId: "c1",
      value: 55,
      source: "client",
      target: { type: "cell", rowId: "r1", colId: "c1" },
    };
    const persistence1 = new LocalStorageOperationPersistence("test.ops");
    const records = new Map([["op1", { op, status: "pending" as const }]]);
    await persistence1.save(records);

    const manager = new OperationManagerImpl(engine, transport, 50, persistence);
    await manager.loadPersistedOperations();

    // Verify cell was updated in engine (idempotent reapply)
    const state = engine.getState();
    const cell = state.rows.get("r1")?.cells["c1"];
    expect(cell?.value).toBe(55);
  });

  it("re-enqueues persisted operations to batcher", async () => {
    const op: Operation = {
      id: "op1",
      type: "set_cell",
      rowId: "r1",
      colId: "c1",
      value: 42,
      source: "client",
      target: { type: "cell", rowId: "r1", colId: "c1" },
    };
    const persistence1 = new LocalStorageOperationPersistence("test.ops");
    const records = new Map([["op1", { op, status: "pending" as const }]]);
    await persistence1.save(records);

    const mockTransport: IOperationTransport = {
      send: vi.fn(async () => ({ results: [{ id: "op1", error: undefined }] })),
    };

    const manager = new OperationManagerImpl(engine, mockTransport, 50, persistence);
    await manager.loadPersistedOperations();

    // Flush batcher to trigger send
    manager.flush();
    await new Promise((r) => setTimeout(r, 100));

    expect(mockTransport.send).toHaveBeenCalled();
    const calls = (mockTransport.send as any).mock.calls;
    expect(calls[0][0]).toEqual([op]);
  });

  it("updates persistence on confirm", async () => {
    const manager = new OperationManagerImpl(engine, transport, 50, persistence);
    const op: Operation = {
      id: "op1",
      type: "set_cell",
      rowId: "r1",
      colId: "c1",
      value: 42,
      source: "client",
      target: { type: "cell", rowId: "r1", colId: "c1" },
    };

    manager.apply(op);
    await new Promise((r) => setTimeout(r, 10));

    manager.confirm("op1");
    await new Promise((r) => setTimeout(r, 10));

    // After confirm, pending ops should not be in storage
    const stored = localStorage.getItem("test.ops");
    const data = JSON.parse(stored!);
    expect(data.op1).toBeUndefined();
  });

  it("handles missing persisted data gracefully", async () => {
    const manager = new OperationManagerImpl(engine, transport, 50, persistence);

    // Should not throw
    await expect(manager.loadPersistedOperations()).resolves.toBeUndefined();
    expect(manager.getPendingByTarget({ type: "cell", rowId: "r1", colId: "c1" })).toEqual([]);
  });
});
