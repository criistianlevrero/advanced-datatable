import type { Operation, TargetDescriptor } from "@advanced-datatable/core";
import type { IConnectivityMonitor } from "./IConnectivityMonitor";
import type { OperationManagerListener, OperationRecord } from "./types";

export interface IOperationManager {
  /** Apply an operation locally and register it as pending. */
  apply(op: Operation): void;
  /** Mark an operation as confirmed (server ack). */
  confirm(opId: string): void;
  /** Mark an operation as failed. */
  fail(opId: string, error: unknown): void;
  /** Return all pending operation records. */
  getPendingOperations(): OperationRecord[];
  /** Return all pending op records for a given target. */
  getPendingByTarget(target: TargetDescriptor): OperationRecord[];
  /** Flush the batcher (send immediately). */
  flush(): void;
  /** Subscribe to operation lifecycle events (apply/confirm/fail). */
  subscribe(listener: OperationManagerListener): () => void;
  /** Restore persisted operations into engine + batcher. */
  loadPersistedOperations(): Promise<void>;
  /** Enable automatic replay after connectivity is restored. */
  enableAutoReplay(monitor: IConnectivityMonitor): void;
  /** Disable automatic replay after connectivity is restored. */
  disableAutoReplay(): void;
  /** Replay all pending operations immediately. */
  replayPendingOperations(): Promise<void>;
}
