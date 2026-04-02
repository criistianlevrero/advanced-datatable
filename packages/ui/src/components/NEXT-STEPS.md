# Refactor UI: plan y fronteras por paquete

Este documento define un refactor de `@advanced-datatable/ui` para hacerlo más composable, sin mezclar responsabilidades con `@advanced-datatable/react`.

## 1. Regla principal: ubicacion correcta de hooks

Para evitar acoplamiento y deuda tecnica, se define esta frontera:

- Los hooks React reutilizables y exportables viven en `packages/react/src/hooks`.
- El paquete `packages/ui` no expone hooks como API publica.
- En `packages/ui`, si se necesita extraer logica, preferir:
  - componentes chicos
  - helpers puros (sin React)
  - hooks privados solo si son internos al componente y no se exportan
- Si un hook podria ser util para mas de un componente o para consumidores externos, debe ir a `packages/react`.

### Decision rapida para cada extraccion

- `usa useState/useEffect y se reutiliza`: `packages/react/src/hooks`.
- `es calculo puro sin React`: `packages/ui/src/components/*` o `packages/ui/src/utils/*`.
- `es comportamiento local de un solo componente`: mantenerlo local o hook interno no exportado.

## 2. Estado actual (base de trabajo)

Componentes UI actuales:
- `DataTable.tsx`
- `Grid.tsx`
- `Cell.tsx`
- `Icon.tsx`

Hooks publicos ya existentes en `@advanced-datatable/react`:
- `useDataTable`
- `useCell`
- `useSelection`
- `useCellSelection`
- `useSort`
- `useFilter`

Esto confirma que la direccion correcta es consolidar hooks en `packages/react`, no en `packages/ui`.

## 3. Refactor propuesto por componente

## 3.1 DataTable.tsx

Objetivo: reducir orquestacion dentro del componente y habilitar composicion.

- Extraer persistencia de vista a una pieza reutilizable:
  - opcion A: helper puro `viewStatePersistence.ts` en `packages/ui/src/components`
  - opcion B: hook reutilizable `useViewStatePersistence` en `packages/react/src/hooks`
- Extraer inicializacion de engine/manager/store a una funcion fabrica (helper).
- Permitir inyectar `GridComponent` por prop con fallback a `Grid` default.
- Mantener `DataTable` como ensamblador: contexto + bootstrap + render del grid.

Nota de frontera:
- Si la extraccion usa hooks React y se considera reutilizable, moverla a `packages/react`.

## 3.2 Grid.tsx

Objetivo: bajar complejidad ciclomática y separar responsabilidades.

- Separar UI en subcomponentes:
  - `GridHeader`
  - `GridRow`
  - `GridFilterMenu`
  - `GridResizeHandle`
- Extraer helpers puros:
  - navegacion de celdas (`moveCellCoord`, `moveCellByTab`, `getArrowDelta`)
  - parseo clipboard (`textToMatrix`)
- Extraer logica reactiva reutilizable a hooks en `packages/react`:
  - `useGridKeyboardNavigation`
  - `useGridClipboard`
  - `useColumnResize`
  - `useFilterMenu`
- Inyeccion por props para personalizacion:
  - `HeaderComponent`
  - `RowComponent`
  - `CellComponent`
  - `FilterMenuComponent`

Nota de frontera:
- Los hooks anteriores deben vivir en `packages/react` si se planea reutilizacion fuera de `Grid`.

## 3.3 Cell.tsx

Objetivo: desacoplar edicion por tipo y mejorar extensibilidad.

- Convertir `Cell` en dispatcher liviano por tipo de columna.
- Crear componentes por tipo:
  - `CellText`
  - `CellNumber`
  - `CellBoolean`
  - `CellDate`
  - `CellCustom`
- Extraer transformacion de valores a helper puro (`parseDraftValue` ya existe y puede moverse a archivo dedicado).
- Si la logica de edicion se vuelve compartida, crear `useCellEditing` en `packages/react/src/hooks`.
- Permitir `renderEdit` y/o `CellComponent` custom por prop.

## 3.4 Icon.tsx

