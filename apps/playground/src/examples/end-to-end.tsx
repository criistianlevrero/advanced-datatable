import React, { useCallback, useContext, useEffect, useMemo, useState } from "react";
import { DataTable, Grid } from "@advanced-datatable/ui";
import { HttpTransport } from "@advanced-datatable/api-client";
import { BrowserConnectivityMonitor, LocalStorageOperationPersistence } from "@advanced-datatable/operations";
import { DataTableContext } from "@advanced-datatable/react";

const BACKEND_URL = "http://localhost:3001";
const CONFLICT_OP_ID = "playground-conflict-op";

interface BackendConfig {
  latencyMs: number;
  errorRate: number;
  partialResponseMode: boolean;
  conflictOpIds: string[];
}

interface OpLogEntry {
  opId: string;
  type: "applied" | "confirmed" | "failed";
  timestamp: number;
}

function StatusBadge({ status }: { status: "checking" | "online" | "offline" }) {
  const colors: Record<string, string> = {
    checking: "#888",
    online: "#1f8f5f",
    offline: "#c0392b",
  };
  const labels: Record<string, string> = {
    checking: "Checking…",
    online: "Online",
    offline: "Offline",
  };
  return (
    <span
      style={{
        display: "inline-block",
        padding: "2px 10px",
        borderRadius: 12,
        fontSize: 13,
        fontWeight: 600,
        color: "#fff",
        backgroundColor: colors[status],
      }}
    >
      {labels[status]}
    </span>
  );
}

function EndToEndControls(): React.ReactElement {
  const store = useContext(DataTableContext);

  const dispatchConflictOp = () => {
    store?.getState().dispatch({
      id: CONFLICT_OP_ID,
      type: "set_cell",
      source: "client",
      rowId: "r1",
      colId: "name",
      value: `Conflict-${Date.now()}`,
      target: { type: "cell", rowId: "r1", colId: "name" },
    });
  };

  const dispatchRegularOp = () => {
    store?.getState().dispatch({
      id: `playground-regular-${Date.now()}`,
      type: "set_cell",
      source: "client",
      rowId: "r2",
      colId: "name",
      value: `Normal-${Date.now()}`,
      target: { type: "cell", rowId: "r2", colId: "name" },
    });
  };

  return (
    <div
      style={{
        marginBottom: 16,
        padding: 16,
        borderRadius: 6,
        backgroundColor: "#f6f8fa",
        display: "flex",
        gap: 8,
        flexWrap: "wrap",
        alignItems: "center",
      }}
    >
      <strong>Manual Operations</strong>
      <button onClick={dispatchRegularOp}>Dispatch Regular Operation</button>
      <button onClick={dispatchConflictOp}>Dispatch Conflict Operation</button>
      <span style={{ fontSize: 13, color: "#555" }}>
        Conflict op uses <code>{CONFLICT_OP_ID}</code>
      </span>
    </div>
  );
}

