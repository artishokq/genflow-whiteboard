import { useCallback, useRef } from "react";
import type Konva from "konva";
import type * as Y from "yjs";
import { runTrackedAction } from "../board-history";

import type { BoardElement, BoardFrameElement } from "../../entities/board";

export function useBoardTransforms({
  trRef,
  updateTextElement,
  updateShapeElement,
  ydoc,
  yElements,
  findYMapById,
  historyActor,
}: {
  trRef: React.RefObject<Konva.Transformer | null>;
  updateTextElement: (id: string, updater: (map: Y.Map<unknown>) => void) => void;
  updateShapeElement: (id: string, updater: (map: Y.Map<unknown>) => void) => void;
  ydoc: Y.Doc;
  yElements: Y.Array<Y.Map<unknown>>;
  findYMapById: (arr: Y.Array<Y.Map<unknown>>, id: string) => Y.Map<unknown> | null;
  historyActor: string;
}) {
  const activeTransformAnchorRef = useRef<string | null>(null);
  const textTransformBaseRef = useRef<{
    id: string;
    width: number;
    fontSize: number;
  } | null>(null);
  const frameTransformBaseRef = useRef<{
    id: string;
    width: number;
    height: number;
  } | null>(null);
  const lineTransformBaseRef = useRef<{
    id: string;
    minX: number;
    minY: number;
    w: number;
    h: number;
    lineX: number;
    lineY: number;
    points: number[];
  } | null>(null);
  const lineGroupDragStartRef = useRef<{
    id: string;
    gx: number;
    gy: number;
    lineX: number;
    lineY: number;
  } | null>(null);

  const applyTextTransform = useCallback(
    (
      node: Konva.Node,
      el: Extract<BoardElement, { type: "text" }>,
      finalize: boolean,
    ) => {
      if (node.getClassName() !== "Group") return;
      const groupNode = node as Konva.Group;
      const anchor =
        activeTransformAnchorRef.current ??
        trRef.current?.getActiveAnchor() ??
        "";
      const sideResize = anchor === "middle-left" || anchor === "middle-right";
      const sx = groupNode.scaleX();
      const sy = groupNode.scaleY();
      const base = textTransformBaseRef.current;
      const baseW = base?.id === el.id ? base.width : el.width;
      const baseFs = base?.id === el.id ? base.fontSize : el.fontSize;

      let nextWidth: number;
      let nextFontSize: number | null = null;

      if (sideResize) {
        nextWidth = Math.max(40, baseW * Math.abs(sx));
      } else if (el.textKind === "sticker") {
        const u = (Math.abs(sx) + Math.abs(sy)) / 2;
        nextWidth = Math.max(40, baseW * u);
        nextFontSize = Math.max(8, baseFs * u);
      } else {
        const scaleFactor = Math.max(0.2, Math.max(Math.abs(sx), Math.abs(sy)));
        nextWidth = Math.max(40, baseW * Math.abs(sx));
        nextFontSize = Math.max(8, baseFs * scaleFactor);
      }

      updateTextElement(el.id, (map) => {
        map.set("x", groupNode.x());
        map.set("y", groupNode.y());
        map.set("width", nextWidth);
        if (!sideResize && nextFontSize !== null) {
          map.set("fontSize", nextFontSize);
        }
      });

      groupNode.scaleX(1);
      groupNode.scaleY(1);
      if (finalize) {
        activeTransformAnchorRef.current = null;
        if (textTransformBaseRef.current?.id === el.id) {
          textTransformBaseRef.current = null;
        }
      }
    },
    [trRef, updateTextElement],
  );

  const applyFrameTransform = useCallback(
    (node: Konva.Node, el: BoardFrameElement, finalize: boolean) => {
      if (node.getClassName() !== "Group") return;
      const g = node as Konva.Group;
      const sx = g.scaleX();
      const sy = g.scaleY();
      const base = frameTransformBaseRef.current;
      const baseW = base?.id === el.id ? base.width : el.width;
      const baseH = base?.id === el.id ? base.height : el.height;
      const cx = g.x();
      const cy = g.y();
      const newW = Math.max(40, baseW * Math.abs(sx));
      const newH = Math.max(40, baseH * Math.abs(sy));
      const newX = cx - newW / 2;
      const newY = cy - newH / 2;
      updateShapeElement(el.id, (map) => {
        map.set("x", newX);
        map.set("y", newY);
        map.set("width", newW);
        map.set("height", newH);
      });
      g.scaleX(1);
      g.scaleY(1);
      if (finalize && frameTransformBaseRef.current?.id === el.id) {
        frameTransformBaseRef.current = null;
      }
    },
    [updateShapeElement],
  );

  const applyFreehandLineTransform = useCallback(
    (node: Konva.Node, finalize: boolean) => {
      if (node.getClassName() !== "Group") return;
      const g = node as Konva.Group;
      const base = lineTransformBaseRef.current;
      const nid = g.id();
      if (!base || base.id !== nid) return;
      const bw = Math.max(1e-6, base.w);
      const bh = Math.max(1e-6, base.h);
      const sx = g.scaleX();
      const sy = g.scaleY();
      const newW = Math.max(4, bw * Math.abs(sx));
      const newH = Math.max(4, bh * Math.abs(sy));
      const fx = newW / bw;
      const fy = newH / bh;
      const gx = g.x();
      const gy = g.y();
      const absPts: number[] = [];
      for (let i = 0; i < base.points.length; i += 2) {
        const wx = base.lineX + (base.points[i] ?? 0);
        const wy = base.lineY + (base.points[i + 1] ?? 0);
        absPts.push(gx + (wx - base.minX) * fx, gy + (wy - base.minY) * fy);
      }
      let minPx = Infinity;
      let minPy = Infinity;
      for (let i = 0; i < absPts.length; i += 2) {
        minPx = Math.min(minPx, absPts[i] ?? 0);
        minPy = Math.min(minPy, absPts[i + 1] ?? 0);
      }
      if (!Number.isFinite(minPx)) {
        minPx = 0;
        minPy = 0;
      }
      const rel: number[] = [];
      for (let i = 0; i < absPts.length; i += 2) {
        rel.push((absPts[i] ?? 0) - minPx, (absPts[i + 1] ?? 0) - minPy);
      }
      runTrackedAction({
        ydoc,
        labelKey: "board.historyAction.transformedStroke",
        actor: historyActor,
        fn: () => {
        const map = findYMapById(yElements, base.id);
        if (!map) return;
        map.set("x", minPx);
        map.set("y", minPy);
        map.set("points", JSON.stringify(rel));
        },
      });
      g.scaleX(1);
      g.scaleY(1);
      if (finalize) {
        activeTransformAnchorRef.current = null;
        if (lineTransformBaseRef.current?.id === base.id) {
          lineTransformBaseRef.current = null;
        }
      }
    },
    [findYMapById, historyActor, ydoc, yElements],
  );

  return {
    activeTransformAnchorRef,
    textTransformBaseRef,
    frameTransformBaseRef,
    lineTransformBaseRef,
    lineGroupDragStartRef,
    applyTextTransform,
    applyFrameTransform,
    applyFreehandLineTransform,
  };
}
