export type SortDirection = "asc" | "desc";

export interface SortState {
  colId: string;
  direction: SortDirection;
}

interface BaseFilterValue {
  invert?: boolean;
}

export interface StringFilterValue extends BaseFilterValue {
  type: "string" | "custom";
  value: string;
}

export interface NumberFilterValue extends BaseFilterValue {
  type: "number";
  min?: number;
  max?: number;
}

export interface BooleanFilterValue extends BaseFilterValue {
  type: "boolean";
  value: "all" | "true" | "false";
}

export interface DateFilterValue extends BaseFilterValue {
  type: "date";
  from?: string;
  to?: string;
}

export type FilterValue =
  | StringFilterValue
  | NumberFilterValue
  | BooleanFilterValue
  | DateFilterValue;

export type FilterState = Record<string, FilterValue>;

export interface CellCoord {
  rowId: string;
  colId: string;
}

export interface SelectionRange {
  start: CellCoord;
  end: CellCoord;
}

export interface CellSelectionState {
  anchor: CellCoord | null;
  focus: CellCoord | null;
  ranges: SelectionRange[];
  activeRangeIndex: number;
}

export interface CellSelectionOptions {
  extend?: boolean;
  append?: boolean;
}
