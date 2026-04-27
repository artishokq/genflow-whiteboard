import { useCallback, useRef } from "react";
import type Konva from "konva";
import type * as Y from "yjs";

import { runTrackedAction } from "../board-history";
import type { BoardElement } from "../../entities/board";

type Box = {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
};

export function useMultiSelectionLineTransform({
  trRef,
  elements,
  ydoc,
  yElements,
  findYMapById,
  historyActor,
}: {
  trRef: React.RefObject<Konva.Transformer | null>;
  elements: BoardElement[];
  ydoc: Y.Doc;
  yElements: Y.Array<Y.Map<unknown>>;
  findYMapById: (arr: Y.Array<Y.Map<unknown>>, id: string) => Y.Map<unknown> | null;
  historyActor: string;
}) {
  const lineTransformBasesRef = useRef<
    Map<
      string,
      {
        absPoints: number[];
        nodeClassName: string;
      }
    >
  >(new Map());
  const transformBoxRef = useRef<{ oldBox: Box; newBox: Box } | null>(null);

  const onTransformStart = useCallback(() => {
    transformBoxRef.current = null;
    const tr = trRef.current;
    lineTransformBasesRef.current.clear();
    if (!tr) {
      return;
    }
    for (const node of tr.nodes()) {
      const id = node.id();
      if (!id) {
        continue;
      }
      const el = elements.find((item) => item.id === id);
      if (!el || el.type !== "line") {
        continue;
      }
      const absPoints: number[] = [];
      if (node.getClassName() === "Line") {
        const lineNode = node as Konva.Line;
        const nodePts = lineNode.points();
        const nx = lineNode.x();
        const ny = lineNode.y();
        for (let i = 0; i < nodePts.length; i += 2) {
          absPoints.push((nodePts[i] ?? 0) + nx, (nodePts[i + 1] ?? 0) + ny);
        }
      } else {
        for (let i = 0; i < el.points.length; i += 2) {
          absPoints.push(el.x + (el.points[i] ?? 0), el.y + (el.points[i + 1] ?? 0));
        }
      }
      lineTransformBasesRef.current.set(id, {
        absPoints,
        nodeClassName: node.getClassName(),
      });
    }
  }, [elements, trRef]);

  const onTransformEnd = useCallback(() => {
    const tr = trRef.current;
    if (!tr) {
      return;
    }
    const lineBases = lineTransformBasesRef.current;
    const targets = tr
      .nodes()
      .map((node) => {
        const id = node.id();
        if (!id) {
          return null;
        }
        const base = lineBases.get(id);
        if (!base) {
          return null;
        }
        return { id, node, base };
      })
      .filter(Boolean) as Array<{
      id: string;
      node: Konva.Node;
      base: {
        absPoints: number[];
        nodeClassName: string;
      };
    }>;
    if (targets.length === 0) {
      return;
    }
    const transformBox = transformBoxRef.current;
    if (!transformBox) {
      lineTransformBasesRef.current.clear();
      return;
    }
    const oldW = Math.max(1e-6, transformBox.oldBox.width);
    const oldH = Math.max(1e-6, transformBox.oldBox.height);
    const fx = transformBox.newBox.width / oldW;
    const fy = transformBox.newBox.height / oldH;
    runTrackedAction({
      ydoc,
      labelKey: "board.historyAction.transformedStroke",
      actor: historyActor,
      fn: () => {
        for (const target of targets) {
          const { id, node, base } = target;
          const map = findYMapById(yElements, id);
          if (!map || map.get("type") !== "line") {
            continue;
          }
          const absPts: number[] = [];
          for (let i = 0; i < base.absPoints.length; i += 2) {
            const wx = base.absPoints[i] ?? 0;
            const wy = base.absPoints[i + 1] ?? 0;
            absPts.push(
              transformBox.newBox.x + (wx - transformBox.oldBox.x) * fx,
              transformBox.newBox.y + (wy - transformBox.oldBox.y) * fy,
            );
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
          map.set("x", minPx);
          map.set("y", minPy);
          map.set("points", JSON.stringify(rel));
          if (base.nodeClassName === "Line") {
            node.x(0);
            node.y(0);
            node.scaleX(1);
            node.scaleY(1);
          }
        }
      },
    });
    transformBoxRef.current = null;
    lineTransformBasesRef.current.clear();
  }, [findYMapById, historyActor, trRef, yElements, ydoc]);

  const boundBoxFunc = useCallback((oldBox: Box, newBox: Box) => {
    if (newBox.width < 12 || newBox.height < 12) {
      return oldBox;
    }
    transformBoxRef.current = { oldBox, newBox };
    return newBox;
  }, []);

  return {
    onTransformStart,
    onTransformEnd,
    boundBoxFunc,
  };
}
