export interface CellEditorProps {
  draft: string;
  setDraft: (value: string) => void;
  commit: () => void;
  cancel: () => void;
}
