import type { TableState } from "@advanced-datatable/core";

export const selectionLabState: Partial<TableState> = {
  schema: {
    columns: {
      id: { id: "id", type: "string", title: "ID", width: 120, meta: { readOnly: true, resizable: false } },
      firstName: { id: "firstName", type: "string", title: "First Name", width: 150 },
      lastName: { id: "lastName", type: "string", title: "Last Name", width: 150 },
      age: { id: "age", type: "number", title: "Age", width: 90 },
      score: { id: "score", type: "number", title: "Score", width: 100 },
      active: { id: "active", type: "boolean", title: "Active", width: 100 },
      startDate: { id: "startDate", type: "date", title: "Start Date", width: 130 },
      status: { id: "status", type: "string", title: "Status", width: 120, meta: { readOnly: true, resizable: false } },
      budget: { id: "budget", type: "number", title: "Budget", width: 120 },
      notes: { id: "notes", type: "string", title: "Notes", width: 220 },
    },
    columnOrder: ["id", "firstName", "lastName", "age", "score", "active", "startDate", "status", "budget", "notes"],
    version: 1,
  },
  rows: new Map(
    Array.from({ length: 30 }, (_, index) => {
      const rowNumber = index + 1;
      const rowId = `r${rowNumber}`;
      const month = String((index % 12) + 1).padStart(2, "0");
      const day = String((index % 28) + 1).padStart(2, "0");
      const status = index % 3 === 0 ? "draft" : index % 3 === 1 ? "review" : "approved";

      return [
        rowId,
        {
          id: rowId,
          cells: {
            id: { value: `EMP-${String(rowNumber).padStart(3, "0")}` },
            firstName: { value: `Name ${rowNumber}` },
            lastName: { value: `Surname ${rowNumber}` },
            age: { value: 20 + (index % 25) },
            score: { value: 60 + ((index * 7) % 40) },
            active: { value: index % 2 === 0 },
            startDate: { value: `2026-${month}-${day}` },
            status: { value: status },
            budget: { value: 1000 + index * 137 },
            notes: {
              value: index % 5 === 0 ? "Cell read-only sample" : `Note ${rowNumber}`,
              meta: index % 5 === 0 ? { readOnly: true } : undefined,
            },
          },
        },
      ];
    }),
  ),
  rowOrder: Array.from({ length: 30 }, (_, index) => `r${index + 1}`),
};
