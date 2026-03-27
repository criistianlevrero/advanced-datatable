/**
 * Mock backend configuration.
 * Control server behavior for testing different scenarios.
 */

export interface MockBackendConfig {
  /** Port to listen on */
  port: number;
  
  /** Simulated network latency in milliseconds */
  latencyMs: number;
  
  /** Percentage of requests that fail (0.0 to 1.0) */
  errorRate: number;
  
  /** Whether to return partial batch responses (missing some operation results) */
  partialResponseMode: boolean;
  
  /** Whether to simulate conflicts on specific operation IDs */
  conflictOpIds: string[];
  
  /** Enable detailed logging */
  verbose: boolean;
}

export const defaultConfig: MockBackendConfig = {
  port: 3001,
  latencyMs: 50,
  errorRate: 0,
  partialResponseMode: false,
  conflictOpIds: [],
  verbose: false,
};

export function createConfig(overrides?: Partial<MockBackendConfig>): MockBackendConfig {
  return { ...defaultConfig, ...overrides };
}
