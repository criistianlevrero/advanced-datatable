import { createServer } from "node:http";
import type { IncomingMessage, ServerResponse } from "node:http";
import { TableEngineImpl } from "@advanced-datatable/core";
import type { BulkUpdateOperation, Operation, SetCellOperation, TableState } from "@advanced-datatable/core";
import type { MockBackendConfig } from "./config";
import { createConfig } from "./config";
import { processBatch, validateBatch } from "./handlers/batchHandler";
import type { BackendIntegrationPullResponse, OperationBatchRequest } from "./types";

const defaultTableState: Partial<TableState> = {
  schema: {
    columns: {
      name: { id: "name", type: "string", title: "Name" },
      age: { id: "age", type: "number", title: "Age" },
      active: { id: "active", type: "boolean", title: "Active" },
    },
    columnOrder: ["name", "age", "active"],
    version: 1,
  },
  rows: new Map([
    ["r1", { id: "r1", cells: { name: { value: "Alice" }, age: { value: 30 }, active: { value: true } } }],
    ["r2", { id: "r2", cells: { name: { value: "Bob" }, age: { value: 25 }, active: { value: false } } }],
    ["r3", { id: "r3", cells: { name: { value: "Carol" }, age: { value: 35 }, active: { value: true } } }],
  ]),
  rowOrder: ["r1", "r2", "r3"],
};

const backendIntegrationInitialState: Partial<TableState> = {
  schema: {
    columns: {
      id: { id: "id", type: "string", title: "ID", meta: { readOnly: true } },
      name: { id: "name", type: "string", title: "Name", meta: { readOnly: true } },
      team: { id: "team", type: "string", title: "Team", meta: { readOnly: true } },
      value: { id: "value", type: "number", title: "Value" },
      processed: { id: "processed", type: "number", title: "Processed", meta: { readOnly: true } },
    },
    columnOrder: ["id", "name", "team", "value", "processed"],
    version: 1,
  },
  rows: new Map(
    Array.from({ length: 16 }, (_, index) => {
      const rowId = `bi-r${index + 1}`;
      const value = (index + 1) * 3;
      const teams = ["Core", "Growth", "Platform", "Data"];
      return [
        rowId,
        {
          id: rowId,
          cells: {
            id: { value: rowId },
            name: { value: `Item ${index + 1}` },
            team: { value: teams[index % teams.length] },
            value: { value },
            processed: { value: value * 2, meta: { readOnly: true } },
          },
        },
      ] as const;
    }),
  ),
  rowOrder: Array.from({ length: 16 }, (_, index) => `bi-r${index + 1}`),
};

interface ScheduledProcessedUpdate {
  readyAt: number;
  operation: Operation;
}

interface LoggedServerOperation {
  cursor: number;
  operation: Operation;
}

function serializeTableResponse(state: Readonly<TableState>) {
  return {
    schema: state.schema,
    rows: Array.from(state.rows.values()),
    rowOrder: state.rowOrder,
  };
}

function setCors(res: ServerResponse): void {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
}

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  setCors(res);
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(body));
}

async function readJson(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }
  const bodyText = Buffer.concat(chunks).toString("utf8");
  if (!bodyText) {
    return null;
  }
  return JSON.parse(bodyText);
}

async function handleOperations(
  req: IncomingMessage,
  res: ServerResponse,
  config: MockBackendConfig,
  engine: InstanceType<typeof TableEngineImpl>,
): Promise<void> {
  try {
    const body = await readJson(req);
    if (!body) {
      sendJson(res, 400, { error: "Empty request body" });
      return;
    }

    if (!validateBatch(body)) {
      sendJson(res, 400, { error: "Invalid batch request format" });
      return;
    }

    const batch = body as OperationBatchRequest;
    if (config.verbose) {
      console.log(`[MockBackend] Processing ${batch.operations.length} operations`);
    }

    const response = await processBatch(batch, config, engine);
    sendJson(res, 200, response);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    const statusMatch = message.match(/(\d{3})/);
    const status = statusMatch ? Number.parseInt(statusMatch[1], 10) : 500;
    sendJson(res, status, { error: message, results: [] });
  }
}

async function handleConfig(
  req: IncomingMessage,
  res: ServerResponse,
  config: MockBackendConfig,
): Promise<void> {
  try {
    const body = (await readJson(req)) as Partial<MockBackendConfig> | null;
    if (!body) {
      sendJson(res, 400, { success: false, error: "Empty request body" });
      return;
    }

    if (body.latencyMs !== undefined) config.latencyMs = body.latencyMs;
    if (body.errorRate !== undefined) config.errorRate = body.errorRate;
    if (body.partialResponseMode !== undefined) config.partialResponseMode = body.partialResponseMode;
    if (body.conflictOpIds !== undefined) config.conflictOpIds = body.conflictOpIds;
    if (body.verbose !== undefined) config.verbose = body.verbose;

    sendJson(res, 200, { success: true, config });
  } catch (error) {
    sendJson(res, 400, { success: false, error: String(error) });
  }
}

