import type { TargetDescriptor } from "@advanced-datatable/core";
import type { FilterValue } from "@advanced-datatable/store";

export function textToMatrix(text: string): string[][] {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n")
    .filter((line, index, lines) => line.length > 0 || index < lines.length - 1)
    .map((line) => line.split("\t"));
}

export function hasActiveFilter(filter: FilterValue | undefined): boolean {
  if (!filter) {
    return false;
  }
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

export function createEmptyFilter(
  columnType: "string" | "number" | "boolean" | "date" | "custom",
): FilterValue {
  if (columnType === "number") {
    return { type: "number" };
  }
  if (columnType === "boolean") {
    return { type: "boolean", value: "all" };
  }
  if (columnType === "date") {
    return { type: "date" };
  }
  if (columnType === "custom") {
    return { type: "custom", value: "" };
  }
  return { type: "string", value: "" };
}

export function getArrowDelta(key: string): { row: number; col: number } | null {
  switch (key) {
    case "ArrowUp":
      return { row: -1, col: 0 };
    case "ArrowDown":
      return { row: 1, col: 0 };
    case "ArrowLeft":
      return { row: 0, col: -1 };
    case "ArrowRight":
      return { row: 0, col: 1 };
    default:
      return null;
  }
}

export function moveCellCoord(
  current: { rowId: string; colId: string },
  delta: { row: number; col: number },
  rowOrder: string[],
  columnOrder: string[],
): { rowId: string; colId: string } | null {
  const currentRowIndex = rowOrder.indexOf(current.rowId);
  const currentColIndex = columnOrder.indexOf(current.colId);
  if (currentRowIndex === -1 || currentColIndex === -1) {
    return null;
  }

  const nextRowIndex = clamp(currentRowIndex + delta.row, 0, rowOrder.length - 1);
  const nextColIndex = clamp(currentColIndex + delta.col, 0, columnOrder.length - 1);

  return {
    rowId: rowOrder[nextRowIndex],
    colId: columnOrder[nextColIndex],
  };
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function isCellInRangeTarget(rowId: string, colId: string, target: TargetDescriptor): boolean {
  if (target.type !== "range") {
    return false;
  }
  return target.rowIds.includes(rowId) && target.colIds.includes(colId);
}

export function moveCellByTab(
  current: { rowId: string; colId: string },
  isReverse: boolean,
  rowOrder: string[],
  columnOrder: string[],
): { rowId: string; colId: string } | null {
  const rowIndex = rowOrder.indexOf(current.rowId);
  const colIndex = columnOrder.indexOf(current.colId);
  if (rowIndex === -1 || colIndex === -1) {
    return null;
  }

  if (!isReverse) {
    if (colIndex < columnOrder.length - 1) {
      return { rowId: rowOrder[rowIndex], colId: columnOrder[colIndex + 1] };
    }
    if (rowIndex < rowOrder.length - 1) {
      return { rowId: rowOrder[rowIndex + 1], colId: columnOrder[0] };
    }
    return { rowId: rowOrder[rowIndex], colId: columnOrder[colIndex] };
  }

  if (colIndex > 0) {
    return { rowId: rowOrder[rowIndex], colId: columnOrder[colIndex - 1] };
  }
  if (rowIndex > 0) {
    return { rowId: rowOrder[rowIndex - 1], colId: columnOrder[columnOrder.length - 1] };
  }
  return { rowId: rowOrder[rowIndex], colId: columnOrder[colIndex] };
}
