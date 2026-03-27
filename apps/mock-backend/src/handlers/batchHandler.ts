import type { MockBackendConfig } from "../config";
import type { MockOperation, OperationBatchRequest, OperationBatchResponse, OperationResult } from "../types";

export async function simulateLatency(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function processBatch(
  req: OperationBatchRequest,
  config: MockBackendConfig,
): Promise<OperationBatchResponse> {
  if (config.latencyMs > 0) {
    await simulateLatency(config.latencyMs);
  }

  const results: OperationResult[] = [];
  let conflictCount = 0;

  for (const op of req.operations) {
    const result = processOperation(op, config);
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
    timestamp: Date.now(),
    conflictCount,
  };
}

function processOperation(op: MockOperation, config: MockBackendConfig): OperationResult {
  if (config.conflictOpIds.includes(op.id)) {
    return {
      opId: op.id,
      status: "error",
      error: "CONFLICT: Operation conflicts with existing data on server",
    };
  }

  return {
    opId: op.id,
    status: "confirmed",
  };
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
