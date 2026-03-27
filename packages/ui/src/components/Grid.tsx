import React from "react";
import { useDataTable } from "@advanced-datatable/react";
import { Cell } from "./Cell";
import type { CellProps } from "./Cell";

export interface GridProps {
  renderCell?: (rowId: string, colId: string) => React.ReactNode;
  cellProps?: Partial<CellProps>;
  className?: string;
  headerClassName?: string;
  rowClassName?: string;
}

export function Grid({
  renderCell,
  cellProps,
  className,
  headerClassName,
  rowClassName,
}: GridProps): React.ReactElement {
  const schema = useDataTable((s) => s.getSchema());
  const rowOrder = useDataTable((s) => s.getRowOrder());

  return (
    <table className={className}>
      <thead>
        <tr className={headerClassName}>
          {schema.columnOrder.map((colId) => (
            <th key={colId}>{schema.columns[colId]?.title ?? colId}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rowOrder.map((rowId) => (
          <tr key={rowId} className={rowClassName}>
            {schema.columnOrder.map((colId) =>
              renderCell ? (
                <td key={colId}>{renderCell(rowId, colId)}</td>
              ) : (
                <Cell key={colId} rowId={rowId} colId={colId} {...cellProps} />
              ),
            )}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
