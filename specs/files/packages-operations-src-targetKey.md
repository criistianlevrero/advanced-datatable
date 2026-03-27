# File Spec: packages/operations/src/targetKey.ts

## Purpose
Serialize TargetDescriptor values into stable string keys for indexing pending operations by target.

## Export
- serializeTarget(target)

## Behavioral Contract
1. Cell target
- Input: { type: "cell", rowId, colId }
- Output format: cell:<rowId>:<colId>

2. Row target
- Input: { type: "row", rowId }
- Output format: row:<rowId>

3. Column target
- Input: { type: "column", colId }
- Output format: column:<colId>

4. Range target
- Input: { type: "range", rowIds, colIds }
- Output format: range:<sorted-unique-rowIds>:<sorted-unique-colIds>
- Sorting is required for deterministic keys.

## Non-Functional Constraints
- Same semantic target must generate the same key.
- Different semantic targets must generate different keys.
- No mutation of input arrays.
