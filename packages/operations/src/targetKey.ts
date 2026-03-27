import type { TargetDescriptor } from "@advanced-datatable/core";

function sortUnique(values: string[]): string[] {
  return Array.from(new Set(values)).sort((a, b) => a.localeCompare(b));
}

export function serializeTarget(target: TargetDescriptor): string {
  if (target.type === "cell") {
    return `cell:${target.rowId}:${target.colId}`;
  }

  if (target.type === "row") {
    return `row:${target.rowId}`;
  }

  if (target.type === "column") {
    return `column:${target.colId}`;
  }

  const rowIds = sortUnique(target.rowIds).join(",");
  const colIds = sortUnique(target.colIds).join(",");
  return `range:${rowIds}:${colIds}`;
}
