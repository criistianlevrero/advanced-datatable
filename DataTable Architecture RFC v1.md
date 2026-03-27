## 1. Visión

Construir un DataTable como un motor de datos basado en operaciones (operation-driven), desacoplado de la UI, capaz de escalar hacia:

- Edición masiva tipo Excel
    
- Streaming de datos
    
- Schema dinámico
    
- Fórmulas
    
- Colaboración en tiempo real
    

---

## 2. Arquitectura General

```
UI Layer (React)
    ↓
View Model (hooks)
    ↓
State Layer (Zustand)
    ↓
Operation Layer
    ↓
Table Engine (core)
    ↓
Data Source (API / streaming)
```

---

## 3. Principios

- **Core desacoplado de UI**  
    El motor de datos (Table Engine) no debe depender de React ni de ninguna capa de presentación. Esto permite testearlo de forma aislada, reutilizarlo en distintos contextos y evitar que cambios en UI impacten la lógica central.
    
- **Operaciones como fuente de verdad**  
    El estado no se modifica directamente, sino a través de operaciones (deltas). Esto habilita batching, undo/redo, sincronización con backend y futura colaboración en tiempo real.
    
- **Schema dinámico**  
    La estructura de la tabla (columnas/filas) puede cambiar en runtime mediante operaciones. Esto permite soportar datasets heterogéneos y evolucionar la tabla sin recargar completamente el estado.
    
- **Virtualización como requisito**  
    El sistema está diseñado desde el inicio para manejar grandes volúmenes de datos, renderizando únicamente la porción visible. No es una optimización posterior sino una restricción de diseño.
    
- **Estado derivado** (no persistir UI state)  
    Estados como loading, selección o foco no se guardan directamente en los datos, sino que se calculan a partir del estado del sistema (operaciones, viewport, etc.). Esto evita inconsistencias y facilita la extensibilidad.
    

---

## 4. Modelos Base

### 4.1 Schema

```ts
interface TableSchema {
  columns: Record<string, ColumnSchema>
  columnOrder: string[]
  version: number
}
```

### 4.2 Data

```ts
interface Row {
  id: string
  cells: Record<string, Cell>
}

interface Cell {
  value: any
  meta?: Record<string, any>
}
```

### 4.3 Operations

```ts
type Operation =
  | DataOperation
  | SchemaOperation
```

### 4.4 Operation Protocol & Operation Layer

Esta sección define el contrato y la capa responsable de orquestar cambios en el sistema.

#### 4.4.1 Estructura base de una operación

```ts
interface BaseOperation {
  id: string;                // único, generado en cliente
  type: string;              // discriminador
  ts: number;                // timestamp lógico/lamport (opcional)
  source: "client" | "server";
  status?: "pending" | "confirmed" | "error";
  target?: TargetDescriptor; // a quién afecta (para loading derivado)
  meta?: Record<string, any>; // extensiones
}
```

#### 4.4.2 Tipos de operaciones

**DataOperation** (mutan datos):

```ts
type DataOperation =
  | (BaseOperation & { type: "set_cell"; rowId: string; colId: string; value: any })
  | (BaseOperation & { type: "bulk_update"; updates: { rowId: string; colId: string; value: any }[] })
  | (BaseOperation & { type: "update_column"; colId: string; values: Record<string, any> });
```

**SchemaOperation** (mutan estructura):

```ts
type SchemaOperation =
  | (BaseOperation & { type: "add_column"; column: ColumnSchema; index?: number })
  | (BaseOperation & { type: "remove_column"; columnId: string })
  | (BaseOperation & { type: "reorder_columns"; columnOrder: string[] })
  | (BaseOperation & { type: "add_row"; row: Row; index?: number })
  | (BaseOperation & { type: "remove_row"; rowId: string })
  | (BaseOperation & { type: "reorder_rows"; rowOrder: string[] });
```

#### 4.4.3 Target Descriptor (para estado derivado)

```ts
type TargetDescriptor =
  | { type: "cell"; rowId: string; colId: string }
  | { type: "row"; rowId: string }
  | { type: "column"; colId: string }
  | { type: "range"; rowIds: string[]; colIds: string[] };
```

