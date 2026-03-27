import type { Row } from "./row";
import type { TableSchema } from "./schema";

export interface TableState {
  schema: TableSchema;
  rows: Map<string, Row>;
  rowOrder: string[];
}
