import { useEffect, useRef } from "react";
import * as Y from "yjs";

import {
  boardImageSrc,
  getBoardSnapshotRequest,
} from "../../shared/api/boardsApi";
import { useAuthStore } from "../../shared/store/authStore";
import { parseBoardElement, type BoardElement } from "../../entities/board";
import styles from "./DashboardPage.module.css";

const PREVIEW_WIDTH = 320;
const PREVIEW_HEIGHT = 160;
const PREVIEW_PADDING = 12;
const PREVIEW_CACHE_LIMIT = 120;

const previewDataUrlCache = new Map<string, string>();

function getCacheKey(boardId: string, updatedAt: string) {
  return `${boardId}:${updatedAt}`;
}

function rememberPreview(key: string, dataUrl: string) {
  previewDataUrlCache.set(key, dataUrl);
  if (previewDataUrlCache.size <= PREVIEW_CACHE_LIMIT) {
    return;
  }
  const oldestKey = previewDataUrlCache.keys().next().value;
  if (typeof oldestKey === "string") {
    previewDataUrlCache.delete(oldestKey);
  }
}

type DashboardBoardPreviewProps = {
  boardId: string;
  updatedAt: string;
};

type Bounds = { minX: number; minY: number; maxX: number; maxY: number };

function addBounds(a: Bounds | null, b: Bounds): Bounds {
  if (!a) return b;
  return {
    minX: Math.min(a.minX, b.minX),
    minY: Math.min(a.minY, b.minY),
    maxX: Math.max(a.maxX, b.maxX),
    maxY: Math.max(a.maxY, b.maxY),
  };
}

function elementBounds(el: BoardElement): Bounds {
  if (el.type === "line") {
    let minX = Number.POSITIVE_INFINITY;
    let minY = Number.POSITIVE_INFINITY;
    let maxX = Number.NEGATIVE_INFINITY;
    let maxY = Number.NEGATIVE_INFINITY;
    for (let i = 0; i < el.points.length; i += 2) {
      const x = el.points[i] ?? 0;
      const y = el.points[i + 1] ?? 0;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
    if (!Number.isFinite(minX)) {
      return { minX: 0, minY: 0, maxX: 1, maxY: 1 };
    }
    return { minX, minY, maxX, maxY };
  }
  if (el.type === "text") {
    return { minX: el.x, minY: el.y, maxX: el.x + el.width, maxY: el.y + el.fontSize * 1.5 };
  }
  return { minX: el.x, minY: el.y, maxX: el.x + el.width, maxY: el.y + el.height };
}

function computeTransform(bounds: Bounds) {
  const w = Math.max(1, bounds.maxX - bounds.minX);
  const h = Math.max(1, bounds.maxY - bounds.minY);
  const scale = Math.min(
    (PREVIEW_WIDTH - PREVIEW_PADDING * 2) / w,
    (PREVIEW_HEIGHT - PREVIEW_PADDING * 2) / h,
  );
  const offsetX = (PREVIEW_WIDTH - w * scale) / 2 - bounds.minX * scale;
  const offsetY = (PREVIEW_HEIGHT - h * scale) / 2 - bounds.minY * scale;
  return { scale, offsetX, offsetY };
}

function tx(x: number, scale: number, offsetX: number) {
  return x * scale + offsetX;
}

function ty(y: number, scale: number, offsetY: number) {
  return y * scale + offsetY;
}

async function loadImage(url: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

export function DashboardBoardPreview({
  boardId,
  updatedAt,
}: DashboardBoardPreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const token = useAuthStore((s) => s.accessToken);

  useEffect(() => {
    let cancelled = false;
    const cacheKey = getCacheKey(boardId, updatedAt);

    const draw = async () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.round(PREVIEW_WIDTH * dpr);
      canvas.height = Math.round(PREVIEW_HEIGHT * dpr);
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, PREVIEW_WIDTH, PREVIEW_HEIGHT);

      const cached = previewDataUrlCache.get(cacheKey);
      if (cached) {
        const img = await loadImage(cached);
        if (cancelled || !img) {
          return;
        }
        ctx.drawImage(img, 0, 0, PREVIEW_WIDTH, PREVIEW_HEIGHT);
        return;
      }

      let state: Uint8Array;
      try {
        state = await getBoardSnapshotRequest(boardId);
      } catch {
        return;
      }
      if (cancelled || state.byteLength === 0) {
        return;
      }

      const doc = new Y.Doc();
      Y.applyUpdate(doc, state);
      const arr = doc.getArray<Y.Map<unknown>>("elements");
      const elements: BoardElement[] = [];
      for (const map of arr) {
        const parsed = parseBoardElement(map.toJSON() as Record<string, unknown>);
        if (parsed) {
          elements.push(parsed);
        }
      }
      if (cancelled || elements.length === 0) {
        return;
      }

      let bounds: Bounds | null = null;
      for (const el of elements) {
        bounds = addBounds(bounds, elementBounds(el));
      }
      if (!bounds) return;
      const { scale, offsetX, offsetY } = computeTransform(bounds);

      for (const el of elements) {
        if (cancelled) return;
        if (el.type === "rect") {
          ctx.fillStyle = el.fill;
          ctx.strokeStyle = el.stroke;
          ctx.lineWidth = Math.max(1, el.strokeWidth * scale);
          ctx.beginPath();
          ctx.rect(
            tx(el.x, scale, offsetX),
            ty(el.y, scale, offsetY),
            Math.max(1, el.width * scale),
            Math.max(1, el.height * scale),
          );
          ctx.fill();
          ctx.stroke();
          continue;
        }

        if (el.type === "line") {
          ctx.strokeStyle = el.stroke;
          ctx.lineCap = "round";
          ctx.lineJoin = "round";
          ctx.lineWidth = Math.max(1, el.strokeWidth * scale);
          ctx.beginPath();
          for (let i = 0; i < el.points.length; i += 2) {
            const x = tx(el.points[i] ?? 0, scale, offsetX);
            const y = ty(el.points[i + 1] ?? 0, scale, offsetY);
            if (i === 0) {
              ctx.moveTo(x, y);
            } else {
              ctx.lineTo(x, y);
            }
          }
          ctx.stroke();
          continue;
        }

        if (el.type === "text") {
          ctx.fillStyle = el.fill;
          ctx.font = `${Math.max(10, el.fontSize * scale)}px system-ui, sans-serif`;
          ctx.textBaseline = "top";
          ctx.fillText(
            el.text,
            tx(el.x, scale, offsetX),
            ty(el.y, scale, offsetY),
            Math.max(10, el.width * scale),
          );
          continue;
        }

        if (el.type === "image" || el.type === "video") {
          const src = boardImageSrc(
            boardId,
            el.type === "image" ? el.imageFile : el.videoFile,
            token,
          );
          const img = await loadImage(src);
          if (!img) {
            ctx.fillStyle = "#d9def4";
            ctx.fillRect(
              tx(el.x, scale, offsetX),
              ty(el.y, scale, offsetY),
              Math.max(6, el.width * scale),
              Math.max(6, el.height * scale),
            );
            continue;
          }
          ctx.drawImage(
            img,
            tx(el.x, scale, offsetX),
            ty(el.y, scale, offsetY),
            Math.max(6, el.width * scale),
            Math.max(6, el.height * scale),
          );
          continue;
        }
      }

      rememberPreview(cacheKey, canvas.toDataURL("image/png"));
    };

    void draw();
    return () => {
      cancelled = true;
    };
  }, [boardId, token, updatedAt]);

  return <canvas ref={canvasRef} className={styles.userBoardPreviewCanvas} aria-hidden />;
}
