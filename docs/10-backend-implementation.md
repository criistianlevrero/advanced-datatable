# Backend Implementation: Using Core & Operations

## Overview

The `@advanced-datatable/core` and `@advanced-datatable/operations` modules are **platform-agnostic** — they work seamlessly on the backend to manage table state and operation lifecycles. This guide explains how to build a DataTable backend using these core abstractions.

### Key Principles

- **TableEngineImpl**: Stateful in-memory table engine that applies operations and maintains state
- **Operation Types**: Strongly typed mutations (from core) that describe all table changes
- **Idempotency**: Operations are keyed by unique `id` — applying the same op twice is a no-op
- **State Snapshots**: After each batch, return the full `TableState` so clients can verify consistency

---

## Architecture Pattern

```
Client Request
    ↓
[Parse Operation Batch]
    ↓
[TableEngineImpl.apply() for each operation]
    ↓
[Capture TableState snapshot]
    ↓
[Return: operation results + updated state]
    ↓
Client Optimistic Update Verification
```

### Component Responsibilities

| Component | Responsibility |
|-----------|---|
| **TableEngineImpl** | Apply operations, maintain state, detect real conflicts |
| **Operation Manager** (optional) | Track pending/confirmed/failed operations (mostly for client) |
| **Backend Handler** | Accept batches, call engine, return results + state |
| **Persistence** | Store final state in database (DB-specific implementation) |

---

## Core Components

### 1. TableEngineImpl

Instantiate the engine with an initial state:

```typescript
import { TableEngineImpl } from "@advanced-datatable/core";
import type { TableState } from "@advanced-datatable/core";

const initialState: TableState = {
  schema: {
    columns: { /* ...column definitions... */ },
    columnOrder: ["col1", "col2"],
    version: 1,
  },
  rows: new Map([
    ["row1", { id: "row1", cells: { col1: { value: "data" } } }],
  ]),
  rowOrder: ["row1"],
};

const engine = new TableEngineImpl(initialState);
```

**Core Methods**:

```typescript
// Apply a single operation (idempotent by op.id)
engine.apply(operation);

// Apply multiple operations in sequence
engine.applyBatch(operations);

// Get current state snapshot
const currentState = engine.getState();
// Returns: { schema, rows: Map<rowId, Row>, rowOrder }
```

### 2. Operation Types

All operations extend from `@advanced-datatable/core`:

```typescript
import type {
  Operation,
  SetCellOperation,
  BulkUpdateOperation,
  AddRowOperation,
  RemoveRowOperation,
  UpdateColumnOperation,
  AddColumnOperation,
  RemoveColumnOperation,
  ReorderColumnsOperation,
  ReorderRowsOperation,
} from "@advanced-datatable/core";
```

**Example Operation Structure**:

```typescript
const setCell: SetCellOperation = {
  id: "op-12345",                // Unique operation ID
  type: "set_cell",              // Discriminator
  source: "client",              // Origin tracking
  rowId: "r1",
  colId: "name",
  value: "Updated Name",
  ts: Date.now(),                // Timestamp (optional)
  target: {                       // Enables pending op queries
    type: "cell",
    rowId: "r1",
    colId: "name",
  },
  meta: {},                       // User-defined metadata
};
```

---

## Example: Building a Batch Handler

Here's a complete example from the reference [mock-backend](../apps/mock-backend/src/handlers/batchHandler.ts):

```typescript
import type { ITableEngine, Operation, TableState } from "@advanced-datatable/core";

export interface OperationResult {
  opId: string;
  status: "confirmed" | "error";
  error?: string;
}

export interface OperationBatchResponse {
  results: OperationResult[];
  state: TableState;        // Include updated state for verification
  timestamp?: number;
}

export async function processBatch(
  operations: Operation[],
  engine: ITableEngine,
): Promise<OperationBatchResponse> {
  const results: OperationResult[] = [];

  // Apply each operation using the engine
  for (const op of operations) {
    try {
      engine.apply(op);
      results.push({
        opId: op.id,
        status: "confirmed",
      });
    } catch (error) {
      results.push({
        opId: op.id,
        status: "error",
        error: `Failed to apply: ${String(error)}`,
      });
    }
  }

  // Return updated state snapshot
  return {
    results,
    state: engine.getState(),
    timestamp: Date.now(),
  };
}
```

---

## State Persistence Strategy

After operations are applied and validated, persist the state to your database:

### Persistence Layer (Pseudo-code)

```typescript
import { TableEngineImpl } from "@advanced-datatable/core";

async function handleBatch(operations: Operation[]): Promise<OperationBatchResponse> {
  const engine = new TableEngineImpl(await loadStateFromDB());

  for (const op of operations) {
    engine.apply(op);
  }

  const resultState = engine.getState();

  // Save to database (DB-specific implementation)
  await database.updateTableState({
    id: tableId,
    schema: resultState.schema,
    rows: resultState.rows,
    rowOrder: resultState.rowOrder,
    version: resultState.schema.version + 1,  // Increment version
  });

  return {
    results: /* ... */,
    state: resultState,
    timestamp: Date.now(),
  };
}
```

### Database Considerations

