import React from "react";
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
  /** Keep table header fixed while scrolling vertically. */
  stickyHeader?: boolean;
  /** Override header renderer. */
  HeaderComponent?: React.ComponentType<GridHeaderProps>;
  /** Override row renderer. */
  RowComponent?: React.ComponentType<GridRowProps>;
  /** Override default cell renderer used by rows when renderCell is not provided. */
  CellComponent?: React.ComponentType<CellProps>;
  /** Override filter menu renderer used by header. */
  FilterMenuComponent?: React.ComponentType<GridFilterMenuProps>;
}

export function Grid({
  renderCell,
  cellProps,
  className,
  headerClassName,
  rowClassName,
  resizableColumns = false,
  selectable = false,
  showFilters = false,
  stickyHeader = false,
  HeaderComponent,
  RowComponent,
  CellComponent,
  FilterMenuComponent,
}: GridProps): React.ReactElement {
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

  const visibleRowIdSet = React.useMemo(() => new Set(rowOrder), [rowOrder]);
  const { allVisibleSelected, someSelected } = React.useMemo(() => {
    if (rowOrder.length === 0 || selectedRowIds.size === 0) {
      return { allVisibleSelected: false, someSelected: false };
    }

    let visibleSelectedCount = 0;
    for (const rowId of selectedRowIds) {
      if (visibleRowIdSet.has(rowId)) {
        visibleSelectedCount += 1;
      }
    }

    return {
      allVisibleSelected: visibleSelectedCount === rowOrder.length,
      someSelected: visibleSelectedCount > 0,
    };
  }, [rowOrder.length, selectedRowIds, visibleRowIdSet]);

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
      <Header
        schema={schema}
        sortState={sortState}
        filterState={filterState}
        headerClassName={headerClassName}
        stickyHeader={stickyHeader}
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
        {rowOrder.map((rowId, rowIdx) => (
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
        ))}
      </tbody>
      </table>
    </div>
  );
}

