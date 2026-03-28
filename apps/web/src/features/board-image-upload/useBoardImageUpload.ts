import { useCallback, useRef } from "react";

import { uploadBoardImageRequest } from "../../shared/api/boardsApi";
import type { BoardTool } from "../../entities/board";

/** Natural size in pixels, scaled down if the long edge exceeds `maxEdge` (board units). */
function boardSizeFromImageFile(
  file: File,
  maxEdge = 800,
): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      let w = img.naturalWidth || img.width;
      let h = img.naturalHeight || img.height;
      if (!w || !h) {
        reject(new Error("bad image size"));
        return;
      }
      if (Math.max(w, h) > maxEdge) {
        const s = maxEdge / Math.max(w, h);
        w = Math.round(w * s);
        h = Math.round(h * s);
      }
      resolve({ width: Math.max(1, w), height: Math.max(1, h) });
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("image decode"));
    };
    img.src = objectUrl;
  });
}

function boardSizeFromVideoFile(
  file: File,
  maxEdge = 800,
): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.preload = "metadata";
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(objectUrl);
      let w = video.videoWidth;
      let h = video.videoHeight;
      if (!w || !h) {
        reject(new Error("bad video size"));
        return;
      }
      if (Math.max(w, h) > maxEdge) {
        const s = maxEdge / Math.max(w, h);
        w = Math.round(w * s);
        h = Math.round(h * s);
      }
      resolve({ width: Math.max(1, w), height: Math.max(1, h) });
    };
    video.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("video metadata decode"));
    };
    video.src = objectUrl;
  });
}

export function useBoardImageUpload({
  boardId,
  accessToken,
  shareToken,
  size,
  stagePos,
  scale,
  addImageAt,
  addVideoAt,
  setTool,
}: {
  boardId: string;
  accessToken: string | null;
  shareToken?: string | null;
  size: { w: number; h: number };
  stagePos: { x: number; y: number };
  scale: number;
  addImageAt: (
    filename: string,
    wx: number,
    wy: number,
    width?: number,
    height?: number,
  ) => void;
  addVideoAt: (
    filename: string,
    wx: number,
    wy: number,
    width?: number,
    height?: number,
  ) => void;
  setTool: (next: BoardTool) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const pickImageFile = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const onImageFile = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = "";
      if (!file || !accessToken) {
        return;
      }
      try {
        const isVideo = /^video\//i.test(file.type);
        let width = isVideo ? 640 : 200;
        let height = isVideo ? 360 : 150;
        try {
          const dims = isVideo
            ? await boardSizeFromVideoFile(file)
            : await boardSizeFromImageFile(file);
          width = dims.width;
          height = dims.height;
        } catch {
          /* fallback keeps previous default box */
        }
        const { filename } = await uploadBoardImageRequest(boardId, file, {
          shareToken: shareToken ?? undefined,
        });
        const vx = size.w / 2;
        const vy = size.h / 2;
        const wx = (vx - stagePos.x) / scale;
        const wy = (vy - stagePos.y) / scale;
        if (isVideo) {
          addVideoAt(filename, wx, wy, width, height);
        } else {
          addImageAt(filename, wx, wy, width, height);
        }
      } catch {
        /* ignore */
      }
      setTool("select");
    },
    [
      accessToken,
      addImageAt,
      addVideoAt,
      boardId,
      scale,
      setTool,
      shareToken,
      size.h,
      size.w,
      stagePos,
    ],
  );

  return {
    fileInputRef,
    pickImageFile,
    onImageFile,
  };
}
