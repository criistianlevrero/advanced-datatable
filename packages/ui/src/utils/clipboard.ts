import type { TableSchema } from "@advanced-datatable/core";
import type { CellCoord, CellSelectionState, SelectionRange } from "@advanced-datatable/store";

export type ClipboardMatrix = string[][];

export interface PastePlan {
  rowIds: string[];
  colIds: string[];
  updates: Array<{ rowId: string; colId: string; value: unknown }>;
}

export function getPrimaryRange(selection: CellSelectionState): SelectionRange | null {
  if (selection.ranges.length === 0) {
    return null;
  }

  if (selection.activeRangeIndex >= 0 && selection.activeRangeIndex < selection.ranges.length) {
    return selection.ranges[selection.activeRangeIndex];
  }

  return selection.ranges[0];
}

export function rangeToRowIds(range: SelectionRange, rowOrder: string[]): string[] {
  const startIndex = rowOrder.indexOf(range.start.rowId);
  const endIndex = rowOrder.indexOf(range.end.rowId);
  if (startIndex === -1 || endIndex === -1) {
    return [];
  }
  return rowOrder.slice(Math.min(startIndex, endIndex), Math.max(startIndex, endIndex) + 1);
}

export function rangeToColIds(range: SelectionRange, columnOrder: string[]): string[] {
  const startIndex = columnOrder.indexOf(range.start.colId);
  const endIndex = columnOrder.indexOf(range.end.colId);
  if (startIndex === -1 || endIndex === -1) {
    return [];
  }
  return columnOrder.slice(Math.min(startIndex, endIndex), Math.max(startIndex, endIndex) + 1);
}

export function buildClipboardText(
  selection: CellSelectionState,
  rowOrder: string[],
  columnOrder: string[],
  readCell: (rowId: string, colId: string) => unknown,
): string {
  const primaryRange = getPrimaryRange(selection);
  if (!primaryRange) {
    return "";
  }

  const rowIds = rangeToRowIds(primaryRange, rowOrder);
  const colIds = rangeToColIds(primaryRange, columnOrder);

  return rowIds
    .map((rowId) => colIds.map((colId) => stringifyClipboardValue(readCell(rowId, colId))).join("\t"))
    .join("\n");
}

export function parseClipboardText(text: string): ClipboardMatrix {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n")
    .filter((line, index, lines) => line.length > 0 || index < lines.length - 1)
    .map((line) => line.split("\t"));
}

export function buildPastePlan(
  selection: CellSelectionState,
  matrix: ClipboardMatrix,
  rowOrder: string[],
  schema: TableSchema,
  isCellReadOnly?: (rowId: string, colId: string) => boolean,
): PastePlan | null {
  const primaryRange = getPrimaryRange(selection);
  if (!primaryRange || matrix.length === 0 || matrix[0]?.length === 0) {
    return null;
  }

  const destination = getDestinationBounds(primaryRange, matrix, rowOrder, schema.columnOrder);
  if (!destination) {
    return null;
  }

  const updates: Array<{ rowId: string; colId: string; value: unknown }> = [];

  for (let rowIndex = 0; rowIndex < destination.rowIds.length; rowIndex += 1) {
    for (let colIndex = 0; colIndex < destination.colIds.length; colIndex += 1) {
      const rowId = destination.rowIds[rowIndex];
      const colId = destination.colIds[colIndex];
      const rawValue = matrix[rowIndex % matrix.length][colIndex % matrix[0].length] ?? "";
      const column = schema.columns[colId];
      if (!column) {
        continue;
      }
      if (column.meta?.readOnly === true) {
        continue;
      }
      if (isCellReadOnly?.(rowId, colId) === true) {
        continue;
      }
      updates.push({
        rowId,
        colId,
        value: parseClipboardValue(rawValue, column.type),
      });
    }
  }

  if (updates.length === 0) {
    return null;
  }

  return {
    rowIds: destination.rowIds,
    colIds: destination.colIds,
    updates,
  };
}

function getDestinationBounds(
  range: SelectionRange,
  matrix: ClipboardMatrix,
  rowOrder: string[],
  columnOrder: string[],
): { rowIds: string[]; colIds: string[] } | null {
  const selectedRowIds = rangeToRowIds(range, rowOrder);
  const selectedColIds = rangeToColIds(range, columnOrder);
  if (selectedRowIds.length === 0 || selectedColIds.length === 0) {
    return null;
  }

  const isSingleCellSelection = selectedRowIds.length === 1 && selectedColIds.length === 1;
  if (!isSingleCellSelection) {
    return { rowIds: selectedRowIds, colIds: selectedColIds };
  }

  const startRowIndex = rowOrder.indexOf(range.start.rowId);
  const startColIndex = columnOrder.indexOf(range.start.colId);
  if (startRowIndex === -1 || startColIndex === -1) {
    return null;
  }

  return {
    rowIds: rowOrder.slice(startRowIndex, startRowIndex + matrix.length),
    colIds: columnOrder.slice(startColIndex, startColIndex + matrix[0].length),
  };
}

function stringifyClipboardValue(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }
  return String(value);
}

function parseClipboardValue(
  rawValue: string,
  columnType: "string" | "number" | "boolean" | "date" | "custom",
): unknown {
  if (columnType === "number") {
    const normalized = rawValue.trim();
    if (normalized === "") {
      return "";
    }
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : rawValue;
  }

  if (columnType === "boolean") {
    const normalized = rawValue.trim().toLowerCase();
    if (["true", "1", "yes", "y"].includes(normalized)) {
      return true;
    }
    if (["false", "0", "no", "n"].includes(normalized)) {
      return false;
    }
  }

  return rawValue;
}

export function isEditableClipboardTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  const tagName = target.tagName.toLowerCase();
  return tagName === "input" || tagName === "textarea" || tagName === "select" || target.isContentEditable;
}

export function getSelectionAnchor(selection: CellSelectionState): CellCoord | null {
  return selection.focus ?? selection.anchor;
}