#### 4.4.4 Semántica del protocolo

- **Idempotencia**: aplicar dos veces la misma operación (mismo `id`) no debe duplicar efectos.
    
- **Orden**: el cliente mantiene orden local; el backend puede reordenar → se requiere reconciliación por `ts`/versión.
    
- **Versionado de schema**: las `SchemaOperation` deben incrementar `schema.version`.
    
- **Compatibilidad parcial**: permitir operaciones sobre subsets (columnas/filas incompletas).
    

#### 4.4.5 Pipeline de aplicación (frontend)

```text
User Action
  → create Operation (pending)
  → Operation Layer registra op
  → TableEngine.apply(op) (optimistic)
  → UI re-render (incluye loading derivado)
  → enqueue → Data Source
  → backend confirma / corrige
  → Operation Layer actualiza status
  → reconcile (si difiere)
```

#### 4.4.6 Operation Layer (responsabilidades)

- Registrar operaciones en vuelo (pending)
    
- Indexar targets para estado derivado (loading)
    
- Batching y debounce de envío
    
- Reintentos y manejo de errores
    
- Reconciliación con respuestas del backend
    
- Garantizar idempotencia en cliente
    

Interfaz sugerida:

```ts
interface OperationManager {
  apply(op: Operation): void;            // optimistic + registro
  applyBatch(ops: Operation[]): void;
  confirm(opId: string): void;           // ack backend
  fail(opId: string, error?: any): void; // error backend
  getPendingByTarget(t: TargetDescriptor): string[];
}
```

#### 4.4.7 Reconciliación (cliente ↔ servidor)

- **Optimistic first**: el cliente aplica inmediatamente.
    
- **Server authority**: el servidor puede devolver correcciones.
    
- **Estrategias**:
    
    - Replace: el server envía valores finales → cliente parchea.
        
    - Transform: el server devuelve nuevas operaciones derivadas.
        

#### 4.4.8 Transporte

- **REST (MVP)**:
    

```ts
POST /operations
{ ops: Operation[] }
```

- **WebSocket (avanzado)**:
    

```ts
client → server: ops[]
server → client: ops[] (broadcast/ack)
```

#### 4.4.9 Consideraciones de performance

- Batching por tiempo (ej: 50–100ms)
    
- Compresión de ops (merge de updates sobre misma celda/columna)
    
- Índices por target para evitar O(n) en cada render
    

#### 4.4.10 Casos edge

- Operaciones fuera de orden → buffer hasta que el schema exista
    
- Columnas/filas inexistentes → ghost entities o cola de espera
    
- Conflictos (multi-user) → diferidos a futura capa CRDT/OT
    

---

### 4.5 TableEngine.apply(op) — Semántica de aplicación

Define cómo el engine muta el estado de forma determinística a partir de operaciones.

#### 4.5.1 Contrato del engine

```ts
interface TableEngine {
  schema: TableSchema;
  rows: Map<string, Row>;
  rowOrder: string[];

  apply(op: Operation): void;
  applyBatch(ops: Operation[]): void;
}
```

#### 4.5.2 Reglas generales

- Determinismo: misma secuencia de ops ⇒ mismo estado
    
- Idempotencia por `op.id`
    
- No efectos colaterales (sin IO)
    
- No mutaciones masivas innecesarias (preferir patching)
    

#### 4.5.3 Aplicación de DataOperation

**set_cell**

```ts
applySetCell(op) {
  const row = ensureRow(op.rowId);
  const cell = row.cells[op.colId] ?? { value: null };
  cell.value = op.value;
  row.cells[op.colId] = cell;
}
```

**bulk_update**

```ts
applyBulk(op) {
  for (u of op.updates) {
    applySetCell({ ...op, type: 'set_cell', ...u });
  }
}
```

**update_column**

```ts
applyUpdateColumn(op) {
  for (rowId in op.values) {
    applySetCell({ ...op, type: 'set_cell', rowId, colId: op.colId, value: op.values[rowId] });
  }
}
```

#### 4.5.4 Aplicación de SchemaOperation

**add_column**

