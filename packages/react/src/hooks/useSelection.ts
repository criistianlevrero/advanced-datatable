import { useState, useCallback } from "react";

export interface SelectionState {
  selectedRowIds: Set<string>;
  toggleRow(rowId: string): void;
  selectAll(rowIds: string[]): void;
  clearSelection(): void;
  isSelected(rowId: string): boolean;
}

export function useSelection(): SelectionState {
  const [selectedRowIds, setSelected] = useState<Set<string>>(new Set());

  const toggleRow = useCallback((rowId: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(rowId)) {
        next.delete(rowId);
      } else {
        next.add(rowId);
      }
      return next;
    });
  }, []);

  const selectAll = useCallback((rowIds: string[]) => {
    setSelected(new Set(rowIds));
  }, []);

  const clearSelection = useCallback(() => {
    setSelected(new Set());
  }, []);

  const isSelected = useCallback(
    (rowId: string) => selectedRowIds.has(rowId),
    [selectedRowIds],
  );

  return { selectedRowIds, toggleRow, selectAll, clearSelection, isSelected };
}
