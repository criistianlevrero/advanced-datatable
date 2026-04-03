# Backend Setup Guide: Quickstart

Build a DataTable backend using `@advanced-datatable/core` and the HTTP contracts defined in this project.

---

## Prerequisites

- **Node.js 18+** (for the reference examples)
- **TypeScript** knowledge
- Familiarity with [Backend Implementation](./10-backend-implementation.md) concepts

---

## Quick Start

### 1. Install Core Packages

```bash
npm install @advanced-datatable/core
```

### 2. Initialize TableEngine

```typescript
import { TableEngineImpl } from "@advanced-datatable/core";
import type { TableState } from "@advanced-datatable/core";

const initialState: TableState = {
  schema: {
    columns: {
      id: { id: "id", type: "string", title: "ID" },
      name: { id: "name", type: "string", title: "Name" },
      age: { id: "age", type: "number", title: "Age" },
    },
    columnOrder: ["id", "name", "age"],
    version: 1,
  },
  rows: new Map([
    ["r1", { id: "r1", cells: { id: { value: "1" }, name: { value: "Alice" }, age: { value: 30 } } }],
    ["r2", { id: "r2", cells: { id: { value: "2" }, name: { value: "Bob" }, age: { value: 25 } } }],
  ]),
  rowOrder: ["r1", "r2"],
};

const engine = new TableEngineImpl(initialState);
```

### 3. Build a Handler

```typescript
import type { Operation } from "@advanced-datatable/core";

export async function handleOperationBatch(operations: Operation[]) {
  const results = [];

  for (const op of operations) {
    try {
      engine.apply(op);
      results.push({ opId: op.id, status: "confirmed" });
    } catch (error) {
      results.push({
        opId: op.id,
        status: "error",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  return {
    results,
    state: engine.getState(),
    timestamp: Date.now(),
  };
}
```

### 4. Expose via HTTP

**Express.js Example:**

```typescript
import express from "express";

const app = express();
app.use(express.json());

// GET /table — Load initial state
app.get("/table", (req, res) => {
  const state = engine.getState();
  res.json({
    schema: state.schema,
    rows: Array.from(state.rows.values()),
    rowOrder: state.rowOrder,
  });
});

// POST /operations — Apply operations
app.post("/operations", async (req, res) => {
  const { operations } = req.body;

  if (!Array.isArray(operations)) {
    return res.status(400).json({ error: "Invalid batch request format" });
  }

  try {
    const response = await handleOperationBatch(operations);
    res.json(response);
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : "Internal server error",
      results: [],
    });
  }
});

app.listen(3001, () => console.log("Server running on port 3001"));
```

**Fastify Example:**

```typescript
import Fastify from "fastify";

const fastify = Fastify({ logger: true });

fastify.get("/table", async (request, reply) => {
  const state = engine.getState();
  return {
    schema: state.schema,
    rows: Array.from(state.rows.values()),
    rowOrder: state.rowOrder,
  };
});

fastify.post("/operations", async (request, reply) => {
  const { operations } = request.body as { operations: Operation[] };

  if (!Array.isArray(operations)) {
    reply.code(400);
    return { error: "Invalid batch request format" };
  }

  try {
    const response = await handleOperationBatch(operations);
    return response;
  } catch (error) {
    reply.code(500);
    return {
      error: error instanceof Error ? error.message : "Internal server error",
      results: [],
    };
  }
});

fastify.listen({ port: 3001 }, (err, address) => {
  if (err) throw err;
  console.log(`Server listening at ${address}`);
});
```

**Hono (Lightweight):**

```typescript
import { Hono } from "hono";

const app = new Hono();

app.get("/table", (c) => {
  const state = engine.getState();
  return c.json({
    schema: state.schema,
    rows: Array.from(state.rows.values()),
    rowOrder: state.rowOrder,
  });
});

app.post("/operations", async (c) => {
  const { operations } = await c.req.json() as { operations: Operation[] };

  if (!Array.isArray(operations)) {
    return c.json({ error: "Invalid batch request format" }, 400);
  }

  try {
    const response = await handleOperationBatch(operations);
    return c.json(response);
  } catch (error) {
    return c.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
        results: [],
      },
      500
    );
  }
});

export default app;
```

