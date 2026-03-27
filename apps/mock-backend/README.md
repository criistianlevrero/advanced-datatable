# Mock Backend for DataTable Testing

A lightweight mock HTTP server for testing advanced DataTable features including:
- Partial batch responses
- Server conflicts
- Network latency simulation
- Error scenarios (4xx, 5xx)

## Usage

### Development server

From the repository root:

```bash
npm run mock-backend
```

### Build and start the server

```bash
npm --workspace apps/mock-backend run build
npm --workspace apps/mock-backend run start
```

Server listens on `http://localhost:3001`

### Endpoints

#### `POST /operations`
Primary endpoint used by `HttpTransport`.

#### `POST /operations/batch`
Compatibility alias for manual testing.

**Request:**
```json
{
  "operations": [
    {
      "id": "op1",
      "type": "set_cell",
      "rowId": "r1",
      "colId": "c1",
      "value": 42,
      "source": "client",
      "target": { "type": "cell", "rowId": "r1", "colId": "c1" }
    }
  ]
}
```

**Response:**
```json
{
  "results": [
    {
      "opId": "op1",
      "status": "confirmed"
    }
  ],
  "timestamp": 1234567890,
  "conflictCount": 0
}
```

#### `GET /health`
Check server status and current configuration.

#### `POST /config`
Update server configuration at runtime.

**Request:**
```json
{
  "latencyMs": 150,
  "errorRate": 0.1,
  "partialResponseMode": false,
  "conflictOpIds": ["op-conflict-1"],
  "verbose": true
}
```

## Configuration Options

- **latencyMs** (default: 50) - Simulated network latency in milliseconds
- **errorRate** (default: 0) - Percentage of requests that fail (0.0-1.0)
- **partialResponseMode** (default: false) - Return partial batch responses
- **conflictOpIds** (default: []) - Operation IDs that will receive conflict errors
- **verbose** (default: false) - Enable detailed logging

## Testing Scenarios

### Test Partial Response Handling
```typescript
// Enable partial response mode
await fetch('http://localhost:3001/config', {
  method: 'POST',
  body: JSON.stringify({ partialResponseMode: true })
});

// Send batch - will randomly drop some results
manager.flush();
```

### Test Conflict Resolution
```typescript
// Mark operations as conflicting
await fetch('http://localhost:3001/config', {
  method: 'POST',
  body: JSON.stringify({ conflictOpIds: ['operation-id-1', 'operation-id-2'] })
});

// Operations will return 409 CONFLICT error
```

### Test Error Handling
```typescript
// Enable error simulation
await fetch('http://localhost:3001/config', {
  method: 'POST',
  body: JSON.stringify({ errorRate: 0.3 }) // 30% failure rate
});

// Some requests will fail with 500 or 503
```

### Test Latency Impact
```typescript
// Add 500ms latency
await fetch('http://localhost:3001/config', {
  method: 'POST',
  body: JSON.stringify({ latencyMs: 500 })
});

// Requests will take longer
```

## Integration with DataTable

```typescript
import { HttpTransport } from '@advanced-datatable/api-client';

// Point at local mock backend
const transport = new HttpTransport({ baseUrl: 'http://localhost:3001' });
const manager = new OperationManagerImpl(engine, transport);

// Now all operations go through mock backend
manager.apply(operation);
```

## Development

### Dev
```bash
npm --workspace @advanced-datatable/mock-backend run dev
```

### Build
```bash
npm --workspace apps/mock-backend run build
```

### Start
```bash
npm --workspace apps/mock-backend run start
```

## Structure

```
src/
├── server.ts           # Main server and Node HTTP app
├── config.ts           # Configuration types and defaults
├── types.ts            # Shared types (request/response)
└── handlers/
    └── batchHandler.ts # Operation batch processing logic
```
