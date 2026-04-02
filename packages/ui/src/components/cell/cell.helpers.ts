export function parseDraftValue(
  draft: string,
  columnType: "string" | "number" | "boolean" | "date" | "custom" | undefined,
  currentValue: unknown,
): unknown {
  if (columnType === "number") {
    const trimmed = draft.trim();
    if (trimmed === "") {
      return currentValue;
    }
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : currentValue;
  }

  if (columnType === "boolean") {
    const normalized = draft.trim().toLowerCase();
    if (["true", "1", "yes", "y"].includes(normalized)) {
      return true;
    }
    if (["false", "0", "no", "n"].includes(normalized)) {
      return false;
    }
    return Boolean(currentValue);
  }

  return draft;
}