function flushReadyProcessedUpdates(
  engine: TableEngineImpl,
  queue: ScheduledProcessedUpdate[],
  opLog: LoggedServerOperation[],
  cursorRef: { value: number },
): void {
  const now = Date.now();
  let writeIndex = 0;

  for (let readIndex = 0; readIndex < queue.length; readIndex += 1) {
    const queued = queue[readIndex];
    if (queued.readyAt <= now) {
      engine.apply(queued.operation);
      cursorRef.value += 1;
      opLog.push({ cursor: cursorRef.value, operation: queued.operation });
      continue;
    }

    queue[writeIndex] = queued;
    writeIndex += 1;
  }

  queue.length = writeIndex;
}

async function handleBackendIntegrationOperations(
  req: IncomingMessage,
  res: ServerResponse,
  config: MockBackendConfig,
  engine: TableEngineImpl,
  queue: ScheduledProcessedUpdate[],
): Promise<void> {
  try {
    const body = await readJson(req);
    if (!body) {
      sendJson(res, 400, { error: "Empty request body" });
      return;
    }

    if (!validateBatch(body)) {
      sendJson(res, 400, { error: "Invalid batch request format" });
      return;
    }

    const batch = body as OperationBatchRequest;
    const results: Array<{ opId: string; status: "confirmed" | "error"; error?: string }> = [];

    const queueProcessedUpdate = (sourceOpId: string, rowId: string, value: number) => {
      queue.push({
        readyAt: Date.now() + 1200,
        operation: {
          id: `${sourceOpId}:processed:${rowId}`,
          type: "set_cell",
          source: "server",
          rowId,
          colId: "processed",
          value: value * 2,
          target: { type: "cell", rowId, colId: "processed" },
          ts: Date.now(),
          meta: { derivedFrom: sourceOpId },
        },
      });
    };

    for (const op of batch.operations) {
      if (config.conflictOpIds.includes(op.id)) {
        results.push({
          opId: op.id,
          status: "error",
          error: "CONFLICT: Operation conflicts with existing data on server",
        });
        continue;
      }

      if (op.type === "set_cell") {
        const setCellOp = op as SetCellOperation;

        if (setCellOp.colId !== "value") {
          results.push({
            opId: op.id,
            status: "error",
            error: "Only operations for column 'value' are supported in this demo",
          });
          continue;
        }

        if (typeof setCellOp.value !== "number" || Number.isNaN(setCellOp.value)) {
          results.push({
            opId: op.id,
            status: "error",
            error: "Column 'value' accepts number values only",
          });
          continue;
        }

        try {
          // Client sends partial cell update; backend applies it immediately.
          engine.apply(setCellOp);
          results.push({ opId: op.id, status: "confirmed" });
          queueProcessedUpdate(op.id, setCellOp.rowId, setCellOp.value);
        } catch (error) {
          results.push({
            opId: op.id,
            status: "error",
            error: `Failed to apply operation: ${String(error)}`,
          });
        }

        continue;
      }

      if (op.type === "bulk_update") {
        const bulkOp = op as BulkUpdateOperation;

        if (!Array.isArray(bulkOp.updates) || bulkOp.updates.length === 0) {
          results.push({
            opId: op.id,
            status: "error",
            error: "bulk_update must include at least one update",
          });
          continue;
        }

        const invalidUpdate = bulkOp.updates.find(
          (update) => update.colId !== "value" || typeof update.value !== "number" || Number.isNaN(update.value),
        );

        if (invalidUpdate) {
          results.push({
            opId: op.id,
            status: "error",
            error: "bulk_update only supports numeric updates for column 'value' in this demo",
          });
          continue;
        }

        try {
          // Client sends a partial batch update (e.g. paste over multiple rows).
          engine.apply(bulkOp);
          results.push({ opId: op.id, status: "confirmed" });

          for (const update of bulkOp.updates) {
            queueProcessedUpdate(op.id, update.rowId, update.value as number);
          }
        } catch (error) {
          results.push({
            opId: op.id,
            status: "error",
            error: `Failed to apply operation: ${String(error)}`,
          });
        }

        continue;
      }

      results.push({
        opId: op.id,
        status: "error",
        error: "Only set_cell and bulk_update operations are supported in this demo",
      });
    }

    sendJson(res, 200, { results, timestamp: Date.now() });
  } catch (error) {
    sendJson(res, 500, { error: String(error), results: [] });
  }
}

