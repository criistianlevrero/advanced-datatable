import React from "react";
import type { TargetDescriptor } from "@advanced-datatable/core";
import type { CellSelectionState } from "@advanced-datatable/store";
import { Cell } from "../cell";
import type { CellProps } from "../cell";
import { isCellInRangeTarget } from "./grid.helpers";

export interface GridRowProps {
  rowId: string;
  rowRef?: React.Ref<HTMLTableRowElement>;
  isLastRow: boolean;
  isSelected: boolean;
  columnOrder: string[];
  selectable: boolean;
  rowClassName?: string;
  cellProps?: Partial<CellProps>;
  cellSelection: CellSelectionState;
  pendingPasteTarget: TargetDescriptor | null;
  isCellSelected: (rowId: string, colId: string) => boolean;
  onToggleRowSelection: () => void;
  renderCell?: (rowId: string, colId: string) => React.ReactNode;
  CellComponent?: React.ComponentType<CellProps>;
  onCellMouseDown: (colId: string, event: React.MouseEvent<HTMLTableCellElement>) => void;
  onCellMouseEnter: (colId: string) => void;
}

export function GridRow({
  rowId,
  rowRef,
  isLastRow,
  isSelected,
  columnOrder,
  selectable,
  rowClassName,
  cellProps,
  cellSelection,
  pendingPasteTarget,
  isCellSelected,
  onToggleRowSelection,
  renderCell,
  CellComponent = Cell,
  onCellMouseDown,
  onCellMouseEnter,
}: GridRowProps): React.ReactElement {
  return (
    <tr
      ref={rowRef}
      className={[
        rowClassName,
        "transition-colors",
        isSelected ? "bg-(--dt-row-hover)" : "bg-(--dt-bg)",
        "hover:bg-(--dt-row-hover-soft)",
      ].filter(Boolean).join(" ")}
      aria-selected={selectable ? isSelected : undefined}
    >
      {selectable && (
        <td className={["w-9 text-center border-none", isLastRow ? "rounded-bl-lg" : ""].join(" ")}>
          <input
            type="checkbox"
            checked={isSelected}
            onChange={onToggleRowSelection}
            aria-label={`Select row ${rowId}`}
            className="accent-(--dt-primary)"
          />
        </td>
      )}

      {columnOrder.map((colId, colIdx) => {
        const isFirstTd = colIdx === 0;
        const isLastTd = colIdx === columnOrder.length - 1;
        const selected = isCellSelected(rowId, colId);
        const focused = cellSelection.focus?.rowId === rowId && cellSelection.focus.colId === colId;
        const pending = pendingPasteTarget ? isCellInRangeTarget(rowId, colId, pendingPasteTarget) : false;

        const tdClass = [
          "px-2 py-1 text-sm font-dt",
          "border-none",
          selected ? "bg-(--dt-row-hover)" : "",
          focused ? "ring-2 ring-(--dt-primary) z-[1] relative" : "",
        ];

        if (isLastRow && isFirstTd) {
          tdClass.push("rounded-bl-lg");
        }
        if (isLastRow && isLastTd) {
          tdClass.push("rounded-br-lg");
        }

        if (renderCell) {
          return (
            <td
              key={colId}
              className={tdClass.join(" ")}
              aria-selected={selected || undefined}
              data-cell-selected={selected || undefined}
              data-cell-pending={pending || undefined}
              data-cell-focused={focused || undefined}
              onMouseDown={(event) => onCellMouseDown(colId, event)}
              onMouseEnter={() => onCellMouseEnter(colId)}
            >
              {renderCell(rowId, colId)}
            </td>
          );
        }

        return (
          <CellComponent
            key={colId}
            rowId={rowId}
            colId={colId}
            selected={selected}
            pending={pending}
            focused={focused}
            onMouseDown={(event) => onCellMouseDown(colId, event)}
            onMouseEnter={() => onCellMouseEnter(colId)}
            className={tdClass.join(" ")}
            {...cellProps}
          />
        );
      })}
    </tr>
  );
}
