import type { TableState } from "@advanced-datatable/core";

/**
 * Shared initial state for resilience scenario examples.
 * Has an editable `value` column and a read-only `processed` column (= value × 2)
 * whose updates are simulated asynchronously by the mock transport (~1.2 s delay).
 */
export const resilienceState: Partial<TableState> = {
  schema: {
    columns: {
      name: { id: "name", type: "string", title: "Name", meta: { readOnly: true } },
      value: { id: "value", type: "number", title: "Value" },
      processed: { id: "processed", type: "number", title: "Processed (×2)", meta: { readOnly: true } },
    },
    columnOrder: ["name", "value", "processed"],
    version: 1,
  },
  rows: new Map([
    ["r1", { id: "r1", cells: { name: { value: "Alice" }, value: { value: 10 }, processed: { value: 20 } } }],
    ["r2", { id: "r2", cells: { name: { value: "Bob" }, value: { value: 15 }, processed: { value: 30 } } }],
    ["r3", { id: "r3", cells: { name: { value: "Carol" }, value: { value: 7 }, processed: { value: 14 } } }],
    ["r4", { id: "r4", cells: { name: { value: "Dave" }, value: { value: 20 }, processed: { value: 40 } } }],
    ["r5", { id: "r5", cells: { name: { value: "Eve" }, value: { value: 5 }, processed: { value: 10 } } }],
  ]),
  rowOrder: ["r1", "r2", "r3", "r4", "r5"],
};

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
