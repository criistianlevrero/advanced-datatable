import { useCallback, useContext } from "react";
import type { CellCoord, CellSelectionOptions, CellSelectionState } from "@advanced-datatable/store";
import { useDataTable } from "./useDataTable";
import { DataTableContext } from "../context/DataTableContext";

export interface CellSelectionControls {
  selection: CellSelectionState;
  selectCell(cell: CellCoord, options?: CellSelectionOptions): void;
  updateFocus(cell: CellCoord): void;
  clearSelection(): void;
  isSelected(rowId: string, colId: string): boolean;
  isFocused(rowId: string, colId: string): boolean;
}

export function useCellSelection(): CellSelectionControls {
  const selection = useDataTable((s) => s.getCellSelection());
  const store = useContext(DataTableContext);

  const selectCell = useCallback(
    (cell: CellCoord, options?: CellSelectionOptions) => {
      store?.getState().selectCell(cell, options);
    },
    [store],
  );

  const updateFocus = useCallback(
    (cell: CellCoord) => {
      store?.getState().updateCellSelectionFocus(cell);
    },
    [store],
  );

  const clearSelection = useCallback(() => {
    store?.getState().clearCellSelection();
  }, [store]);

  const isSelected = useCallback(
    (rowId: string, colId: string) => store?.getState().isCellSelected(rowId, colId) ?? false,
    [store],
  );

  const isFocused = useCallback(
    (rowId: string, colId: string) => store?.getState().isCellFocused(rowId, colId) ?? false,
    [store],
  );

  return { selection, selectCell, updateFocus, clearSelection, isSelected, isFocused };
}