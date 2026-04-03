# HTTP Contracts: Client-Server Communication

This document specifies the HTTP API contracts between frontend and backend, ensuring compatibility with `@advanced-datatable/api-client` and the operation system.

---

## Overview

The frontend communicates with the backend via well-defined HTTP endpoints:

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/table` | GET | Load initial table state |
| `/operations` (or `/operations/batch`) | POST | Submit operation batch |
| `/health` | GET | Check server status |
| `/config` | POST | Update mock server config (testing only) |

---

## GET /table

Load the complete table state on application startup.

### Request

```http
GET /table
```

### Response (200 OK)

```typescript
interface TableLoadResponse {
  schema: {
    columns: Record<string, {
      id: string;
      type: "string" | "number" | "boolean" | /* custom types */;
      title: string;
      [key: string]: unknown;  // Custom column properties
    }>;
    columnOrder: string[];
    version: number;
  };
  rows: Array<{
    id: string;
    cells: Record<string, { value: unknown; meta?: Record<string, unknown> }>;
  }>;
  rowOrder: string[];
}
```

### Example

```json
{
  "schema": {
    "columns": {
      "id": { "id": "id", "type": "string", "title": "ID" },
      "name": { "id": "name", "type": "string", "title": "Name" },
      "age": { "id": "age", "type": "number", "title": "Age" },
      "active": { "id": "active", "type": "boolean", "title": "Active" }
    },
    "columnOrder": ["id", "name", "age", "active"],
    "version": 1
  },
  "rows": [
    {
      "id": "r1",
      "cells": {
        "id": { "value": "1" },
        "name": { "value": "Alice" },
        "age": { "value": 30 },
        "active": { "value": true }
      }
    },
    {
      "id": "r2",
      "cells": {
        "id": { "value": "2" },
        "name": { "value": "Bob" },
        "age": { "value": 25 },
        "active": { "value": false }
      }
    }
  ],
  "rowOrder": ["r1", "r2"]
}
```

### Error Handling

| Status | Response |
|--------|----------|
| 500 | `{ "error": "Internal server error" }` |

---

## POST /operations (or /operations/batch)

Submit a batch of operations to be applied on the server.

### Request

```typescript
interface OperationBatchRequest {
  operations: Operation[];  // From @advanced-datatable/core
  clientId?: string;        // Optional client identifier
  timestamp?: number;       // Optional request timestamp
}
```

### Operation Type (from @advanced-datatable/core)

```typescript
type Operation = DataOperation | SchemaOperation;

// Examples:
type SetCellOperation = {
  id: string;
  type: "set_cell";
  source: "client" | "server";
  rowId: string;
  colId: string;
  value: unknown;
  ts?: number;
  target?: TargetDescriptor;
  meta?: Record<string, unknown>;
};

type BulkUpdateOperation = {
  id: string;
  type: "bulk_update";
  source: "client" | "server";
  updates: Array<{ rowId: string; colId: string; value: unknown }>;
  ts?: number;
  target?: TargetDescriptor;
  meta?: Record<string, unknown>;
};

type AddRowOperation = {
  id: string;
  type: "add_row";
  source: "client" | "server";
  row: { id: string; cells: Record<string, { value: unknown }> };
  index?: number;
  ts?: number;
  target?: TargetDescriptor;
  meta?: Record<string, unknown>;
};