async function handleBackendIntegrationPull(
  req: IncomingMessage,
  res: ServerResponse,
  engine: TableEngineImpl,
  queue: ScheduledProcessedUpdate[],
  opLog: LoggedServerOperation[],
  cursorRef: { value: number },
): Promise<void> {
  const url = new URL(req.url ?? "", `http://${req.headers.host ?? "localhost"}`);
  const sinceParam = Number.parseInt(url.searchParams.get("since") ?? "0", 10);
  const since = Number.isFinite(sinceParam) ? Math.max(0, sinceParam) : 0;

  flushReadyProcessedUpdates(engine, queue, opLog, cursorRef);

  const operations = opLog
    .filter((entry) => entry.cursor > since)
    .map((entry) => entry.operation);

  const response: BackendIntegrationPullResponse = {
    cursor: cursorRef.value,
    operations,
  };

  sendJson(res, 200, response);
}

export function createMockBackendServer(config: MockBackendConfig = createConfig()) {
  // Initialize TableEngine with the default table state
  // This engine instance persists across requests and applies real operations
  const engine = new TableEngineImpl(defaultTableState);
  const backendIntegrationEngine = new TableEngineImpl(backendIntegrationInitialState);
  const backendIntegrationQueue: ScheduledProcessedUpdate[] = [];
  const backendIntegrationLog: LoggedServerOperation[] = [];
  const backendIntegrationCursor = { value: 0 };

  return createServer(async (req, res) => {
    setCors(res);

    if (!req.url || !req.method) {
      sendJson(res, 400, { error: "Invalid request" });
      return;
    }

    if (req.method === "OPTIONS") {
      res.statusCode = 204;
      res.end();
      return;
    }

    const url = new URL(req.url, `http://${req.headers.host ?? `localhost:${config.port}`}`);

    if (req.method === "GET" && url.pathname === "/health") {
      sendJson(res, 200, {
        status: "ok",
        timestamp: Date.now(),
        config: {
          latencyMs: config.latencyMs,
          errorRate: config.errorRate,
          partialResponseMode: config.partialResponseMode,
          conflictOpIds: config.conflictOpIds.length,
        },
      });
      return;
    }

    if (req.method === "GET" && url.pathname === "/table") {
      // Return current engine state (may have been modified by operations)
      const currentState = engine.getState();
      sendJson(res, 200, serializeTableResponse(currentState));
      return;
    }

    if (req.method === "GET" && url.pathname === "/backend-integration/table") {
      flushReadyProcessedUpdates(
        backendIntegrationEngine,
        backendIntegrationQueue,
        backendIntegrationLog,
        backendIntegrationCursor,
      );
      sendJson(res, 200, serializeTableResponse(backendIntegrationEngine.getState()));
      return;
    }

    if (req.method === "POST" && (url.pathname === "/operations" || url.pathname === "/operations/batch")) {
      await handleOperations(req, res, config, engine);
      return;
    }

    if (req.method === "POST" && url.pathname === "/backend-integration/operations") {
      await handleBackendIntegrationOperations(
        req,
        res,
        config,
        backendIntegrationEngine,
        backendIntegrationQueue,
      );
      return;
    }

    if (req.method === "GET" && url.pathname === "/backend-integration/pull") {
      await handleBackendIntegrationPull(
        req,
        res,
        backendIntegrationEngine,
        backendIntegrationQueue,
        backendIntegrationLog,
        backendIntegrationCursor,
      );
      return;
    }

    if (req.method === "POST" && url.pathname === "/config") {
      await handleConfig(req, res, config);
      return;
    }

    sendJson(res, 404, { error: "Not found" });
  });
}

export function startMockBackend(config: MockBackendConfig = createConfig()) {
  const server = createMockBackendServer(config);
  return new Promise<{ server: ReturnType<typeof createMockBackendServer>; config: MockBackendConfig }>((resolve) => {
    server.listen(config.port, () => {
      console.log(`[MockBackend] Server listening on http://localhost:${config.port}`);
      resolve({ server, config });
    });
  });
}

const isDirectRun = process.argv[1]?.endsWith("server.ts") || process.argv[1]?.endsWith("server.js");

if (isDirectRun) {
  void startMockBackend(createConfig({
    port: 3001,
    latencyMs: 100,
    errorRate: 0,
    verbose: true,
  }));
}
