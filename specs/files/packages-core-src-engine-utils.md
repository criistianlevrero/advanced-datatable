# File Spec: packages/core/src/engine/utils.ts

## Purpose
Provide deterministic utility helpers used by the core engine for ordered ID arrays and row upsert behavior.

## Exports
- insertIntoOrder(order, id, index?)
- removeFromOrder(order, id)
- ensureRow(state, rowId)

## Behavioral Contract
1. insertIntoOrder
- Appends id when index is undefined, negative, or out of range.
- Inserts at exact index when valid.
- Mutates provided array in place.

2. removeFromOrder
- Removes every occurrence of id from the array.
- No-op if id is not present.
- Mutates provided array in place.

3. ensureRow
- Returns existing row if present in state.rows.
- Creates a row with empty cells when row is missing.
- Adds created row ID to state.rowOrder if not present.
- Must not create duplicate rowOrder entries.

## Non-Functional Constraints
- No side effects outside input objects.
- No random values.
- Deterministic output for deterministic input.
