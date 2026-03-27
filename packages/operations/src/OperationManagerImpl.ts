import type { ITableEngine, Operation, TargetDescriptor } from "@advanced-datatable/core";
import type { IOperationTransport } from "@advanced-datatable/api-client";
import type { IOperationManager } from "./IOperationManager";
import type { OperationManagerListener, OperationRecord } from "./types";
import { OperationBatcherImpl } from "./OperationBatcherImpl";
import type { OperationBatcherOptions } from "./OperationBatcherImpl";
import { TargetIndexImpl } from "./TargetIndexImpl";
import type { IOperationPersistence } from "./IOperationPersistence";
import { NoOpOperationPersistence } from "./LocalStorageOperationPersistence";
import type { IConnectivityMonitor } from "./IConnectivityMonitor";

export class OperationManagerImpl implements IOperationManager {
  private readonly records = new Map<string, OperationRecord>();
  private readonly targetIndex = new TargetIndexImpl();
  private readonly batcher: OperationBatcherImpl;
  private readonly listeners = new Set<OperationManagerListener>();
  private readonly persistence: IOperationPersistence;
  private connectivityMonitor: IConnectivityMonitor | null = null;
  private unsubscribeConnectivity: (() => void) | null = null;

  constructor(
    private readonly engine: ITableEngine,
    transport: IOperationTransport,
    batcherOptions?: number | OperationBatcherOptions,
    persistence?: IOperationPersistence,
  ) {
    this.batcher = new OperationBatcherImpl(
      transport,
      { onConfirm: (id) => this.confirm(id), onFail: (id, err) => this.fail(id, err) },
      batcherOptions,
    );
    this.persistence = persistence ?? new NoOpOperationPersistence();
  }

  /**
   * Load persisted operations and restore them to the engine and batcher.
   * This should be called before using the manager.
   */
  async loadPersistedOperations(): Promise<void> {
    try {
      const loadedRecords = await this.persistence.load();
      for (const [id, record] of loadedRecords) {
        if (record.status === "pending") {
          // Restore to local state
          this.records.set(id, record);
          if (record.op.target) this.targetIndex.add(record.op.target, record.op.id);
          
          // Re-apply to engine (idempotent)
          this.engine.apply(record.op);
          
          // Re-enqueue to batcher for retry
          this.batcher.enqueue(record.op);
        }
      }
    } catch (err) {
      console.warn("[OperationManager] Failed to restore persisted operations:", err);
    }
  }

  apply(op: Operation): void {
    this.records.set(op.id, { op, status: "pending" });
    if (op.target) this.targetIndex.add(op.target, op.id);
    this.engine.apply(op);
    this.batcher.enqueue(op);
    this.notify({ type: "applied", opId: op.id });
    void this.persistence.save(this.records);
  }

  confirm(opId: string): void {
    const record = this.records.get(opId);
    if (!record) return;
    record.status = "confirmed";
    this.targetIndex.remove(opId);
    this.notify({ type: "confirmed", opId });
    void this.persistence.save(this.records);
  }

  fail(opId: string, error: unknown): void {
    const record = this.records.get(opId);
    if (!record) return;
    record.status = "error";
    record.error = error;
    this.targetIndex.remove(opId);
    this.notify({ type: "failed", opId, error });
    void this.persistence.save(this.records);
  }

  getPendingOperations(): OperationRecord[] {
    return Array.from(this.records.values()).filter((record) => record.status === "pending");
  }

  getPendingByTarget(target: TargetDescriptor): OperationRecord[] {
    return this.targetIndex
      .getByTarget(target)
      .map((id) => this.records.get(id))
      .filter((r): r is OperationRecord => r?.status === "pending");
  }

  flush(): void {
    this.batcher.flush();
  }

  subscribe(listener: OperationManagerListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(event: { type: "applied"; opId: string } | { type: "confirmed"; opId: string } | { type: "failed"; opId: string; error: unknown }): void {
    for (const listener of this.listeners) {
      listener(event);
    }
  }

  /**
   * Enable automatic replay of pending operations when connectivity is restored.
   * Call this after manager initialization to activate auto-replay.
   */
  enableAutoReplay(monitor: IConnectivityMonitor): void {
    if (this.connectivityMonitor) {
      this.disableAutoReplay();
    }
    this.connectivityMonitor = monitor;
    this.unsubscribeConnectivity = monitor.subscribe((isOnline) => {
      if (isOnline) {
        void this.replayPendingOperations();
      }
    });
  }

  /**
   * Disable automatic replay.
   */
  disableAutoReplay(): void {
    if (this.unsubscribeConnectivity) {
      this.unsubscribeConnectivity();
      this.unsubscribeConnectivity = null;
    }
    this.connectivityMonitor = null;
  }

  /**
   * Replay all pending operations.
   * Re-enqueues them to the batcher and triggers a flush.
   */
  async replayPendingOperations(): Promise<void> {
    const pendingOps = Array.from(this.records.values())
      .filter((r) => r.status === "pending")
      .map((r) => r.op);

    if (pendingOps.length === 0) return;

    console.log(`[OperationManager] Replaying ${pendingOps.length} pending operations after reconnect`);

    for (const op of pendingOps) {
      this.batcher.enqueue(op);
    }

    this.batcher.flush();
  }
}
