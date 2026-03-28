import { useCallback, useContext } from "react";
import type { SortState } from "@advanced-datatable/store";
import { useDataTable } from "./useDataTable";
import { DataTableContext } from "../context/DataTableContext";

export interface SortControls {
  sortState: SortState | null;
  toggleSort(colId: string): void;
  setSortState(sort: SortState | null): void;
  clearSort(): void;
}

/**
 * Returns the current sort state and control methods backed by the DataTable store.
 * Useful for building external sort controls outside the Grid.
 */
export function useSort(): SortControls {
  const sortState = useDataTable((s) => s.getSortState());
  const store = useContext(DataTableContext);

  const toggleSort = useCallback(
    (colId: string) => {
      store?.getState().toggleSort(colId);
    },
    [store],
  );

  const setSortState = useCallback(
    (sort: SortState | null) => {
      store?.getState().setSortState(sort);
    },
    [store],
  );

  const clearSort = useCallback(() => {
    store?.getState().setSortState(null);
  }, [store]);

  return { sortState, toggleSort, setSortState, clearSort };
}