---

## Production Patterns

### 1. Load State from Database

```typescript
import { pool } from "./db";  // PostgreSQL pool or similar

async function loadStateFromDatabase(tableId: string) {
  const result = await pool.query(
    `SELECT schema, rows, row_order FROM tables WHERE id = $1`,
    [tableId]
  );

  if (result.rows.length === 0) {
    throw new Error("Table not found");
  }

  const { schema, rows, row_order } = result.rows[0];

  return {
    schema,
    rows: new Map(rows.map((r: any) => [r.id, r])),
    rowOrder: row_order,
  };
}

// Usage
const state = await loadStateFromDatabase("my-table-id");
const engine = new TableEngineImpl(state);
```

### 2. Persist State After Operations

```typescript
async function handleBatchWithPersistence(
  tableId: string,
  operations: Operation[]
) {
  const engine = new TableEngineImpl(await loadStateFromDatabase(tableId));

  const results = [];
  for (const op of operations) {
    try {
      engine.apply(op);
      results.push({ opId: op.id, status: "confirmed" });
    } catch (error) {
      results.push({
        opId: op.id,
        status: "error",
        error: String(error),
      });
    }
  }

  const finalState = engine.getState();

  // Save to database (wrapped in transaction)
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    await client.query(
      `UPDATE tables SET schema = $1, rows = $2, row_order = $3, version = version + 1
       WHERE id = $4`,
      [finalState.schema, Array.from(finalState.rows.values()), finalState.rowOrder, tableId]
    );

    // Log operations for audit trail
    for (const op of operations) {
      await client.query(
        `INSERT INTO operation_log (table_id, operation_id, type, data, status)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          tableId,
          op.id,
          op.type,
          JSON.stringify(op),
          results.find((r) => r.opId === op.id)?.status,
        ]
      );
    }

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }

  return {
    results,
    state: finalState,
    timestamp: Date.now(),
  };
}
```

### 3. Idempotency

Clients may retry operations. Detect duplicates to avoid applying twice:

```typescript
async function isOperationAlreadyApplied(tableId: string, opId: string) {
  const result = await pool.query(
    `SELECT 1 FROM operation_log WHERE table_id = $1 AND operation_id = $2`,
    [tableId, opId]
  );
  return result.rows.length > 0;
}

async function handleBatchIdempotent(tableId: string, operations: Operation[]) {
  const results = [];

  for (const op of operations) {
    if (await isOperationAlreadyApplied(tableId, op.id)) {
      // Skip — already applied
      results.push({
        opId: op.id,
        status: "confirmed", // Pretend it just succeeded
      });
      continue;
    }

    try {
      engine.apply(op);
      results.push({ opId: op.id, status: "confirmed" });
    } catch (error) {
      results.push({
        opId: op.id,
        status: "error",
        error: String(error),
      });
    }
  }

  // ... persist as before ...
}
```

### 4. Conflict Resolution

Real conflicts come from the engine. Log them for debugging:

```typescript
import { TableEngineImpl } from "@advanced-datatable/core";

const results = [];

for (const op of operations) {
  try {
    engine.apply(op);
    results.push({ opId: op.id, status: "confirmed" });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Unknown error";

    // Log conflict for analysis
    await pool.query(
      `INSERT INTO conflict_log (table_id, operation_id, error, attempted_state)
       VALUES ($1, $2, $3, $4)`,
      [tableId, op.id, errorMsg, JSON.stringify(op)]
    );

    results.push({
      opId: op.id,
      status: "error",
      error: errorMsg,
    });
  }
}
```

---

## Testing Your Backend

### Unit Test

```typescript
import { describe, it, expect } from "vitest";
import { TableEngineImpl } from "@advanced-datatable/core";

