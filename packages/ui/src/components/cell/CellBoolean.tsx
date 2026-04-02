import React from "react";
import type { CellEditorProps } from "./CellEditorTypes";

export function CellBoolean({ draft, setDraft, commit, cancel }: CellEditorProps): React.ReactElement {
  return (
    <select
      autoFocus
      value={draft.toLowerCase() === "true" ? "true" : "false"}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          cancel();
        }
      }}
      className="w-full rounded border border-(--dt-border) bg-(--dt-bg) px-1 py-0.5 text-sm focus:ring-2 focus:ring-(--dt-primary)"
    >
      <option value="true">true</option>
      <option value="false">false</option>
    </select>
  );
}
