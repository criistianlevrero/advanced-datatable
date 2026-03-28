import React from "react";
import type { TargetDescriptor } from "@advanced-datatable/core";
import type { FilterValue } from "@advanced-datatable/store";
import { DataTableContext, useDataTable } from "@advanced-datatable/react";
import { Cell } from "./Cell";
import type { CellProps } from "./Cell";
import {
  buildClipboardText,
  buildPastePlan,
  getSelectionAnchor,
  isEditableClipboardTarget,
} from "./clipboard";

export interface GridProps {
  renderCell?: (rowId: string, colId: string) => React.ReactNode;
  cellProps?: Partial<CellProps>;
  className?: string;
  headerClassName?: string;
  rowClassName?: string;
  /** Enables header drag-resize for columns (default: false). */
  resizableColumns?: boolean;
  /** Show per-row selection checkboxes and a "select all" header checkbox. */
  selectable?: boolean;
  /** Render a filter input row below the column headers. */
  showFilters?: boolean;
}

const SORT_ICONS: Record<string, string> = {
  asc: " ↑",
  desc: " ↓",
};

export function Grid({
  renderCell,
  cellProps,
  className,
  headerClassName,
  rowClassName,
  resizableColumns = false,
  selectable = false,
  showFilters = false,
}: GridProps): React.ReactElement {
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const schema = useDataTable((s) => s.getSchema());
  const rowOrder = useDataTable((s) => s.getRowOrder());
  const sortState = useDataTable((s) => s.getSortState());
  const filterState = useDataTable((s) => s.getFilterState());
  const columnWidths = useDataTable((s) => s.getColumnWidths());
  const selectedRowIds = useDataTable((s) => s.getSelectedRowIds());
  const cellSelection = useDataTable((s) => s.getCellSelection());
  const store = React.useContext(DataTableContext);
  const [isDraggingSelection, setIsDraggingSelection] = React.useState(false);
  const [pendingPasteTarget, setPendingPasteTarget] = React.useState<TargetDescriptor | null>(null);
  const [openFilterColId, setOpenFilterColId] = React.useState<string | null>(null);
  const [hoveredResizableColId, setHoveredResizableColId] = React.useState<string | null>(null);
  const filterMenuRef = React.useRef<HTMLDivElement | null>(null);
  const resizingRef = React.useRef<{ colId: string; startX: number; startWidth: number } | null>(null);

  const allVisibleSelected =
    rowOrder.length > 0 && rowOrder.every((id) => selectedRowIds.has(id));
  const someSelected = rowOrder.some((id) => selectedRowIds.has(id));

  React.useEffect(() => {
    if (!isDraggingSelection) {
      return;
    }

    const handleMouseUp = () => {
      setIsDraggingSelection(false);
    };

    window.addEventListener("mouseup", handleMouseUp);
    return () => window.removeEventListener("mouseup", handleMouseUp);
  }, [isDraggingSelection]);

  React.useEffect(() => {
    if (!openFilterColId) {
      return;
    }

    const handleDocumentMouseDown = (event: MouseEvent) => {
      if (!filterMenuRef.current) {
        return;
      }
      if (!filterMenuRef.current.contains(event.target as Node)) {
        setOpenFilterColId(null);
      }
    };

    document.addEventListener("mousedown", handleDocumentMouseDown);
    return () => document.removeEventListener("mousedown", handleDocumentMouseDown);
  }, [openFilterColId]);

  const handleToggleSort = (colId: string) => {
    store?.getState().toggleSort(colId);
  };

  const handleFilterChange = (colId: string, value: FilterValue | string) => {
    store?.getState().setFilter(colId, value);
  };

  const startColumnResize = (colId: string, event: React.MouseEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();

    const startWidth = columnWidths[colId] ?? schema.columns[colId]?.width ?? 140;
    resizingRef.current = { colId, startX: event.clientX, startWidth };

    const onMouseMove = (moveEvent: MouseEvent) => {
      const resizeState = resizingRef.current;
      if (!resizeState) {
        return;
      }
      const delta = moveEvent.clientX - resizeState.startX;
      const nextWidth = clamp(Math.round(resizeState.startWidth + delta), 80, 900);
      store?.getState().setColumnWidth(resizeState.colId, nextWidth);
    };

    const onMouseUp = () => {
      resizingRef.current = null;
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };

    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  };

  const handleToggleFilterInvert = (colId: string) => {
    const columnType = schema.columns[colId]?.type ?? "string";
    const current = filterState[colId] ?? createEmptyFilter(columnType);
    handleFilterChange(colId, { ...current, invert: !current.invert });
  };

  const handleRemoveFilter = (colId: string) => {
    store?.getState().clearFilter(colId);
    setOpenFilterColId(null);
  };

  const handleToggleAll = () => {
    if (allVisibleSelected) {
      store?.getState().clearSelection();
    } else {
      store?.getState().selectAllRows();
    }
  };

  const handleCellMouseDown = (rowId: string, colId: string, event: React.MouseEvent<HTMLTableCellElement>) => {
    if (event.button !== 0) {
      return;
    }

    event.preventDefault();
    containerRef.current?.focus({ preventScroll: true });
    store?.getState().selectCell(
      { rowId, colId },
      {
        append: event.metaKey || event.ctrlKey,
        extend: event.shiftKey && !(event.metaKey || event.ctrlKey),
      },
    );
    setIsDraggingSelection(true);
  };

  const handleCellMouseEnter = (rowId: string, colId: string) => {
    if (!isDraggingSelection) {
      return;
    }

    store?.getState().updateCellSelectionFocus({ rowId, colId });
  };

  const getCellFrameStyle = (rowId: string, colId: string): React.CSSProperties | undefined => {
    const isSelected = store?.getState().isCellSelected(rowId, colId) ?? false;
    const isFocused = cellSelection.focus?.rowId === rowId && cellSelection.focus.colId === colId;
    const isPending = pendingPasteTarget
      ? isCellInRangeTarget(rowId, colId, pendingPasteTarget)
      : false;

    if (!isSelected && !isFocused && !isPending) {
      return undefined;
    }

    return {
      backgroundColor: isPending ? "#fff7d6" : isSelected ? "#e8f0fe" : undefined,
      boxShadow: isFocused ? "inset 0 0 0 2px #1a73e8" : "inset 0 0 0 1px #8ab4f8",
    };
  };

  const isPastePending = pendingPasteTarget ? (store?.getState().isPending(pendingPasteTarget) ?? false) : false;

  React.useEffect(() => {
    if (!pendingPasteTarget) {
      return;
    }
    if (!isPastePending) {
      setPendingPasteTarget(null);
    }
  }, [isPastePending, pendingPasteTarget]);

  const handleCopy = (event: React.ClipboardEvent<HTMLDivElement>) => {
    if (isEditableClipboardTarget(event.target)) {
      return;
    }

    const clipboardText = buildClipboardText(
      cellSelection,
      rowOrder,
      schema.columnOrder,
      (rowId, colId) => store?.getState().getCell(rowId, colId).value,
    );

    if (!clipboardText) {
      return;
    }

    event.preventDefault();
    event.clipboardData.setData("text/plain", clipboardText);
  };

  const handlePaste = (event: React.ClipboardEvent<HTMLDivElement>) => {
    if (isEditableClipboardTarget(event.target)) {
      return;
    }

    const text = event.clipboardData.getData("text/plain");
    if (!text.trim()) {
      return;
    }

    const plan = buildPastePlan(
      cellSelection,
      textToMatrix(text),
      rowOrder,
      schema,
      (rowId, colId) => store?.getState().getCell(rowId, colId).meta?.readOnly === true,
    );
    if (!plan || plan.updates.length === 0) {
      return;
    }

    event.preventDefault();
    store?.getState().dispatch({
      id: `paste-${Date.now()}`,
      type: "bulk_update",
      source: "client",
      target: {
        type: "range",
        rowIds: plan.rowIds,
        colIds: plan.colIds,
      },
      meta: { origin: "clipboard-paste" },
      updates: plan.updates,
    });

    setPendingPasteTarget({
      type: "range",
      rowIds: plan.rowIds,
      colIds: plan.colIds,
    });

    const focus = getSelectionAnchor(cellSelection);
    if (focus) {
      store?.getState().selectCell(focus);
      store?.getState().updateCellSelectionFocus({
        rowId: plan.rowIds[plan.rowIds.length - 1],
        colId: plan.colIds[plan.colIds.length - 1],
      });
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (isEditableClipboardTarget(event.target)) {
      return;
    }

    if (rowOrder.length === 0 || schema.columnOrder.length === 0) {
      return;
    }

    const current = getSelectionAnchor(cellSelection) ?? {
      rowId: rowOrder[0],
      colId: schema.columnOrder[0],
    };

    if (event.key === "Enter") {
      event.preventDefault();
      const activeCell = containerRef.current?.querySelector<HTMLElement>("td[data-cell-focused='true']");
      activeCell?.dispatchEvent(new MouseEvent("dblclick", { bubbles: true }));
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      store?.getState().clearCellSelection();
      return;
    }

    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "a") {
      event.preventDefault();
      store?.getState().selectCell({ rowId: rowOrder[0], colId: schema.columnOrder[0] });
      store?.getState().updateCellSelectionFocus({
        rowId: rowOrder[rowOrder.length - 1],
        colId: schema.columnOrder[schema.columnOrder.length - 1],
      });
      return;
    }

    if (event.key === "Tab") {
      event.preventDefault();
      const next = moveCellByTab(current, event.shiftKey, rowOrder, schema.columnOrder);
      if (!next) {
        return;
      }
      store?.getState().selectCell(next);
      return;
    }

    const delta = getArrowDelta(event.key);
    if (!delta) {
      return;
    }

    event.preventDefault();
    const next = moveCellCoord(current, delta, rowOrder, schema.columnOrder);
    if (!next) {
      return;
    }

    store?.getState().selectCell(next, { extend: event.shiftKey });
  };

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onCopy={handleCopy}
      onPaste={handlePaste}
      style={{ outline: "none", position: "relative" }}
      aria-label="Data grid clipboard region"
      aria-busy={isPastePending || undefined}
    >
      {isPastePending && (
        <div
          aria-live="polite"
          style={{
            position: "sticky",
            top: 0,
            zIndex: 2,
            width: "fit-content",
            margin: "6px",
            padding: "4px 8px",
            borderRadius: "999px",
            fontSize: "12px",
            fontWeight: 600,
            color: "#7a5a00",
            background: "#fff1b8",
            border: "1px solid #f6d365",
          }}
        >
          Applying paste operation...
        </div>
      )}
      <table className={className}>
      <colgroup>
        {selectable && <col style={{ width: 36 }} />}
        {schema.columnOrder.map((colId) => {
          const width = columnWidths[colId] ?? schema.columns[colId]?.width;
          return <col key={colId} style={typeof width === "number" ? { width } : undefined} />;
        })}
      </colgroup>
      <thead>
        <tr className={headerClassName}>
          {selectable && (
            <th style={{ width: 36, textAlign: "center" }}>
              <input
                type="checkbox"
                checked={allVisibleSelected}
                ref={(el) => {
                  if (el) el.indeterminate = !allVisibleSelected && someSelected;
                }}
                onChange={handleToggleAll}
                aria-label="Select all visible rows"
              />
            </th>
          )}
          {schema.columnOrder.map((colId) => {
            const col = schema.columns[colId];
            const isSorted = sortState?.colId === colId;
            const filter = filterState[colId];
            const isFilterActive = hasActiveFilter(filter);
            const isFilterMenuOpen = showFilters && openFilterColId === colId;
            const isColumnResizable = resizableColumns && col?.meta?.resizable !== false;
            return (
              <th
                key={colId}
                onClick={() => handleToggleSort(colId)}
                onMouseEnter={() => setHoveredResizableColId(colId)}
                onMouseLeave={() => setHoveredResizableColId((prev) => (prev === colId ? null : prev))}
                style={{
                  cursor: "pointer",
                  userSelect: "none",
                  whiteSpace: "nowrap",
                  position: "relative",
                  backgroundColor: isFilterActive ? "#eef9f1" : undefined,
                  boxShadow: isFilterActive ? "inset 0 -2px 0 #2f9e44" : undefined,
                }}
                title={`Sort by ${col?.title ?? colId}`}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6 }}>
                  <span>{col?.title ?? colId}</span>

                  <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    {showFilters && (
                      <button
                        type="button"
                        aria-label={`Filter ${col?.title ?? colId}`}
                        onClick={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          setOpenFilterColId((prev) => (prev === colId ? null : colId));
                        }}
                        style={{
                          border: "none",
                          background: "transparent",
                          color: isFilterActive ? "#2b8a3e" : "#495057",
                          borderRadius: 6,
                          padding: "1px 4px",
                          fontSize: "0.8em",
                          cursor: "pointer",
                        }}
                      >
                        <span aria-hidden="true">🔍</span>
                      </button>
                    )}

                    <button
                      type="button"
                      aria-label={`Sort by ${col?.title ?? colId}`}
                      onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        handleToggleSort(colId);
                      }}
                      style={{
                        border: "none",
                        background: "transparent",
                        color: isSorted ? "#1f2328" : "#868e96",
                        borderRadius: 6,
                        padding: "1px 4px",
                        fontSize: "0.85em",
                        cursor: "pointer",
                      }}
                    >
                      <span aria-hidden="true">{isSorted ? SORT_ICONS[sortState!.direction].trim() : "↕"}</span>
                    </button>
                  </div>
                </div>

                {isColumnResizable && (
                  <div
                    role="presentation"
                    aria-hidden="true"
                    style={{
                      position: "absolute",
                      top: 4,
                      bottom: 4,
                      right: 0,
                      width: 2,
                      borderRadius: 999,
                      background: hoveredResizableColId === colId ? "#228be6" : "transparent",
                      transition: "background-color 120ms ease",
                      pointerEvents: "none",
                      zIndex: 4,
                    }}
                  />
                )}

                {isColumnResizable && (
                  <div
                    role="presentation"
                    aria-hidden="true"
                    data-column-resize-handle="true"
                    onMouseDown={(event) => startColumnResize(colId, event)}
                    onClick={(event) => event.stopPropagation()}
                    style={{
                      position: "absolute",
                      top: 0,
                      right: -2,
                      width: 8,
                      height: "100%",
                      cursor: "col-resize",
                      zIndex: 6,
                    }}
                  />
                )}

                {isFilterMenuOpen && (
                  <div
                    ref={filterMenuRef}
                    onClick={(event) => event.stopPropagation()}
                    style={{
                      position: "absolute",
                      right: 4,
                      top: "calc(100% + 4px)",
                      zIndex: 5,
                      minWidth: 180,
                      padding: 8,
                      border: "1px solid #dee2e6",
                      borderRadius: 8,
                      background: "#fff",
                      boxShadow: "0 8px 20px rgba(0,0,0,0.12)",
                    }}
                  >
                    {renderFilterMenu({
                      colId,
                      columnType: col?.type ?? "string",
                      filter,
                      onChange: handleFilterChange,
                      onToggleInvert: handleToggleFilterInvert,
                      onRemove: handleRemoveFilter,
                    })}
                  </div>
                )}
              </th>
            );
          })}
        </tr>
      </thead>

      <tbody>
        {rowOrder.map((rowId) => {
          const isSelected = selectedRowIds.has(rowId);
          return (
            <tr
              key={rowId}
              className={rowClassName}
              aria-selected={selectable ? isSelected : undefined}
            >
              {selectable && (
                <td style={{ width: 36, textAlign: "center" }}>
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => store?.getState().toggleRowSelection(rowId)}
                    aria-label={`Select row ${rowId}`}
                  />
                </td>
              )}
              {schema.columnOrder.map((colId) =>
                renderCell ? (
                  <td
                    key={colId}
                    style={getCellFrameStyle(rowId, colId)}
                    aria-selected={store?.getState().isCellSelected(rowId, colId) || undefined}
                    data-cell-selected={store?.getState().isCellSelected(rowId, colId) || undefined}
                    data-cell-pending={
                      pendingPasteTarget && isCellInRangeTarget(rowId, colId, pendingPasteTarget) ? true : undefined
                    }
                    data-cell-focused={
                      (cellSelection.focus?.rowId === rowId && cellSelection.focus.colId === colId) || undefined
                    }
                    onMouseDown={(event) => handleCellMouseDown(rowId, colId, event)}
                    onMouseEnter={() => handleCellMouseEnter(rowId, colId)}
                  >
                    {renderCell(rowId, colId)}
                  </td>
                ) : (
                  <Cell
                    key={colId}
                    rowId={rowId}
                    colId={colId}
                    selected={store?.getState().isCellSelected(rowId, colId) ?? false}
                    pending={pendingPasteTarget ? isCellInRangeTarget(rowId, colId, pendingPasteTarget) : false}
                    focused={cellSelection.focus?.rowId === rowId && cellSelection.focus.colId === colId}
                    onMouseDown={(event) => handleCellMouseDown(rowId, colId, event)}
                    onMouseEnter={() => handleCellMouseEnter(rowId, colId)}
                    {...cellProps}
                  />
                ),
              )}
            </tr>
          );
        })}
      </tbody>
      </table>
    </div>
  );
}

