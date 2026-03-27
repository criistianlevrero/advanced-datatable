# DataTable Advanced Implementation - Next Steps

**Last Updated:** March 26, 2026  
**Current Status:** 102 tests passing | Core + Persistence + Replay complete | Ready for advanced features

---

## 🎯 Strategic Priorities

### **PHASE 1: Mock Backend & Advanced Features** (Current Focus)
Create a backend simulation layer to test:
- Partial batch response handling
- Conflict resolution
- Concurrent operation handling
- Error scenarios and recovery

**Duration:** Est. 3-4 hours  
**Impact:** Enable comprehensive end-to-end testing

---

### **PHASE 2: Enhanced Playground**
Upgrade playground examples to showcase:
- All CRUD operations
- Batch operations with progress
- Real-time conflict scenarios
- Pending operations UI feedback
- Error recovery workflows

**Duration:** Est. 4-5 hours  
**Impact:** Production-ready demonstration

---

### **PHASE 3: Storage Upgrades**
1. **IndexedDB Adapter** (for large datasets)
   - Async read/write with proper typing
   - Automatic migration from localStorage
   - Schema versioning

2. **Snapshot State Recovery** (for full session restore)
   - Engine state snapshots (schema + rows)
   - Versioned snapshots with timestamps
   - Diff-based storage optimization

**Duration:** 4-6 hours total  
**Impact:** Support tables with 10k+ rows

---

### **PHASE 4: Advanced Conflict Resolution**
Define and implement conflict handling:
- Server-wins strategy (current default)
- Client-wins strategy
- Merge strategy (field-level conflict resolution)
- Custom conflict handler API

**Duration:** 3-4 hours  
**Impact:** Multi-user reliability

---

### **PHASE 5: Real-Time Transport** (Post-MVP)
Implement WebSocket transport:
- **IWebSocketTransport** interface
- Automatic reconnection logic
- Message queuing during disconnection
- Heartbeat protocol for connection health

**Duration:** 5-6 hours  
**Impact:** True real-time collaboration

---

## 📋 Detailed Feature Roadmap

### **Immediate (Next Sprint)**

#### 1. Mock Backend Server
**Files to create:**
- `apps/mock-backend/server.ts` - Express server or Hono
- `apps/mock-backend/routes/operations.ts` - Operation batch endpoint
- `apps/mock-backend/handlers/` - Scenario handlers:
  - `partialResponseHandler.ts` - Returns subset of results
  - `conflictHandler.ts` - Simulates server conflicts
  - `latencyHandler.ts` - Adds realistic delays
  - `errorHandler.ts` - Returns 5xx/4xx errors on demand

**Key features:**
- Simulate partial batch responses (missing IDs)
- Return conflicts (operation already applied by another user)
- Configurable error scenarios (500, 503, timeout)
- Rate limiting simulation
- Request logging for debugging

**Tests needed:**
- Partial response recovery
- Conflict error handling
- Error classification (4xx vs 5xx)
- Timeout and retry behavior

---

#### 2. Enhanced Playground Examples
**File:** `apps/playground/src/examples/`

**New examples to add:**

1. **AdvancedBatchEdit.tsx**
   - Multi-row/column batch updates
   - Progress indicator
   - Cancel operation support
   - Pending operations counter

2. **ConflictResolution.tsx**
   - Simulate server conflict scenario
   - Show conflict UI
   - Implement resolution strategy selector
   - Before/after state visualization

3. **ErrorRecovery.tsx**
   - Simulate network errors
   - Show retry count
   - Manual retry button
   - Error message display

4. **ReplayOnReconnect.tsx**
   - Offline mode toggle
   - Pending ops visualizer
   - Simulated reconnection button
   - Operation replay progress

5. **FullDataFlow.tsx**
   - End-to-end workflow
   - Edit → dispatch → pending → confirm/fail → final state
   - Real-time state updates
   - Performance metrics

---

#### 3. Project Structure for Mock Backend
```
apps/mock-backend/
├── src/
│   ├── server.ts           # Server entry point
│   ├── routes/
│   │   └── operations.ts   # POST /operations/batch endpoint
│   ├── handlers/
│   │   ├── partialResponse.ts
│   │   ├── conflictHandler.ts
│   │   ├── errorHandler.ts
│   │   └── latencyHandler.ts
│   ├── types/
│   │   └── index.ts        # Shared types
│   └── config.ts           # Server configuration
├── package.json
└── README.md
```

---

### **Short Term (Within 2 Weeks)**

#### 4. IndexedDB Persistence Adapter
**File:** `packages/operations/src/IndexedDBOperationPersistence.ts`

**Implementation details:**
- Use idb or similar library
- Async open/close transactions
- Auto-migrate from localStorage on first run
- Configurable store name and version

**Key methods:**
```typescript
async save(records: Map<string, OperationRecord>): Promise<void>
async load(): Promise<Map<string, OperationRecord>>
async clear(): Promise<void>
async stats(): Promise<{ count: number; sizeBytes: number }>
```

**Tests:**
- Save/load cycle
- Async transactions
- Error handling (quota exceeded, etc.)
- Migration from localStorage
- Concurrent access safety

---

#### 5. State Snapshot System
**Files:**
- `packages/core/src/engine/StateSnapshot.ts` - Serialization logic
- `packages/store/src/createStateSnapshot.ts` - Store integration

**Features:**
- Version field for compatibility
- Timestamp for ordering
- Diff-aware: only store changes
- Compress if >1MB

**Integration:**
```typescript
// On app init
const snapshot = await persistence.loadSnapshot();
if (snapshot) {
  const state = deserializeSnapshot(snapshot);
  engine.setState(state);
}

// Periodic save (every 5 mins of inactivity)
manager.subscribe((event) => {
  if (event.type === "confirmed") {
    debounced(() => persistence.saveSnapshot(engine.getState()));
  }
});
```

