import React from "react";
import { Button, Card, Group, SimpleGrid, Stack, Text, ThemeIcon, Title } from "@mantine/core";
import { IconArrowsShuffle, IconKeyboard, IconPlugConnected, IconTable } from "@tabler/icons-react";
import { Link, Route, Routes } from "react-router-dom";
import { DataTable, Grid } from "@advanced-datatable/ui";
import type { TableState } from "@advanced-datatable/core";
import { BasicExample } from "./examples/basic";
import { BulkEditExample } from "./examples/bulk-edit";
import { SchemaDynamicExample } from "./examples/schema-dynamic";
import { ReplayOnReconnectExample } from "./examples/replay-on-reconnect";
import { ErrorRecoveryExample } from "./examples/error-recovery";
import { PartialResponseExample } from "./examples/partial-response";
import { BackendIntegrationExample } from "./examples/backend-integration";
import { SelectionLabExample } from "./examples/selection-lab";
import { VirtualizationExample } from "./examples/virtualization";
import { mockTransport } from "./mocks/mockTransport";

const overviewPreviewState: Partial<TableState> = {
  schema: {
    columns: {
      name: { id: "name", type: "string", title: "Name" },
      role: { id: "role", type: "string", title: "Role" },
      team: { id: "team", type: "string", title: "Team" },
      region: { id: "region", type: "string", title: "Region" },
      status: { id: "status", type: "string", title: "Status" },
      age: { id: "age", type: "number", title: "Age" },
      score: { id: "score", type: "number", title: "Score" },
      active: { id: "active", type: "boolean", title: "Active" },
    },
    columnOrder: ["name", "role", "team", "region", "status", "age", "score", "active"],
    version: 1,
  },
  rows: new Map(
    Array.from({ length: 23 }, (_, index) => {
      const rowNumber = index + 1;
      const rowId = `overview-r${rowNumber}`;
      const roles = ["Engineer", "Designer", "Analyst", "Manager"];
      const teams = ["Core", "Growth", "Platform", "Data"];
      const regions = ["NA", "LATAM", "EMEA", "APAC"];
      const statuses = ["New", "Active", "Review", "Done"];

      return [
        rowId,
        {
          id: rowId,
          cells: {
            name: { value: `Person ${rowNumber}` },
            role: { value: roles[index % roles.length] },
            team: { value: teams[index % teams.length] },
            region: { value: regions[index % regions.length] },
            status: { value: statuses[index % statuses.length] },
            age: { value: 22 + (index % 18) },
            score: { value: 70 + ((index * 3) % 31) },
            active: { value: index % 2 === 0 },
          },
        },
      ] as const;
    }),
  ),
  rowOrder: Array.from({ length: 23 }, (_, index) => `overview-r${index + 1}`),
};

