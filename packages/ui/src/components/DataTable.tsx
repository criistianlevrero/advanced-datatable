import React, { useEffect, useMemo } from "react";
import type { ReactNode } from "react";
import { DataTableContext } from "@advanced-datatable/react";
import { TableEngineImpl } from "@advanced-datatable/core";
import type { IConnectivityMonitor, IOperationPersistence } from "@advanced-datatable/operations";
import { OperationManagerImpl } from "@advanced-datatable/operations";
import { createTableStore } from "@advanced-datatable/store";
import type { IOperationTransport } from "@advanced-datatable/api-client";
import type { TableState } from "@advanced-datatable/core";
import { Grid } from "./Grid";
import type { GridProps } from "./Grid";

export interface DataTableProps extends GridProps {
  transport: IOperationTransport;
  initialState?: Partial<TableState>;
  persistence?: IOperationPersistence;
  connectivityMonitor?: IConnectivityMonitor;
  onReady?: (api: { manager: OperationManagerImpl; store: ReturnType<typeof createTableStore> }) => void;
  children?: ReactNode;
}

export function DataTable({
  transport,
  initialState,
  persistence,
  connectivityMonitor,
  onReady,
  children,
  ...gridProps
}: DataTableProps): React.ReactElement {
  const api = useMemo(() => {
    const engine = new TableEngineImpl(initialState);
    const manager = new OperationManagerImpl(engine, transport, undefined, persistence);
    const store = createTableStore(engine, manager);
    return { manager, store };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    void api.manager.loadPersistedOperations();
    if (connectivityMonitor) {
      api.manager.enableAutoReplay(connectivityMonitor);
      return () => api.manager.disableAutoReplay();
    }
    return;
  }, [api, connectivityMonitor]);

  useEffect(() => {
    onReady?.(api);
  }, [api, onReady]);

  return (
    <DataTableContext.Provider value={api.store}>
      {children ?? <Grid {...gridProps} />}
    </DataTableContext.Provider>
  );
}
