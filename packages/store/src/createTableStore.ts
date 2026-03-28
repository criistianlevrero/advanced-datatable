import { create } from "zustand";
import type { Cell, ITableEngine, Operation, TableSchema, TargetDescriptor } from "@advanced-datatable/core";
import { getCell as engineGetCell } from "@advanced-datatable/core";
import type { IOperationManager, OperationRecord } from "@advanced-datatable/operations";
import type {
  CellCoord,
  CellSelectionOptions,
  CellSelectionState,
  FilterState,
  FilterValue,
  SelectionRange,
  SortState,
} from "./viewTypes";

export interface StoreState {
  /** Snapshots updated on every dispatch — new references trigger Zustand re-renders. */
  _schemaSnapshot: TableSchema;
  _rowOrderSnapshot: string[];
  _tick: number; // used by getCell / isPending which read from engine directly

  // View state — not persisted, not operation-driven
  _sortState: SortState | null;
  _filterState: FilterState;
  _columnWidths: Record<string, number>;
  _selectedRowIds: Set<string>;
  _cellSelection: CellSelectionState;
  /** Cached derived row order. Recomputed whenever rawOrder/sort/filter changes. */
  _derivedRowOrder: string[];

  dispatch(op: Operation): void;
  flush(): void;
  getSchema(): TableSchema;
  /** Returns the row order after applying active filters and sort. */
  getRowOrder(): string[];
  getCell(rowId: string, colId: string): Cell;
  isPending(target: TargetDescriptor): boolean;
  getPendingOperations(): OperationRecord[];
  getPendingOperationCount(): number;
  getPendingByTarget(target: TargetDescriptor): OperationRecord[];

  // Sort
  getSortState(): SortState | null;
  toggleSort(colId: string): void;
  setSortState(sort: SortState | null): void;

  getColumnWidths(): Readonly<Record<string, number>>;
  getColumnWidth(colId: string): number | undefined;
  setColumnWidth(colId: string, width: number): void;
  resetColumnWidth(colId: string): void;

  // Filter
  getFilterState(): FilterState;
  setFilter(colId: string, value: FilterValue | string): void;
  clearFilter(colId: string): void;
  clearAllFilters(): void;

  // Selection
  getSelectedRowIds(): ReadonlySet<string>;
  isRowSelected(rowId: string): boolean;
  toggleRowSelection(rowId: string): void;
  setRowSelection(rowIds: string[]): void;
  selectAllRows(): void;
  clearSelection(): void;

  getCellSelection(): CellSelectionState;
  isCellSelected(rowId: string, colId: string): boolean;
  isCellFocused(rowId: string, colId: string): boolean;
  selectCell(cell: CellCoord, options?: CellSelectionOptions): void;
  updateCellSelectionFocus(cell: CellCoord): void;
  clearCellSelection(): void;
}