export function EndToEndExample(): React.ReactElement {
  const [backendStatus, setBackendStatus] = useState<"checking" | "online" | "offline">("checking");
  const [pendingOps, setPendingOps] = useState(0);
  const [opLog, setOpLog] = useState<OpLogEntry[]>([]);

  const [pendingConfig, setPendingConfig] = useState<BackendConfig>({
    latencyMs: 100,
    errorRate: 0,
    partialResponseMode: false,
    conflictOpIds: [],
  });
  const [appliedConfig, setAppliedConfig] = useState<BackendConfig | null>(null);
  const [configStatus, setConfigStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  const transport = useMemo(() => new HttpTransport({ baseUrl: BACKEND_URL }), []);
  const persistence = useMemo(
    () => new LocalStorageOperationPersistence("advanced-datatable.playground.e2e"),
    [],
  );
  const connectivityMonitor = useMemo(() => new BrowserConnectivityMonitor(), []);

  const addToLog = useCallback((entry: OpLogEntry) => {
    setOpLog((prev) => [entry, ...prev].slice(0, 30));
  }, []);

  // Health check ─ every 5 s
  const checkHealth = useCallback(async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/health`, { signal: AbortSignal.timeout(2000) });
      if (res.ok) {
        const data = (await res.json()) as {
          config?: Partial<BackendConfig> & { conflictOpIds?: string[] | number };
        };
        setBackendStatus("online");
        if (data.config) {
          setPendingConfig((prev) => ({
            latencyMs: (data.config?.latencyMs as number | undefined) ?? prev.latencyMs,
            errorRate: (data.config?.errorRate as number | undefined) ?? prev.errorRate,
            partialResponseMode:
              (data.config?.partialResponseMode as boolean | undefined) ?? prev.partialResponseMode,
            conflictOpIds: Array.isArray(data.config?.conflictOpIds)
              ? data.config.conflictOpIds
              : prev.conflictOpIds,
          }));
        }
      } else {
        setBackendStatus("offline");
      }
    } catch {
      setBackendStatus("offline");
    }
  }, []);

  useEffect(() => {
    void checkHealth();
    const interval = setInterval(() => void checkHealth(), 5000);
    return () => clearInterval(interval);
  }, [checkHealth]);

  const applyConfig = async () => {
    setConfigStatus("saving");
    try {
      const res = await fetch(`${BACKEND_URL}/config`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(pendingConfig),
      });
      if (res.ok) {
        setAppliedConfig(pendingConfig);
        setConfigStatus("saved");
        setTimeout(() => setConfigStatus("idle"), 2000);
      } else {
        setConfigStatus("error");
      }
    } catch {
      setConfigStatus("error");
    }
  };

  return (
    <section>
      <h2>End-to-End (Real Backend)</h2>
      <p>
        This example connects to the real mock backend using{" "}
        <code>HttpTransport</code>. Start the server with{" "}
        <code>npm run mock-backend</code>, then edit cells to see operations
        complete a real HTTP round-trip.
      </p>

      {/* Backend status */}
      <div
        style={{
          marginBottom: 16,
          padding: 16,
          borderRadius: 6,
          backgroundColor: backendStatus === "online" ? "#d9f5e5" : "#fde2e1",
          borderLeft: `4px solid ${backendStatus === "online" ? "#1f8f5f" : "#c0392b"}`,
          display: "flex",
          alignItems: "center",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <span>
          <strong>Backend:</strong> {BACKEND_URL}
        </span>
        <StatusBadge status={backendStatus} />
        <span>
          <strong>Pending ops:</strong> {pendingOps}
        </span>
        <button onClick={() => void checkHealth()} style={{ marginLeft: "auto" }}>
          Refresh Status
        </button>
      </div>

      {backendStatus === "offline" && (
        <div
          style={{
            marginBottom: 16,
            padding: 12,
            backgroundColor: "#fff3cd",
            borderRadius: 6,
            fontSize: 14,
          }}
        >
          <strong>Backend not running.</strong> Start it with:{" "}
          <code style={{ backgroundColor: "#eee", padding: "2px 6px", borderRadius: 4 }}>
            npm run mock-backend
          </code>{" "}
          in a separate terminal. Operations will queue locally and replay once the server is up.
        </div>
      )}

      {/* Backend config panel */}
      <details style={{ marginBottom: 16 }}>
        <summary style={{ cursor: "pointer", fontWeight: 600, marginBottom: 8 }}>
          Backend Configuration
          {appliedConfig && (
            <span style={{ fontWeight: 400, marginLeft: 8, color: "#555", fontSize: 13 }}>
              (latency: {appliedConfig.latencyMs}ms, errors: {(appliedConfig.errorRate * 100).toFixed(0)}%,
              partial: {appliedConfig.partialResponseMode ? "on" : "off"}, conflicts: {appliedConfig.conflictOpIds.length})
            </span>
          )}
        </summary>
        <div
          style={{
            padding: 16,
            backgroundColor: "#f6f8fa",
            borderRadius: 6,
            display: "grid",
            gap: 12,
          }}
        >
          <label>
            <span style={{ display: "block", marginBottom: 4 }}>
              <strong>Simulated latency:</strong> {pendingConfig.latencyMs} ms
            </span>
            <input
              type="range"
              min="0"
              max="2000"
              step="50"
              value={pendingConfig.latencyMs}
              onChange={(e) =>
                setPendingConfig((prev) => ({ ...prev, latencyMs: Number(e.target.value) }))
              }
              style={{ width: "100%" }}
            />
          </label>

          <label>
            <span style={{ display: "block", marginBottom: 4 }}>
              <strong>Error rate:</strong> {(pendingConfig.errorRate * 100).toFixed(0)}%
            </span>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={pendingConfig.errorRate}
              onChange={(e) =>
                setPendingConfig((prev) => ({ ...prev, errorRate: Number(e.target.value) }))
              }
              style={{ width: "100%" }}
            />
          </label>

          <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <input
              type="checkbox"
              checked={pendingConfig.partialResponseMode}
              onChange={(e) =>
                setPendingConfig((prev) => ({ ...prev, partialResponseMode: e.target.checked }))
              }
            />
            <span>
              <strong>Partial response mode</strong> — server drops some results from each batch
            </span>
          </label>

          <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <input
              type="checkbox"
              checked={pendingConfig.conflictOpIds.includes(CONFLICT_OP_ID)}
              onChange={(e) =>
                setPendingConfig((prev) => ({
                  ...prev,
                  conflictOpIds: e.target.checked ? [CONFLICT_OP_ID] : [],
                }))
              }
            />
            <span>
              <strong>Conflict mode</strong> — backend rejects the manual conflict operation ID
            </span>
          </label>

          <button
            onClick={() => void applyConfig()}
            disabled={backendStatus !== "online" || configStatus === "saving"}
            style={{ alignSelf: "flex-start" }}
          >
            {configStatus === "saving"
              ? "Saving…"
              : configStatus === "saved"
                ? "Saved!"
                : configStatus === "error"
                  ? "Error — retry"
                  : "Apply to backend"}
          </button>
        </div>
      </details>

      {/* Operation log */}
      {opLog.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <h4 style={{ margin: "0 0 8px" }}>Operation Log</h4>
            <button onClick={() => setOpLog([])} style={{ fontSize: 12 }}>
              Clear
            </button>
          </div>
          <div
            style={{
              maxHeight: 180,
              overflowY: "auto",
              fontFamily: "monospace",
              fontSize: 12,
              backgroundColor: "#1e1e1e",
              color: "#d4d4d4",
              borderRadius: 6,
              padding: 12,
            }}
          >
            {opLog.map((entry, i) => {
              const color =
                entry.type === "confirmed"
                  ? "#4ec9b0"
                  : entry.type === "failed"
                    ? "#f48771"
                    : "#9cdcfe";
              return (
                <div key={i}>
                  <span style={{ color: "#888" }}>
                    {new Date(entry.timestamp).toLocaleTimeString()}
                  </span>{" "}
                  <span style={{ color }}>[{entry.type}]</span>{" "}
                  <span>{entry.opId}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <DataTable
        transport={transport}
        persistence={persistence}
        connectivityMonitor={connectivityMonitor}
        onReady={({ manager }) => {
          setPendingOps(manager.getPendingOperations().length);
          manager.subscribe((event) => {
            setPendingOps(manager.getPendingOperations().length);
            const type =
              event.type === "applied"
                ? "applied"
                : event.type === "confirmed"
                  ? "confirmed"
                  : "failed";
            addToLog({ opId: event.opId, type, timestamp: Date.now() });
          });
        }}
      >
        <EndToEndControls />
        <Grid />
      </DataTable>
    </section>
  );
}
