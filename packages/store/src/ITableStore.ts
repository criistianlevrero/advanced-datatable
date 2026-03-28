import type { Cell, Operation, TableSchema, TargetDescriptor } from "@advanced-datatable/core";
import type { OperationRecord } from "@advanced-datatable/operations";
import type {
  CellCoord,
  CellSelectionOptions,
  CellSelectionState,
  FilterState,
  FilterValue,
  SortState,
} from "./viewTypes";

export interface ITableStore {
  /** Current schema. */
  getSchema(): TableSchema;
  /** Ordered list of row IDs. */
  getRowOrder(): string[];
  /** Get the cell value at (rowId, colId). Returns null-valued cell if absent. */
  getCell(rowId: string, colId: string): Cell;
  /** True if there are pending operations targeting this cell/row/column. */
  isPending(target: TargetDescriptor): boolean;
  /** Returns all pending operation records. */
  getPendingOperations(): OperationRecord[];
  /** Returns the total pending operation count. */
  getPendingOperationCount(): number;
  /** Returns all pending operation records for a target. */
  getPendingByTarget(target: TargetDescriptor): OperationRecord[];
  /** Dispatch an operation (apply locally + enqueue for transport). */
  dispatch(op: Operation): void;
  /** Flush pending transport queue. */
  flush(): void;

  // ── Sort ────────────────────────────────────────────────────────────────────
  /** Current sort state (null = no sort applied). */
  getSortState(): SortState | null;
  /** Cycle a column through: no sort → asc → desc → no sort. */
  toggleSort(colId: string): void;
  /** Set exact sort state. Pass null to clear. */
  setSortState(sort: SortState | null): void;

  // ── Column Widths ───────────────────────────────────────────────────────────
  /** Current width overrides for columns in pixels (initialized from schema widths). */
  getColumnWidths(): Readonly<Record<string, number>>;
  /** Get a single column width in pixels, if defined. */
  getColumnWidth(colId: string): number | undefined;
  /** Set a column width in pixels. */
  setColumnWidth(colId: string, width: number): void;
  /** Reset a column width to schema/default behavior. */
  resetColumnWidth(colId: string): void;

  // ── Filter ──────────────────────────────────────────────────────────────────
  /** Current filter state (map of colId → typed filter). */
  getFilterState(): FilterState;
  /** Set a single column filter. String values are treated as shorthand text filters. */
  setFilter(colId: string, value: FilterValue | string): void;
  /** Clear the filter for a single column. */
  clearFilter(colId: string): void;
  /** Clear all column filters. */
  clearAllFilters(): void;

  // ── Selection ───────────────────────────────────────────────────────────────
  /** The set of currently selected row IDs. */
  getSelectedRowIds(): ReadonlySet<string>;
  /** True if the given row is selected. */
  isRowSelected(rowId: string): boolean;
  /** Toggle selection for a single row. */
  toggleRowSelection(rowId: string): void;
  /** Replace the current selection with exactly the given row IDs. */
  setRowSelection(rowIds: string[]): void;
  /** Select all rows currently visible (post-filter). */
  selectAllRows(): void;
  /** Clear the entire selection. */
  clearSelection(): void;

  // ── Cell Selection ──────────────────────────────────────────────────────────
  /** Full cell selection state for spreadsheet-like interactions. */
  getCellSelection(): CellSelectionState;
  /** True if the given cell is inside any active selection range. */
  isCellSelected(rowId: string, colId: string): boolean;
  /** True if the given cell is the current focus cell. */
  isCellFocused(rowId: string, colId: string): boolean;
  /** Start or replace a selection from a cell. Supports shift-extend and ctrl/cmd append. */
  selectCell(cell: CellCoord, options?: CellSelectionOptions): void;
  /** Update the focus end of the active range, used while dragging. */
  updateCellSelectionFocus(cell: CellCoord): void;
  /** Clear all cell selection ranges. */
  clearCellSelection(): void;
}