| Concern | Strategy |
|---------|----------|
| **Row Storage** | Denormalize rows as JSONB (PostgreSQL) or documents (MongoDB) for fast retrieval |
| **Column Schema** | Store schema as versioned JSONB — simple evolution without migrations |
| **Audit Trail** | Optionally log each operation with original client ID + timestamp |
| **Transactions** | Wrap DB update in transaction; reject if version mismatch (optimistic locking) |
| **Idempotency** | Store operation ID + hash; reject duplicate operations within time window |

---

## Conflict Detection

Conflicts arise when operations cannot be applied cleanly. The engine detects them automatically:

### Real Conflicts (Engine-Detected)

```typescript
try {
  engine.apply(operation);
  // Success
} catch (error) {
  // Engine threw: column doesn't exist, row not found, type mismatch, etc.
  return {
    opId: operation.id,
    status: "error",
    error: error.message,
  };
}
```

### Injected Conflicts (Testing Only)

For frontend testing, inject conflicts via configuration:

```typescript
const config = {
  conflictOpIds: ["op-fake-1", "op-fake-2"],  // Operations to simulate as conflicts
};

function processOperation(op: Operation, config): OperationResult {
  if (config.conflictOpIds.includes(op.id)) {
    return {
      opId: op.id,
      status: "error",
      error: "CONFLICT: Operation conflicts with existing data on server",
    };
  }

  try {
    engine.apply(op);
    return { opId: op.id, status: "confirmed" };
  } catch (error) {
    return { opId: op.id, status: "error", error: error.message };
  }
}
```

---

## Testing the Backend

### Unit Test Example

```typescript
import { describe, it, expect } from "vitest";
import { TableEngineImpl } from "@advanced-datatable/core";

describe("TableEngineImpl", () => {
  it("applies setCell operation and updates state", () => {
    const engine = new TableEngineImpl({
      schema: {
        columns: { name: { id: "name", type: "string", title: "Name" } },
        columnOrder: ["name"],
        version: 1,
      },
      rows: new Map([["r1", { id: "r1", cells: { name: { value: "Alice" } } }]]),
      rowOrder: ["r1"],
    });

    engine.apply({
      id: "op-1",
      type: "set_cell",
      source: "client",
      rowId: "r1",
      colId: "name",
      value: "Bob",
    });

    const state = engine.getState();
    const updatedCell = state.rows.get("r1")?.cells.name;
    expect(updatedCell?.value).toBe("Bob");
  });
});
```

### Integration Test with Backend

Use the provided [mock-backend](../apps/mock-backend) as a reference:

```bash
# Start mock backend (uses real TableEngineImpl)
npm run -w apps/mock-backend dev

# Test against it
curl -X POST http://localhost:3001/operations \
  -H "Content-Type: application/json" \
  -d '{
    "operations": [{
      "id": "op-1",
      "type": "set_cell",
      "source": "client",
      "rowId": "r1",
      "colId": "name",
      "value": "Updated"
    }]
  }'
```

---

## Operation Lifecycle on Backend

```
1. Client sends batch of operations
   └─ Request: { operations: Operation[], clientId?, timestamp? }

2. Backend receives batch
   └─ Handler validates structure

3. For each operation:
   └─ engine.apply(op)
   └─ Catch errors → mark as "error"
   └─ Success → mark as "confirmed"

4. Generate response
   └─ Include updated state snapshot
   └─ Include operation results

5. Persist to database
   └─ Save state, operation log, audit trail
   └─ Increment schema version if applicable

6. Return response to client
   └─ Response: { results: OperationResult[], state: TableState }
   └─ Client verifies state matches optimistic update
```

---

## Common Patterns

### Pattern: Validation Before Apply

```typescript
function validateOperation(op: Operation, context: ValidationContext): string | null {
  if (op.type === "set_cell") {
    const cell = op as SetCellOperation;
    const column = context.schema.columns[cell.colId];
    if (!column) return "Column does not exist";
    if (typeof cell.value !== "string" && column.type === "string") {
      return "Value type mismatch";
    }
  }
  return null;
}

// Usage
for (const op of operations) {
  const validationError = validateOperation(op, { schema: currentState.schema });
  if (validationError) {
    results.push({ opId: op.id, status: "error", error: validationError });
    continue;
  }

  engine.apply(op);
  results.push({ opId: op.id, status: "confirmed" });
}
```

### Pattern: Selective Replication

If some operations should not replicate to other clients:

```typescript
const replicatedOp = engine.apply(op);
const shouldReplicate = op.source === "client" && !op.meta?.internal;

if (shouldReplicate) {
  await broadcastToOtherClients(op);
}
```

### Pattern: Audit Trail

```typescript
const auditLog = {
  operationId: op.id,
  operationType: op.type,
  clientId: batch.clientId,
  timestamp: op.ts,
  status: result.status,
  error: result.error,
  userId: context.userId,  // From auth
};

await database.insertAuditLog(auditLog);
```

---

## Framework Agnostic

The above patterns work with any backend framework:

- **Express/Node.js**: POST /operations handler calls processBatch(request.body)
- **FastAPI/Python**: Receive Operation[] from JSON payload, call engine methods
- **Go/Rust**: Load core types via FFI or gRPC, apply operations in native code
- **GraphQL**: Define mutation that accepts Operation, returns BatchResponse

The core logic is framework-independent!

---

## See Also

- [HTTP Contracts](./11-http-contracts.md) — Request/response schemas
- [Backend Setup Guide](./12-backend-setup-guide.md) — Quickstart for your framework
- [Reference Implementation](../apps/mock-backend/src) — Working example in Node.js