- Mantener como componente puro. Sin cambios estructurales.

## 4. Composable UI (API objetivo)

Ejemplo objetivo:

```tsx
<DataTable
  GridComponent={CustomGrid}
  HeaderComponent={CustomHeader}
  RowComponent={CustomRow}
  CellComponent={CustomCellDispatcher}
  FilterMenuComponent={CustomFilterMenu}
/>
```

Patron default:

```tsx
const Header = props.HeaderComponent ?? DefaultHeader;
const Row = props.RowComponent ?? DefaultRow;
const Cell = props.CellComponent ?? DefaultCellDispatcher;
const FilterMenu = props.FilterMenuComponent ?? DefaultFilterMenu;
```

## 5. Plan de migracion por fases

## Fase 1: Sin romper API
- Extraer subcomponentes y helpers internos en `ui`.
- Mantener props actuales y comportamiento actual.
- Agregar pruebas de regresion visual/funcional.

## Fase 2: Hooks compartidos en `react`
- Mover hooks reutilizables desde `ui` a `packages/react/src/hooks`.
- Re-exportar desde `packages/react/src/index.ts`.
- Actualizar imports internos de `ui` para consumir desde `@advanced-datatable/react`.

## Fase 3: API composable publica
- Exponer props de inyeccion de subcomponentes.
- Mantener defaults para compatibilidad.
- Documentar contratos de cada componente inyectable.

Estado actual de Fase 3

- Completado: `DataTable` expone `GridComponent`.
- Completado: `Grid` expone `HeaderComponent`, `RowComponent`, `CellComponent`, `FilterMenuComponent`.
- Completado: defaults backward-compatible en todos los puntos de inyeccion.
- Completado: tests de composicion en `tests/ui/components/Grid.composition.test.tsx`.
- Pendiente: documentacion publica consolidada en docs funcionales del paquete UI.

## 6. Criterios de aceptacion

- `packages/ui` no exporta hooks publicos nuevos.
- Hooks reutilizables viven en `packages/react/src/hooks`.
- `DataTable`, `Grid` y `Cell` reducen tamaño/complejidad por separacion de responsabilidades.
- La API actual sigue funcionando sin cambios obligatorios para consumidores.
- Existen tests para keyboard navigation, clipboard, resize, filtros y edicion.

Estado de criterios de aceptacion

- `packages/ui` no exporta hooks publicos nuevos: cumplido.
- Hooks reutilizables viven en `packages/react/src/hooks`: cumplido.
- `DataTable`, `Grid` y `Cell` reducen tamaño/complejidad por separacion de responsabilidades: cumplido.
- La API actual sigue funcionando sin cambios obligatorios para consumidores: cumplido.
- Existen tests para keyboard navigation, clipboard, resize, filtros y edicion: cumplido.

## 7. Riesgos y mitigacion

- Riesgo: romper UX de seleccion/teclado al extraer logica de `Grid`.
  - Mitigacion: tests de integracion para navegacion y seleccion.
- Riesgo: duplicar logica entre `ui` y `react`.
  - Mitigacion: regla de frontera y checklist de revision en PR.
- Riesgo: sobre-ingenieria de composicion.
  - Mitigacion: exponer primero 4 puntos de extension (Header, Row, Cell, FilterMenu).

## 8. Checklist tecnica para Fase 1

Objetivo de esta fase: reducir complejidad interna de `ui` sin mover todavia la API publica ni introducir breaking changes.

Estado actual: avances implementados

- Completado: extraccion de helpers puros de `Grid` y `Cell`.
- Completado: extraccion de `GridFilterMenu`, `GridHeader`, `GridResizeHandle` y `GridRow`.
- Completado: extraccion de `createDataTableApi.ts` y `viewStatePersistence.ts`.
- Completado: division de editores de celda por tipo (`CellText`, `CellNumber`, `CellBoolean`, `CellDate`) manteniendo `Cell.tsx` como dispatcher.
- Completado: estabilizacion del test de integracion `HttpTransport.integration.test.ts`.

## 8.1 DataTable

