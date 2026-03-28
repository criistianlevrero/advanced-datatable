import { useCallback, useContext } from "react";
import type { FilterState, FilterValue } from "@advanced-datatable/store";
import { useDataTable } from "./useDataTable";
import { DataTableContext } from "../context/DataTableContext";

export interface FilterControls {
  filterState: FilterState;
  setFilter(colId: string, value: FilterValue | string): void;
  clearFilter(colId: string): void;
  clearAllFilters(): void;
  activeFilterCount: number;
}

/**
 * Returns the current filter state and control methods backed by the DataTable store.
 * Useful for building external filter panels outside the Grid.
 */
export function useFilter(): FilterControls {
  const filterState = useDataTable((s) => s.getFilterState());
  const store = useContext(DataTableContext);

  const activeFilterCount = Object.values(filterState).filter(isActiveFilter).length;

  const setFilter = useCallback(
    (colId: string, value: FilterValue | string) => {
      store?.getState().setFilter(colId, value);
    },
    [store],
  );

  const clearFilter = useCallback(
    (colId: string) => {
      store?.getState().clearFilter(colId);
    },
    [store],
  );

  const clearAllFilters = useCallback(() => {
    store?.getState().clearAllFilters();
  }, [store]);

  return { filterState, setFilter, clearFilter, clearAllFilters, activeFilterCount };
}

function isActiveFilter(filter: FilterValue): boolean {
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
