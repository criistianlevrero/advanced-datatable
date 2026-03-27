import { useContext } from "react";
import { useStore } from "zustand";
import { DataTableContext } from "../context/DataTableContext";
import type { Cell } from "@advanced-datatable/core";

export function useCell(rowId: string, colId: string): Cell {
  const store = useContext(DataTableContext);
  if (!store) {
    throw new Error("useCell must be used inside a DataTableProvider");
  }
  return useStore(store, (s) => s.getCell(rowId, colId));
}
