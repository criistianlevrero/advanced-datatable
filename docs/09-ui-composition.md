# 09 — UI Composition Guide

## Objetivo

Este documento describe la API composable de `@advanced-datatable/ui` para reemplazar partes de la UI sin modificar el core.

## 1. Puntos de extension disponibles

### 1.1 En `DataTable`

- `GridComponent`: reemplaza el grid completo.

### 1.2 En `Grid`

- `HeaderComponent`: reemplaza el encabezado.
- `RowComponent`: reemplaza la renderizacion de filas.
- `CellComponent`: reemplaza la celda default usada por cada fila.
- `FilterMenuComponent`: reemplaza el menu de filtros.

Todos los puntos anteriores tienen fallback al componente default interno.

## 2. Compatibilidad

- Si no pasas ningun componente custom, el comportamiento es el mismo que antes del refactor.
- Los props existentes (`renderCell`, `cellProps`, `showFilters`, `resizableColumns`, etc.) siguen funcionando.

## 3. Ejemplos

### 3.1 Reemplazar solo el header

```tsx
import { DataTable } from "@advanced-datatable/ui";
import type { GridHeaderProps } from "@advanced-datatable/ui";

function MyHeader(props: GridHeaderProps) {
  return (
    <thead>
      <tr>
        <th>Custom Header</th>
      </tr>
    </thead>
  );
}

<DataTable
  transport={transport}
  HeaderComponent={MyHeader}
  initialState={initialState}
/>;
```

### 3.2 Reemplazar el menu de filtros

```tsx
import { DataTable } from "@advanced-datatable/ui";
import type { GridFilterMenuProps } from "@advanced-datatable/ui";

function MyFilterMenu({ colId }: GridFilterMenuProps) {
  return <div>Custom filter for {colId}</div>;
}

<DataTable
  transport={transport}
  showFilters
  FilterMenuComponent={MyFilterMenu}
  initialState={initialState}
/>;
```

### 3.3 Reemplazar fila y celda

```tsx
import { DataTable } from "@advanced-datatable/ui";
import type { GridRowProps, CellProps } from "@advanced-datatable/ui";

function MyCell({ rowId, colId }: CellProps) {
  return <td data-cell={`${rowId}-${colId}`}>Custom cell</td>;
}

function MyRow(props: GridRowProps) {
  return (
    <tr>
      <td>Custom row {props.rowId}</td>
    </tr>
  );
}

<DataTable
  transport={transport}
  RowComponent={MyRow}
  CellComponent={MyCell}
  initialState={initialState}
/>;
```

## 4. Contratos recomendados para implementaciones custom

- Mantener accesibilidad basica (`aria-*`) cuando reemplaces header/celda/filtros.
- Si reemplazas `RowComponent`, respetar el manejo de seleccion/focus recibido por props.
- Si reemplazas `CellComponent`, soportar estados `selected`, `focused`, `pending` para no perder feedback visual.
- Si reemplazas `FilterMenuComponent`, emitir cambios via `onChange`, `onToggleInvert`, `onRemove`.

## 5. Cobertura de tests

Los overrides estan cubiertos en:

- `tests/ui/components/Grid.composition.test.tsx`
