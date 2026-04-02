import React from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { DataTable } from "@advanced-datatable/ui";
import type { IOperationTransport } from "@advanced-datatable/api-client";
import type {
  CellProps,
  GridFilterMenuProps,
  GridHeaderProps,
  GridRowProps,
} from "@advanced-datatable/ui";

const transport: IOperationTransport = {
  send: vi.fn().mockResolvedValue({ results: [] }),
  loadTable: vi.fn(),
};

afterEach(() => {
  cleanup();
});

function baseState() {
  return {
    schema: {
      columns: {
        label: { id: "label", type: "string" as const, title: "Label" },
      },
      columnOrder: ["label"],
      version: 1,
    },
    rows: new Map([["r1", { id: "r1", cells: { label: { value: "Row 1" } } }]]),
    rowOrder: ["r1"],
  };
}

describe("Grid composable overrides", () => {
  it("uses HeaderComponent override", () => {
    const CustomHeader: React.FC<GridHeaderProps> = () => (
      <thead data-testid="custom-header">
        <tr>
          <th>Custom Header</th>
        </tr>
      </thead>
    );

    render(
      <DataTable
        transport={transport}
        initialState={baseState()}
        HeaderComponent={CustomHeader}
      />,
    );

    expect(screen.getByTestId("custom-header")).toBeTruthy();
    expect(screen.getByText("Custom Header")).toBeTruthy();
  });

  it("uses RowComponent override", () => {
    const CustomRow: React.FC<GridRowProps> = ({ rowId }) => (
      <tr data-testid={`custom-row-${rowId}`}>
        <td>Row override {rowId}</td>
      </tr>
    );

    render(
      <DataTable
        transport={transport}
        initialState={baseState()}
        RowComponent={CustomRow}
      />,
    );

    expect(screen.getByTestId("custom-row-r1")).toBeTruthy();
    expect(screen.getByText("Row override r1")).toBeTruthy();
  });

  it("uses CellComponent override", () => {
    const CustomCell: React.FC<CellProps> = ({ rowId, colId }) => (
      <td data-testid={`custom-cell-${rowId}-${colId}`}>Cell override</td>
    );

    render(
      <DataTable
        transport={transport}
        initialState={baseState()}
        CellComponent={CustomCell}
      />,
    );

    expect(screen.getByTestId("custom-cell-r1-label")).toBeTruthy();
    expect(screen.getByText("Cell override")).toBeTruthy();
  });

  it("uses FilterMenuComponent override", () => {
    const CustomFilterMenu: React.FC<GridFilterMenuProps> = ({ colId }) => (
      <div data-testid={`custom-filter-${colId}`}>Filter override {colId}</div>
    );

    render(
      <DataTable
        transport={transport}
        initialState={baseState()}
        showFilters
        FilterMenuComponent={CustomFilterMenu}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Filter Label" }));

    expect(screen.getByTestId("custom-filter-label")).toBeTruthy();
    expect(screen.getByText("Filter override label")).toBeTruthy();
  });
});
