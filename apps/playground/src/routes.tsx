import React from "react";
import { Button, Card, Group, SimpleGrid, Stack, Text, ThemeIcon, Title } from "@mantine/core";
import { IconArrowsShuffle, IconKeyboard, IconPlugConnected, IconTable } from "@tabler/icons-react";
import { Link, Route, Routes } from "react-router-dom";
import { BasicExample } from "./examples/basic";
import { BulkEditExample } from "./examples/bulk-edit";
import { SchemaDynamicExample } from "./examples/schema-dynamic";
import { ReplayOnReconnectExample } from "./examples/replay-on-reconnect";
import { ErrorRecoveryExample } from "./examples/error-recovery";
import { PartialResponseExample } from "./examples/partial-response";
import { EndToEndExample } from "./examples/end-to-end";
import { SelectionLabExample } from "./examples/selection-lab";

function OverviewPage(): React.ReactElement {
  return (
    <Stack gap="xl">
      <div>
        <Title order={1}>Advanced DataTable Playground</Title>
        <Text c="dimmed" mt="sm">
          Navegá por categorías de tests para validar operaciones base, resiliencia y escenarios con backend real.
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
            Edición básica, operaciones en lote y cambios de esquema.
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
            Replay, recuperación frente a errores y respuestas parciales.
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
            Demo end-to-end con HTTP real y configuración global del backend.
          </Text>
          <Button component={Link} to="/backend" variant="light" color="teal">
            Open backend tests
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
            Escenario dedicado a selección, atajos de teclado y copy/paste con read-only.
          </Text>
          <Button component={Link} to="/selection-lab" variant="light" color="grape">
            Open selection lab
          </Button>
        </Card>
      </SimpleGrid>
    </Stack>
  );
}

function CorePage(): React.ReactElement {
  return (
    <Stack gap="xl">
      <div>
        <Title order={2}>Core Scenarios</Title>
        <Text c="dimmed">Validación de edición, bulk operations y cambios dinámicos de schema.</Text>
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
        <Text c="dimmed">Simulaciones locales para reconexión, errores retryable y respuestas incompletas.</Text>
      </div>
      <ReplayOnReconnectExample />
      <ErrorRecoveryExample />
      <PartialResponseExample />
    </Stack>
  );
}

function BackendPage(): React.ReactElement {
  return (
    <Stack gap="xl">
      <div>
        <Title order={2}>Backend Integration</Title>
        <Text c="dimmed">
          Esta ruta usa el backend mock real. El drawer global permite cambiar su configuración sin salir de la vista.
        </Text>
      </div>
      <EndToEndExample />
    </Stack>
  );
}

function SelectionLabPage(): React.ReactElement {
  return (
    <Stack gap="xl">
      <div>
        <Title order={2}>Selection Lab</Title>
        <Text c="dimmed">
          Tabla grande (10x30) para validar selección, navegación por teclado, copy/paste y restricciones read-only.
        </Text>
      </div>
      <SelectionLabExample />
    </Stack>
  );
}

export function AppRoutes(): React.ReactElement {
  return (
    <Routes>
      <Route path="/" element={<OverviewPage />} />
      <Route path="/core" element={<CorePage />} />
      <Route path="/resilience" element={<ResiliencePage />} />
      <Route path="/backend" element={<BackendPage />} />
      <Route path="/selection-lab" element={<SelectionLabPage />} />
    </Routes>
  );
}
