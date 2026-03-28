import { useMemo } from "react";

import { GRID_STEP } from "../../widgets/board-canvas/model/constants";
import { worldBounds } from "../../widgets/board-canvas/model/geometry";

export function useBoardGrid({
  size,
  stagePos,
  scale,
}: {
  size: { w: number; h: number };
  stagePos: { x: number; y: number };
  scale: number;
}) {
  return useMemo(() => {
    const { worldLeft, worldTop, worldRight, worldBottom } = worldBounds(
      size.w,
      size.h,
      stagePos,
      scale,
    );
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
  }, [scale, size.h, size.w, stagePos]);
}
