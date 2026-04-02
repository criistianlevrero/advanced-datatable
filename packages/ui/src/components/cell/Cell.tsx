import React from "react";
import { useCell, useDataTable } from "@advanced-datatable/react";
import type { Cell as CellModel } from "@advanced-datatable/core";
import { DataTableContext } from "@advanced-datatable/react";
import { parseDraftValue } from "./cell.helpers";
import { CellBoolean } from "./CellBoolean";
import { CellDate } from "./CellDate";
import { CellNumber } from "./CellNumber";
import { CellText } from "./CellText";

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
  const renderEditor = () => {
    if (column?.type === "boolean") {
      return <CellBoolean draft={draft} setDraft={setDraft} commit={commit} cancel={cancel} />;
    }
    if (column?.type === "number") {
      return <CellNumber draft={draft} setDraft={setDraft} commit={commit} cancel={cancel} />;
    }
    if (column?.type === "date") {
      return <CellDate draft={draft} setDraft={setDraft} commit={commit} cancel={cancel} />;
    }
    return <CellText draft={draft} setDraft={setDraft} commit={commit} cancel={cancel} />;
  };

  if (isEditing && canEdit) {
    return (
      <td
        className={[
          className,
          'border border-(--dt-border) px-2 py-1 text-sm font-dt',
          selected ? 'bg-(--dt-row-hover)' : '',
          focused ? 'ring-2 ring-(--dt-primary)' : '',
        ].join(' ')}
        aria-selected={selected || undefined}
        data-cell-selected={selected || undefined}
        data-cell-pending={pending || undefined}
        data-cell-focused={focused || undefined}
      >
        {renderEditor()}
      </td>
    );
  }

  return (
    <td
      className={[
        className,
        'border border-(--dt-border) px-2 py-1 text-sm font-dt transition-colors',
        selected ? 'bg-(--dt-row-hover)' : '',
        focused ? 'ring-2 ring-(--dt-primary)' : '',
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