```ts
applyAddColumn(op) {
  schema.columns[op.column.id] = op.column;
  insertIntoOrder(schema.columnOrder, op.column.id, op.index);
  schema.version++;
}
```

**remove_column**

```ts
applyRemoveColumn(op) {
  delete schema.columns[op.columnId];
  removeFromOrder(schema.columnOrder, op.columnId);
  schema.version++;
}
```

**add_row**

```ts
applyAddRow(op) {
  rows.set(op.row.id, op.row);
  insertIntoOrder(rowOrder, op.row.id, op.index);
}
```

**remove_row**

```ts
applyRemoveRow(op) {
  rows.delete(op.rowId);
  removeFromOrder(rowOrder, op.rowId);
}
```

#### 4.5.5 Lazy resolution

- Celdas inexistentes ⇒ valor por defecto
    
- Columnas nuevas no requieren backfill inmediato
    

#### 4.5.6 Manejo de inconsistencias

- Si `colId` no existe ⇒ buffer o ignorar según policy
    
- Si `rowId` no existe ⇒ crear (upsert) o buffer
    

---

### 4.6 Backend Contract (API & Sync)

Define cómo el frontend y backend intercambian operaciones y estado.

#### 4.6.1 Endpoint principal (MVP)

```ts
POST /operations
{
  ops: Operation[]
}
```

**Response:**

```ts
{
  ack: string[];           // opIds confirmadas
  errors?: { opId: string; reason: string }[];
  serverOps?: Operation[]; // correcciones / derivados
}
```

#### 4.6.2 Reglas del backend

- Es la fuente de verdad
    
- Revalida todas las operaciones
    
- Puede:
    
    - aceptar (ack)
        
    - rechazar (error)
        
    - transformar (emitir nuevas ops)
        

#### 4.6.3 Flujo de sincronización

```text
Client → ops[]
Server:
  validate
  persist
  compute (opcional)
  emit ack + serverOps
Client:
  confirm
  reconcile
```

#### 4.6.4 Estrategias de reconciliación

- Replace: server envía valores finales
    
- Transform: server envía ops nuevas
    
- Reject: revert en cliente
    

#### 4.6.5 Streaming (futuro)

WebSocket:

```ts
onMessage({ ops }) => applyBatch(ops)
```

- Broadcast a múltiples clientes
    
- Orden garantizado por servidor
    

#### 4.6.6 Versionado y consistencia

- `schema.version` sincronizado
    
- Opcional: `data.version` o checkpoints
    
- Detección de desincronización → full refresh
    

#### 4.6.7 Seguridad

- Nunca confiar en valores computados del cliente
    
- Validar tipos y constraints
    
- Sanitizar inputs
    

---

## 5. Stack Tecnológico

- TypeScript
    
- Zustand
    
- TanStack Table
    
- TanStack Virtual
    
- REST / WebSocket (futuro)
    

---

## 6. Features

### Core

- Schema dinámico
    
- Batch operations
    
- Delta system
    

### UI

- Virtualización
    
- Renderers custom
    

### Edición

- Celda
    
- Bulk
    
- Clipboard
    

### Estado

- Loading derivado
    
- Optimistic updates
    

### Sync

- Deltas
    
- Streaming
    

---

## 7. Roadmap

### Fase 1 — Engine

- Modelos
    
- apply(op)
    

### Fase 2 — Store

- Zustand
    

### Fase 3 — UI básica

### Fase 4 — Virtualización

### Fase 5 — Bulk

### Fase 6 — API

### Fase 7 — Schema dinámico

### Fase 8 — Viewport stability

### Fase 9 — Optimización

### Fase 10 — Fórmulas (opcional)

### Fase 11 — Colaboración (opcional)

---

## 8. Riesgos

- Acoplamiento UI/data
    
- Operaciones mal definidas
    
- Virtualización mal integrada
    

---

## 9. Decisiones abiertas

Estas decisiones impactan directamente en la complejidad del sistema, el alcance del MVP y la evolución futura. Deben validarse con producto y backend.

