import { useCallback, useEffect, useState } from "react";
import type Konva from "konva";

import type { CanvasBounds } from "../../widgets/board-canvas/model/types";
import { MAX_SCALE, MIN_SCALE } from "../../widgets/board-canvas/model/constants";
import { clampStagePosition } from "../../widgets/board-canvas/model/geometry";

export function useBoardStageInteractions({
  size,
  canvasBounds,
  onScaleChange,
}: {
  size: { w: number; h: number };
  canvasBounds: CanvasBounds;
  onScaleChange?: (scale: number) => void;
}) {
  const [scale, setScale] = useState(1);
  const [stagePos, setStagePos] = useState({ x: 0, y: 0 });

  const setStagePosClamped = useCallback(
    (updater: (prev: { x: number; y: number }) => { x: number; y: number }) => {
      setStagePos((prev) =>
        clampStagePosition(updater(prev), canvasBounds, size, scale),
      );
    },
    [canvasBounds, scale, size],
  );

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      setStagePosClamped((prev) => prev);
    });
    return () => {
      cancelled = true;
    };
  }, [setStagePosClamped]);

  useEffect(() => {
    onScaleChange?.(scale);
  }, [onScaleChange, scale]);

  const handleWheel = useCallback(
    (e: Konva.KonvaEventObject<WheelEvent>) => {
      e.evt.preventDefault();
      const stage = e.target.getStage();
      if (!stage) {
        return;
      }
      const pointer = stage.getPointerPosition();
      if (!pointer) {
        return;
      }
      const absDx = Math.abs(e.evt.deltaX);
      const absDy = Math.abs(e.evt.deltaY);
      const trackpadPan =
        !e.evt.ctrlKey &&
        e.evt.deltaMode === WheelEvent.DOM_DELTA_PIXEL &&
        (absDx > 0 || absDy < 30);
      if (trackpadPan) {
        setStagePosClamped((p) => ({
          x: p.x - e.evt.deltaX,
          y: p.y - e.evt.deltaY,
        }));
        return;
      }
      const isTrackpadPinch = e.evt.ctrlKey;
      setScale((prevScale) => {
        const factor = isTrackpadPinch
          ? Math.exp(-e.evt.deltaY * 0.009)
          : e.evt.deltaY > 0
            ? 1 / 1.08
            : 1.08;
        const next = Math.min(MAX_SCALE, Math.max(MIN_SCALE, prevScale * factor));
        setStagePosClamped((prevPos) => {
          const mousePointTo = {
            x: (pointer.x - prevPos.x) / prevScale,
            y: (pointer.y - prevPos.y) / prevScale,
          };
          return {
            x: pointer.x - mousePointTo.x * next,
            y: pointer.y - mousePointTo.y * next,
          };
        });
        return next;
      });
    },
    [setStagePosClamped],
  );

  const applyZoom = useCallback(
    (factor: number) => {
      const cx = size.w / 2;
      const cy = size.h / 2;
      setScale((prevScale) => {
        const next = Math.min(MAX_SCALE, Math.max(MIN_SCALE, prevScale * factor));
        setStagePosClamped((prevPos) => {
          const worldX = (cx - prevPos.x) / prevScale;
          const worldY = (cy - prevPos.y) / prevScale;
          return {
            x: cx - worldX * next,
            y: cy - worldY * next,
          };
        });
        return next;
      });
    },
    [setStagePosClamped, size.h, size.w],
  );

  const zoomIn = useCallback(() => applyZoom(1.15), [applyZoom]);
  const zoomOut = useCallback(() => applyZoom(1 / 1.15), [applyZoom]);
  const resetZoom = useCallback(() => setScale(1), []);

  return {
    scale,
    stagePos,
    setScale,
    setStagePosClamped,
    handleWheel,
    zoomIn,
    zoomOut,
    resetZoom,
  };
}
