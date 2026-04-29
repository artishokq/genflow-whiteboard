import { useMemo } from "react";

import { GRID_STEP } from "../../widgets/board-canvas/model/constants";
import { worldBounds } from "../../widgets/board-canvas/model/geometry";
import type { CanvasBounds } from "../../widgets/board-canvas/model/types";

export function useBoardGrid({
  size,
  stagePos,
  scale,
  canvasBounds,
}: {
  size: { w: number; h: number };
  stagePos: { x: number; y: number };
  scale: number;
  canvasBounds: CanvasBounds;
}) {
  return useMemo(() => {
    const vp = worldBounds(size.w, size.h, stagePos, scale);
    let worldLeft = vp.worldLeft;
    let worldTop = vp.worldTop;
    let worldRight = vp.worldRight;
    let worldBottom = vp.worldBottom;
    worldLeft = Math.min(worldLeft, canvasBounds.minX);
    worldTop = Math.min(worldTop, canvasBounds.minY);
    worldRight = Math.max(worldRight, canvasBounds.maxX);
    worldBottom = Math.max(worldBottom, canvasBounds.maxY);
    const pad = GRID_STEP * 4;
    const xs: number[] = [];
    const ys: number[] = [];
    let x = Math.floor(worldLeft / GRID_STEP) * GRID_STEP;
    while (x <= worldRight + pad) {
      xs.push(x);
      x += GRID_STEP;
    }
    let y = Math.floor(worldTop / GRID_STEP) * GRID_STEP;
    while (y <= worldBottom + pad) {
      ys.push(y);
      y += GRID_STEP;
    }
    return { xs, ys, worldLeft, worldTop, worldRight, worldBottom, pad };
  }, [canvasBounds, scale, size.h, size.w, stagePos]);
}