// ... and others (RemoveRow, UpdateColumn, AddColumn, etc.)
```

### Request Example

```json
{
  "operations": [
    {
      "id": "op-1",
      "type": "set_cell",
      "source": "client",
      "rowId": "r1",
      "colId": "name",
      "value": "Alice Updated",
      "ts": 1701234567890
    },
    {
      "id": "op-2",
      "type": "set_cell",
      "source": "client",
      "rowId": "r2",
      "colId": "age",
      "value": 26,
      "ts": 1701234567891
    }
  ],
  "clientId": "client-xyz",
  "timestamp": 1701234567890
}
```

### Response (200 OK)

```typescript
interface OperationBatchResponse {
  results: Array<{
    opId: string;
    status: "confirmed" | "error";
    error?: string;  // Present if status === "error"
  }>;
  state: TableState;  // Current state after applying operations
  timestamp?: number;
  conflictCount?: number;  // Number of operations that resulted in conflicts
}
```

### Response Example

```json
{
  "results": [
    {
      "opId": "op-1",
      "status": "confirmed"
    },
    {
      "opId": "op-2",
      "status": "confirmed"
    }
  ],
  "state": {
    "schema": {
      "columns": {
        "id": { "id": "id", "type": "string", "title": "ID" },
        "name": { "id": "name", "type": "string", "title": "Name" },
        "age": { "id": "age", "type": "number", "title": "Age" },
        "active": { "id": "active", "type": "boolean", "title": "Active" }
      },
      "columnOrder": ["id", "name", "age", "active"],
      "version": 1
    },
    "rows": [
      {
        "id": "r1",
        "cells": {
          "id": { "value": "1" },
          "name": { "value": "Alice Updated" },
          "age": { "value": 30 },
          "active": { "value": true }
        }
      },
      {
        "id": "r2",
        "cells": {
          "id": { "value": "2" },
          "name": { "value": "Bob" },
          "age": { "value": 26 },
          "active": { "value": false }
        }
      }
    ],
    "rowOrder": ["r1", "r2"]
  },
  "timestamp": 1701234567892,
  "conflictCount": 0
}
```

### Conflict Response Example

```json
{
  "results": [
    {
      "opId": "op-1",
      "status": "confirmed"
    },
    {
      "opId": "op-2",
      "status": "error",
      "error": "CONFLICT: Operation conflicts with existing data on server"
    }
  ],
  "state": {
    "schema": { /* ... */ },
    "rows": [ /* ... */ ],
    "rowOrder": [ /* ... */ ]
  },
  "conflictCount": 1
}
```

### Error Responses

| Status | Response | Meaning |
|--------|----------|---------|
| 400 | `{ "error": "Invalid batch request format" }` | Request doesn't match schema |
| 400 | `{ "error": "Empty request body" }` | No JSON payload sent |
| 500 | `{ "error": "Mock server error: 500" }` | Unhandled server error |
| 503 | `{ "error": "Mock server error: 503" }` | Service unavailable |

**Transient vs. Permanent Errors**:

- **Transient (retryable)**: 5xx errors. Client should retry with exponential backoff.
- **Permanent**: 400 errors. Client should not retry; fix request format.

---

## GET /health

Check server status and configuration (for debugging/testing).

### Request

```http
GET /health
```

### Response (200 OK)

```typescript
interface HealthResponse {
  status: "ok" | "degraded" | "down";
  timestamp: number;
  config?: {
    latencyMs?: number;          // Simulated latency (mock-backend)
    errorRate?: number;          // Simulated error rate (mock-backend)
    partialResponseMode?: boolean;
    conflictOpIds?: number;       // Count of injected conflicts
  };
}
```

### Example

```json
{
  "status": "ok",
  "timestamp": 1701234567890,
  "config": {
    "latencyMs": 100,
    "errorRate": 0,
    "partialResponseMode": false,
    "conflictOpIds": 0
  }
}
```

---

## POST /config (Testing Only)

Update mock backend configuration at runtime for testing different scenarios.

### Request

```typescript
interface ConfigUpdateRequest {
  latencyMs?: number;          // Add artificial delay
  errorRate?: number;          // Probability of returning 5xx (0-1)
  partialResponseMode?: boolean;  // Return incomplete results
  conflictOpIds?: string[];    // Operation IDs to simulate as conflicts
  verbose?: boolean;           // Log details to console
}
```

### Example

```json
{
  "latencyMs": 500,
  "errorRate": 0.1,
  "conflictOpIds": ["op-3", "op-4"],
  "verbose": true
}
```

### Response (200 OK)

```json
{
  "success": true,
  "config": {
    "latencyMs": 500,
    "errorRate": 0.1,
    "partialResponseMode": false,
    "conflictOpIds": ["op-3", "op-4"],
    "verbose": true
  }
}
```

---

## Validation Boundaries

### Client-Side Validation

The client (via `@advanced-datatable/api-client`) validates:

- **Request format**: Operation structure matches types from `@advanced-datatable/core`
- **Operation batching**: Groups operations into reasonable batch sizes
- **Retry logic**: Retries on 5xx errors with exponential backoff

### Server-Side Validation

The server validates:

- **Request structure**: Batch payload is valid JSON with required fields
- **Operation integrity**: Each operation has `id`, `type`, and required fields
- **State application**: Engine throws errors for invalid state transitions
  - Column doesn't exist
  - Row ID doesn't exist
  - Type mismatches between cell value and column type

### No Payload Modification

Neither client nor server modifies operations in the batch. Config-injected conflicts (for testing) are the only exception to this rule.

---

## Compatibility with api-client

The `@advanced-datatable/api-client` module implements `IOperationTransport`:

```typescript
export interface IOperationTransport {
  send(ops: Operation[]): Promise<BatchResponse>;
  loadTable(): Promise<TableLoadResponse>;
}

export class HttpTransport implements IOperationTransport {
  async loadTable(): Promise<TableLoadResponse> {
    // GET /table
  }

  async send(ops: Operation[]): Promise<BatchResponse> {
    // POST /operations with retry logic
  }
}
```

**Retry Strategy**:
- On 5xx: Retry up to N times with exponential backoff (default: 3 retries, 1s base delay)
- On 400: Don't retry (validation error on client side)
- On timeout: Retry (network glitch)

---

## Best Practices

### 1. Always Return State in Batch Response

Clients use the returned state to verify optimistic updates:

```typescript
// Client applies op locally (optimistic)
// Server returns confirmation with final state
// Client verifies local state matches server state
if (localState === serverState) {
  // ✓ Consistent
  markOperationAsConfirmed(op.id);
} else {
  // ✗ Conflict detected
  markOperationAsFailed(op.id);
  reloadFromServer();
}
```

### 2. Use Operation IDs for Idempotency

If a request is lost but the server applied operations, the client will retry with the same operation IDs. The server should detect duplicates:

```typescript
if (database.hasOperationId(op.id)) {
  // Already applied; return cached result
  return cachedResult;
}
```

### 3. Include Timestamps

Help detect clock skew and ordering issues:

```typescript
const consistency = {
  clientClock: request.timestamp,
  serverClock: Date.now(),
  skew: Date.now() - request.timestamp,
};
```

### 4. Manage Partial Responses (Testing)

When testing client retry logic, use `partialResponseMode` to simulate incomplete batch responses:

```bash
curl -X POST http://localhost:3001/config \
  -H "Content-Type: application/json" \
  -d '{ "partialResponseMode": true }'
```

The client should detect that some operations are missing from results and retry appropriately.

---

## See Also

- [Backend Implementation](./10-backend-implementation.md) — How to build the server
- [Backend Setup Guide](./12-backend-setup-guide.md) — Framework-specific examples
- [@advanced-datatable/api-client](../packages/api-client) — Client implementation
