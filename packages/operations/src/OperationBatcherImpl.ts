import type { Operation } from "@advanced-datatable/core";
import type { IOperationBatcher } from "./IOperationBatcher";
import type { IOperationTransport } from "@advanced-datatable/api-client";

interface BatcherCallbacks {
  onConfirm(opId: string): void;
  onFail(opId: string, error: unknown): void;
}

export interface OperationBatcherOptions {
  debounceMs?: number;
  maxRetries?: number;
  baseRetryDelayMs?: number;
  jitterRatio?: number;
  shouldRetry?: (error: unknown, attempt: number) => boolean;
}

export class OperationBatcherImpl implements IOperationBatcher {
  private queue: Operation[] = [];
  private timer: ReturnType<typeof setTimeout> | null = null;
  private readonly debounceMs: number;
  private readonly maxRetries: number;
  private readonly baseRetryDelayMs: number;
  private readonly jitterRatio: number;
  private readonly shouldRetry: (error: unknown, attempt: number) => boolean;

  constructor(
    private readonly transport: IOperationTransport,
    private readonly callbacks: BatcherCallbacks,
    options: number | OperationBatcherOptions = 50,
  ) {
    if (typeof options === "number") {
      this.debounceMs = options;
      this.maxRetries = 0;
      this.baseRetryDelayMs = 100;
      this.jitterRatio = 0;
      this.shouldRetry = defaultShouldRetry;
      return;
    }

    this.debounceMs = options.debounceMs ?? 50;
    this.maxRetries = options.maxRetries ?? 0;
    this.baseRetryDelayMs = options.baseRetryDelayMs ?? 100;
    this.jitterRatio = options.jitterRatio ?? 0;
    this.shouldRetry = options.shouldRetry ?? defaultShouldRetry;
  }

  enqueue(op: Operation): void {
    this.queue.push(op);
    if (this.timer === null) {
      this.timer = setTimeout(() => this._send(), this.debounceMs);
    }
  }

  flush(): void {
    if (this.timer !== null) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    void this._send();
  }

  private async _send(): Promise<void> {
    this.timer = null;
    const batch = this.queue.splice(0);
    if (batch.length === 0) return;

    await this._sendWithRetry(batch, 0);
  }

  private async _sendWithRetry(batch: Operation[], attempt: number): Promise<void> {
    try {
      const response = await this.transport.send(batch);
      const resultsByOpId = new Map(response.results.map((result) => [result.opId, result]));

      for (const op of batch) {
        const result = resultsByOpId.get(op.id);

        if (!result) {
          this.callbacks.onFail(op.id, `missing batch result for op ${op.id}`);
          continue;
        }

        if (result.status === "confirmed") {
          this.callbacks.onConfirm(result.opId);
        } else {
          this.callbacks.onFail(result.opId, result.error ?? "unknown error");
        }
      }
    } catch (err) {
      if (attempt < this.maxRetries && this.shouldRetry(err, attempt)) {
        const retryDelay = withJitter(this.baseRetryDelayMs * 2 ** attempt, this.jitterRatio);
        await delay(retryDelay);
        await this._sendWithRetry(batch, attempt + 1);
        return;
      }

      // Transport-level failure: mark all ops in batch as failed.
      for (const op of batch) {
        this.callbacks.onFail(op.id, err);
      }
    }
  }
}

function withJitter(baseDelayMs: number, jitterRatio: number): number {
  if (jitterRatio <= 0) {
    return baseDelayMs;
  }
  const jitterFactor = 1 + (Math.random() * 2 - 1) * jitterRatio;
  return Math.max(0, Math.round(baseDelayMs * jitterFactor));
}

function defaultShouldRetry(error: unknown): boolean {
  if (isRecord(error) && typeof error.retryable === "boolean") {
    return error.retryable;
  }

  if (isRecord(error) && typeof error.status === "number") {
    return error.status >= 500 || error.status === 429;
  }

  // Unknown/network/runtime errors default to retryable.
  return true;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
