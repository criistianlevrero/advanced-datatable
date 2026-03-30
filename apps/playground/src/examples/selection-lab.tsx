import React from "react";
import { Alert, Card, Group, List, Stack, Text, Title } from "@mantine/core";
import { IconInfoCircle } from "@tabler/icons-react";
import { DataTable, Grid } from "@advanced-datatable/ui";
import { mockTransport } from "../mocks/mockTransport";
import { selectionLabState } from "../mocks/selection-lab-data";

export function SelectionLabExample(): React.ReactElement {
  return (
    <section>
      <Stack gap="md">
        <div>
          <Title order={3} className="text-red-500">Selection and Paste Lab (10 x 30)</Title>
          <Text c="dimmed" size="sm">
            Tabla de prueba para selección por rango, copy/paste y comportamiento con columnas/celdas read-only.
          </Text>
        </div>

        <Card withBorder radius="md" padding="md">
          <Group mb="xs">
            <IconInfoCircle size={18} />
            <Title order={5}>Instrucciones de navegación por teclado</Title>
          </Group>
          <List size="sm" spacing={4}>
            <List.Item>Click para seleccionar celda activa</List.Item>
            <List.Item>Shift + click o Shift + flechas para extender selección</List.Item>
            <List.Item>Ctrl/Cmd + click para agregar rango independiente</List.Item>
            <List.Item>Flechas para mover foco</List.Item>
            <List.Item>Tab y Shift + Tab para navegar horizontalmente</List.Item>
            <List.Item>Ctrl/Cmd + A para seleccionar el rango visible completo</List.Item>
            <List.Item>Ctrl/Cmd + C y Ctrl/Cmd + V para copiar/pegar TSV</List.Item>
            <List.Item>Enter para editar celda activa (si no es read-only)</List.Item>
            <List.Item>Escape para limpiar selección de celdas</List.Item>
          </List>
        </Card>

        <Alert color="gray" variant="light" title="Read-only configurado para pruebas">
          <Text size="sm">Columnas read-only: ID y Status.</Text>
          <Text size="sm">Celdas read-only: algunas celdas en Notes (cada 5 filas).</Text>
          <Text size="sm">Columnas no-resizeables: ID y Status. El resto se puede redimensionar desde el header.</Text>
        </Alert>
          <DataTable
            transport={mockTransport}
            initialState={selectionLabState}
            viewStatePersistence={{ key: "selection-lab", includeCellSelection: true }}
          >
          <Grid showFilters resizableColumns />
        </DataTable>
      </Stack>
    </section>
  );
}
