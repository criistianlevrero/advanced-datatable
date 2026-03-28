import React, { useEffect, useMemo } from "react";
import type { ReactNode } from "react";
import { DataTableContext } from "@advanced-datatable/react";
import { TableEngineImpl } from "@advanced-datatable/core";
import type { IConnectivityMonitor, IOperationPersistence } from "@advanced-datatable/operations";
import { OperationManagerImpl } from "@advanced-datatable/operations";
import { createTableStore } from "@advanced-datatable/store";
import type { CellCoord, FilterState, SortState } from "@advanced-datatable/store";
import type { IOperationTransport } from "@advanced-datatable/api-client";
import type { TableState } from "@advanced-datatable/core";
import { Grid } from "./Grid";
import type { GridProps } from "./Grid";

export interface ViewStatePersistenceOptions {
  key: string;
  includeCellSelection?: boolean;
}

interface PersistedViewState {
  sortState: SortState | null;
  filterState: FilterState;
  columnWidths: Record<string, number>;
  selectionAnchor?: CellCoord;
  selectionFocus?: CellCoord;
}

export interface DataTableProps extends GridProps {
  transport: IOperationTransport;
  initialState?: Partial<TableState>;
  persistence?: IOperationPersistence;
  connectivityMonitor?: IConnectivityMonitor;
  viewStatePersistence?: ViewStatePersistenceOptions;
  onReady?: (api: { manager: OperationManagerImpl; store: ReturnType<typeof createTableStore> }) => void;
  children?: ReactNode;
}

export function DataTable({
  transport,
  initialState,
  persistence,
  connectivityMonitor,
  viewStatePersistence,
  onReady,
  children,
  ...gridProps
}: DataTableProps): React.ReactElement {
  const api = useMemo(() => {
    const engine = new TableEngineImpl(initialState);
    const manager = new OperationManagerImpl(engine, transport, undefined, persistence);
    const store = createTableStore(engine, manager);
    return { manager, store };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    void api.manager.loadPersistedOperations();
    if (connectivityMonitor) {
      api.manager.enableAutoReplay(connectivityMonitor);
      return () => api.manager.disableAutoReplay();
    }
    return;
  }, [api, connectivityMonitor]);

  useEffect(() => {
    if (!viewStatePersistence || typeof window === "undefined") {
      return;
    }

    const persisted = readViewState(viewStatePersistence.key);
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

    if (viewStatePersistence.includeCellSelection && persisted.selectionAnchor) {
      storeState.selectCell(persisted.selectionAnchor);
      if (persisted.selectionFocus) {
        storeState.updateCellSelectionFocus(persisted.selectionFocus);
      }
    }
  }, [api, viewStatePersistence]);

  useEffect(() => {
    if (!viewStatePersistence || typeof window === "undefined") {
      return;
    }

    const unsubscribe = api.store.subscribe((state) => {
      const persisted: PersistedViewState = {
        sortState: state.getSortState(),
        filterState: state.getFilterState(),
        columnWidths: { ...state.getColumnWidths() },
      };

      if (viewStatePersistence.includeCellSelection) {
        const selection = state.getCellSelection();
        if (selection.anchor) {
          persisted.selectionAnchor = selection.anchor;
        }
        if (selection.focus) {
          persisted.selectionFocus = selection.focus;
        }
      }

      writeViewState(viewStatePersistence.key, persisted);
    });

    return () => unsubscribe();
  }, [api, viewStatePersistence]);

  useEffect(() => {
    onReady?.(api);
  }, [api, onReady]);

  return (
    <DataTableContext.Provider value={api.store}>
      {children ?? <Grid {...gridProps} />}
    </DataTableContext.Provider>
  );
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
