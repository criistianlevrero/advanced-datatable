import type { ITableEngine, Operation } from "@advanced-datatable/core";
import type { MockBackendConfig } from "../config";
import type { OperationBatchRequest, OperationBatchResponse, OperationResult } from "../types";

export async function simulateLatency(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Process a batch of operations by applying them to the TableEngine.
 * The engine handles the actual state mutations using core logic.
 * Config-driven conflict injection simulates server-side conflicts for testing.
 */
export async function processBatch(
  req: OperationBatchRequest,
  config: MockBackendConfig,
  engine: ITableEngine,
): Promise<OperationBatchResponse> {
  if (config.latencyMs > 0) {
    await simulateLatency(config.latencyMs);
  }

  const results: OperationResult[] = [];
  let conflictCount = 0;

  // Apply each operation using the TableEngine
  for (const op of req.operations) {
    const result = processOperation(op, config, engine);
    results.push(result);
    if (result.status === "error" && result.error?.includes("CONFLICT")) {
      conflictCount += 1;
    }
  }

  let finalResults = results;
  if (config.partialResponseMode && results.length > 0) {
    const dropCount = Math.floor(Math.random() * results.length);
    finalResults = results.slice(0, results.length - dropCount);
    if (config.verbose && dropCount > 0) {
      console.log(`[MockBackend] Partial response: dropped ${dropCount} results`);
    }
  }

  if (Math.random() < config.errorRate) {
    const statusCode = Math.random() < 0.5 ? 500 : 503;
    if (config.verbose) {
      console.log(`[MockBackend] Simulating server error: ${statusCode}`);
    }
    throw new Error(`Mock server error: ${statusCode}`);
  }

  return {
    results: finalResults,
    state: engine.getState(),
    timestamp: Date.now(),
    conflictCount,
  };
}

/**
 * Process an individual operation.
 * Uses TableEngine to apply the operation (real logic).
 * Respects config-injected conflicts for testing retry scenarios.
 */
function processOperation(op: Operation, config: MockBackendConfig, engine: ITableEngine): OperationResult {
  // Check for config-injected conflicts (for testing client retry logic)
  if (config.conflictOpIds.includes(op.id)) {
    return {
      opId: op.id,
      status: "error",
      error: "CONFLICT: Operation conflicts with existing data on server",
    };
  }

  try {
    // Apply the operation using TableEngineImpl logic
    engine.apply(op);
    return {
      opId: op.id,
      status: "confirmed",
    };
  } catch (error) {
    return {
      opId: op.id,
      status: "error",
      error: `Failed to apply operation: ${String(error)}`,
    };
  }
}

export function validateBatch(req: unknown): req is OperationBatchRequest {
  if (typeof req !== "object" || req === null) return false;
  const batch = req as Record<string, unknown>;
  return (
    Array.isArray(batch.operations) &&
    batch.operations.every(
      (op: unknown) => typeof op === "object" && op !== null && "id" in (op as Record<string, unknown>),
    )
  );
}
