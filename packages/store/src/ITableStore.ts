import type { Cell, Operation, TableSchema, TargetDescriptor } from "@advanced-datatable/core";
import type { OperationRecord } from "@advanced-datatable/operations";

export interface ITableStore {
  /** Current schema. */
  getSchema(): TableSchema;
  /** Ordered list of row IDs. */
  getRowOrder(): string[];
  /** Get the cell value at (rowId, colId). Returns null-valued cell if absent. */
  getCell(rowId: string, colId: string): Cell;
  /** True if there are pending operations targeting this cell/row/column. */
  isPending(target: TargetDescriptor): boolean;
  /** Returns all pending operation records. */
  getPendingOperations(): OperationRecord[];
  /** Returns the total pending operation count. */
  getPendingOperationCount(): number;
  /** Returns all pending operation records for a target. */
  getPendingByTarget(target: TargetDescriptor): OperationRecord[];
  /** Dispatch an operation (apply locally + enqueue for transport). */
  dispatch(op: Operation): void;
  /** Flush pending transport queue. */
  flush(): void;
}
