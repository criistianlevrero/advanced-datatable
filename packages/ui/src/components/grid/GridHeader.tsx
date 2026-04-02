import React from "react";
import type { TableSchema } from "@advanced-datatable/core";
import type { FilterState, FilterValue, SortState } from "@advanced-datatable/store";
import { Icon } from "../common";
import { GridFilterMenu } from "./GridFilterMenu";
import type { GridFilterMenuProps } from "./GridFilterMenu";
import { GridResizeHandle } from "./GridResizeHandle";
import { hasActiveFilter } from "./grid.helpers";

export interface GridHeaderProps {
  schema: TableSchema;
  sortState: SortState | null;
  filterState: FilterState;
  headerClassName?: string;
  stickyHeader?: boolean;
  selectable: boolean;
  allVisibleSelected: boolean;
  someSelected: boolean;
  showFilters: boolean;
  resizableColumns: boolean;
  openFilterColId: string | null;
  hoveredResizableColId: string | null;
  filterMenuRef: React.RefObject<HTMLDivElement | null>;
  onToggleAll: () => void;
  onToggleSort: (colId: string) => void;
  onFilterChange: (colId: string, value: FilterValue | string) => void;
  onToggleFilterInvert: (colId: string) => void;
  onRemoveFilter: (colId: string) => void;
  onToggleFilterMenu: (colId: string) => void;
  onHoverColumn: (colId: string | null) => void;
  onStartColumnResize: (colId: string, event: React.MouseEvent<HTMLDivElement>) => void;
  FilterMenuComponent?: React.ComponentType<GridFilterMenuProps>;
}

export function GridHeader({
  schema,
  sortState,
  filterState,
  headerClassName,
  stickyHeader = false,
  selectable,
  allVisibleSelected,
  someSelected,
  showFilters,
  resizableColumns,
  openFilterColId,
  hoveredResizableColId,
  filterMenuRef,
  onToggleAll,
  onToggleSort,
  onFilterChange,
  onToggleFilterInvert,
  onRemoveFilter,
  onToggleFilterMenu,
  onHoverColumn,
  onStartColumnResize,
  FilterMenuComponent = GridFilterMenu,
}: GridHeaderProps): React.ReactElement {
  const stickyHeaderClass = stickyHeader ? "sticky top-0 z-30" : "";

  return (
    <thead>
      <tr
        className={[
          headerClassName,
          "border-none",
        ].filter(Boolean).join(" ")}
      >
        {selectable && (
          <th
            className={[
              "w-9 text-center bg-(--dt-header-bg) text-(--dt-header-color) font-dt",
              stickyHeaderClass,
            ].join(" ")}
          >
            <input
              type="checkbox"
              checked={allVisibleSelected}
              ref={(el) => {
                if (el) {
                  el.indeterminate = !allVisibleSelected && someSelected;
                }
              }}
              onChange={onToggleAll}
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
          const isFirstTh = selectable ? colIdx === 0 : colIdx === 0;
          const isLastTh = colIdx === schema.columnOrder.length - 1;
          const thClass = [
            "relative select-none whitespace-nowrap transition-colors",
            isFilterActive ? "bg-(--dt-header-bg) shadow-[inset_0_-2px_0_var(--dt-primary)]" : "bg-(--dt-header-bg)",
            "text-(--dt-header-color) font-dt",
            "px-1",
            "py-1",
            "border-none",
            stickyHeaderClass,
          ];

          if (isFirstTh) {
            thClass.push("rounded-tl-lg");
          }
          if (isLastTh) {
            thClass.push("rounded-tr-lg");
          }

          return (
            <th
              key={colId}
              onMouseEnter={() => onHoverColumn(colId)}
              onMouseLeave={() => onHoverColumn(null)}
              className={thClass.join(" ")}
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
                        onToggleFilterMenu(colId);
                      }}
                      className={[
                        "appearance-none border-0 bg-transparent p-0 m-0 shadow-none outline-none",
                        isFilterActive ? "text-(--dt-primary)" : "text-(--dt-header-color)",
                        "hover:text-(--dt-primary) focus:outline-none",
                      ].join(" ")}
                      style={{ lineHeight: 1, width: 20, height: 20, display: "inline-flex", alignItems: "center", justifyContent: "center", background: "none", border: "none", boxShadow: "none" }}
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
                      onToggleSort(colId);
                    }}
                    className={[
                      "appearance-none border-0 bg-transparent p-0 m-0 shadow-none outline-none",
                      isSorted ? "text-(--dt-primary) font-bold" : "text-(--dt-header-color)",
                      "hover:text-(--dt-primary) focus:outline-none",
                    ].join(" ")}
                    style={{ lineHeight: 1, width: 20, height: 20, display: "inline-flex", alignItems: "center", justifyContent: "center", background: "none", border: "none", boxShadow: "none", marginLeft: "auto" }}
                  >
                    <span aria-hidden="true">
                      {isSorted
                        ? sortState!.direction === "asc"
                          ? <Icon name="arrow-up" size={16} />
                          : <Icon name="arrow-down" size={16} />
                        : <Icon name="arrow-up-down" size={16} />}
                    </span>
                  </button>
                </div>
              </div>

              {isColumnResizable && (
                <GridResizeHandle
                  isHovered={hoveredResizableColId === colId}
                  onMouseDown={(event) => onStartColumnResize(colId, event)}
                />
              )}

              {isFilterMenuOpen && (
                <div
                  ref={filterMenuRef}
                  onClick={(event) => event.stopPropagation()}
                  className="absolute right-1 top-full z-10 min-w-45 p-2 border border-(--dt-border) rounded-lg bg-(--dt-bg) shadow-lg"
                >
                  <FilterMenuComponent
                    colId={colId}
                    columnType={col?.type ?? "string"}
                    filter={filter}
                    onChange={onFilterChange}
                    onToggleInvert={onToggleFilterInvert}
                    onRemove={onRemoveFilter}
                  />
                </div>
              )}
            </th>
          );
        })}
      </tr>
    </thead>
  );
}