- Crear helper `createDataTableApi.ts` para encapsular:
  - `new TableEngineImpl(initialState)`
  - `new OperationManagerImpl(...)`
  - `createTableStore(...)`
- Crear helper `viewStatePersistence.ts` para encapsular:
  - `readViewState`
  - `writeViewState`
  - tipo `PersistedViewState`
- Mantener `DataTable.tsx` solo con:
  - bootstrap del API
  - efectos de lifecycle
  - provider de contexto
  - render de `Grid`
- Agregar prop opcional `GridComponent` con fallback a `Grid`.

## 8.2 Grid

- Extraer `renderFilterMenu` a `GridFilterMenu.tsx`.
- Extraer header a `GridHeader.tsx`.
- Extraer fila a `GridRow.tsx`.
- Extraer handle de resize a `GridResizeHandle.tsx`.
- Extraer helpers puros a `grid.helpers.ts`:
  - `textToMatrix`
  - `hasActiveFilter`
  - `getArrowDelta`
  - `moveCellCoord`
  - `moveCellByTab`
  - `clamp`
  - `isCellInRangeTarget`
- Dejar `Grid.tsx` como coordinador de estado + composición.

## 8.3 Cell

- Extraer `parseDraftValue` a `cell.helpers.ts`.
- Crear componentes internos por tipo:
  - `CellText.tsx`
  - `CellNumber.tsx`
  - `CellBoolean.tsx`
  - `CellDate.tsx`
- Mantener `Cell.tsx` como dispatcher y capa de compatibilidad.
- Definir interfaz base compartida para props de render/edit de celda.

## 8.4 Estructura de carpetas sugerida

```text
packages/ui/src/components/
  common/
    Icon.tsx
  data-table/
    DataTable.tsx
    createDataTableApi.ts
    viewStatePersistence.ts
  grid/
    Grid.tsx
    GridHeader.tsx
    GridRow.tsx
    GridFilterMenu.tsx
    GridResizeHandle.tsx
    grid.helpers.ts
    clipboard.ts
  cell/
    Cell.tsx
    CellText.tsx
    CellNumber.tsx
    CellBoolean.tsx
    CellDate.tsx
    CellEditorTypes.ts
    cell.helpers.ts
```

## 8.5 Tests a cubrir en Fase 1

- `DataTable` restaura `sortState`, `filterState` y `columnWidths` desde persistencia.
- `DataTable` persiste cambios de vista cuando cambia el store.
- `Grid` mantiene navegacion por teclado actual.
- `Grid` mantiene copy/paste actual.
- `Grid` mantiene resize de columnas actual.
- `GridFilterMenu` conserva comportamiento de filtros string, number, boolean y date.
- `Cell` mantiene commit/cancel de edicion.
- `Cell` respeta `readOnly` en columna y en celda.

## 8.6 Orden recomendado de implementacion

1. Extraer helpers puros de `Grid` y `Cell`.
2. Extraer `GridFilterMenu`.
3. Extraer `GridHeader` y `GridResizeHandle`.
4. Extraer `GridRow`.
5. Extraer persistencia y factory de `DataTable`.
6. Dividir `Cell` por tipos manteniendo el dispatcher actual.
7. Cerrar con tests de regresion.

Estado de ejecucion del orden recomendado

1. Extraer helpers puros de `Grid` y `Cell`: completado.
2. Extraer `GridFilterMenu`: completado.
3. Extraer `GridHeader` y `GridResizeHandle`: completado.
4. Extraer `GridRow`: completado.
5. Extraer persistencia y factory de `DataTable`: completado.
6. Dividir `Cell` por tipos manteniendo el dispatcher actual: completado.
7. Cerrar con tests de regresion: completado.

## 8.7 Definicion de terminado para Fase 1

- `DataTable.tsx`, `Grid.tsx` y `Cell.tsx` bajan claramente de tamaño.
- No cambia el entrypoint publico de `@advanced-datatable/ui`.
- No se agregan hooks publicos nuevos en `ui`.
- El comportamiento observable actual queda cubierto por tests.

---

Este documento debe actualizarse junto con cada PR de refactor para reflejar decisiones reales de arquitectura.
