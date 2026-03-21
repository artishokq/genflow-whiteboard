import { useCallback } from "react";
import type Konva from "konva";
import type * as Y from "yjs";

import { runTrackedAction } from "../board-history";
import { findYMapById, translateYMapElementByDelta } from "../../widgets/board-canvas/model/geometry";
import type { LineEditDraftState } from "../../widgets/board-canvas/model/types";

export function useBoardElementMutations({
  ydoc,
  yElements,
  lineEditDraftRef,
  historyActor,
}: {
  ydoc: Y.Doc;
  yElements: Y.Array<Y.Map<unknown>>;
  lineEditDraftRef: React.MutableRefObject<LineEditDraftState | null>;
  historyActor: string;
}) {
  const updateTextElement = useCallback(
    (id: string, updater: (map: Y.Map<unknown>) => void) => {
      runTrackedAction({
        ydoc,
        labelKey: "board.historyAction.updatedText",
        actor: historyActor,
        fn: () => {
        const map = findYMapById(yElements, id);
        if (!map) return;
        updater(map);
        },
      });
    },
    [historyActor, ydoc, yElements],
  );

  const updateShapeElement = useCallback(
    (id: string, updater: (map: Y.Map<unknown>) => void) => {
      runTrackedAction({
        ydoc,
        labelKey: "board.historyAction.updatedShape",
        actor: historyActor,
        fn: () => {
        const map = findYMapById(yElements, id);
        if (!map) return;
        updater(map);
        },
      });
    },
    [historyActor, ydoc, yElements],
  );

  const commitFramePositionFromNode = useCallback(
    (frameId: string, node: Konva.Group) => {
      runTrackedAction({
        ydoc,
        labelKey: "board.historyAction.movedFrame",
        actor: historyActor,
        fn: () => {
        const map = findYMapById(yElements, frameId);
        if (!map) return;
        const w = Number(map.get("width"));
        const h = Number(map.get("height"));
        const newX = node.x() - w / 2;
        const newY = node.y() - h / 2;
        const oldX = Number(map.get("x"));
        const oldY = Number(map.get("y"));
        const dx = newX - oldX;
        const dy = newY - oldY;
        if (dx === 0 && dy === 0) return;
        map.set("x", newX);
        map.set("y", newY);
        for (const m of yElements) {
          if (m.get("frameId") === frameId) {
            translateYMapElementByDelta(m, dx, dy);
          }
        }
        },
      });
    },
    [historyActor, ydoc, yElements],
  );

  const mutateLinePoints = useCallback(
    (id: string, mutator: (points: number[]) => number[]) => {
      runTrackedAction({
        ydoc,
        labelKey: "board.historyAction.editedLinePoints",
        actor: historyActor,
        fn: () => {
        const map = findYMapById(yElements, id);
        if (!map) return;
        const raw = map.get("points");
        const current = typeof raw === "string" ? (JSON.parse(raw) as number[]) : [];
        map.set("points", JSON.stringify(mutator([...current])));
        },
      });
    },
    [historyActor, ydoc, yElements],
  );

  const startLineDraft = useCallback((lineId: string, points: number[]) => {
    lineEditDraftRef.current = { lineId, points: [...points] };
  }, [lineEditDraftRef]);

  const updateLineDraft = useCallback(
    (
      lineId: string,
      fallbackPoints: number[],
      updater: (points: number[]) => void,
    ) => {
      const current = lineEditDraftRef.current;
      const base =
        current && current.lineId === lineId
          ? [...current.points]
          : [...fallbackPoints];
      updater(base);
      lineEditDraftRef.current = { lineId, points: base };
    },
    [lineEditDraftRef],
  );

  const commitAndClearLineDraft = useCallback(
    (lineId: string) => {
      const draft = lineEditDraftRef.current;
      if (draft && draft.lineId === lineId) {
        mutateLinePoints(lineId, () => [...draft.points]);
      }
      lineEditDraftRef.current = null;
    },
    [lineEditDraftRef, mutateLinePoints],
  );

  return {
    updateTextElement,
    updateShapeElement,
    commitFramePositionFromNode,
    startLineDraft,
    updateLineDraft,
    commitAndClearLineDraft,
  };
}
