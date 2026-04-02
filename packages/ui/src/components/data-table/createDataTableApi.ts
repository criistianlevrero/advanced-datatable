import { TableEngineImpl } from "@advanced-datatable/core";
import type { TableState } from "@advanced-datatable/core";
import type { IOperationTransport } from "@advanced-datatable/api-client";
import type { IOperationPersistence } from "@advanced-datatable/operations";
import { OperationManagerImpl } from "@advanced-datatable/operations";
import { createTableStore } from "@advanced-datatable/store";

export interface DataTableApi {
  manager: OperationManagerImpl;
  store: ReturnType<typeof createTableStore>;
}

export function createDataTableApi(params: {
  transport: IOperationTransport;
  initialState?: Partial<TableState>;
  persistence?: IOperationPersistence;
}): DataTableApi {
  const { transport, initialState, persistence } = params;
  const engine = new TableEngineImpl(initialState);
  const manager = new OperationManagerImpl(engine, transport, undefined, persistence);
  const store = createTableStore(engine, manager);
  return { manager, store };
}
