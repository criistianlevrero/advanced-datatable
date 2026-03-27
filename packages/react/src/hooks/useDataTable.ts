import { useContext } from "react";
import { useStore } from "zustand";
import { DataTableContext } from "../context/DataTableContext";
import type { TableStore } from "@advanced-datatable/store";

export function useDataTable<T>(selector: (store: ReturnType<TableStore["getState"]>) => T): T {
  const store = useContext(DataTableContext);
  if (!store) {
    throw new Error("useDataTable must be used inside a DataTableProvider");
  }
  return useStore(store, selector);
}
