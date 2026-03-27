import type { Operation } from "./models/operations";
import type { TableState } from "./models/state";
import type { ITableEngine } from "./engine/ITableEngine";
import { applySetCell } from "./engine/apply/applySetCell";
import { applyBulkUpdate } from "./engine/apply/applyBulkUpdate";
import { applyUpdateColumn } from "./engine/apply/applyUpdateColumn";
import { applyAddColumn } from "./engine/apply/applyAddColumn";
import { applyRemoveColumn } from "./engine/apply/applyRemoveColumn";
import { applyReorderColumns } from "./engine/apply/applyReorderColumns";
import { applyAddRow } from "./engine/apply/applyAddRow";
import { applyRemoveRow } from "./engine/apply/applyRemoveRow";
import { applyReorderRows } from "./engine/apply/applyReorderRows";

export class TableEngineImpl implements ITableEngine {
  private readonly state: TableState;
  private readonly applied = new Set<string>();

  constructor(initialState?: Partial<TableState>) {
    this.state = {
      schema: {
        columns: {},
        columnOrder: [],
        version: 0,
        ...initialState?.schema,
      },
      rows: initialState?.rows ?? new Map(),
      rowOrder: initialState?.rowOrder ?? [],
    };
  }

  apply(op: Operation): void {
    if (this.applied.has(op.id)) return;
    this.applied.add(op.id);

    switch (op.type) {
      case "set_cell":
        applySetCell(this.state, op);
        break;
      case "bulk_update":
        applyBulkUpdate(this.state, op);
        break;
      case "update_column":
        applyUpdateColumn(this.state, op);
        break;
      case "add_column":
        applyAddColumn(this.state, op);
        break;
      case "remove_column":
        applyRemoveColumn(this.state, op);
        break;
      case "reorder_columns":
        applyReorderColumns(this.state, op);
        break;
      case "add_row":
        applyAddRow(this.state, op);
        break;
      case "remove_row":
        applyRemoveRow(this.state, op);
        break;
      case "reorder_rows":
        applyReorderRows(this.state, op);
        break;
    }
  }

  applyBatch(ops: Operation[]): void {
    for (const op of ops) {
      this.apply(op);
    }
  }

  getState(): Readonly<TableState> {
    return this.state;
  }
}
