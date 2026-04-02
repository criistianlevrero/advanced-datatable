import type { CellCoord, FilterState, SortState } from "@advanced-datatable/store";
import type { DataTableApi } from "./createDataTableApi";

export interface ViewStatePersistenceOptions {
  key: string;
  includeCellSelection?: boolean;
}

export interface PersistedViewState {
  sortState: SortState | null;
  filterState: FilterState;
  columnWidths: Record<string, number>;
  selectionAnchor?: CellCoord;
  selectionFocus?: CellCoord;
}

export function applyPersistedViewState(api: DataTableApi, options: ViewStatePersistenceOptions): void {
  if (typeof window === "undefined") {
    return;
  }

  const persisted = readViewState(options.key);
  if (!persisted) {
    return;
  }

  const storeState = api.store.getState();
  storeState.setSortState(persisted.sortState ?? null);
  storeState.clearAllFilters();
  for (const [colId, filter] of Object.entries(persisted.filterState ?? {})) {
    storeState.setFilter(colId, filter);
  }
  for (const [colId, width] of Object.entries(persisted.columnWidths ?? {})) {
    if (typeof width === "number" && Number.isFinite(width)) {
      storeState.setColumnWidth(colId, width);
    }
  }

  if (options.includeCellSelection && persisted.selectionAnchor) {
    storeState.selectCell(persisted.selectionAnchor);
    if (persisted.selectionFocus) {
      storeState.updateCellSelectionFocus(persisted.selectionFocus);
    }
  }
}

export function subscribeViewStatePersistence(
  api: DataTableApi,
  options: ViewStatePersistenceOptions,
): () => void {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  const unsubscribe = api.store.subscribe((state) => {
    const persisted: PersistedViewState = {
      sortState: state.getSortState(),
      filterState: state.getFilterState(),
      columnWidths: { ...state.getColumnWidths() },
    };

    if (options.includeCellSelection) {
      const selection = state.getCellSelection();
      if (selection.anchor) {
        persisted.selectionAnchor = selection.anchor;
      }
      if (selection.focus) {
        persisted.selectionFocus = selection.focus;
      }
    }

    writeViewState(options.key, persisted);
  });

  return () => unsubscribe();
}

function readViewState(key: string): PersistedViewState | null {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) {
      return null;
    }
    return JSON.parse(raw) as PersistedViewState;
  } catch {
    return null;
  }
}

function writeViewState(key: string, state: PersistedViewState): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(state));
  } catch {
    // Ignore storage write errors in environments with restricted storage.
  }
}