export function createTableStore(engine: ITableEngine, manager: IOperationManager) {
  return create<StoreState>()((set, get) => {
    manager.subscribe(() => {
      const s = engine.getState();
      set((prev) => {
        const newRaw = [...s.rowOrder];
        return {
          _tick: prev._tick + 1,
          _schemaSnapshot: snapshotSchema(s.schema),
          _rowOrderSnapshot: newRaw,
          _columnWidths: reconcileColumnWidths(prev._columnWidths, s.schema),
          _derivedRowOrder: computeDerivedRowOrder(newRaw, prev._sortState, prev._filterState, s),
        };
      });
    });

    const initialState = engine.getState();
    const initialRaw = [...initialState.rowOrder];

    return {
      _schemaSnapshot: snapshotSchema(initialState.schema),
      _rowOrderSnapshot: initialRaw,
      _tick: 0,
      _sortState: null,
      _filterState: {},
      _columnWidths: initializeColumnWidths(initialState.schema),
      _selectedRowIds: new Set<string>(),
      _cellSelection: emptyCellSelection(),
      _derivedRowOrder: computeDerivedRowOrder(initialRaw, null, {}, initialState),

      dispatch(op: Operation) {
        manager.apply(op);
      },

      flush() {
        manager.flush();
      },

      getSchema(): TableSchema {
        return get()._schemaSnapshot;
      },

      getRowOrder(): string[] {
        return get()._derivedRowOrder;
      },

      getCell(rowId: string, colId: string): Cell {
        void get()._tick;
        return engineGetCell(engine.getState(), rowId, colId);
      },

      isPending(target: TargetDescriptor): boolean {
        void get()._tick;
        return manager.getPendingByTarget(target).length > 0;
      },

      getPendingOperations(): OperationRecord[] {
        void get()._tick;
        return manager.getPendingOperations();
      },

      getPendingOperationCount(): number {
        void get()._tick;
        return manager.getPendingOperations().length;
      },

      getPendingByTarget(target: TargetDescriptor): OperationRecord[] {
        void get()._tick;
        return manager.getPendingByTarget(target);
      },

      // ── Sort ───────────────────────────────────────────────────────────────

      getSortState(): SortState | null {
        return get()._sortState;
      },

      toggleSort(colId: string): void {
        const current = get()._sortState;
        let newSort: SortState | null;
        if (current?.colId !== colId) {
          newSort = { colId, direction: "asc" };
        } else if (current.direction === "asc") {
          newSort = { colId, direction: "desc" };
        } else {
          newSort = null;
        }
        set((prev) => ({
          _sortState: newSort,
          _derivedRowOrder: computeDerivedRowOrder(prev._rowOrderSnapshot, newSort, prev._filterState, engine.getState()),
        }));
      },

      setSortState(sort: SortState | null): void {
        set((prev) => ({
          _sortState: sort,
          _derivedRowOrder: computeDerivedRowOrder(prev._rowOrderSnapshot, sort, prev._filterState, engine.getState()),
        }));
      },

      // ── Column Widths ───────────────────────────────────────────────────────

      getColumnWidths(): Readonly<Record<string, number>> {
        return get()._columnWidths;
      },

      getColumnWidth(colId: string): number | undefined {
        return get()._columnWidths[colId];
      },

      setColumnWidth(colId: string, width: number): void {
        const nextWidth = Math.max(40, Math.round(width));
        set((prev) => ({
          _columnWidths: { ...prev._columnWidths, [colId]: nextWidth },
        }));
      },

      resetColumnWidth(colId: string): void {
        set((prev) => {
          const next = { ...prev._columnWidths };
          delete next[colId];
          const schemaWidth = engine.getState().schema.columns[colId]?.width;
          if (typeof schemaWidth === "number" && Number.isFinite(schemaWidth)) {
            next[colId] = Math.max(40, Math.round(schemaWidth));
          }
          return { _columnWidths: next };
        });
      },

      // ── Filter ─────────────────────────────────────────────────────────────

      getFilterState(): FilterState {
        return get()._filterState;
      },

      setFilter(colId: string, value: FilterValue | string): void {
        set((prev) => {
          const normalizedFilter = normalizeFilterValue(value, engine.getState().schema.columns[colId]?.type);
          const newFilter = { ...prev._filterState };
          if (normalizedFilter) {
            newFilter[colId] = normalizedFilter;
          } else {
            delete newFilter[colId];
          }
          return {
            _filterState: newFilter,
            _derivedRowOrder: computeDerivedRowOrder(prev._rowOrderSnapshot, prev._sortState, newFilter, engine.getState()),
          };
        });
      },

      clearFilter(colId: string): void {
        set((prev) => {
          const newFilter = { ...prev._filterState };
          delete newFilter[colId];
          return {
            _filterState: newFilter,
            _derivedRowOrder: computeDerivedRowOrder(prev._rowOrderSnapshot, prev._sortState, newFilter, engine.getState()),
          };
        });
      },

      clearAllFilters(): void {
        set((prev) => ({
          _filterState: {},
          _derivedRowOrder: computeDerivedRowOrder(prev._rowOrderSnapshot, prev._sortState, {}, engine.getState()),
        }));
      },

      // ── Selection ──────────────────────────────────────────────────────────

      getSelectedRowIds(): ReadonlySet<string> {
        return get()._selectedRowIds;
      },

      isRowSelected(rowId: string): boolean {
        return get()._selectedRowIds.has(rowId);
      },

      toggleRowSelection(rowId: string): void {
        set((prev) => {
          const next = new Set(prev._selectedRowIds);
          if (next.has(rowId)) {
            next.delete(rowId);
          } else {
            next.add(rowId);
          }
          return { _selectedRowIds: next };
        });
      },

      setRowSelection(rowIds: string[]): void {
        set({ _selectedRowIds: new Set(rowIds) });
      },

      selectAllRows(): void {
        // Select only the currently visible (filtered) rows
        set((prev) => ({ _selectedRowIds: new Set(prev._derivedRowOrder) }));
      },

      clearSelection(): void {
        set({ _selectedRowIds: new Set<string>() });
      },

      getCellSelection(): CellSelectionState {
        return get()._cellSelection;
      },

      isCellSelected(rowId: string, colId: string): boolean {
        const state = get();
        return state._cellSelection.ranges.some((range) =>
          isCoordInRange({ rowId, colId }, range, state._derivedRowOrder, state._schemaSnapshot.columnOrder),
        );
      },

      isCellFocused(rowId: string, colId: string): boolean {
        const focus = get()._cellSelection.focus;
        return focus?.rowId === rowId && focus.colId === colId;
      },

      selectCell(cell: CellCoord, options?: CellSelectionOptions): void {
        set((prev) => ({
          _cellSelection: buildNextCellSelection(
            prev._cellSelection,
            cell,
            options,
            prev._derivedRowOrder,
            prev._schemaSnapshot.columnOrder,
          ),
        }));
      },

      updateCellSelectionFocus(cell: CellCoord): void {
        set((prev) => ({
          _cellSelection: updateCellSelectionFocusState(
            prev._cellSelection,
            cell,
            prev._derivedRowOrder,
            prev._schemaSnapshot.columnOrder,
          ),
        }));
      },

      clearCellSelection(): void {
        set({ _cellSelection: emptyCellSelection() });
      },
    };
  });
}

