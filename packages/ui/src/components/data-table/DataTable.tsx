import React, { useEffect, useMemo } from "react";
import type { ReactNode } from "react";
import { DataTableContext } from "@advanced-datatable/react";
import type { IConnectivityMonitor, IOperationPersistence } from "@advanced-datatable/operations";
import type { IOperationTransport } from "@advanced-datatable/api-client";
import type { TableState } from "@advanced-datatable/core";
import { Grid } from "../grid";
import type { GridProps } from "../grid";
import { createDataTableApi } from "./createDataTableApi";
import type { DataTableApi } from "./createDataTableApi";
import {
  applyPersistedViewState,
  subscribeViewStatePersistence,
} from "./viewStatePersistence";
import type { ViewStatePersistenceOptions } from "./viewStatePersistence";

export interface DataTableProps extends GridProps {
  transport: IOperationTransport;
  initialState?: Partial<TableState>;
  persistence?: IOperationPersistence;
  connectivityMonitor?: IConnectivityMonitor;
  viewStatePersistence?: ViewStatePersistenceOptions;
  GridComponent?: React.ComponentType<GridProps>;
  onReady?: (api: DataTableApi) => void;
  children?: ReactNode;
}

export function DataTable({
  transport,
  initialState,
  persistence,
  connectivityMonitor,
  viewStatePersistence,
  GridComponent = Grid,
  onReady,
  children,
  ...gridProps
}: DataTableProps): React.ReactElement {
  const api = useMemo(
    () => createDataTableApi({ transport, initialState, persistence }),
    [],
  ); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    void api.manager.loadPersistedOperations();
    if (connectivityMonitor) {
      api.manager.enableAutoReplay(connectivityMonitor);
      return () => api.manager.disableAutoReplay();
    }
    return;
  }, [api, connectivityMonitor]);

  useEffect(() => {
    if (!viewStatePersistence || typeof window === "undefined") {
      return;
    }

    applyPersistedViewState(api, viewStatePersistence);
  }, [api, viewStatePersistence]);

  useEffect(() => {
    if (!viewStatePersistence || typeof window === "undefined") {
      return;
    }

    return subscribeViewStatePersistence(api, viewStatePersistence);
  }, [api, viewStatePersistence]);

  useEffect(() => {
    onReady?.(api);
  }, [api, onReady]);

  return (
    <DataTableContext.Provider value={api.store}>
      {children ?? <GridComponent {...gridProps} />}
    </DataTableContext.Provider>
  );
}
