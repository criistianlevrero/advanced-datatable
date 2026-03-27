import type { TableState } from "@advanced-datatable/core";

export const basicState: Partial<TableState> = {
  schema: {
    columns: {
      name: { id: "name", type: "string", title: "Name" },
      age: { id: "age", type: "number", title: "Age" },
      active: { id: "active", type: "boolean", title: "Active" },
    },
    columnOrder: ["name", "age", "active"],
    version: 1,
  },
  rows: new Map([
    ["r1", { id: "r1", cells: { name: { value: "Alice" }, age: { value: 30 }, active: { value: true } } }],
    ["r2", { id: "r2", cells: { name: { value: "Bob" }, age: { value: 25 }, active: { value: false } } }],
    ["r3", { id: "r3", cells: { name: { value: "Carol" }, age: { value: 35 }, active: { value: true } } }],
  ]),
  rowOrder: ["r1", "r2", "r3"],
};
