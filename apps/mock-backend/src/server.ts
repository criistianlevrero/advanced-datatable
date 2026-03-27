import { createServer } from "node:http";
import type { IncomingMessage, ServerResponse } from "node:http";
import type { MockBackendConfig } from "./config";
import { createConfig } from "./config";
import { processBatch, validateBatch } from "./handlers/batchHandler";
import type { OperationBatchRequest, MockTableResponse } from "./types";

const defaultTable: MockTableResponse = {
  schema: {
    columns: {
      name: { id: "name", type: "string", title: "Name" },
      age: { id: "age", type: "number", title: "Age" },
      active: { id: "active", type: "boolean", title: "Active" },
    },
    columnOrder: ["name", "age", "active"],
    version: 1,
  },
  rows: [
    { id: "r1", cells: { name: { value: "Alice" }, age: { value: 30 }, active: { value: true } } },
    { id: "r2", cells: { name: { value: "Bob" }, age: { value: 25 }, active: { value: false } } },
    { id: "r3", cells: { name: { value: "Carol" }, age: { value: 35 }, active: { value: true } } },
  ],
  rowOrder: ["r1", "r2", "r3"],
};

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

    const response = await processBatch(batch, config);
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

export function createMockBackendServer(config: MockBackendConfig = createConfig()) {
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
      sendJson(res, 200, defaultTable);
      return;
    }

    if (req.method === "POST" && (url.pathname === "/operations" || url.pathname === "/operations/batch")) {
      await handleOperations(req, res, config);
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
