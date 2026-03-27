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
}

export function Cell({
  rowId,
  colId,
  renderValue,
  className,
  editable = true,
}: CellProps): React.ReactElement {
  const cell = useCell(rowId, colId);
  const column = useDataTable((s) => s.getSchema().columns[colId]);
  const store = React.useContext(DataTableContext);
  const [isEditing, setIsEditing] = React.useState(false);
  const [draft, setDraft] = React.useState(String(cell.value ?? ""));

  React.useEffect(() => {
    if (!isEditing) {
      setDraft(String(cell.value ?? ""));
    }
  }, [cell.value, isEditing]);

  const commit = React.useCallback(() => {
    if (!editable) {
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
  }, [cell.value, colId, column?.type, draft, editable, rowId, store]);

  const cancel = React.useCallback(() => {
    setDraft(String(cell.value ?? ""));
    setIsEditing(false);
  }, [cell.value]);

  const content = renderValue ? renderValue(cell) : String(cell.value ?? "");
  const isBooleanColumn = column?.type === "boolean";
  const inputType = column?.type === "number" ? "number" : column?.type === "date" ? "date" : "text";

  if (isEditing && editable) {
    return (
      <td className={className}>
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
          />
        )}
      </td>
    );
  }

  return (
    <td
      className={className}
      onDoubleClick={() => {
        if (editable) {
          setIsEditing(true);
        }
      }}
    >
      {content}
    </td>
  );
}

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
