import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

export const BACKEND_URL = "http://localhost:3001";
export const CONFLICT_OP_ID = "playground-conflict-op";

export interface BackendConfig {
  latencyMs: number;
  errorRate: number;
  partialResponseMode: boolean;
  conflictOpIds: string[];
}

type BackendStatus = "checking" | "online" | "offline";
type ConfigStatus = "idle" | "saving" | "saved" | "error";

interface BackendConfigContextValue {
  backendUrl: string;
  backendStatus: BackendStatus;
  pendingConfig: BackendConfig;
  appliedConfig: BackendConfig | null;
  configStatus: ConfigStatus;
  refreshStatus: () => Promise<void>;
  applyConfig: () => Promise<void>;
  setPendingConfig: React.Dispatch<React.SetStateAction<BackendConfig>>;
}

const defaultConfig: BackendConfig = {
  latencyMs: 100,
  errorRate: 0,
  partialResponseMode: false,
  conflictOpIds: [],
};

const BackendConfigContext = createContext<BackendConfigContextValue | null>(null);

export function BackendConfigProvider({ children }: { children: React.ReactNode }): React.ReactElement {
  const [backendStatus, setBackendStatus] = useState<BackendStatus>("checking");
  const [pendingConfig, setPendingConfig] = useState<BackendConfig>(defaultConfig);
  const [appliedConfig, setAppliedConfig] = useState<BackendConfig | null>(null);
  const [configStatus, setConfigStatus] = useState<ConfigStatus>("idle");

  const refreshStatus = useCallback(async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/health`, { signal: AbortSignal.timeout(2000) });
      if (!res.ok) {
        setBackendStatus("offline");
        return;
      }

      const data = (await res.json()) as { config?: Partial<BackendConfig> };
      setBackendStatus("online");
      if (data.config) {
        const nextConfig: BackendConfig = {
          latencyMs: data.config.latencyMs ?? defaultConfig.latencyMs,
          errorRate: data.config.errorRate ?? defaultConfig.errorRate,
          partialResponseMode: data.config.partialResponseMode ?? defaultConfig.partialResponseMode,
          conflictOpIds: Array.isArray(data.config.conflictOpIds) ? data.config.conflictOpIds : [],
        };
        setPendingConfig(nextConfig);
        setAppliedConfig(nextConfig);
      }
    } catch {
      setBackendStatus("offline");
    }
  }, []);

  useEffect(() => {
    void refreshStatus();
    const interval = window.setInterval(() => {
      void refreshStatus();
    }, 5000);

    return () => window.clearInterval(interval);
  }, [refreshStatus]);

  const applyConfig = useCallback(async () => {
    setConfigStatus("saving");
    try {
      const res = await fetch(`${BACKEND_URL}/config`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(pendingConfig),
      });

      if (!res.ok) {
        setConfigStatus("error");
        return;
      }

      setAppliedConfig(pendingConfig);
      setConfigStatus("saved");
      window.setTimeout(() => setConfigStatus("idle"), 2000);
    } catch {
      setConfigStatus("error");
    }
  }, [pendingConfig]);

  const value = useMemo<BackendConfigContextValue>(
    () => ({
      backendUrl: BACKEND_URL,
      backendStatus,
      pendingConfig,
      appliedConfig,
      configStatus,
      refreshStatus,
      applyConfig,
      setPendingConfig,
    }),
    [appliedConfig, applyConfig, backendStatus, configStatus, pendingConfig, refreshStatus],
  );

  return <BackendConfigContext.Provider value={value}>{children}</BackendConfigContext.Provider>;
}

export function useBackendConfig(): BackendConfigContextValue {
  const context = useContext(BackendConfigContext);
  if (!context) {
    throw new Error("useBackendConfig must be used within BackendConfigProvider");
  }
  return context;
}