describe("Backend Handler", () => {
  it("applies operations and returns updated state", async () => {
    const engine = new TableEngineImpl({
      schema: {
        columns: { name: { id: "name", type: "string", title: "Name" } },
        columnOrder: ["name"],
        version: 1,
      },
      rows: new Map([["r1", { id: "r1", cells: { name: { value: "Alice" } } }]]),
      rowOrder: ["r1"],
    });

    const response = await handleOperationBatch([
      {
        id: "op-1",
        type: "set_cell",
        source: "client",
        rowId: "r1",
        colId: "name",
        value: "Bob",
      },
    ]);

    expect(response.results[0].status).toBe("confirmed");
    expect(response.state.rows.get("r1")?.cells.name.value).toBe("Bob");
  });
});
```

### Integration Test with Mock Backend

Start the reference mock-backend and test against it:

```bash
# Terminal 1: Start mock server
npm run -w apps/mock-backend dev

# Terminal 2: Run test
npm run test:integration
```

```typescript
import { test } from "vitest";

test("POST /operations applies operations", async () => {
  const response = await fetch("http://localhost:3001/operations", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      operations: [
        {
          id: "op-1",
          type: "set_cell",
          source: "client",
          rowId: "r1",
          colId: "name",
          value: "Updated",
        },
      ],
    }),
  });

  const data = await response.json();
  expect(data.results[0].status).toBe("confirmed");
  expect(data.state.rows[0].cells.name.value).toBe("Updated");
});
```

---

## Common Pitfalls

### 1. Rows Must Be a Map

❌ **Wrong:**
```typescript
const state = {
  schema: { /* ... */ },
  rows: [/* array of rows */],  // WRONG
  rowOrder: ["r1", "r2"],
};
```

✅ **Correct:**
```typescript
const state = {
  schema: { /* ... */ },
  rows: new Map([
    ["r1", { id: "r1", cells: { /* ... */ } }],
  ]),  // Correct: Map<id, Row>
  rowOrder: ["r1"],
};
```

### 2. Operation IDs Must Be Unique

❌ **Wrong:**
```typescript
const ops = [
  { id: "op-1", type: "set_cell", ... },
  { id: "op-1", type: "add_row", ... },  // DUPLICATE ID
];
```

✅ **Correct:**
```typescript
const ops = [
  { id: "op-1", type: "set_cell", ... },
  { id: "op-2", type: "add_row", ... },
];
```

### 3. Return State in Response

❌ **Wrong:**
```typescript
res.json({
  results: [{ opId: "op-1", status: "confirmed" }],
  // Missing state!
});
```

✅ **Correct:**
```typescript
res.json({
  results: [{ opId: "op-1", status: "confirmed" }],
  state: engine.getState(),  // Include state
  timestamp: Date.now(),
});
```

### 4. Serialize Map to Array

HTTP JSON doesn't support Map. Convert before sending:

❌ **Wrong:**
```typescript
res.json(engine.getState());  // Map won't serialize
```

✅ **Correct:**
```typescript
const state = engine.getState();
res.json({
  schema: state.schema,
  rows: Array.from(state.rows.values()),  // Convert to array
  rowOrder: state.rowOrder,
});
```

---

## Reference Implementation

For a working example, see the [mock-backend](../apps/mock-backend):

```bash
# View the code
cat apps/mock-backend/src/server.ts
cat apps/mock-backend/src/handlers/batchHandler.ts

# Run it
npm run -w apps/mock-backend dev
```

---

## Deployment Checklist

- [ ] Load state from production database
- [ ] Persist state after operations (with transactions)
- [ ] Implement idempotency key tracking
- [ ] Log operation audit trail
- [ ] Handle errors gracefully
- [ ] Monitor /health endpoint
- [ ] Add request validation
- [ ] Implement rate limiting
- [ ] Enable CORS for frontend domain
- [ ] Test with api-client against staging

---

## See Also

- [Backend Implementation](./10-backend-implementation.md) — Architecture & patterns
- [HTTP Contracts](./11-http-contracts.md) — API specs
- [Reference: Mock Backend](../apps/mock-backend) — Working Node.js example
- [@advanced-datatable/core](../packages/core) — Core documentation
