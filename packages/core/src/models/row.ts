import type { Cell } from "./cell";

export interface Row {
  id: string;
  cells: Record<string, Cell>;
}
