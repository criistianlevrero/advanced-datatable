import { useCallback, useContext } from "react";
import { useDataTable } from "./useDataTable";
import { DataTableContext } from "../context/DataTableContext";

export interface SelectionState {
  selectedRowIds: ReadonlySet<string>;
  toggleRow(rowId: string): void;
  /** Replace selection with the given row IDs. Pass no args to select all visible rows. */
  selectAll(rowIds?: string[]): void;
  clearSelection(): void;
  isSelected(rowId: string): boolean;
}

/**
 * Returns row selection state and control methods backed by the DataTable store.
 * Must be used within a DataTable context.
 */
export function useSelection(): SelectionState {
  const selectedRowIds = useDataTable((s) => s.getSelectedRowIds());
  const store = useContext(DataTableContext);

  const toggleRow = useCallback(
    (rowId: string) => {
      store?.getState().toggleRowSelection(rowId);
    },
    [store],
  );

  const selectAll = useCallback(
    (rowIds?: string[]) => {
      if (rowIds !== undefined) {
        store?.getState().setRowSelection(rowIds);
      } else {
        store?.getState().selectAllRows();
      }
    },
    [store],
  );

  const clearSelection = useCallback(() => {
    store?.getState().clearSelection();
  }, [store]);

  const isSelected = useCallback(
    (rowId: string) => selectedRowIds.has(rowId),
    [selectedRowIds],
  );

  return { selectedRowIds, toggleRow, selectAll, clearSelection, isSelected };
}