- **Nivel de soporte para schema dinámico**  
    Define qué tan flexible será la estructura en runtime.
    
    - Opciones:
        
        - Básico: columnas fijas tras carga inicial
            
        - Intermedio: agregar/eliminar columnas
            
        - Avanzado: reorder, cambios de tipo, meta dinámica
            
    - Impacto:
        
        - Alto en complejidad del engine y del protocolo de operaciones
            
        - Afecta virtualización horizontal y memoización
            
    - Decisión a tomar:
        
        - ¿Permitimos cambios estructurales en caliente en producción?
            
- **Modelo de operaciones (granularidad y protocolo)**  
    Determina cómo se representan y transmiten los cambios.
    
    - Opciones:
        
        - Fino: operaciones por celda
            
        - Medio: batch/bulk por rango
            
        - Grueso: por columna/tabla
            
    - Impacto:
        
        - Performance de red y render
            
        - Complejidad de reconciliación y debugging
            
    - Decisión a tomar:
        
        - ¿Qué nivel de granularidad será el estándar del sistema?
            
- **Estrategia de sincronización con backend**  
    Cómo viajan los deltas y cómo se confirma el estado.
    
    - Opciones:
        
        - Pull (REST) con polling
            
        - Push (WebSocket) con eventos
            
        - Híbrido (optimistic + confirmación)
            
    - Impacto:
        
        - Latencia percibida
            
        - Complejidad de manejo de estados pending/error
            
    - Decisión a tomar:
        
        - ¿Necesitamos near real-time desde el inicio o puede ser eventual?
            
- **Necesidad de colaboración multiusuario**  
    Define si múltiples usuarios editan simultáneamente.
    
    - Opciones:
        
        - No soportado (single-user)
            
        - Locking por recurso
            
        - Tiempo real (CRDT/OT)
            
    - Impacto:
        
        - Muy alto en complejidad (conflictos, orden de ops, consistencia)
            
    - Decisión a tomar:
        
        - ¿Es requisito de MVP o fase posterior?
            
- **Inclusión de fórmulas y motor de cálculo**  
    Determina si habrá celdas derivadas.
    
    - Opciones:
        
        - Sin fórmulas
            
        - Fórmulas simples (sin dependencias complejas)
            
        - Motor completo (grafo de dependencias)
            
    - Impacto:
        
        - Alto en diseño (DAG, recomputación incremental)
            
        - Necesidad de cómputo en frontend y backend
            
    - Decisión a tomar:
        
        - ¿Se guardan expresiones o valores?
            
- **Volumen de datos esperado**  
    Define límites de performance y arquitectura.
    
    - Rangos típicos:
        
        - Bajo: < 10k filas
            
        - Medio: 10k–100k
            
        - Alto: 100k–1M+
            
    - Impacto:
        
        - Necesidad de virtualización avanzada
            
        - Posible adopción de formatos columnar/streaming
            
    - Decisión a tomar:
        
        - ¿Cuál es el worst-case que debemos soportar?
            
- **Modelo de IDs y estabilidad de filas/columnas**  
    Cómo se identifican entidades a lo largo del tiempo.
    
    - Opciones:
        
        - Índices (no recomendado)
            
        - IDs estables (UUID/keys backend)
            
    - Impacto:
        
        - Scroll anchoring
            
        - Reconciliación de deltas
            
    - Decisión a tomar:
        
        - ¿Quién genera y garantiza la estabilidad de IDs?
            
- **Estrategia de loading y estados intermedios**  
    Cómo se representa el estado mientras hay operaciones en curso.
    
    - Opciones:
        
        - Flags en datos (no recomendado)
            
        - Estado derivado desde operaciones (recomendado)
            
    - Impacto:
        
        - Consistencia UI
            
        - Complejidad del store (indexación de targets)
            
    - Decisión a tomar:
        
        - ¿Implementamos Operation Tracking desde el inicio?
            
- **Política de errores y retry**  
    Qué ocurre cuando una operación falla.
    
    - Opciones:
        
        - Revert automático
            
        - Estado de error por celda/rango
            
        - Retry manual/automático
            
    - Impacto:
        
        - UX y confiabilidad
            
    - Decisión a tomar:
        
        - ¿Qué guarantees damos al usuario sobre persistencia?
            