export type TableStore = ReturnType<typeof createTableStore>;

function emptyCellSelection(): CellSelectionState {
  return {
    anchor: null,
    focus: null,
    ranges: [],
    activeRangeIndex: -1,
  };
}

function snapshotSchema(schema: TableSchema): TableSchema {
  return {
    ...schema,
    columns: { ...schema.columns },
    columnOrder: [...schema.columnOrder],
  };
}

function initializeColumnWidths(schema: TableSchema): Record<string, number> {
  const widths: Record<string, number> = {};
  for (const colId of schema.columnOrder) {
    const width = schema.columns[colId]?.width;
    if (typeof width === "number" && Number.isFinite(width)) {
      widths[colId] = Math.max(40, Math.round(width));
    }
  }
  return widths;
}

function reconcileColumnWidths(current: Record<string, number>, schema: TableSchema): Record<string, number> {
  const next: Record<string, number> = {};
  for (const colId of schema.columnOrder) {
    if (typeof current[colId] === "number" && Number.isFinite(current[colId])) {
      next[colId] = current[colId];
      continue;
    }
    const schemaWidth = schema.columns[colId]?.width;
    if (typeof schemaWidth === "number" && Number.isFinite(schemaWidth)) {
      next[colId] = Math.max(40, Math.round(schemaWidth));
    }
  }
  return next;
}

function computeDerivedRowOrder(
  rawOrder: string[],
  sortState: SortState | null,
  filterState: FilterState,
  engineState: ReturnType<ITableEngine["getState"]>,
): string[] {
  let result = rawOrder;
  for (const [colId, filterValue] of Object.entries(filterState)) {
    if (!isFilterActive(filterValue)) continue;
    const columnType = engineState.schema.columns[colId]?.type;
    result = result.filter((rowId) => {
      const cell = engineState.rows.get(rowId)?.cells[colId];
      return matchesFilter(cell?.value, filterValue, columnType);
    });
  }
  if (!sortState) return result;
  const { colId, direction } = sortState;
  const colType = engineState.schema.columns[colId]?.type;
  return [...result].sort((aId, bId) => {
    const aVal = engineState.rows.get(aId)?.cells[colId]?.value;
    const bVal = engineState.rows.get(bId)?.cells[colId]?.value;
    return compareValues(aVal, bVal, direction, colType);
  });
}

