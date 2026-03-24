export const LOCAL_HISTORY_ORIGIN = "board-local-user-action";
export const SYSTEM_HISTORY_ORIGIN = "board-system-sync";

export type BoardHistoryEntry = {
  id: string;
  labelKey: string;
  labelValues?: Record<string, string | number>;
  actor: string;
  at: number;
  kind: "undo" | "redo" | "edit";
};