- **Scope del MVP vs features avanzadas**  
    Control de alcance para evitar sobreingeniería.
    
    - Candidatos a excluir del MVP:
        
        - Fórmulas complejas
            
        - Colaboración en tiempo real
            
        - Reordenamiento avanzado
            
    - Impacto:
        
        - Time-to-market vs deuda técnica
            
    - Decisión a tomar:
        
        - ¿Qué funcionalidades son estrictamente necesarias en la primera versión?
            

---

## 9.1 Ejemplos End-to-End (Operation Flow)

Esta sección muestra flujos completos desde UI → Operation Layer → Engine → Backend → reconciliación.

---

### Caso 1 — Edición simple de celda

**Acción usuario:** cambia A1 = 10

```ts
op = {
  id: "op1",
  type: "set_cell",
  rowId: "r1",
  colId: "A",
  value: 10,
  status: "pending",
  source: "client",
  target: { type: "cell", rowId: "r1", colId: "A" }
}
```

**Flujo:**

```text
UI → OperationManager.apply(op)
→ Engine.apply(op) (optimistic)
→ UI re-render (valor actualizado + loading)
→ API /operations
→ Backend valida
→ Backend responde ack
→ OperationManager.confirm(op1)
→ UI elimina loading
```

---

### Caso 2 — Paste masivo (bulk update)

**Acción usuario:** pega 3x3 celdas

```ts
op = {
  id: "op2",
  type: "bulk_update",
  updates: [ ...9 updates... ],
  status: "pending",
  source: "client",
  target: { type: "range", rowIds: [...], colIds: [...] }
}
```

**Flujo:**

```text
UI → OperationManager.apply(op)
→ Engine.apply(op) (loop interno)
→ UI muestra valores + loading en rango
→ batch → API
→ Backend persiste
→ ack
→ UI limpia loading
```

---

### Caso 3 — Update de columna desde backend

**Evento servidor:** recalcula columna "total"

```ts
serverOp = {
  id: "op3",
  type: "update_column",
  colId: "total",
  values: { r1: 100, r2: 200 },
  source: "server"
}
```

**Flujo:**

```text
WebSocket → receive op
→ Engine.apply(serverOp)
→ UI re-render (sin loading, estado confirmado)
```

---

### Caso 4 — Agregar columna dinámica

**Evento servidor:** nueva columna

```ts
schemaOp = {
  id: "op4",
  type: "add_column",
  column: { id: "discount", type: "number" },
  index: 2,
  source: "server"
}
```

**Flujo:**

```text
Engine.apply(schemaOp)
→ UI renderiza nueva columna vacía
→ posteriormente llegan data ops
→ celdas se llenan progresivamente
```

---

### Caso 5 — Operación rechazada

**Acción usuario:** escribe valor inválido

```text
UI → op pending
→ Engine.apply(op) (optimistic)
→ Backend valida
→ error
→ OperationManager.fail(opId)
→ Engine revert (opcional)
→ UI muestra error
```

---

### Caso 6 — Inserción de filas con scroll activo

```text
capture anchor
→ apply add_row
→ recompute layout
→ restore anchor
→ UI estable (sin salto de scroll)
```

---

## 10. Conclusión

Arquitectura escalable basada en operaciones, con evolución incremental y bajo acoplamiento.


# DataTable Architecture RFC — Annex A

## 1. Operation State Machine

Define el ciclo de vida de una operación desde su creación hasta su resolución.

```
          ┌──────────────┐
          │   pending    │
          └──────┬───────┘
                 │
        ┌────────▼────────┐
        │   applying      │ (optimistic en engine)
        └──────┬───────┬──┘
               │       │
       ┌───────▼───┐ ┌─▼────────┐
       │ confirmed │ │  error   │
       └───────────┘ └──────────┘
```

### Estados

- **pending**: operación creada en cliente, aún no confirmada
    
- **applying**: aplicada optimísticamente en el engine
    
- **confirmed**: validada por backend
    
- **error**: rechazada o fallida
    

### Transiciones

- pending → applying: inmediatamente al aplicar en frontend
    
- applying → confirmed: backend responde OK
    
- applying → error: backend rechaza
    

---

## 2. Performance Targets

Define límites esperados del sistema.