function OverviewPage(): React.ReactElement {
  return (
    <Stack gap="xl">
      <div>
        <Title order={1}>Advanced DataTable Playground</Title>
        <Text c="dimmed" mt="sm">
          Navigate test categories to validate core operations, resilience, and real-backend scenarios.
        </Text>
      </div>

      <SimpleGrid cols={{ base: 1, md: 3 }} spacing="lg">
        <Card withBorder radius="md" padding="lg">
          <Group mb="sm">
            <ThemeIcon size="lg" color="blue" variant="light">
              <IconTable size={18} />
            </ThemeIcon>
            <Title order={3}>Core Scenarios</Title>
          </Group>
          <Text c="dimmed" mb="md">
            Basic editing, bulk operations, and schema changes.
          </Text>
          <Button component={Link} to="/core" variant="light">
            Open core tests
          </Button>
        </Card>

        <Card withBorder radius="md" padding="lg">
          <Group mb="sm">
            <ThemeIcon size="lg" color="orange" variant="light">
              <IconArrowsShuffle size={18} />
            </ThemeIcon>
            <Title order={3}>Resilience Scenarios</Title>
          </Group>
          <Text c="dimmed" mb="md">
            Replay, error recovery, and partial responses.
          </Text>
          <Button component={Link} to="/resilience" variant="light" color="orange">
            Open resilience tests
          </Button>
        </Card>

        <Card withBorder radius="md" padding="lg">
          <Group mb="sm">
            <ThemeIcon size="lg" color="teal" variant="light">
              <IconPlugConnected size={18} />
            </ThemeIcon>
            <Title order={3}>Backend Integration</Title>
          </Group>
          <Text c="dimmed" mb="md">
            Partial operations + polling deltas for backend-computed values.
          </Text>
          <Button component={Link} to="/backend-integration" variant="light" color="teal">
            Open backend integration
          </Button>
        </Card>

        <Card withBorder radius="md" padding="lg">
          <Group mb="sm">
            <ThemeIcon size="lg" color="grape" variant="light">
              <IconKeyboard size={18} />
            </ThemeIcon>
            <Title order={3}>Selection Lab</Title>
          </Group>
          <Text c="dimmed" mb="md">
            Dedicated scenario for selection, keyboard shortcuts, and copy/paste with read-only constraints.
          </Text>
          <Button component={Link} to="/selection-lab" variant="light" color="grape">
            Open selection lab
          </Button>
        </Card>

        <Card withBorder radius="md" padding="lg">
          <Group mb="sm">
            <ThemeIcon size="lg" color="violet" variant="light">
              <IconTable size={18} />
            </ThemeIcon>
            <Title order={3}>Virtualization</Title>
          </Group>
          <Text c="dimmed" mb="md">
            10,000 virtualized rows with @tanstack/react-virtual for optimal performance.
          </Text>
          <Button component={Link} to="/virtualization" variant="light" color="violet">
            Open virtualization demo
          </Button>
        </Card>
      </SimpleGrid>

      <Card withBorder radius="md" padding="lg">
        <Stack gap="md">
          <div>
            <Title order={3}>Interactive Table Preview</Title>
            <Text c="dimmed" mt="xs">
              This sample table showcases the core interactive features: sorting by clicking column
              headers, filtering with per-column filter inputs, and column resize using header
              drag handles. The grid is also editable and supports copy/paste across selected
              regions.
            </Text>
          </div>

          <DataTable transport={mockTransport} initialState={overviewPreviewState}>
            <Grid showFilters resizableColumns />
          </DataTable>
        </Stack>
      </Card>
    </Stack>
  );
}

function CorePage(): React.ReactElement {
  return (
    <Stack gap="xl">
      <div>
        <Title order={2}>Core Scenarios</Title>
        <Text c="dimmed">Validation of editing, bulk operations, and dynamic schema changes.</Text>
      </div>
      <BasicExample />
      <BulkEditExample />
      <SchemaDynamicExample />
    </Stack>
  );
}

function ResiliencePage(): React.ReactElement {
  return (
    <Stack gap="xl">
      <div>
        <Title order={2}>Resilience Scenarios</Title>
        <Text c="dimmed">Local simulations for reconnect, retryable errors, and incomplete responses.</Text>
      </div>
      <ReplayOnReconnectExample />
      <ErrorRecoveryExample />
      <PartialResponseExample />
    </Stack>
  );
}

function BackendIntegrationPage(): React.ReactElement {
  return (
    <Stack gap="xl">
      <div>
        <Title order={2}>Backend Integration</Title>
        <Text c="dimmed">
          Table data is loaded from backend. Edits send partial operations, and processed values are pulled as partial deltas.
        </Text>
      </div>
      <BackendIntegrationExample />
    </Stack>
  );
}

function SelectionLabPage(): React.ReactElement {
  return (
    <Stack gap="xl">
      <div>
        <Title order={2}>Selection Lab</Title>
        <Text c="dimmed">
          Large table (10x30) for validating selection, keyboard navigation, copy/paste, and read-only constraints.
        </Text>
      </div>
      <SelectionLabExample />
    </Stack>
  );
}

function VirtualizationPage(): React.ReactElement {
  return (
    <Stack gap="xl">
      <div>
        <Title order={2}>Virtualization</Title>
        <Text c="dimmed">
          Demo with 10,000 virtualized rows using @tanstack/react-virtual. All features (sort, filter, select, edit) work without performance degradation.
        </Text>
      </div>
      <VirtualizationExample />
    </Stack>
  );
}

export function AppRoutes(): React.ReactElement {
  return (
    <Routes>
      <Route path="/" element={<OverviewPage />} />
      <Route path="/core" element={<CorePage />} />
      <Route path="/resilience" element={<ResiliencePage />} />
      <Route path="/backend-integration" element={<BackendIntegrationPage />} />
      <Route path="/selection-lab" element={<SelectionLabPage />} />
      <Route path="/virtualization" element={<VirtualizationPage />} />
    </Routes>
  );
}
