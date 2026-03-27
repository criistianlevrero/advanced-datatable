import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { TableEngineImpl } from "@advanced-datatable/core";
import { OperationManagerImpl } from "@advanced-datatable/operations";
import type { IOperationTransport } from "@advanced-datatable/api-client";
import type { Operation } from "@advanced-datatable/core";

function makeEngine() {
  return new TableEngineImpl({
    schema: {
      columns: { name: { id: "name", type: "string", title: "Name" } },
      columnOrder: ["name"],
      version: 1,
    },
    rows: new Map([["r1", { id: "r1", cells: { name: { value: "Alice" } } }]]),
    rowOrder: ["r1"],
  });
}

function makeSetCellOp(id = "op-1"): Operation {
  return {
    id,
    type: "set_cell",
    source: "client",
    rowId: "r1",
    colId: "name",
    value: "Bob",
    target: { type: "cell", rowId: "r1", colId: "name" },
  };
}

describe("OperationManagerImpl", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it("applies op to engine immediately and tracks pending by target", () => {
    const transport: IOperationTransport = {
      send: vi.fn().mockResolvedValue({ results: [] }),
      loadTable: vi.fn(),
    };

    const engine = makeEngine();
    const manager = new OperationManagerImpl(engine, transport, 10);

    manager.apply(makeSetCellOp());

    expect(engine.getState().rows.get("r1")?.cells.name.value).toBe("Bob");
    expect(
      manager.getPendingByTarget({ type: "cell", rowId: "r1", colId: "name" }).length,
    ).toBe(1);
  });

  it("confirms ops after successful transport send", async () => {
    const transport: IOperationTransport = {
      send: vi.fn().mockResolvedValue({
        results: [{ opId: "op-1", status: "confirmed" }],
      }),
      loadTable: vi.fn(),
    };

    const manager = new OperationManagerImpl(makeEngine(), transport, 10);
    manager.apply(makeSetCellOp("op-1"));

    await vi.advanceTimersByTimeAsync(10);
    await Promise.resolve();

    expect(transport.send).toHaveBeenCalledTimes(1);
    expect(
      manager.getPendingByTarget({ type: "cell", rowId: "r1", colId: "name" }).length,
    ).toBe(0);
  });

  it("marks op as error and clears pending when transport fails", async () => {
    const transport: IOperationTransport = {
      send: vi.fn().mockRejectedValue(new Error("network down")),
      loadTable: vi.fn(),
    };

    const manager = new OperationManagerImpl(makeEngine(), transport, 10);
    manager.apply(makeSetCellOp("op-err"));

    await vi.advanceTimersByTimeAsync(10);
    await Promise.resolve();

    expect(transport.send).toHaveBeenCalledTimes(1);
    expect(
      manager.getPendingByTarget({ type: "cell", rowId: "r1", colId: "name" }).length,
    ).toBe(0);
  });

  it("flush sends queued ops immediately", async () => {
    const transport: IOperationTransport = {
      send: vi.fn().mockResolvedValue({
        results: [{ opId: "op-flush", status: "confirmed" }],
      }),
      loadTable: vi.fn(),
    };

    const manager = new OperationManagerImpl(makeEngine(), transport, 1000);
    manager.apply(makeSetCellOp("op-flush"));

    manager.flush();
    await Promise.resolve();

    expect(transport.send).toHaveBeenCalledTimes(1);
    expect(transport.send).toHaveBeenCalledWith([expect.objectContaining({ id: "op-flush" })]);
  });

  it("emits lifecycle events to subscribers", async () => {
    const transport: IOperationTransport = {
      send: vi.fn().mockResolvedValue({
        results: [{ opId: "op-events", status: "confirmed" }],
      }),
      loadTable: vi.fn(),
    };

    const manager = new OperationManagerImpl(makeEngine(), transport, 10);
    const events: string[] = [];

    const unsubscribe = manager.subscribe((event) => {
      events.push(event.type);
    });

    manager.apply(makeSetCellOp("op-events"));
    await vi.advanceTimersByTimeAsync(10);
    await Promise.resolve();

    unsubscribe();

    expect(events).toContain("applied");
    expect(events).toContain("confirmed");
  });

  it("fails missing operations when transport returns partial results", async () => {
    const transport: IOperationTransport = {
      send: vi.fn().mockResolvedValue({
        results: [{ opId: "op-a", status: "confirmed" }],
      }),
      loadTable: vi.fn(),
    };

    const manager = new OperationManagerImpl(makeEngine(), transport, 10);
    const events: string[] = [];

    const unsubscribe = manager.subscribe((event) => {
      events.push(event.type);
    });

    manager.apply(makeSetCellOp("op-a"));
    manager.apply(makeSetCellOp("op-b"));

    await vi.advanceTimersByTimeAsync(10);
    await Promise.resolve();

    unsubscribe();

    expect(transport.send).toHaveBeenCalledTimes(1);
    expect(events.filter((e) => e === "applied")).toHaveLength(2);
    expect(events).toContain("confirmed");
    expect(events).toContain("failed");
    expect(
      manager.getPendingByTarget({ type: "cell", rowId: "r1", colId: "name" }).length,
    ).toBe(0);
  });

  it("retries transport failures and confirms when retry succeeds", async () => {
    const transport: IOperationTransport = {
      send: vi
        .fn()
        .mockRejectedValueOnce(new Error("temporary network error"))
        .mockResolvedValueOnce({
          results: [{ opId: "op-retry", status: "confirmed" }],
        }),
      loadTable: vi.fn(),
    };

    const manager = new OperationManagerImpl(makeEngine(), transport, {
      debounceMs: 10,
      maxRetries: 1,
      baseRetryDelayMs: 20,
    });

    manager.apply(makeSetCellOp("op-retry"));

    await vi.advanceTimersByTimeAsync(10);
    await Promise.resolve();
    expect(transport.send).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(20);
    await Promise.resolve();
    expect(transport.send).toHaveBeenCalledTimes(2);
    expect(
      manager.getPendingByTarget({ type: "cell", rowId: "r1", colId: "name" }).length,
    ).toBe(0);
  });

  it("fails operation after exhausting configured retries", async () => {
    const transport: IOperationTransport = {
      send: vi.fn().mockRejectedValue(new Error("permanent failure")),
      loadTable: vi.fn(),
    };

    const manager = new OperationManagerImpl(makeEngine(), transport, {
      debounceMs: 10,
      maxRetries: 2,
      baseRetryDelayMs: 20,
    });

    manager.apply(makeSetCellOp("op-exhaust"));

    await vi.advanceTimersByTimeAsync(10);
    await Promise.resolve();
    await vi.advanceTimersByTimeAsync(20);
    await Promise.resolve();
    await vi.advanceTimersByTimeAsync(40);
    await Promise.resolve();

    // 1 initial attempt + 2 retries.
    expect(transport.send).toHaveBeenCalledTimes(3);
    expect(
      manager.getPendingByTarget({ type: "cell", rowId: "r1", colId: "name" }).length,
    ).toBe(0);
  });

  it("does not retry non-retryable transport errors (e.g. 4xx)", async () => {
    const nonRetryableError = Object.assign(new Error("bad request"), {
      status: 400,
      retryable: false,
    });

    const transport: IOperationTransport = {
      send: vi.fn().mockRejectedValue(nonRetryableError),
      loadTable: vi.fn(),
    };

    const manager = new OperationManagerImpl(makeEngine(), transport, {
      debounceMs: 10,
      maxRetries: 3,
      baseRetryDelayMs: 20,
    });

    manager.apply(makeSetCellOp("op-400"));

    await vi.advanceTimersByTimeAsync(10);
    await Promise.resolve();
    await vi.advanceTimersByTimeAsync(1000);
    await Promise.resolve();

    expect(transport.send).toHaveBeenCalledTimes(1);
    expect(
      manager.getPendingByTarget({ type: "cell", rowId: "r1", colId: "name" }).length,
    ).toBe(0);
  });

  it("retries status 503 errors by default", async () => {
    const retryableError = Object.assign(new Error("service unavailable"), {
      status: 503,
      retryable: true,
    });

    const transport: IOperationTransport = {
      send: vi
        .fn()
        .mockRejectedValueOnce(retryableError)
        .mockResolvedValueOnce({ results: [{ opId: "op-503", status: "confirmed" }] }),
      loadTable: vi.fn(),
    };

    const manager = new OperationManagerImpl(makeEngine(), transport, {
      debounceMs: 10,
      maxRetries: 2,
      baseRetryDelayMs: 20,
      jitterRatio: 0,
    });

    manager.apply(makeSetCellOp("op-503"));

    await vi.advanceTimersByTimeAsync(10);
    await Promise.resolve();
    expect(transport.send).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(20);
    await Promise.resolve();
    expect(transport.send).toHaveBeenCalledTimes(2);
    expect(
      manager.getPendingByTarget({ type: "cell", rowId: "r1", colId: "name" }).length,
    ).toBe(0);
  });
});
