import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render, waitFor } from "@testing-library/react";
import { DataTable } from "@advanced-datatable/ui";
import type { IOperationTransport } from "@advanced-datatable/api-client";
import type { TableStore } from "@advanced-datatable/store";

const transport: IOperationTransport = {
  send: vi.fn().mockResolvedValue({ results: [] }),
  loadTable: vi.fn(),
};

const VIEW_STATE_KEY = "advanced-datatable:view-state:test";

afterEach(() => {
  cleanup();
  window.localStorage.removeItem(VIEW_STATE_KEY);
});

function renderPersistentTable(onReady?: (store: TableStore) => void) {
  return render(
    <DataTable
      transport={transport}
      viewStatePersistence={{ key: VIEW_STATE_KEY, includeCellSelection: true }}
      onReady={(api) => onReady?.(api.store)}
      initialState={{
        schema: {
          columns: {
            name: { id: "name", type: "string", title: "Name", width: 150 },
            age: { id: "age", type: "number", title: "Age", width: 80 },
          },
          columnOrder: ["name", "age"],
          version: 1,
        },
        rows: new Map([
          ["r1", { id: "r1", cells: { name: { value: "Alice" }, age: { value: 30 } } }],
          ["r2", { id: "r2", cells: { name: { value: "Bob" }, age: { value: 24 } } }],
        ]),
        rowOrder: ["r1", "r2"],
      }}
    />,
  );
}

function renderPersistentTableWithoutSelection(onReady?: (store: TableStore) => void) {
  return render(
    <DataTable
      transport={transport}
      viewStatePersistence={{ key: VIEW_STATE_KEY, includeCellSelection: false }}
      onReady={(api) => onReady?.(api.store)}
      initialState={{
        schema: {
          columns: {
            name: { id: "name", type: "string", title: "Name", width: 150 },
            age: { id: "age", type: "number", title: "Age", width: 80 },
          },
          columnOrder: ["name", "age"],
          version: 1,
        },
        rows: new Map([
          ["r1", { id: "r1", cells: { name: { value: "Alice" }, age: { value: 30 } } }],
          ["r2", { id: "r2", cells: { name: { value: "Bob" }, age: { value: 24 } } }],
        ]),
        rowOrder: ["r1", "r2"],
      }}
    />,
  );
}

describe("DataTable view state persistence", () => {
  it("persists and restores sort, filters, column widths, and active cell selection", async () => {
    let firstStore: TableStore | undefined;
    const firstRender = renderPersistentTable((store) => {
      firstStore = store;
    });

    await waitFor(() => expect(firstStore).toBeDefined());

    act(() => {
      const state = firstStore!.getState();
      state.setSortState({ colId: "age", direction: "desc" });
      state.setFilter("name", { type: "string", value: "ali" });
      state.setColumnWidth("name", 260);
      state.selectCell({ rowId: "r1", colId: "name" });
      state.updateCellSelectionFocus({ rowId: "r2", colId: "age" });
    });

    firstRender.unmount();

    let secondStore: TableStore | undefined;
    renderPersistentTable((store) => {
      secondStore = store;
    });

    await waitFor(() => expect(secondStore).toBeDefined());

    await waitFor(() => {
      const state = secondStore!.getState();
      expect(state.getSortState()).toEqual({ colId: "age", direction: "desc" });
      expect(state.getFilterState().name).toEqual({ type: "string", value: "ali" });
      expect(state.getColumnWidth("name")).toBe(260);
      expect(state.getCellSelection().anchor).toEqual({ rowId: "r1", colId: "name" });
      expect(state.getCellSelection().focus).toEqual({ rowId: "r2", colId: "age" });
    });
  });

  it("does not restore cell selection when includeCellSelection is false", async () => {
    let firstStore: TableStore | undefined;
    const firstRender = renderPersistentTableWithoutSelection((store) => {
      firstStore = store;
    });

    await waitFor(() => expect(firstStore).toBeDefined());

    act(() => {
      const state = firstStore!.getState();
      state.setSortState({ colId: "age", direction: "asc" });
      state.selectCell({ rowId: "r1", colId: "name" });
      state.updateCellSelectionFocus({ rowId: "r2", colId: "age" });
    });

    firstRender.unmount();

    let secondStore: TableStore | undefined;
    renderPersistentTableWithoutSelection((store) => {
      secondStore = store;
    });

    await waitFor(() => expect(secondStore).toBeDefined());

    await waitFor(() => {
      const state = secondStore!.getState();
      expect(state.getSortState()).toEqual({ colId: "age", direction: "asc" });
      expect(state.getCellSelection().anchor).toBeNull();
      expect(state.getCellSelection().focus).toBeNull();
      expect(state.getCellSelection().ranges).toEqual([]);
    });
  });
});