### UI / Rendering

- FPS objetivo: 60fps
    
- Re-render máximo aceptable: <16ms
    
- Virtualización obligatoria > 1000 filas
    

### Data Volume

- MVP: hasta 50k filas
    
- Target: 100k–500k filas
    
- Columnas: hasta 200 (virtualización horizontal recomendada)
    

### Operaciones

- Batch size recomendado: 50–500 ops
    
- Latencia backend objetivo: <200ms
    
- Debounce envío: 50–100ms
    

### Memoria

- Evitar duplicación de estructuras
    
- Uso de maps/indexes para lookup O(1)
    

---

## 3. Performance Strategies

- Virtualización (vertical + horizontal)
    
- Memoización por celda
    
- Indexación de operaciones por target
    
- Batching de operaciones
    
- Lazy evaluation de celdas
    

---

## 4. Testing Strategy

### Unit Tests (core)

- TableEngine.apply(op)
    
- Idempotencia de operaciones
    
- Orden de operaciones
    
- Schema evolution
    

### Integration Tests

- OperationManager + Engine
    
- Sync con backend mock
    
- Reconciliación
    

### UI Tests

- Render de grandes datasets
    
- Scroll stability
    
- Loading states
    

### Edge Cases

- Ops fuera de orden
    
- Schema no existente
    
- Conflictos de datos
    

---

## 5. Observability (recomendado)

- Logging de operaciones
    
- Métricas de latency
    
- Conteo de ops pending
    
- Detección de desync
    

---

## 6. Conclusión

Este anexo define aspectos no funcionales clave para garantizar estabilidad, performance y mantenibilidad del sistema.


# DataTable Architecture RFC — Annex B

## 1. Data Model (Detailed)

### 1.1 ColumnSchema

```ts
interface ColumnSchema {
  id: string;
  type: "string" | "number" | "boolean" | "date" | "custom";
  title?: string;
  width?: number;
  default?: any;
  meta?: Record<string, any>; // renderer, validation rules, etc.
}
```

---

### 1.2 TableSchema

```ts
interface TableSchema {
  columns: Record<string, ColumnSchema>;
  columnOrder: string[];
  version: number;
}
```

---

### 1.3 Row & Cell

```ts
interface Cell {
  value: any;
  meta?: Record<string, any>;
}

interface Row {
  id: string;
  cells: Record<string, Cell>;
}
```

---

### 1.4 Table State

```ts
interface TableState {
  schema: TableSchema;
  rows: Record<string, Row>;
  rowOrder: string[];
}
```

---

## 2. Operation Payloads (Wire Format)

### 2.1 Base Operation

```ts
interface BaseOperation {
  id: string;
  type: string;
  ts?: number;
  source: "client" | "server";
  target?: any;
  meta?: Record<string, any>;
}
```

---

### 2.2 Data Operations

```ts
// Set cell
{
  id: "op1",
  type: "set_cell",
  rowId: "r1",
  colId: "A",
  value: 42
}

// Bulk update
{
  id: "op2",
  type: "bulk_update",
  updates: [
    { rowId: "r1", colId: "A", value: 1 },
    { rowId: "r2", colId: "B", value: 2 }
  ]
}

// Column update
{
  id: "op3",
  type: "update_column",
  colId: "total",
  values: {
    r1: 100,
    r2: 200
  }
}
```

---

### 2.3 Schema Operations

```ts
// Add column
{
  id: "op4",
  type: "add_column",
  column: {
    id: "discount",
    type: "number"
  },
  index: 2
}

// Remove column
{
  id: "op5",
  type: "remove_column",
  columnId: "discount"
}

// Add row
{
  id: "op6",
  type: "add_row",
  row: {
    id: "r10",
    cells: {}
  },
  index: 5
}
```

---

## 3. API Contracts

### 3.1 Submit Operations

**Endpoint**

```
POST /operations
```

**Request**

```json
{
  "ops": [ /* Operation[] */ ]
}
```

**Response**

```json
{
  "ack": ["op1", "op2"],
  "errors": [
    { "opId": "op3", "reason": "Invalid value" }
  ],
  "serverOps": [ /* Operation[] */ ]
}
```

