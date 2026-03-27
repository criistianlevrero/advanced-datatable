import { createContext } from "react";
import type { TableStore } from "@advanced-datatable/store";

export const DataTableContext = createContext<TableStore | null>(null);
