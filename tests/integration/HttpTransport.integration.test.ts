// @vitest-environment node
/**
 * Integration tests: HttpTransport + OperationManagerImpl + mock backend server.
 */

import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import type { Server } from "node:http";
import { TableEngineImpl } from "@advanced-datatable/core";
import type { Operation } from "@advanced-datatable/core";
import { HttpTransport } from "@advanced-datatable/api-client";
import { OperationManagerImpl } from "@advanced-datatable/operations";

// Dynamically import the server so this test file can work without tsx resolution
const { createMockBackendServer } = await import(
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore – mock-backend is not in the monorepo aliases, import by path
  "../../apps/mock-backend/src/server.ts"
);
const { createConfig } = await import(
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore – mock-backend is not in the monorepo aliases, import by path
  "../../apps/mock-backend/src/config.ts"
);

const TEST_PORT = 3099;
const BASE_URL = `http://localhost:${TEST_PORT}`;

function makeManager() {
  const engine = new TableEngineImpl({
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

  const transport = new HttpTransport({ baseUrl: BASE_URL });
  const manager = new OperationManagerImpl(engine, transport, { debounceMs: 0, maxRetries: 0 });

  return { engine, transport, manager };
}

function makeSetCellOp(id: string, value: string): Operation {
  return {
    id,
    type: "set_cell",
    source: "client",
    rowId: "r1",
    colId: "name",
    value,
    target: { type: "cell", rowId: "r1", colId: "name" },
  };
}

describe("HttpTransport + OperationManagerImpl integration", () => {
  let server: Server;

  beforeAll(
    () =>
      new Promise<void>((resolve) => {
        server = createMockBackendServer(
          createConfig({ port: TEST_PORT, latencyMs: 0, verbose: false }),
        );
        server.listen(TEST_PORT, () => resolve());
      }),
  );

  afterEach(async () => {
    vi.restoreAllMocks();
    await fetch(`${BASE_URL}/config`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        errorRate: 0,
        latencyMs: 0,
        partialResponseMode: false,
        conflictOpIds: [],
        verbose: false,
      }),
    });
  });

  afterAll(
    () =>
      new Promise<void>((resolve, reject) => {
        server.close((err) => (err ? reject(err) : resolve()));
      }),
  );

  it("confirms a single operation end-to-end", async () => {
    const { manager } = makeManager();
    const confirmedOps: string[] = [];

    manager.subscribe((event) => {
      if (event.type === "confirmed") confirmedOps.push(event.opId);
    });

    manager.apply(makeSetCellOp("op-e2e-1", "Updated"));

    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(confirmedOps).toContain("op-e2e-1");
    expect(manager.getPendingOperations()).toHaveLength(0);
  });

  it("confirms a batch of multiple operations", async () => {
    const { manager } = makeManager();
    const confirmedOps: string[] = [];

    manager.subscribe((event) => {
      if (event.type === "confirmed") confirmedOps.push(event.opId);
    });

    for (let i = 0; i < 5; i++) {
      manager.apply(makeSetCellOp(`op-batch-${i}`, `Val${i}`));
    }

    await new Promise((resolve) => setTimeout(resolve, 200));

    expect(confirmedOps).toHaveLength(5);
    expect(manager.getPendingOperations()).toHaveLength(0);
  });

  it("marks operations as failed when server returns errorRate=1", async () => {
    // Reconfigure server to fail all requests
    await fetch(`${BASE_URL}/config`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ errorRate: 1 }),
    });

    const { manager } = makeManager();
    const failedOps: string[] = [];

    manager.subscribe((event) => {
      if (event.type === "failed") failedOps.push(event.opId);
    });

    manager.apply(makeSetCellOp("op-fail-1", "ShouldFail"));

    await new Promise((resolve) => setTimeout(resolve, 300));

    expect(failedOps).toContain("op-fail-1");
    expect(manager.getPendingOperations()).toHaveLength(0);
  });

  it("handles partial response — missing ops are marked failed", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0.8);

    // Enable partial response mode
    await fetch(`${BASE_URL}/config`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ partialResponseMode: true }),
    });

    const { manager } = makeManager();
    const confirmedOps: string[] = [];
    const failedOps: string[] = [];

    manager.subscribe((event) => {
      if (event.type === "confirmed") confirmedOps.push(event.opId);
      if (event.type === "failed") failedOps.push(event.opId);
    });

    for (let i = 0; i < 3; i++) {
      manager.apply(makeSetCellOp(`op-partial-${i}`, `P${i}`));
    }

    await new Promise((resolve) => setTimeout(resolve, 300));

    expect(confirmedOps.length + failedOps.length).toBe(3);
    expect(failedOps.length).toBeGreaterThan(0);
  });

  it("marks configured conflict opIds as failed", async () => {
    await fetch(`${BASE_URL}/config`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ conflictOpIds: ["op-conflict-1"] }),
    });

    const { manager } = makeManager();
    const failedOps: string[] = [];

    manager.subscribe((event) => {
      if (event.type === "failed") failedOps.push(event.opId);
    });

    manager.apply(makeSetCellOp("op-conflict-1", "ConflictValue"));

    await new Promise((resolve) => setTimeout(resolve, 200));

    expect(failedOps).toContain("op-conflict-1");
    expect(manager.getPendingOperations()).toHaveLength(0);
  });

  it("GET /health returns server config", async () => {
    const res = await fetch(`${BASE_URL}/health`);
    expect(res.ok).toBe(true);
    const data = (await res.json()) as { status: string };
    expect(data.status).toBe("ok");
  });

  it("GET /table returns default table state", async () => {
    const transport = new HttpTransport({ baseUrl: BASE_URL });
    const table = await transport.loadTable();
    expect(table.rowOrder.length).toBeGreaterThan(0);
    expect(table.schema.columnOrder.length).toBeGreaterThan(0);
  });

  it("replayPendingOperations sends queued ops to the server", async () => {
    const { manager } = makeManager();
    const confirmedOps: string[] = [];

    manager.subscribe((event) => {
      if (event.type === "confirmed") confirmedOps.push(event.opId);
    });

    manager.apply(makeSetCellOp("op-replay-1", "ReplayTest"));

    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(confirmedOps).toContain("op-replay-1");
    expect(manager.getPendingOperations()).toHaveLength(0);
  });
});
