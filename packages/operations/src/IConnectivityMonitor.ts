/**
 * Monitors network connectivity state.
 * Allows consumers to react to online/offline transitions.
 */
export interface IConnectivityMonitor {
  /**
   * Check if currently online.
   */
  isOnline(): boolean;

  /**
   * Subscribe to connectivity state changes.
   * Callback is invoked when transitioning online or offline.
   * Returns unsubscribe function.
   */
  subscribe(listener: (isOnline: boolean) => void): () => void;
}
