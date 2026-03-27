export * from "./models";
export { insertIntoOrder, removeFromOrder, ensureRow } from "./engine/utils";
export { getCell, getColumn, getRow } from "./engine/selectors";
export type { IApplyStrategy } from "./engine/IApplyStrategy";
export type { ITableEngine } from "./engine/ITableEngine";
export { TableEngineImpl } from "./TableEngineImpl";