function normalizeFilterValue(
  value: FilterValue | string,
  columnType: "string" | "number" | "boolean" | "date" | "custom" | undefined,
): FilterValue | null {
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) {
      return null;
    }
    return {
      type: columnType === "custom" ? "custom" : "string",
      value,
    };
  }

  if (!isFilterActive(value)) {
    return null;
  }

  return value;
}

function isFilterActive(filter: FilterValue): boolean {
  if (filter.type === "string" || filter.type === "custom") {
    return filter.value.trim().length > 0;
  }
  if (filter.type === "number") {
    return Number.isFinite(filter.min) || Number.isFinite(filter.max);
  }
  if (filter.type === "boolean") {
    return filter.value !== "all";
  }
  if (filter.type === "date") {
    return Boolean(filter.from || filter.to);
  }
  return false;
}

function matchesFilter(
  cellValue: unknown,
  filter: FilterValue,
  columnType: "string" | "number" | "boolean" | "date" | "custom" | undefined,
): boolean {
  let matches = false;

  if (filter.type === "string" || filter.type === "custom") {
    const lower = filter.value.trim().toLowerCase();
    matches = String(cellValue ?? "").toLowerCase().includes(lower);
    return filter.invert ? !matches : matches;
  }

  if (filter.type === "number") {
    const value = Number(cellValue);
    if (!Number.isFinite(value)) {
      matches = false;
      return filter.invert ? !matches : matches;
    }
    if (Number.isFinite(filter.min) && value < (filter.min as number)) {
      matches = false;
      return filter.invert ? !matches : matches;
    }
    if (Number.isFinite(filter.max) && value > (filter.max as number)) {
      matches = false;
      return filter.invert ? !matches : matches;
    }
    matches = true;
    return filter.invert ? !matches : matches;
  }

  if (filter.type === "boolean") {
    const boolValue = Boolean(cellValue);
    if (filter.value === "true") {
      matches = boolValue === true;
      return filter.invert ? !matches : matches;
    }
    if (filter.value === "false") {
      matches = boolValue === false;
      return filter.invert ? !matches : matches;
    }
    matches = true;
    return filter.invert ? !matches : matches;
  }

  if (filter.type === "date") {
    const value = new Date(String(cellValue)).getTime();
    if (!Number.isFinite(value)) {
      matches = false;
      return filter.invert ? !matches : matches;
    }
    if (filter.from) {
      const from = new Date(filter.from).getTime();
      if (Number.isFinite(from) && value < from) {
        matches = false;
        return filter.invert ? !matches : matches;
      }
    }
    if (filter.to) {
      const to = new Date(filter.to).getTime();
      if (Number.isFinite(to) && value > to) {
        matches = false;
        return filter.invert ? !matches : matches;
      }
    }
    matches = true;
    return filter.invert ? !matches : matches;
  }

  // Fallback for unknown custom semantics: behave as string filter.
  matches = String(cellValue ?? "").toLowerCase().includes(String((filter as FilterValue & { value?: string }).value ?? "").toLowerCase());
  return filter.invert ? !matches : matches;
}

function buildNextCellSelection(
  current: CellSelectionState,
  cell: CellCoord,
  options: CellSelectionOptions | undefined,
  rowOrder: string[],
  columnOrder: string[],
): CellSelectionState {
  if (options?.append) {
    const nextRange = normalizeRange(cell, cell, rowOrder, columnOrder);
    return {
      anchor: cell,
      focus: cell,
      ranges: [...current.ranges, nextRange],
      activeRangeIndex: current.ranges.length,
    };
  }

  if (options?.extend) {
    const anchor = current.anchor ?? cell;
    const range = normalizeRange(anchor, cell, rowOrder, columnOrder);
    if (current.activeRangeIndex >= 0 && current.ranges.length > 0) {
      const nextRanges = [...current.ranges];
      nextRanges[current.activeRangeIndex] = range;
      return {
        anchor,
        focus: cell,
        ranges: nextRanges,
        activeRangeIndex: current.activeRangeIndex,
      };
    }

    return {
      anchor,
      focus: cell,
      ranges: [range],
      activeRangeIndex: 0,
    };
  }

  return {
    anchor: cell,
    focus: cell,
    ranges: [normalizeRange(cell, cell, rowOrder, columnOrder)],
    activeRangeIndex: 0,
  };
}

