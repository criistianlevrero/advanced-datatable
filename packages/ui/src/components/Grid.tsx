import React from "react";
import { Icon } from "./Icon";
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
      className="outline-none relative"
      aria-label="Data grid clipboard region"
      aria-busy={isPastePending || undefined}
    >
      {isPastePending && (
        <div
          aria-live="polite"
          className="sticky top-0 z-20 w-fit m-1.5 px-2 py-1 rounded-full text-xs font-semibold text-[#7a5a00] bg-[#fff1b8] border border-[#f6d365]"
        >
          Applying paste operation...
        </div>
      )}
      <table
        className={[
          className,
          'border-collapse border-none rounded-lg',
        ].filter(Boolean).join(' ')}
      >
      <colgroup>
        {selectable && <col style={{ width: 36 }} />}
        {schema.columnOrder.map((colId) => {
          const width = columnWidths[colId] ?? schema.columns[colId]?.width;
          return <col key={colId} style={typeof width === "number" ? { width } : undefined} />;
        })}
      </colgroup>
      <thead>
        <tr
          className={[
            headerClassName,
            'border-none',
          ].filter(Boolean).join(' ')}
        >
          {selectable && (
            <th className="w-9 text-center bg-(--dt-header-bg) text-(--dt-header-color) font-dt">
              <input
                type="checkbox"
                checked={allVisibleSelected}
                ref={(el) => {
                  if (el) el.indeterminate = !allVisibleSelected && someSelected;
                }}
                onChange={handleToggleAll}
                aria-label="Select all visible rows"
                className="accent-(--dt-primary)"
              />
            </th>
          )}
              {schema.columnOrder.map((colId, colIdx) => {
                const col = schema.columns[colId];
                const isSorted = sortState?.colId === colId;
                const filter = filterState[colId];
                const isFilterActive = hasActiveFilter(filter);
                const isFilterMenuOpen = showFilters && openFilterColId === colId;
                const isColumnResizable = resizableColumns && col?.meta?.resizable !== false;
                // Bordes redondeados en el primer y último th
                const isFirstTh = selectable ? colIdx === 0 : colIdx === 0;
                const isLastTh = colIdx === schema.columnOrder.length - 1;
                let thClass = [
                  'relative select-none whitespace-nowrap transition-colors',
                  isFilterActive ? 'bg-(--dt-header-bg) shadow-[inset_0_-2px_0_var(--dt-primary)]' : 'bg-(--dt-header-bg)',
                  'text-(--dt-header-color) font-dt',
                  'px-1',
                  'py-1',
                  'border-none',
                ];
                if (isFirstTh) thClass.push('rounded-tl-lg');
                if (isLastTh) thClass.push('rounded-tr-lg');
                return (
                  <th
                    key={colId}
                    onMouseEnter={() => setHoveredResizableColId(colId)}
                    onMouseLeave={() => setHoveredResizableColId((prev) => (prev === colId ? null : prev))}
                    className={thClass.join(' ')}
                    title={`Sort by ${col?.title ?? colId}`}
                  >
                <div className="flex flex-row items-center gap-1.5 justify-between w-full">
                  <span className="truncate">{col?.title ?? colId}</span>
                  <div className="flex items-center gap-1 ml-auto">
                    {showFilters && (
                      <button
                        type="button"
                        aria-label={`Filter ${col?.title ?? colId}`}
                        onClick={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          setOpenFilterColId((prev) => (prev === colId ? null : colId));
                        }}
                        className={[
                          'appearance-none border-0 bg-transparent p-0 m-0 shadow-none outline-none',
                          isFilterActive ? 'text-(--dt-primary)' : 'text-(--dt-header-color)',
                          'hover:text-(--dt-primary) focus:outline-none',
                        ].join(' ')}
                        style={{ lineHeight: 1, width: 20, height: 20, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', boxShadow: 'none' }}
                      >
                        <Icon name="search" size={16} />
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
                      className={[
                        'appearance-none border-0 bg-transparent p-0 m-0 shadow-none outline-none',
                        isSorted ? 'text-(--dt-primary) font-bold' : 'text-(--dt-header-color)',
                        'hover:text-(--dt-primary) focus:outline-none',
                      ].join(' ')}
                      style={{ lineHeight: 1, width: 20, height: 20, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', boxShadow: 'none', marginLeft: 'auto' }}
                    >
                      <span aria-hidden="true">
                        {isSorted
                          ? sortState!.direction === 'asc'
                            ? <Icon name="arrow-up" size={16} />
                            : <Icon name="arrow-down" size={16} />
                          : <Icon name="arrow-up-down" size={16} />}
                      </span>
                    </button>
                  </div>
                </div>

                {isColumnResizable && (
                  <div
                    role="presentation"
                    aria-hidden="true"
                    className={[
                      'absolute',
                      'top-1',
                      'bottom-1',
                      'right-0',
                      'w-0.5',
                      'rounded-full',
                      hoveredResizableColId === colId ? 'bg-[#228be6]' : 'bg-transparent',
                      'transition-colors',
                      'pointer-events-none',
                      'z-40',
                    ].join(' ')}
                  />
                )}

                {isColumnResizable && (
                  <div
                    role="presentation"
                    aria-hidden="true"
                    data-column-resize-handle="true"
                    onMouseDown={(event) => startColumnResize(colId, event)}
                    onClick={(event) => event.stopPropagation()}
                    className="absolute top-0 right-[-2px] w-2 h-full cursor-col-resize z-60"
                  />
                )}

                {isFilterMenuOpen && (
                  <div
                    ref={filterMenuRef}
                    onClick={(event) => event.stopPropagation()}
                    className="absolute right-1 top-full z-10 min-w-45 p-2 border border-(--dt-border) rounded-lg bg-(--dt-bg) shadow-lg"
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
        {rowOrder.map((rowId, rowIdx) => {
          const isSelected = selectedRowIds.has(rowId);
          const isLastRow = rowIdx === rowOrder.length - 1;
          return (
            <tr
              key={rowId}
              className={[
                rowClassName,
                'transition-colors',
                isSelected ? 'bg-(--dt-row-hover)' : 'bg-(--dt-bg)',
                'hover:bg-(--dt-row-hover)',
              ].filter(Boolean).join(' ')}
              aria-selected={selectable ? isSelected : undefined}
            >
              {selectable && (
                <td className={['w-9 text-center border-none', isLastRow ? 'rounded-bl-lg' : ''].join(' ')}>
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => store?.getState().toggleRowSelection(rowId)}
                    aria-label={`Select row ${rowId}`}
                    className="accent-(--dt-primary)"
                  />
                </td>
              )}
              {schema.columnOrder.map((colId, colIdx) => {
                // Bordes redondeados en la última fila, primer y último td
                const isFirstTd = selectable ? colIdx === 0 : colIdx === 0;
                const isLastTd = colIdx === schema.columnOrder.length - 1;
                let tdClass = [
                  'px-2 py-1 text-sm font-dt',
                  'border-none',
                  store?.getState().isCellSelected(rowId, colId) ? 'bg-(--dt-row-hover)' : '',
                  cellSelection.focus?.rowId === rowId && cellSelection.focus.colId === colId ? 'ring-2 ring-(--dt-primary) z-[1] relative' : '',
                ];
                if (isLastRow && isFirstTd) tdClass.push('rounded-bl-lg');
                if (isLastRow && isLastTd) tdClass.push('rounded-br-lg');
                if (renderCell) {
                  return (
                    <td
                      key={colId}
                      className={tdClass.join(' ')}
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
                  );
                } else {
                  return (
                    <Cell
                      key={colId}
                      rowId={rowId}
                      colId={colId}
                      selected={store?.getState().isCellSelected(rowId, colId) ?? false}
                      pending={pendingPasteTarget ? isCellInRangeTarget(rowId, colId, pendingPasteTarget) : false}
                      focused={cellSelection.focus?.rowId === rowId && cellSelection.focus.colId === colId}
                      onMouseDown={(event) => handleCellMouseDown(rowId, colId, event)}
                      onMouseEnter={() => handleCellMouseEnter(rowId, colId)}
                      className={tdClass.join(' ')}
                      {...cellProps}
                    />
                  );
                }
              })}
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
