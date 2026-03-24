type PendingHistoryAction = {
  labelKey: string;
  labelValues?: Record<string, string | number>;
  actor: string;
};

let pendingAction: PendingHistoryAction | null = null;

export function pushPendingHistoryAction(action: PendingHistoryAction) {
  // Keep only the latest local action metadata to avoid stale labels leaking
  // when UndoManager merges multiple transactions into one stack item.
  pendingAction = action;
}

export function consumePendingHistoryAction(): PendingHistoryAction | null {
  if (!pendingAction) return null;
  const next = pendingAction;
  pendingAction = null;
  return next;
}