---

### 3.2 Initial Load

**Endpoint**

```
GET /table
```

**Response**

```json
{
  "schema": { /* TableSchema */ },
  "rows": { /* Row map */ },
  "rowOrder": ["r1", "r2"],
  "version": 1
}
```

---

### 3.3 Streaming (WebSocket)

```ts
// server → client
{
  type: "ops",
  ops: Operation[]
}
```

---

## 4. Validation Rules (Backend)

- Validar existencia de columnas
    
- Validar tipos de datos
    
- Validar constraints (ej: required, ranges)
    
- Sanitizar inputs
    

---

## 5. Error Handling Contract

```ts
{
  opId: string;
  reason: string;
  code?: string;
}
```

---

## 6. Versioning Strategy

- `schema.version` incrementa en cambios estructurales
    
- Opcional: `data.version`
    
- Cliente detecta mismatch → puede refrescar
    

---

## 7. Security Considerations

- No confiar en cálculos del cliente
    
- Validación server-side obligatoria
    
- Sanitización de inputs
    

---

## 8. Conclusión

Este anexo define el contrato explícito de datos y comunicación, garantizando consistencia entre frontend y backend.


# DataTable Architecture RFC — Annex C

## 1. Objetivo

Definir un plan concreto de implementación basado en la arquitectura propuesta, incluyendo:

- Estructura de repositorio
    
- Módulos y responsabilidades
    
- Interfaces iniciales
    
- Orden de desarrollo
    

---

## 2. Estructura de Repositorio (Monorepo recomendado)

> El repositorio contiene **una librería reutilizable** (packages) y **una app de ejemplos/playground** (apps) para desarrollo, validación y demos.

```
/
├─ package.json
├─ pnpm-workspace.yaml (o yarn workspaces)
├─ tsconfig.base.json
├─ .eslintrc
├─ /packages
│  ├─ /core
│  │  ├─ src/
│  │  │  ├─ engine/
│  │  │  │  ├─ TableEngine.ts
│  │  │  │  ├─ apply.ts
│  │  │  │  └─ selectors.ts
│  │  │  ├─ models/
│  │  │  │  ├─ schema.ts
│  │  │  │  ├─ row.ts
│  │  │  │  └─ cell.ts
│  │  │  ├─ ops/
│  │  │  │  └─ types.ts
│  │  │  └─ index.ts
│  │  └─ package.json
│  │
│  ├─ /operations
│  │  ├─ src/
│  │  │  ├─ OperationManager.ts
│  │  │  ├─ index.ts
│  │  │  └─ indexes.ts
│  │  └─ package.json
│  │
│  ├─ /store
│  │  ├─ src/
│  │  │  ├─ createStore.ts
│  │  │  └─ index.ts
│  │  └─ package.json
│  │
│  ├─ /react
│  │  ├─ src/
│  │  │  ├─ hooks/
│  │  │  │  ├─ useDataTable.ts
│  │  │  │  ├─ useCell.ts
│  │  │  │  └─ useSelection.ts
│  │  │  └─ index.ts
│  │  └─ package.json
│  │
│  ├─ /ui (opcional)
│  │  ├─ src/
│  │  │  ├─ components/
│  │  │  │  ├─ DataTable.tsx
│  │  │  │  ├─ Cell.tsx
│  │  │  │  └─ Grid.tsx
│  │  │  └─ index.ts
│  │  └─ package.json
│  │
│  ├─ /adapters
│  └─ /api-client (opcional)
│     ├─ src/
│     │  ├─ transport.ts
│     │  ├─ http.ts
│     │  ├─ websocket.ts
│     │  └─ index.ts
│     └─ package.json
│
├─ /apps
│  └─ /playground
│     ├─ src/
│     │  ├─ main.tsx
│     │  ├─ App.tsx
│     │  ├─ examples/
│     │  │  ├─ basic.tsx
│     │  │  ├─ bulk-edit.tsx
│     │  │  ├─ streaming.tsx
│     │  │  └─ schema-dynamic.tsx
│     │  └─ mocks/
│     │     └─ data.ts
│     ├─ index.html
│     └─ package.json
│
└─ /configs
   ├─ tsconfig/
   └─ eslint/
```

