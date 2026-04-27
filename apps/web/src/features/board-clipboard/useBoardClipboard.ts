import { useCallback, useEffect, useRef, useState } from "react";
import * as Y from "yjs";
import { runTrackedAction } from "../board-history";
import { generateId } from "../../shared/lib/generateId";

export function useBoardClipboard({
  ydoc,
  yElements,
  findYMapById,
  selectedIds,
  setSelectedIds,
  editingTextId,
  historyActor,
}: {
  ydoc: Y.Doc;
  yElements: Y.Array<Y.Map<unknown>>;
  findYMapById: (
    arr: Y.Array<Y.Map<unknown>>,
    id: string,
  ) => Y.Map<unknown> | null;
  selectedIds: string[];
  setSelectedIds: React.Dispatch<React.SetStateAction<string[]>>;
  editingTextId: string | null;
  historyActor: string;
}) {
  const clipboardRef = useRef<Record<string, unknown>[] | null>(null);
  const [clipboardHasItems, setClipboardHasItems] = useState(false);

  const copyIds = useCallback(
    (ids: string[]) => {
      const payload: Record<string, unknown>[] = [];
      for (const id of ids) {
        const map = findYMapById(yElements, id);
        if (!map) continue;
        payload.push(map.toJSON() as Record<string, unknown>);
      }
      clipboardRef.current = payload.length > 0 ? payload : null;
      setClipboardHasItems(payload.length > 0);
    },
    [findYMapById, yElements],
  );

  const deleteIds = useCallback(
    (ids: string[]) => {
      if (ids.length === 0) return;
      const remove = new Set(ids);
      let expanded = true;
      while (expanded) {
        expanded = false;
        for (const m of yElements) {
          const id = m.get("id");
          const fid = m.get("frameId");
          if (typeof id !== "string" || remove.has(id)) {
            continue;
          }
          if (typeof fid === "string" && remove.has(fid)) {
            remove.add(id);
            expanded = true;
          }
        }
      }
      runTrackedAction({
        ydoc,
        labelKey:
          ids.length > 1
            ? "board.historyAction.deletedItemsMany"
            : "board.historyAction.deletedItem",
        ...(ids.length > 1 ? { labelValues: { count: ids.length } } : {}),
        actor: historyActor,
        fn: () => {
        for (let i = yElements.length - 1; i >= 0; i--) {
          const m = yElements.get(i);
          const id = m.get("id");
          if (typeof id === "string" && remove.has(id)) {
            yElements.delete(i, 1);
          }
        }
        },
      });
      setSelectedIds((prev) => prev.filter((id) => !remove.has(id)));
    },
    [historyActor, setSelectedIds, ydoc, yElements],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (editingTextId) {
        return;
      }
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") {
        return;
      }
      if (e.key !== "Delete" && e.key !== "Backspace") {
        return;
      }
      if (selectedIds.length === 0) {
        return;
      }
      e.preventDefault();
      deleteIds(selectedIds);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [deleteIds, editingTextId, selectedIds]);

  const duplicateFromPayload = useCallback(
    (payload: Record<string, unknown>[]) => {
      if (payload.length === 0) return;
      const created: string[] = [];
      runTrackedAction({
        ydoc,
        labelKey:
          payload.length > 1
            ? "board.historyAction.duplicatedItemsMany"
            : "board.historyAction.duplicatedItem",
        ...(payload.length > 1
          ? { labelValues: { count: payload.length } }
          : {}),
        actor: historyActor,
        fn: () => {
        const idMap = new Map<string, string>();
        const pushed: Y.Map<unknown>[] = [];
        for (const raw of payload) {
          const map = new Y.Map<unknown>();
          const oldId = typeof raw.id === "string" ? raw.id : "";
          const newId = generateId();
          if (oldId) {
            idMap.set(oldId, newId);
          }
          created.push(newId);
          for (const [k, v] of Object.entries(raw)) {
            map.set(k, v as unknown);
          }
          map.set("id", newId);
          const x = Number(raw.x);
          const y = Number(raw.y);
          map.set("x", Number.isFinite(x) ? x + 24 : 24);
          map.set("y", Number.isFinite(y) ? y + 24 : 24);
          if (raw.type === "line" && typeof raw.points === "string") {
            try {
              const pts = JSON.parse(raw.points) as number[];
              for (let i = 0; i < pts.length; i += 2) {
                pts[i] += 24;
                pts[i + 1] += 24;
              }
              map.set("points", JSON.stringify(pts));
            } catch {
              /* ignore */
            }
          }
          pushed.push(map);
        }
        for (const map of pushed) {
          const fid = map.get("frameId");
          if (typeof fid === "string" && idMap.has(fid)) {
            map.set("frameId", idMap.get(fid)!);
          }
        }
        if (pushed.length > 0) {
          yElements.push(pushed);
        }
        },
      });
      setSelectedIds(created);
    },
    [historyActor, setSelectedIds, ydoc, yElements],
  );

  const duplicateIds = useCallback(
    (ids: string[]) => {
      const payload: Record<string, unknown>[] = [];
      for (const id of ids) {
        const map = findYMapById(yElements, id);
        if (!map) continue;
        payload.push(map.toJSON() as Record<string, unknown>);
      }
      duplicateFromPayload(payload);
    },
    [duplicateFromPayload, findYMapById, yElements],
  );

  const pasteClipboard = useCallback(() => {
    const payload = clipboardRef.current;
    if (!payload || payload.length === 0) return;
    duplicateFromPayload(payload);
  }, [duplicateFromPayload]);

  return {
    clipboardHasItems,
    copyIds,
    deleteIds,
    duplicateIds,
    pasteClipboard,
  };
}