function updateCellSelectionFocusState(
  current: CellSelectionState,
  cell: CellCoord,
  rowOrder: string[],
  columnOrder: string[],
): CellSelectionState {
  const anchor = current.anchor ?? cell;
  const activeRangeIndex = current.activeRangeIndex >= 0 ? current.activeRangeIndex : 0;
  const nextRanges = current.ranges.length > 0 ? [...current.ranges] : [normalizeRange(anchor, cell, rowOrder, columnOrder)];

  nextRanges[activeRangeIndex] = normalizeRange(anchor, cell, rowOrder, columnOrder);

  return {
    anchor,
    focus: cell,
    ranges: nextRanges,
    activeRangeIndex,
  };
}

function normalizeRange(
  start: CellCoord,
  end: CellCoord,
  rowOrder: string[],
  columnOrder: string[],
): SelectionRange {
  const startRowIndex = rowOrder.indexOf(start.rowId);
  const endRowIndex = rowOrder.indexOf(end.rowId);
  const startColIndex = columnOrder.indexOf(start.colId);
  const endColIndex = columnOrder.indexOf(end.colId);

  if (startRowIndex === -1 || endRowIndex === -1 || startColIndex === -1 || endColIndex === -1) {
    return { start, end };
  }

  const topRowIndex = Math.min(startRowIndex, endRowIndex);
  const bottomRowIndex = Math.max(startRowIndex, endRowIndex);
  const leftColIndex = Math.min(startColIndex, endColIndex);
  const rightColIndex = Math.max(startColIndex, endColIndex);

  return {
    start: {
      rowId: rowOrder[topRowIndex],
      colId: columnOrder[leftColIndex],
    },
    end: {
      rowId: rowOrder[bottomRowIndex],
      colId: columnOrder[rightColIndex],
    },
  };
}

function isCoordInRange(
  coord: CellCoord,
  range: SelectionRange,
  rowOrder: string[],
  columnOrder: string[],
): boolean {
  const rowIndex = rowOrder.indexOf(coord.rowId);
  const colIndex = columnOrder.indexOf(coord.colId);
  const startRowIndex = rowOrder.indexOf(range.start.rowId);
  const endRowIndex = rowOrder.indexOf(range.end.rowId);
  const startColIndex = columnOrder.indexOf(range.start.colId);
  const endColIndex = columnOrder.indexOf(range.end.colId);

  if (
    rowIndex === -1 ||
    colIndex === -1 ||
    startRowIndex === -1 ||
    endRowIndex === -1 ||
    startColIndex === -1 ||
    endColIndex === -1
  ) {
    return false;
  }

  return (
    rowIndex >= Math.min(startRowIndex, endRowIndex) &&
    rowIndex <= Math.max(startRowIndex, endRowIndex) &&
    colIndex >= Math.min(startColIndex, endColIndex) &&
    colIndex <= Math.max(startColIndex, endColIndex)
  );
}

function compareValues(
  a: unknown,
  b: unknown,
  direction: "asc" | "desc",
  type: string | undefined,
): number {
  const multiplier = direction === "asc" ? 1 : -1;

  if (a === null || a === undefined) return 1 * multiplier;
  if (b === null || b === undefined) return -1 * multiplier;

  let cmp = 0;
  if (type === "number") {
    cmp = Number(a) - Number(b);
  } else if (type === "boolean") {
    cmp = Number(Boolean(a)) - Number(Boolean(b));
  } else if (type === "date") {
    cmp = new Date(String(a)).getTime() - new Date(String(b)).getTime();
  } else {
    cmp = String(a).localeCompare(String(b));
  }

  return cmp * multiplier;
}
