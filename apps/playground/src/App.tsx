import React from "react";
import {
  AppShell,
  Burger,
  Group,
  NavLink,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import {
  IconArrowsShuffle,
  IconHome2,
  IconKeyboard,
  IconPlugConnected,
  IconTable,
} from "@tabler/icons-react";
import { BrowserRouter, Link, useLocation } from "react-router-dom";
import { BackendConfigProvider } from "./backend/BackendConfigContext";
import { AppRoutes } from "./routes";

function Navigation(): React.ReactElement {
  const location = useLocation();

  return (
    <Stack gap="xs">
      <NavLink
        component={Link}
        to="/"
        label="Overview"
        leftSection={<IconHome2 size={16} />}
        active={location.pathname === "/"}
      />
      <NavLink
        component={Link}
        to="/core"
        label="Core Scenarios"
        description="Basic, bulk edit, schema"
        leftSection={<IconTable size={16} />}
        active={location.pathname === "/core"}
      />
      <NavLink
        component={Link}
        to="/resilience"
        label="Resilience Scenarios"
        description="Replay, retries, partials"
        leftSection={<IconArrowsShuffle size={16} />}
        active={location.pathname === "/resilience"}
      />
      <NavLink
        component={Link}
        to="/backend-integration"
        label="Backend Integration"
        description="Partial ops + polling"
        leftSection={<IconPlugConnected size={16} />}
        active={location.pathname === "/backend-integration"}
      />
      <NavLink
        component={Link}
        to="/selection-lab"
        label="Selection Lab"
        description="Keyboard + paste + read-only"
        leftSection={<IconKeyboard size={16} />}
        active={location.pathname === "/selection-lab"}
      />
      <NavLink
        component={Link}
        to="/virtualization"
        label="Virtualization"
        description="10k rows with react-virtual"
        leftSection={<IconTable size={16} />}
        active={location.pathname === "/virtualization"}
      />
    </Stack>
  );
}

function PlaygroundShell(): React.ReactElement {
  const [navOpened, setNavOpened] = React.useState(false);

  return (
    <AppShell
      header={{ height: 72 }}
      navbar={{ width: 280, breakpoint: "sm", collapsed: { mobile: !navOpened } }}
      padding="lg"
    >
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between">
          <Group>
            <Burger opened={navOpened} onClick={() => setNavOpened((open) => !open)} hiddenFrom="sm" size="sm" />
            <div>
              <Title order={3}>Advanced DataTable Demo</Title>
              <Text size="sm" c="dimmed">Test categories and scenario-specific integrations</Text>
            </div>
          </Group>

          <Group>
            <Text size="sm" c="dimmed">Backend Integration is the main interactive backend demo.</Text>
          </Group>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p="md">
        <Text size="sm" fw={700} c="dimmed" mb="sm">
          Test categories
        </Text>
        <Navigation />
      </AppShell.Navbar>

      <AppShell.Main>
        <AppRoutes />
      </AppShell.Main>
    </AppShell>
  );
}

export function App(): React.ReactElement {
  return (
    <BackendConfigProvider>
      <BrowserRouter>
        <PlaygroundShell />
      </BrowserRouter>
    </BackendConfigProvider>
  );
}
