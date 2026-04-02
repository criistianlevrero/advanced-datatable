import React from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import type { TargetDescriptor } from "@advanced-datatable/core";
import type { FilterValue } from "@advanced-datatable/store";
import { DataTableContext, useDataTable } from "@advanced-datatable/react";
import type { CellProps } from "../cell";
import { GridHeader } from "./GridHeader";
import type { GridHeaderProps } from "./GridHeader";
import type { GridFilterMenuProps } from "./GridFilterMenu";
import { GridRow } from "./GridRow";
import type { GridRowProps } from "./GridRow";
import {
  buildClipboardText,
  buildPastePlan,
  getSelectionAnchor,
  isEditableClipboardTarget,
} from "./clipboard";
import {
  clamp,
  createEmptyFilter,
  getArrowDelta,
  moveCellByTab,
  moveCellCoord,
  textToMatrix,
} from "./grid.helpers";

export interface GridVirtualizedProps {
  renderCell?: (rowId: string, colId: string) => React.ReactNode;
  cellProps?: Partial<CellProps>;
  className?: string;
  headerClassName?: string;
  rowClassName?: string;
  /** Height of the virtual scrolling container (e.g., "600px", "80vh") */
  height: string;
  /** Estimated height of each row in pixels (default: 40) */
  estimateSize?: number;
  /** Number of items to render outside of visible area (default: 10) */
  overscan?: number;
  /** Enables header drag-resize for columns (default: false). */
  resizableColumns?: boolean;
  /** Show per-row selection checkboxes and a "select all" header checkbox. */
  selectable?: boolean;
  /** Render a filter input row below the column headers. */
  showFilters?: boolean;
  /** Override header renderer. */
  HeaderComponent?: React.ComponentType<GridHeaderProps>;
  /** Override row renderer. */
  RowComponent?: React.ComponentType<GridRowProps>;
  /** Override default cell renderer used by rows when renderCell is not provided. */
  CellComponent?: React.ComponentType<CellProps>;
  /** Override filter menu renderer used by header. */
  FilterMenuComponent?: React.ComponentType<GridFilterMenuProps>;
}

export function GridVirtualized({
  renderCell,
  cellProps,
  className,
  headerClassName,
  rowClassName,
  height,
  estimateSize = 40,
  overscan = 10,
  resizableColumns = false,
  selectable = false,
  showFilters = false,
  HeaderComponent,
  RowComponent,
  CellComponent,
  FilterMenuComponent,
}: GridVirtualizedProps): React.ReactElement {
  const Header = HeaderComponent ?? GridHeader;
  const Row = RowComponent ?? GridRow;
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

  // Setup virtualizer for rows
  const rowVirtualizer = useVirtualizer({
    count: rowOrder.length,
    getScrollElement: () => containerRef.current,
    estimateSize: () => estimateSize,
    overscan,
  });

  const virtualRows = rowVirtualizer.getVirtualItems();
  const totalSize = rowVirtualizer.getTotalSize();

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
      (rowId: string, colId: string) => store?.getState().getCell(rowId, colId).value,
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
      (rowId: string, colId: string) => store?.getState().getCell(rowId, colId).meta?.readOnly === true,
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

  const handleToggleFilterMenu = React.useCallback((colId: string) => {
    setOpenFilterColId((prev) => (prev === colId ? null : colId));
  }, []);

  const handleHoverColumn = React.useCallback((colId: string | null) => {
    setHoveredResizableColId(colId);
  }, []);

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onCopy={handleCopy}
      onPaste={handlePaste}
      className="outline-none relative"
      style={{ height, overflow: "auto" }}
      aria-label="Data grid clipboard region (virtualized)"
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

        <Header
          schema={schema}
          sortState={sortState}
          filterState={filterState}
          headerClassName={headerClassName}
          selectable={selectable}
          allVisibleSelected={allVisibleSelected}
          someSelected={someSelected}
          showFilters={showFilters}
          resizableColumns={resizableColumns}
          openFilterColId={openFilterColId}
          hoveredResizableColId={hoveredResizableColId}
          filterMenuRef={filterMenuRef}
          onToggleAll={handleToggleAll}
          onToggleSort={handleToggleSort}
          onFilterChange={handleFilterChange}
          onToggleFilterInvert={handleToggleFilterInvert}
          onRemoveFilter={handleRemoveFilter}
          onToggleFilterMenu={handleToggleFilterMenu}
          onHoverColumn={handleHoverColumn}
          onStartColumnResize={startColumnResize}
          FilterMenuComponent={FilterMenuComponent}
        />

        <tbody>
          {virtualRows.length > 0 ? (
            <>
              {virtualRows[0] && (
                <tr style={{ height: `${virtualRows[0].start}px` }} />
              )}
              {virtualRows.map((virtualRow) => {
                const rowId = rowOrder[virtualRow.index];
                const rowIdx = virtualRow.index;
                return (
                  <Row
                    key={rowId}
                    rowId={rowId}
                    isLastRow={rowIdx === rowOrder.length - 1}
                    isSelected={selectedRowIds.has(rowId)}
                    columnOrder={schema.columnOrder}
                    selectable={selectable}
                    rowClassName={rowClassName}
                    cellProps={cellProps}
                    cellSelection={cellSelection}
                    pendingPasteTarget={pendingPasteTarget}
                    isCellSelected={(r, c) => store?.getState().isCellSelected(r, c) ?? false}
                    onToggleRowSelection={() => store?.getState().toggleRowSelection(rowId)}
                    renderCell={renderCell}
                    CellComponent={CellComponent}
                    onCellMouseDown={(colId, event) => handleCellMouseDown(rowId, colId, event)}
                    onCellMouseEnter={(colId) => handleCellMouseEnter(rowId, colId)}
                  />
                );
              })}
              {virtualRows.length > 0 && (
                <tr
                  style={{
                    height: `${Math.max(0, totalSize - (virtualRows[virtualRows.length - 1]?.end ?? 0))}px`,
                  }}
                />
              )}
            </>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}
