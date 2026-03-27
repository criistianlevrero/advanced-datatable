import { create } from "zustand";
import type { Cell, ITableEngine, Operation, TableSchema, TargetDescriptor } from "@advanced-datatable/core";
import { getCell as engineGetCell } from "@advanced-datatable/core";
import type { IOperationManager, OperationRecord } from "@advanced-datatable/operations";

export interface StoreState {
  /** Snapshots updated on every dispatch — new references trigger Zustand re-renders. */
  _schemaSnapshot: TableSchema;
  _rowOrderSnapshot: string[];
  _tick: number; // used by getCell / isPending which read from engine directly
  dispatch(op: Operation): void;
  flush(): void;
  getSchema(): TableSchema;
  getRowOrder(): string[];
  getCell(rowId: string, colId: string): Cell;
  isPending(target: TargetDescriptor): boolean;
  getPendingOperations(): OperationRecord[];
  getPendingOperationCount(): number;
  getPendingByTarget(target: TargetDescriptor): OperationRecord[];
}

export function createTableStore(engine: ITableEngine, manager: IOperationManager) {
  return create<StoreState>()((set, get) => {
    manager.subscribe(() => {
      const s = engine.getState();
      set((prev) => ({
        _tick: prev._tick + 1,
        _schemaSnapshot: snapshotSchema(s.schema),
        _rowOrderSnapshot: [...s.rowOrder],
      }));
    });

    return {
      _schemaSnapshot: snapshotSchema(engine.getState().schema),
      _rowOrderSnapshot: [...engine.getState().rowOrder],
      _tick: 0,

      dispatch(op: Operation) {
        manager.apply(op);
      },

      flush() {
        manager.flush();
      },

      getSchema(): TableSchema {
        return get()._schemaSnapshot;
      },

      getRowOrder(): string[] {
        return get()._rowOrderSnapshot;
      },

      getCell(rowId: string, colId: string): Cell {
        void get()._tick;
        return engineGetCell(engine.getState(), rowId, colId);
      },

      isPending(target: TargetDescriptor): boolean {
        void get()._tick;
        return manager.getPendingByTarget(target).length > 0;
      },

      getPendingOperations(): OperationRecord[] {
        void get()._tick;
        return manager.getPendingOperations();
      },

      getPendingOperationCount(): number {
        void get()._tick;
        return manager.getPendingOperations().length;
      },

      getPendingByTarget(target: TargetDescriptor): OperationRecord[] {
        void get()._tick;
        return manager.getPendingByTarget(target);
      },
    };
  });
}

export type TableStore = ReturnType<typeof createTableStore>;

function snapshotSchema(schema: TableSchema): TableSchema {
  return {
    ...schema,
    columns: { ...schema.columns },
    columnOrder: [...schema.columnOrder],
  };
}
