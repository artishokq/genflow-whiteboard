import { useCallback } from "react";
import type Konva from "konva";

import type { BoardElement } from "../../../entities/board";
import { boardImageSrc } from "../../../shared/api/boardsApi";
import type { CanvasBounds } from "../../../widgets/board-canvas/model/types";
import { downloadBlob, downloadTextFile } from "./download";

const EXPORT_MAX_CANVAS_SIDE = 8192;

function clampExportPixelRatio(
  width: number,
  height: number,
  pixelRatio: number,
): number {
  const w = Math.max(1, Math.round(width));
  const h = Math.max(1, Math.round(height));
  const maxByW = Math.floor(EXPORT_MAX_CANVAS_SIDE / w);
  const maxByH = Math.floor(EXPORT_MAX_CANVAS_SIDE / h);
  const cap = Math.max(1, Math.min(maxByW, maxByH));
  return Math.max(1, Math.min(pixelRatio, cap));
}

export function useBoardExportActions({
  stageRef,
  boardColor,
  stagePos,
  scale,
  elements,
  canvasBounds,
  elementBounds,
  boardId,
  accessToken,
  shareToken,
}: {
  stageRef: React.RefObject<Konva.Stage | null>;
  boardColor: string;
  stagePos: { x: number; y: number };
  scale: number;
  elements: BoardElement[];
  canvasBounds: CanvasBounds;
  elementBounds: (el: BoardElement) => {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
  };
  boardId: string;
  accessToken: string | null;
  shareToken?: string | null;
}) {
  const exportStageRegionPng = useCallback(
    async (
      opts: {
        x: number;
        y: number;
        width: number;
        height: number;
        pixelRatio: number;
      },
      
      neutralizeStagePanZoom: boolean,
    ) => {
      const stage = stageRef.current;
      if (!stage) return;
      const pixelRatio = clampExportPixelRatio(
        opts.width,
        opts.height,
        opts.pixelRatio,
      );

      let savedX = 0;
      let savedY = 0;
      let savedSx = 1;
      let savedSy = 1;
      if (neutralizeStagePanZoom) {
        savedX = stage.x();
        savedY = stage.y();
        savedSx = stage.scaleX();
        savedSy = stage.scaleY();
        stage.scale({ x: 1, y: 1 });
        stage.position({ x: 0, y: 0 });
        stage.batchDraw();
      }

      let dataUrl: string;
      try {
        dataUrl = stage.toDataURL({
          x: opts.x,
          y: opts.y,
          width: opts.width,
          height: opts.height,
          pixelRatio,
        });
      } finally {
        if (neutralizeStagePanZoom) {
          stage.scale({ x: savedSx, y: savedSy });
          stage.position({ x: savedX, y: savedY });
          stage.batchDraw();
        }
      }
      const image = await new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error("Failed to load stage image"));
        img.src = dataUrl;
      });
      const iw = Math.max(1, image.naturalWidth || 1);
      const ih = Math.max(1, image.naturalHeight || 1);
      const canvas = document.createElement("canvas");
      canvas.width = iw;
      canvas.height = ih;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.fillStyle = boardColor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(image, 0, 0);
      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob((value) => resolve(value), "image/png");
      });
      if (!blob) return;
      const stamp = new Date().toISOString().replace(/[:.]/g, "-");
      downloadBlob(blob, `board-${stamp}.png`);
    },
    [boardColor, stageRef],
  );

  const exportPngViewport = useCallback(
    async (pixelRatio = 2) => {
      const stage = stageRef.current;
      if (!stage) return;
      const sw = Math.max(1, stage.width());
      const sh = Math.max(1, stage.height());
      await exportStageRegionPng(
        {
          x: -stagePos.x / scale,
          y: -stagePos.y / scale,
          width: sw / scale,
          height: sh / scale,
          pixelRatio,
        },
        false,
      );
    },
    [exportStageRegionPng, scale, stagePos.x, stagePos.y, stageRef],
  );

  const exportPngFullBoard = useCallback(
    async (pixelRatio = 2) => {
      const bounds = elements
        .map((el) => elementBounds(el))
        .reduce(
          (acc, b) => ({
            minX: Math.min(acc.minX, b.minX),
            minY: Math.min(acc.minY, b.minY),
            maxX: Math.max(acc.maxX, b.maxX),
            maxY: Math.max(acc.maxY, b.maxY),
          }),
          {
            minX: Number.POSITIVE_INFINITY,
            minY: Number.POSITIVE_INFINITY,
            maxX: Number.NEGATIVE_INFINITY,
            maxY: Number.NEGATIVE_INFINITY,
          },
        );
      if (!Number.isFinite(bounds.minX)) {
        await exportPngViewport(pixelRatio);
        return;
      }
      const pad = 32;
      await exportStageRegionPng(
        {
          x: bounds.minX - pad,
          y: bounds.minY - pad,
          width: Math.max(1, bounds.maxX - bounds.minX + pad * 2),
          height: Math.max(1, bounds.maxY - bounds.minY + pad * 2),
          pixelRatio,
        },
        true,
      );
    },
    [elementBounds, elements, exportPngViewport, exportStageRegionPng],
  );

  const exportJsonBackup = useCallback(() => {
    const payload = {
      schemaVersion: 1,
      exportedAt: new Date().toISOString(),
      canvas: canvasBounds,
      elements,
    };
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    downloadTextFile(
      JSON.stringify(payload, null, 2),
      `board-backup-${stamp}.json`,
    );
  }, [canvasBounds, elements]);

  const downloadBoardImage = useCallback(
    async (file: string) => {
      const src = boardImageSrc(boardId, file, accessToken, shareToken);
      const response = await fetch(src);
      if (!response.ok) {
        return;
      }
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      try {
        const ext = file.split(".").pop() || "png";
        const a = document.createElement("a");
        a.href = objectUrl;
        a.download = `board-image-${Date.now()}.${ext}`;
        document.body.appendChild(a);
        a.click();
        a.remove();
      } finally {
        URL.revokeObjectURL(objectUrl);
      }
    },
    [accessToken, boardId, shareToken],
  );

  return {
    exportPngViewport,
    exportPngFullBoard,
    exportJsonBackup,
    downloadBoardImage,
  };
}
