import React from "react";
import {
  Alert,
  Badge,
  Button,
  Code,
  Divider,
  Drawer,
  Group,
  Slider,
  Stack,
  Switch,
  Text,
} from "@mantine/core";
import { CONFLICT_OP_ID, useBackendConfig } from "../backend/BackendConfigContext";

interface BackendConfigDrawerProps {
  opened: boolean;
  onClose: () => void;
}

export function BackendConfigDrawer({ opened, onClose }: BackendConfigDrawerProps): React.ReactElement {
  const {
    backendUrl,
    backendStatus,
    pendingConfig,
    appliedConfig,
    configStatus,
    refreshStatus,
    applyConfig,
    setPendingConfig,
  } = useBackendConfig();

  return (
    <Drawer
      opened={opened}
      onClose={onClose}
      position="right"
      title="Backend Configuration"
      padding="lg"
      size="md"
    >
      <Stack gap="lg">
        <Group justify="space-between" align="center">
          <div>
            <Text fw={600}>Mock backend</Text>
            <Code>{backendUrl}</Code>
          </div>
          <Badge color={backendStatus === "online" ? "teal" : backendStatus === "offline" ? "red" : "gray"}>
            {backendStatus}
          </Badge>
        </Group>

        <Alert color={backendStatus === "online" ? "teal" : "yellow"}>
          {backendStatus === "online"
            ? "Configuration from this panel is available on any playground route."
            : "The backend is not responding. Run npm run mock-backend to enable integrated routes."}
        </Alert>

        {appliedConfig ? (
          <Text size="sm" c="dimmed">
            Active now: latency {appliedConfig.latencyMs} ms, errors {(appliedConfig.errorRate * 100).toFixed(0)}%,
            partial {appliedConfig.partialResponseMode ? "on" : "off"}, conflicts {appliedConfig.conflictOpIds.length}
          </Text>
        ) : null}

        <Divider />

        <div>
          <Text fw={600} mb={6}>Simulated latency</Text>
          <Slider
            min={0}
            max={2000}
            step={50}
            label={(value) => `${value} ms`}
            value={pendingConfig.latencyMs}
            onChange={(value) => setPendingConfig((prev) => ({ ...prev, latencyMs: value }))}
          />
        </div>

        <div>
          <Text fw={600} mb={6}>Error rate</Text>
          <Slider
            min={0}
            max={100}
            step={5}
            label={(value) => `${value}%`}
            value={pendingConfig.errorRate * 100}
            onChange={(value) => setPendingConfig((prev) => ({ ...prev, errorRate: value / 100 }))}
          />
        </div>

        <Switch
          checked={pendingConfig.partialResponseMode}
          onChange={(event) =>
            setPendingConfig((prev) => ({ ...prev, partialResponseMode: event.currentTarget.checked }))
          }
          label="Partial response mode"
          description="The backend omits some results and the manager must mark them as failed."
        />

        <Switch
          checked={pendingConfig.conflictOpIds.includes(CONFLICT_OP_ID)}
          onChange={(event) =>
            setPendingConfig((prev) => ({
              ...prev,
              conflictOpIds: event.currentTarget.checked ? [CONFLICT_OP_ID] : [],
            }))
          }
          label="Conflict mode"
          description={`Rejects the manual operation with opId ${CONFLICT_OP_ID}.`}
        />

        <Group justify="space-between">
          <Button variant="default" onClick={() => void refreshStatus()}>
            Refresh
          </Button>
          <Button
            onClick={() => void applyConfig()}
            disabled={backendStatus !== "online" || configStatus === "saving"}
          >
            {configStatus === "saving"
              ? "Saving..."
              : configStatus === "saved"
                ? "Saved"
                : configStatus === "error"
                  ? "Retry"
                  : "Apply"}
          </Button>
        </Group>
      </Stack>
    </Drawer>
  );
}
