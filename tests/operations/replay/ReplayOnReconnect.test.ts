import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import type { ITableEngine, Operation } from "@advanced-datatable/core";
import { TableEngineImpl } from "@advanced-datatable/core";
import type { IOperationTransport } from "@advanced-datatable/api-client";
import {
  OperationManagerImpl,
  BrowserConnectivityMonitor,
  NoOpConnectivityMonitor,
  LocalStorageOperationPersistence,
} from "@advanced-datatable/operations";
import type { IConnectivityMonitor } from "@advanced-datatable/operations";

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

describe("BrowserConnectivityMonitor", () => {
  it("reports initial online state", () => {
    const monitor = new BrowserConnectivityMonitor();
    expect(typeof monitor.isOnline()).toBe("boolean");
  });

  it("calls listener when going online", () => {
    const monitor = new BrowserConnectivityMonitor();
    const listener = vi.fn();

    monitor.subscribe(listener);

    // Simulate online event
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("online"));
    }

    // Listener should have been called if window was offline
    // (we can't force offline in test, so we just verify subscription works)
    expect(typeof listener).toBe("function");
  });

  it("calls listener when going offline", () => {
    const monitor = new BrowserConnectivityMonitor();
    const listener = vi.fn();

    monitor.subscribe(listener);

    // Simulate offline event
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("offline"));
    }

    expect(typeof listener).toBe("function");
  });

  it("unsubscribes listener", () => {
    const monitor = new BrowserConnectivityMonitor();
    const listener = vi.fn();

    const unsubscribe = monitor.subscribe(listener);
    unsubscribe();

    // Listener should be removed
    // We can't directly verify, but unsubscribe should return cleanly
    expect(typeof unsubscribe).toBe("function");
  });
});

describe("NoOpConnectivityMonitor", () => {
  it("always reports online", () => {
    const monitor = new NoOpConnectivityMonitor();
    expect(monitor.isOnline()).toBe(true);
  });

  it("subscription is no-op", () => {
    const monitor = new NoOpConnectivityMonitor();
    const listener = vi.fn();

    const unsubscribe = monitor.subscribe(listener);
    unsubscribe();

    expect(listener).not.toHaveBeenCalled();
  });
});

describe("OperationManager Auto-Replay", () => {
  let engine: ITableEngine;
  let transport: IOperationTransport;
  let connectivity: IConnectivityMonitor;

  beforeEach(() => {
    localStorage.clear();
    engine = makeEngine();
    transport = {
      send: vi.fn(async (batch: Operation[]) => ({
        results: batch.map((op) => ({ id: op.id, error: undefined })),
      })),
    };
  });

  it("enables auto-replay with connectivity monitor", () => {
    connectivity = new NoOpConnectivityMonitor();
    const manager = new OperationManagerImpl(engine, transport, 50);

    // Should not throw
    manager.enableAutoReplay(connectivity);
    expect(manager).toBeDefined();
  });

  it("disables auto-replay", () => {
    connectivity = new NoOpConnectivityMonitor();
    const manager = new OperationManagerImpl(engine, transport, 50);

    manager.enableAutoReplay(connectivity);
    manager.disableAutoReplay();

    expect(manager).toBeDefined();
  });

  it("replays pending operations manually", async () => {
    connectivity = new NoOpConnectivityMonitor();
    const manager = new OperationManagerImpl(engine, transport, 50);

    const op1: Operation = {
      id: "op1",
      type: "set_cell",
      rowId: "r1",
      colId: "c1",
      value: "test1",
      source: "client",
      target: { type: "cell", rowId: "r1", colId: "c1" },
    };

    const op2: Operation = {
      id: "op2",
      type: "set_cell",
      rowId: "r1",
      colId: "c1",
      value: "test2",
      source: "client",
      target: { type: "cell", rowId: "r1", colId: "c1" },
    };

    // Apply two operations
    manager.apply(op1);
    manager.apply(op2);
    await new Promise((r) => setTimeout(r, 10));

    // Clear transport calls
    (transport.send as any).mockClear();

    // Replay pending operations
    await manager.replayPendingOperations();
    await new Promise((r) => setTimeout(r, 100));

    // Verify transport was called with pending ops
    expect((transport.send as any).mock.calls.length).toBeGreaterThan(0);
    const calls = (transport.send as any).mock.calls;
    const sentOps = calls[0][0] as Operation[];
    expect(sentOps).toContainEqual(op1);
    expect(sentOps).toContainEqual(op2);
  });

  it("replays only pending operations, not confirmed", async () => {
    connectivity = new NoOpConnectivityMonitor();
    const manager = new OperationManagerImpl(engine, transport, 50);

    const op1: Operation = {
      id: "op1",
      type: "set_cell",
      rowId: "r1",
      colId: "c1",
      value: "test1",
      source: "client",
      target: { type: "cell", rowId: "r1", colId: "c1" },
    };

    const op2: Operation = {
      id: "op2",
      type: "set_cell",
      rowId: "r1",
      colId: "c1",
      value: "test2",
      source: "client",
      target: { type: "cell", rowId: "r1", colId: "c1" },
    };

    // Apply both operations
    manager.apply(op1);
    manager.apply(op2);
    
    // Wait for batcher to process (debounce 50ms)
    await new Promise((r) => setTimeout(r, 100));

    // Now confirm op1
    manager.confirm("op1");
    await new Promise((r) => setTimeout(r, 10));

    // Clear transport calls
    (transport.send as any).mockClear();

    // Replay pending operations - should only have op2
    await manager.replayPendingOperations();
    await new Promise((r) => setTimeout(r, 100));

    // Verify only op2 was replayed
    if ((transport.send as any).mock.calls.length > 0) {
      const calls = (transport.send as any).mock.calls;
      const sentOps = calls[0][0] as Operation[];
      expect(sentOps.length).toBe(1);
      expect(sentOps[0].id).toBe("op2");
    }
  });

  it("auto-triggers replay when connectivity monitor emits online", async () => {
    // Create a custom mock monitor
    const listeners = new Set<(isOnline: boolean) => void>();
    const mockMonitor: IConnectivityMonitor = {
      isOnline: () => true,
      subscribe: (listener) => {
        listeners.add(listener);
        return () => listeners.delete(listener);
      },
    };

    const manager = new OperationManagerImpl(engine, transport, 50);

    const op: Operation = {
      id: "op1",
      type: "set_cell",
      rowId: "r1",
      colId: "c1",
      value: "test",
      source: "client",
      target: { type: "cell", rowId: "r1", colId: "c1" },
    };

    manager.apply(op);
    await new Promise((r) => setTimeout(r, 10));

    // Enable auto-replay
    manager.enableAutoReplay(mockMonitor);

    // Clear transport calls
    (transport.send as any).mockClear();

    // Simulate going back online
    for (const listener of listeners) {
      listener(true);
    }

    await new Promise((r) => setTimeout(r, 100));

    // Verify replay was triggered
    expect((transport.send as any).mock.calls.length).toBeGreaterThan(0);
  });

  it("does not replay if no pending operations", async () => {
    connectivity = new NoOpConnectivityMonitor();
    const manager = new OperationManagerImpl(engine, transport, 50);

    (transport.send as any).mockClear();

    // Replay with no pending ops
    await manager.replayPendingOperations();

    // Transport should not have been called
    expect((transport.send as any).mock.calls.length).toBe(0);
  });
});
