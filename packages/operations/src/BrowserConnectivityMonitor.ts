import type { IConnectivityMonitor } from "./IConnectivityMonitor";

/**
 * Browser-based connectivity monitor using window online/offline events.
 */
export class BrowserConnectivityMonitor implements IConnectivityMonitor {
  private readonly listeners = new Set<(isOnline: boolean) => void>();
  private _isOnline = typeof navigator !== "undefined" ? navigator.onLine : true;

  constructor() {
    if (typeof window === "undefined") return; // No-op in non-browser environments

    window.addEventListener("online", () => {
      if (!this._isOnline) {
        this._isOnline = true;
        this.notifyListeners(true);
      }
    });

    window.addEventListener("offline", () => {
      if (this._isOnline) {
        this._isOnline = false;
        this.notifyListeners(false);
      }
    });
  }

  isOnline(): boolean {
    return this._isOnline;
  }

  subscribe(listener: (isOnline: boolean) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners(isOnline: boolean): void {
    for (const listener of this.listeners) {
      listener(isOnline);
    }
  }
}

/**
 * No-op monitor for non-browser environments or testing.
 */
export class NoOpConnectivityMonitor implements IConnectivityMonitor {
  isOnline(): boolean {
    return true;
  }

  subscribe(): () => void {
    return () => {
      // no-op
    };
  }
}
