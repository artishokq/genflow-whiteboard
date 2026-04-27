import { useCallback, useEffect, useMemo, useState } from "react";
import type * as Y from "yjs";

import type { BoardHistoryEntry } from "./historyOrigins";
import { consumePendingHistoryAction } from "./localActionQueue";

const MAX_HISTORY_ENTRIES = 40;
type UndoRedoKind = "undo" | "redo";

export function useBoardHistory({
  undoManager,
  actorName,
}: {
  undoManager: Y.UndoManager;
  actorName: string;
}) {
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [entries, setEntries] = useState<BoardHistoryEntry[]>([]);

  const syncStackState = useCallback(() => {
    setCanUndo(undoManager.undoStack.length > 0);
    setCanRedo(undoManager.redoStack.length > 0);
  }, [undoManager]);

  useEffect(() => {
    syncStackState();
    const onStackItemAdded = () => {
      const pending = consumePendingHistoryAction();
      setEntries((prev) => [
        {
          id: crypto.randomUUID(),
          labelKey: pending?.labelKey ?? "board.historyAction.canvasEdit",
          ...(pending?.labelValues ? { labelValues: pending.labelValues } : {}),
          actor: pending?.actor ?? (actorName.trim() || "Unknown user"),
          at: Date.now(),
          kind: "edit",
        },
        ...prev.slice(0, MAX_HISTORY_ENTRIES - 1),
      ]);
      syncStackState();
    };
    const onStackItemPopped = (evt: unknown, _undoManager: Y.UndoManager) => {
      const kind: UndoRedoKind =
        (evt as { type?: UndoRedoKind } | null)?.type === "redo"
          ? "redo"
          : "undo";
      consumePendingHistoryAction();
      setEntries((prev) => [
        {
          id: crypto.randomUUID(),
          labelKey:
            kind === "undo"
              ? "board.historyAction.undo"
              : "board.historyAction.redo",
          actor: actorName.trim() || "Unknown user",
          at: Date.now(),
          kind,
        },
        ...prev.slice(0, MAX_HISTORY_ENTRIES - 1),
      ]);
      syncStackState();
    };
    const onStackItemUpdated = () => {
      const pending = consumePendingHistoryAction();
      if (pending) {
        setEntries((prev) => {
          if (prev.length === 0) {
            return prev;
          }
          const [first, ...rest] = prev;
          if (first.kind !== "edit") {
            return prev;
          }
          return [
            {
              ...first,
              labelKey: pending.labelKey,
              ...(pending.labelValues ? { labelValues: pending.labelValues } : {}),
              actor: pending.actor,
              at: Date.now(),
            },
            ...rest,
          ];
        });
      }
      syncStackState();
    };
    undoManager.on("stack-item-added", onStackItemAdded);
    undoManager.on("stack-item-popped", onStackItemPopped);
    undoManager.on("stack-item-updated", onStackItemUpdated);
    return () => {
      undoManager.off("stack-item-added", onStackItemAdded);
      undoManager.off("stack-item-popped", onStackItemPopped);
      undoManager.off("stack-item-updated", onStackItemUpdated);
    };
  }, [actorName, syncStackState, undoManager]);

  const undo = useCallback(() => {
    undoManager.stopCapturing();
    undoManager.undo();
    syncStackState();
  }, [syncStackState, undoManager]);

  const redo = useCallback(() => {
    undoManager.stopCapturing();
    undoManager.redo();
    syncStackState();
  }, [syncStackState, undoManager]);

  return useMemo(
    () => ({
      canUndo,
      canRedo,
      entries,
      undo,
      redo,
    }),
    [canRedo, canUndo, entries, redo, undo],
  );
}
