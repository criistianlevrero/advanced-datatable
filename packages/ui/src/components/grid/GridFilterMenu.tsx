import React from "react";
import type { FilterValue } from "@advanced-datatable/store";
import { createEmptyFilter } from "./grid.helpers";

export interface GridFilterMenuProps {
  colId: string;
  columnType: "string" | "number" | "boolean" | "date" | "custom";
  filter: FilterValue | undefined;
  onChange: (colId: string, value: FilterValue | string) => void;
  onToggleInvert: (colId: string) => void;
  onRemove: (colId: string) => void;
}

export function GridFilterMenu({
  colId,
  columnType,
  filter,
  onChange,
  onToggleInvert,
  onRemove,
}: GridFilterMenuProps): React.ReactElement {
  const effectiveFilter = filter ?? createEmptyFilter(columnType);

  return (
    <div style={{ display: "grid", gap: 8 }}>
      {columnType === "number" && effectiveFilter.type === "number" && (
        <>
          <input
            type="number"
            value={effectiveFilter.min ?? ""}
            onChange={(e) =>
              onChange(colId, {
                type: "number",
                min: e.target.value === "" ? undefined : Number(e.target.value),
                max: effectiveFilter.max,
                invert: effectiveFilter.invert,
              })
            }
            placeholder="Min"
            aria-label="Filter min"
            className="w-full box-border text-xs rounded border border-(--dt-border) bg-(--dt-bg) px-1 py-0.5 mb-1"
          />
          <input
            type="number"
            value={effectiveFilter.max ?? ""}
            onChange={(e) =>
              onChange(colId, {
                type: "number",
                min: effectiveFilter.min,
                max: e.target.value === "" ? undefined : Number(e.target.value),
                invert: effectiveFilter.invert,
              })
            }
            placeholder="Max"
            aria-label="Filter max"
            className="w-full box-border text-xs rounded border border-(--dt-border) bg-(--dt-bg) px-1 py-0.5"
          />
        </>
      )}

      {columnType === "boolean" && effectiveFilter.type === "boolean" && (
        <select
          value={effectiveFilter.value}
          onChange={(e) =>
            onChange(colId, {
              type: "boolean",
              value: e.target.value as "all" | "true" | "false",
              invert: effectiveFilter.invert,
            })
          }
          aria-label="Filter boolean"
          className="w-full box-border text-xs rounded border border-(--dt-border) bg-(--dt-bg) px-1 py-0.5"
        >
          <option value="all">All</option>
          <option value="true">True</option>
          <option value="false">False</option>
        </select>
      )}

      {columnType === "date" && effectiveFilter.type === "date" && (
        <>
          <input
            type="date"
            value={effectiveFilter.from ?? ""}
            onChange={(e) =>
              onChange(colId, {
                type: "date",
                from: e.target.value || undefined,
                to: effectiveFilter.to,
                invert: effectiveFilter.invert,
              })
            }
            aria-label="Filter from"
            className="w-full box-border text-xs rounded border border-(--dt-border) bg-(--dt-bg) px-1 py-0.5 mb-1"
          />
          <input
            type="date"
            value={effectiveFilter.to ?? ""}
            onChange={(e) =>
              onChange(colId, {
                type: "date",
                from: effectiveFilter.from,
                to: e.target.value || undefined,
                invert: effectiveFilter.invert,
              })
            }
            aria-label="Filter to"
            className="w-full box-border text-xs rounded border border-(--dt-border) bg-(--dt-bg) px-1 py-0.5"
          />
        </>
      )}

      {(columnType === "string" || columnType === "custom") &&
        (effectiveFilter.type === "string" || effectiveFilter.type === "custom") && (
          <input
            type="text"
            value={effectiveFilter.value}
            onChange={(e) =>
              onChange(colId, {
                type: columnType === "custom" ? "custom" : "string",
                value: e.target.value,
                invert: effectiveFilter.invert,
              })
            }
            placeholder="Contains..."
            aria-label="Filter text"
            className="w-full box-border text-xs rounded border border-(--dt-border) bg-(--dt-bg) px-1 py-0.5"
          />
        )}

      <label className="flex items-center gap-1 text-xs mt-1">
        <input
          type="checkbox"
          checked={Boolean(effectiveFilter.invert)}
          onChange={() => onToggleInvert(colId)}
          aria-label="Invert filter"
          className="accent-(--dt-primary)"
        />
        Invert filter
      </label>

      <button
        type="button"
        onClick={() => onRemove(colId)}
        className="mt-2 border border-(--dt-border) bg-(--dt-bg-alt) rounded px-2 py-1 text-xs cursor-pointer text-left hover:bg-(--dt-row-hover)"
      >
        Remove filter
      </button>
    </div>
  );
}