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
  /**
   * Transport is treated as immutable after mount.
   * To switch transport, remount DataTable (for example by changing key).
   */
  transport: IOperationTransport;
  /**
   * Initial state is consumed only during bootstrap.
   * Runtime updates should be dispatched through the store/manager APIs.
   */
  initialState?: Partial<TableState>;
  /**
   * Persistence adapter is treated as immutable after mount.
   * To switch persistence implementation, remount DataTable.
   */
  persistence?: IOperationPersistence;
  connectivityMonitor?: IConnectivityMonitor;
  viewStatePersistence?: ViewStatePersistenceOptions;
  GridComponent?: React.ComponentType<GridProps>;
  onReady?: (api: DataTableApi) => void;
  children?: ReactNode;
}

function isDevelopmentEnvironment(): boolean {
  return typeof process !== "undefined" && process.env.NODE_ENV !== "production";
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

  const initialImmutablePropsRef = React.useRef({
    transport,
    initialState,
    persistence,
  });
  const warnedKeysRef = React.useRef(new Set<string>());

  useEffect(() => {
    if (!isDevelopmentEnvironment()) {
      return;
    }

    const initialProps = initialImmutablePropsRef.current;
    const warnOnce = (key: "transport" | "initialState" | "persistence") => {
      if (warnedKeysRef.current.has(key)) {
        return;
      }
      warnedKeysRef.current.add(key);
      console.warn(
        `[DataTable] Prop '${key}' changed after mount. This prop is treated as immutable and will not be reinitialized. Remount DataTable (for example with a different key) to apply the new value.`,
      );
    };

    if (transport !== initialProps.transport) {
      warnOnce("transport");
    }
    if (initialState !== initialProps.initialState) {
      warnOnce("initialState");
    }
    if (persistence !== initialProps.persistence) {
      warnOnce("persistence");
    }
  }, [transport, initialState, persistence]);

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
