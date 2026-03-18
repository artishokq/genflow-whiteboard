import { useEffect, useState } from "react";
import type * as Y from "yjs";

import type { BoardElement } from "../../../entities/board";
import { parseBoardElement } from "../../../entities/board";
import type { CanvasBounds } from "./types";

function readCanvasBoundsFromY(
  yCanvas: Y.Map<unknown>,
  fallback: CanvasBounds,
): CanvasBounds {
  const minX = Number(yCanvas.get("minX"));
  const minY = Number(yCanvas.get("minY"));
  const maxX = Number(yCanvas.get("maxX"));
  const maxY = Number(yCanvas.get("maxY"));
  if (
    Number.isFinite(minX) &&
    Number.isFinite(minY) &&
    Number.isFinite(maxX) &&
    Number.isFinite(maxY) &&
    maxX > minX &&
    maxY > minY
  ) {
    return { minX, minY, maxX, maxY };
  }
  return fallback;
}

function readElementsFromY(yElements: Y.Array<Y.Map<unknown>>): BoardElement[] {
  const next: BoardElement[] = [];
  for (const m of yElements) {
    const raw = Object.fromEntries(m.entries()) as Record<string, unknown>;
    const parsed = parseBoardElement(raw);
    if (parsed) {
      next.push(parsed);
    }
  }
  return next;
}

export function useBoardCanvasYSync({
  yCanvas,
  yElements,
  initialBounds,
}: {
  yCanvas: Y.Map<unknown>;
  yElements: Y.Array<Y.Map<unknown>>;
  initialBounds: CanvasBounds;
}) {
  const [canvasBounds, setCanvasBounds] = useState<CanvasBounds>(() =>
    readCanvasBoundsFromY(yCanvas, initialBounds),
  );
  const [elements, setElements] = useState<BoardElement[]>(() =>
    readElementsFromY(yElements),
  );

  useEffect(() => {
    const onCanvasChange = () => {
      setCanvasBounds(readCanvasBoundsFromY(yCanvas, initialBounds));
    };
    yCanvas.observe(onCanvasChange);
    return () => {
      yCanvas.unobserve(onCanvasChange);
    };
  }, [initialBounds, yCanvas]);

  useEffect(() => {
    const onElementsDeepChange = () => {
      setElements(readElementsFromY(yElements));
    };
    yElements.observeDeep(onElementsDeepChange);
    return () => {
      yElements.unobserveDeep(onElementsDeepChange);
    };
  }, [yElements]);

  return { canvasBounds, elements };
}