### Aclaración clave

- `/packages/*` → librería reusable (publicable como npm/internal registry)
    
- `/apps/playground` → entorno de desarrollo, testing manual y showcase
    
- La app **NO es parte de la librería**, pero usa exactamente los mismos paquetes
    

---

## 3. Módulos y Responsabilidades

### 3.1 core (TableEngine)

Responsable de:

- estado de tabla
    
- aplicar operaciones
    
- acceso a datos
    

### 3.2 operations (OperationManager)

Responsable de:

- tracking de operaciones
    
- estado pending/error
    
- batching
    

### 3.3 store

Responsable de:

- integración reactiva con Zustand
    
- exponer estado a UI
    

### 3.4 react

Responsable de:

- hooks (useDataTable, useCell, etc.)
    

### 3.5 ui (opcional)

Responsable de:

- renderers base
    
- componentes reutilizables
    

### 3.6 adapters/api-client (opcional)

Responsable de:

- implementación concreta del transporte (HTTP / WebSocket)
    
- envío/recepción de operaciones
    

Aclaraciones clave:

- **No es parte del core de la librería**
    
- Implementa una interfaz (ej: `OperationTransport`)
    
- Puede ser reemplazado según backend/proyecto
    
- Funciona como referencia o plugin
    

El core debe depender de una abstracción, no de esta implementación concreta

---

## 4. Interfaces Iniciales

### 4.0 OperationTransport (abstracción de red)

```ts
export interface OperationTransport {
  send(ops: Operation[]): Promise<{ ack: string[]; errors?: any[]; serverOps?: Operation[] }>;
  subscribe?(cb: (ops: Operation[]) => void): void;
}
```

**Nota:** esta interfaz vive en un paquete compartido (ej: `core` u `operations`) y es utilizada por el `OperationManager` sin acoplarse a HTTP/WebSocket.

---

### 4.1 TableEngine

```ts
export interface TableEngine {
  apply(op: Operation): void;
  applyBatch(ops: Operation[]): void;
  getCell(rowId: string, colId: string): Cell;
}
```

**Archivo inicial sugerido:**  
`/packages/core/src/engine/TableEngine.ts`

```ts
export class TableEngineImpl implements TableEngine {
  apply(op: Operation) {
    // dispatch por tipo
  }

  applyBatch(ops: Operation[]) {
    for (const op of ops) this.apply(op);
  }

  getCell(rowId: string, colId: string) {
    // resolver lazy
  }
}
```

---

### 4.2 OperationManager

```ts
export interface OperationManager {
  apply(op: Operation): void;
  confirm(opId: string): void;
  fail(opId: string): void;
}
```

**Archivo:**  
`/packages/operations/src/OperationManager.ts`

---

### 4.3 Store

```ts
export interface TableStore {
  engine: TableEngine;
  operations: OperationManager;
}
```

**Archivo:**  
`/packages/store/src/createStore.ts`

---

## 5. Orden de Implementación (Scaffold real)

### Paso 1 — Setup repo

- configurar monorepo
    
- tsconfig base
    
- lint + build
    

### Paso 2 — Core

- models
    
- TableEngine básico
    

### Paso 3 — Operations

- OperationManager mínimo
    

### Paso 4 — Store

- createStore con Zustand
    

### Paso 5 — React

- hooks mínimos
    

### Paso 6 — Playground app

- render básico
    
- dataset mock
    

### Paso 7 — Virtualización

### Paso 8 — Adapters (API client opcional)

- implementar OperationTransport
    
- integrar HTTP / WebSocket
    
- conectar con OperationManager
    

---

## 6. Entregables por etapa

|Etapa|Entregable|
|---|---|
|Core|Engine testeado|
|Ops|Loading derivado|
|Store|UI reactiva|
|React|Hooks funcionales|
|UI|Tabla usable|
|API|Sync funcional|

---

## 7. Testing Inicial

- Unit tests para engine
    
- Tests de operaciones
    

---

## 8. Conclusión

Este anexo traduce la arquitectura en un plan ejecutable, permitiendo iniciar implementación sin ambigüedad.