---

### **Medium Term (1 Month)**

#### 6. Conflict Resolution Framework
**Files:**
- `packages/operations/src/IConflictResolver.ts`
- `packages/operations/src/ConflictResolverImpl.ts`
- `packages/operations/src/strategies/` - Resolution strategies

**Conflict types:**
- `CellConflict` - Same cell edited by two users
- `ColumnConflict` - Column added/removed while pending
- `RowConflict` - Row deleted while edits pending
- `SchemaConflict` - Schema version mismatch

**Resolution strategies:**
1. **ServerWinsStrategy** (current behavior)
   - Reject local operation, apply server state
   - Best for: Single admin use cases

2. **ClientWinsStrategy**
   - Keep local operation, ignore server
   - Best for: Optimistic local-first apps

3. **MergeStrategy**
   - Apply both operations if compatible
   - Fall back to server or manual resolution on conflict
   - Best for: Collaborative editing

4. **CustomStrategy**
   - User-provided callback for resolution
   - Access to both client and server versions

---

#### 7. WebSocket Transport Layer
**Files:**
- `packages/api-client/src/WebSocketTransport.ts`
- `packages/api-client/src/WebSocketConnectivityMonitor.ts`

**Features:**
- Automatic reconnection (exponential backoff)
- Message queue during disconnection
- Heartbeat/ping-pong every 30s
- Connection state events

**Integration:**
```typescript
const wsTransport = new WebSocketTransport("wss://api.example.com");
const monitor = new WebSocketConnectivityMonitor(wsTransport);

manager.enableAutoReplay(monitor);

// Automatically uses WebSocket and handles reconnects
manager.apply(op);
```

---

### **Long Term (Post-MVP)**

#### 8. Collaborative Features
- User presence indicators
- Operation attribution (who made this change?)
- Undo/redo with conflict handling
- Operation history view

#### 9. Performance Optimizations
- Operation batching with size limits (10MB max)
- Compression (gzip for large batches)
- Differential updates (only changed cells)
- Indexed queries for OperationRecord lookup

#### 10. Admin/Monitoring Tools
- Operation audit log viewer
- Pending operations dashboard
- Performance metrics (latency, success rate)
- Conflict rate analytics

---

## 🔄 Implementation Order Recommendation

1. **Mock Backend** (highest priority)
   - Unblocks testing of advanced scenarios
   - Enables realistic playground examples
   - No external dependencies needed

2. **Enhanced Playground** (parallelizable)
   - Uses mock backend
   - Showcases all capabilities
   - Marketing/documentation value

3. **IndexedDB Adapter** (when needed)
   - Supports larger datasets
   - Drop-in replacement for localStorage
   - Low risk of regression

4. **Conflict Resolution** (depends on real backend behavior)
   - Only needed if backend returns conflicts
   - Interview backend team on strategy first
   - Potentially significant scope

5. **WebSocket Transport** (optional for MVP)
   - HTTP transport works for most use cases
   - Add when real-time requirement becomes critical
   - Higher complexity

---

## 📊 Test Coverage Goals

| Layer | Current | Target | Priority |
|-------|---------|--------|----------|
| Core Engine | 22/22 ✓ | 22/22 ✓ | Complete |
| Operations Manager | 10/10 ✓ | 12/12 | Medium |
| Persistence | 14/14 ✓ | 14/14 ✓ | Complete |
| Replay | 12/12 ✓ | 12/12 ✓ | Complete |
| Store | 4/4 ✓ | 8/8 | Medium |
| UI Components | 10/10 ✓ | 15/15 | Low |
| Mock Backend | 0/0 | 20+ | High |
| Integration | 0/0 | 15+ | High |

**Target:** 150+ tests across all layers

---

## ⚙️ Configuration / Setup

### Environment Variables for Mock Backend
```env
MOCK_BACKEND_PORT=3001
MOCK_BACKEND_DELAY=100ms  # Simulate latency
MOCK_BACKEND_ERROR_RATE=0.1  # 10% error rate
MOCK_BACKEND_SCENARIO=normal  # normal|partial-response|conflicts|errors
```

### Build Scripts to Add
```json
{
  "scripts": {
    "dev:backend": "tsx watch apps/mock-backend/src/server.ts",
    "dev:all": "concurrently npm:dev npm:dev:backend",
    "test:integration": "vitest run --include '**/*.integration.test.ts'"
  }
}
```

---

## 🚀 Success Criteria

✅ **Immediate (This Week)**
- [ ] Mock backend operational
- [ ] All replay scenarios tested
- [ ] 3-5 new playground examples
- [ ] 115+ tests passing

✅ **Short Term (2 Weeks)**
- [ ] IndexedDB adapter complete
- [ ] Full state snapshots working
- [ ] Playground polished
- [ ] 130+ tests passing

✅ **Medium Term (1 Month)**
- [ ] Conflict resolution framework
- [ ] WebSocket transport prototype
- [ ] Real-world scenario tests
- [ ] 150+ tests passing

---

## 📝 Notes for Future Maintainers

- **Conflict resolution strategy** is not decided yet - consult with backend team
- **MockBackend** should be a fully functional minimal Express/Hono server for production testing
- **WebSocket** can wait until real-time collaboration is required
- **Performance optimizations** only after profiling identifies bottlenecks

---

## 🔗 Related Documents

- `DataTable Architecture RFC v1.md` - Original design
- `persistence_architecture.md` - Persistence layer documentation
- `replay_on_reconnect.md` - (To be created) Auto-replay mechanism details