function textToMatrix(text: string): string[][] {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n")
    .filter((line, index, lines) => line.length > 0 || index < lines.length - 1)
    .map((line) => line.split("\t"));
}

function renderFilterMenu(params: {
  colId: string;
  columnType: "string" | "number" | "boolean" | "date" | "custom";
  filter: FilterValue | undefined;
  onChange: (colId: string, value: FilterValue | string) => void;
  onToggleInvert: (colId: string) => void;
  onRemove: (colId: string) => void;
}): React.ReactElement {
  const { colId, columnType, filter, onChange, onToggleInvert, onRemove } = params;
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
            style={{ width: "100%", boxSizing: "border-box", fontSize: "0.85em" }}
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
            style={{ width: "100%", boxSizing: "border-box", fontSize: "0.85em" }}
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
          style={{ width: "100%", boxSizing: "border-box", fontSize: "0.85em" }}
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
            style={{ width: "100%", boxSizing: "border-box", fontSize: "0.85em" }}
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
            style={{ width: "100%", boxSizing: "border-box", fontSize: "0.85em" }}
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
            style={{ width: "100%", boxSizing: "border-box", fontSize: "0.85em" }}
          />
        )}

      <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.8em" }}>
        <input
          type="checkbox"
          checked={Boolean(effectiveFilter.invert)}
          onChange={() => onToggleInvert(colId)}
          aria-label="Invert filter"
        />
        Invert filter
      </label>

      <button
        type="button"
        onClick={() => onRemove(colId)}
        style={{
          border: "1px solid #dee2e6",
          background: "#f8f9fa",
          borderRadius: 6,
          padding: "4px 8px",
          cursor: "pointer",
          fontSize: "0.8em",
          textAlign: "left",
        }}
      >
        Remove filter
      </button>
    </div>
  );
}

function createEmptyFilter(columnType: "string" | "number" | "boolean" | "date" | "custom"): FilterValue {
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

function hasActiveFilter(filter: FilterValue | undefined): boolean {
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

function getArrowDelta(key: string): { row: number; col: number } | null {
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

function moveCellCoord(
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

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function isCellInRangeTarget(rowId: string, colId: string, target: TargetDescriptor): boolean {
  if (target.type !== "range") {
    return false;
  }
  return target.rowIds.includes(rowId) && target.colIds.includes(colId);
}

function moveCellByTab(
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
