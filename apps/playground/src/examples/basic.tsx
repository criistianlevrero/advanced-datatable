import React from "react";
import { DataTable } from "@advanced-datatable/ui";
import { basicState } from "../mocks/data";
import { mockTransport } from "../mocks/mockTransport";

export function BasicExample(): React.ReactElement {
  return (
    <section>
      <h2>Basic DataTable</h2>
      <DataTable transport={mockTransport} initialState={basicState} />
    </section>
  );
}
