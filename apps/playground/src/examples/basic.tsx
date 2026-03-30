import React from "react";
import { DataTable } from "@advanced-datatable/ui";
import { basicState } from "../mocks/data";
import { mockTransport } from "../mocks/mockTransport";
import { Title } from "@mantine/core";

export function BasicExample(): React.ReactElement {
  return (
    <section>
      <Title order={2}>Basic DataTable 01</Title>
      <DataTable transport={mockTransport} initialState={basicState} />
    </section>
  );
}
