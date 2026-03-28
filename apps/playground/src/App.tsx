import React from "react";
import {
  ActionIcon,
  AppShell,
  Badge,
  Burger,
  Button,
  Group,
  NavLink,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import {
  IconAdjustmentsHorizontal,
  IconArrowsShuffle,
  IconHome2,
  IconKeyboard,
  IconPlugConnected,
  IconTable,
} from "@tabler/icons-react";
import { BrowserRouter, Link, useLocation } from "react-router-dom";
import { BackendConfigProvider, useBackendConfig } from "./backend/BackendConfigContext";
import { BackendConfigDrawer } from "./components/BackendConfigDrawer";
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
        to="/backend"
        label="Backend Integration"
        description="Real HTTP round-trip"
        leftSection={<IconPlugConnected size={16} />}
        active={location.pathname === "/backend"}
      />
      <NavLink
        component={Link}
        to="/selection-lab"
        label="Selection Lab"
        description="Keyboard + paste + read-only"
        leftSection={<IconKeyboard size={16} />}
        active={location.pathname === "/selection-lab"}
      />
    </Stack>
  );
}

function PlaygroundShell(): React.ReactElement {
  const [drawerOpened, { open: openDrawer, close: closeDrawer }] = useDisclosure(false);
  const [navOpened, { toggle: toggleNav }] = useDisclosure(false);
  const { backendStatus } = useBackendConfig();

  return (
    <AppShell
      header={{ height: 72 }}
      navbar={{ width: 280, breakpoint: "sm", collapsed: { mobile: !navOpened } }}
      padding="lg"
    >
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between">
          <Group>
            <Burger opened={navOpened} onClick={toggleNav} hiddenFrom="sm" size="sm" />
            <div>
              <Title order={3}>Advanced DataTable Demo</Title>
              <Text size="sm" c="dimmed">Categorías de tests y backend compartido</Text>
            </div>
          </Group>

          <Group>
            <Badge color={backendStatus === "online" ? "teal" : backendStatus === "offline" ? "red" : "gray"}>
              backend {backendStatus}
            </Badge>
            <Button leftSection={<IconAdjustmentsHorizontal size={16} />} onClick={openDrawer}>
              Backend drawer
            </Button>
            <ActionIcon component={Link} to="/backend" variant="light" aria-label="Open backend route">
              <IconPlugConnected size={18} />
            </ActionIcon>
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

      <BackendConfigDrawer opened={drawerOpened} onClose={closeDrawer} />
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
