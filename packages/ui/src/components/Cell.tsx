import React from "react";
import { useCell, useDataTable } from "@advanced-datatable/react";
import type { Cell as CellModel } from "@advanced-datatable/core";
import { DataTableContext } from "@advanced-datatable/react";

export interface CellProps {
  rowId: string;
  colId: string;
  renderValue?: (cell: CellModel) => React.ReactNode;
  className?: string;
  editable?: boolean;
  selected?: boolean;
  focused?: boolean;
  pending?: boolean;
  onMouseDown?: React.MouseEventHandler<HTMLTableCellElement>;
  onMouseEnter?: React.MouseEventHandler<HTMLTableCellElement>;
}

export function Cell({
  rowId,
  colId,
  renderValue,
  className,
  editable = true,
  selected = false,
  focused = false,
  pending = false,
  onMouseDown,
  onMouseEnter,
}: CellProps): React.ReactElement {
  const cell = useCell(rowId, colId);
  const column = useDataTable((s) => s.getSchema().columns[colId]);
  const isReadOnly = column?.meta?.readOnly === true || cell.meta?.readOnly === true;
  const canEdit = editable && !isReadOnly;
  const store = React.useContext(DataTableContext);
  const [isEditing, setIsEditing] = React.useState(false);
  const [draft, setDraft] = React.useState(String(cell.value ?? ""));

  React.useEffect(() => {
    if (!isEditing) {
      setDraft(String(cell.value ?? ""));
    }
  }, [cell.value, isEditing]);

  const commit = React.useCallback(() => {
    if (!canEdit) {
      setIsEditing(false);
      return;
    }

    setIsEditing(false);
    if (!store) {
      return;
    }

    store.getState().dispatch({
      id: `set-cell-${rowId}-${colId}-${Date.now()}`,
      type: "set_cell",
      source: "client",
      rowId,
      colId,
      value: parseDraftValue(draft, column?.type, cell.value),
    });
  }, [canEdit, cell.value, colId, column?.type, draft, rowId, store]);

  const cancel = React.useCallback(() => {
    setDraft(String(cell.value ?? ""));
    setIsEditing(false);
  }, [cell.value]);

  const content = renderValue ? renderValue(cell) : String(cell.value ?? "");
  const isBooleanColumn = column?.type === "boolean";
  const inputType = column?.type === "number" ? "number" : column?.type === "date" ? "date" : "text";


  if (isEditing && canEdit) {
    return (
      <td
        className={[
          className,
          'border border-[var(--dt-border)] px-2 py-1 text-sm font-dt',
          selected ? 'bg-[var(--dt-row-hover)]' : '',
          focused ? 'ring-2 ring-[var(--dt-primary)]' : '',
        ].join(' ')}
        aria-selected={selected || undefined}
        data-cell-selected={selected || undefined}
        data-cell-pending={pending || undefined}
        data-cell-focused={focused || undefined}
      >
        {isBooleanColumn ? (
          <select
            autoFocus
            value={draft.toLowerCase() === "true" ? "true" : "false"}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                cancel();
              }
            }}
            className="w-full rounded border border-[var(--dt-border)] bg-[var(--dt-bg)] px-1 py-0.5 text-sm focus:ring-2 focus:ring-[var(--dt-primary)]"
          >
            <option value="true">true</option>
            <option value="false">false</option>
          </select>
        ) : (
          <input
            autoFocus
            type={inputType}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                commit();
              }
              if (e.key === "Escape") {
                cancel();
              }
            }}
            className="w-full rounded border border-[var(--dt-border)] bg-[var(--dt-bg)] px-1 py-0.5 text-sm focus:ring-2 focus:ring-[var(--dt-primary)]"
          />
        )}
      </td>
    );
  }

  return (
    <td
      className={[
        className,
        'border border-[var(--dt-border)] px-2 py-1 text-sm font-dt transition-colors',
        selected ? 'bg-[var(--dt-row-hover)]' : '',
        focused ? 'ring-2 ring-[var(--dt-primary)]' : '',
      ].join(' ')}
      aria-selected={selected || undefined}
      data-cell-selected={selected || undefined}
      data-cell-pending={pending || undefined}
      data-cell-focused={focused || undefined}
      onMouseDown={onMouseDown}
      onMouseEnter={onMouseEnter}
      onDoubleClick={() => {
        if (canEdit) {
          setIsEditing(true);
        }
      }}
    >
      {content}
    </td>
  );
}

// Eliminado: getCellSelectionStyle. Ahora todo es por clases Tailwind y tokens CSS.

function parseDraftValue(
  draft: string,
  columnType: "string" | "number" | "boolean" | "date" | "custom" | undefined,
  currentValue: unknown,
): unknown {
  if (columnType === "number") {
    const trimmed = draft.trim();
    if (trimmed === "") {
      return currentValue;
    }
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : currentValue;
  }

  if (columnType === "boolean") {
    const normalized = draft.trim().toLowerCase();
    if (["true", "1", "yes", "y"].includes(normalized)) {
      return true;
    }
    if (["false", "0", "no", "n"].includes(normalized)) {
      return false;
    }
    return Boolean(currentValue);
  }

  return draft;
}
