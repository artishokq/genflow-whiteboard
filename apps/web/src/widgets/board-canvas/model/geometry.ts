import type Konva from "konva";
import * as Y from "yjs";

import { type BoardElement, frameOuterBounds } from "../../../entities/board";

import {
  BOUNDS_PAD,
  OP_AWARENESS,
  TEXT_BLOCK_PADDING,
  TEXT_LINE_HEIGHT,
} from "./constants";
import type { CanvasBounds } from "./types";

export function findYMapById(
  arr: Y.Array<Y.Map<unknown>>,
  id: string,
): Y.Map<unknown> | null {
  for (const m of arr) {
    if (m.get("id") === id) {
      return m;
    }
  }
  return null;
}

export function worldBounds(
  width: number,
  height: number,
  stagePos: { x: number; y: number },
  scale: number,
) {
  const worldLeft = -stagePos.x / scale;
  const worldTop = -stagePos.y / scale;
  const worldRight = (width - stagePos.x) / scale;
  const worldBottom = (height - stagePos.y) / scale;
  return { worldLeft, worldTop, worldRight, worldBottom };
}

export function pointerToWorld(
  stage: Konva.Stage,
  stagePos: { x: number; y: number },
  scale: number,
  evt?: MouseEvent,
) {
  const p = stage.getPointerPosition();
  if (!p && evt) {
    const rect = stage.container().getBoundingClientRect();
    return {
      x: (evt.clientX - rect.left - stagePos.x) / scale,
      y: (evt.clientY - rect.top - stagePos.y) / scale,
    };
  }
  if (!p) {
    return { x: -stagePos.x / scale, y: -stagePos.y / scale };
  }
  return {
    x: (p.x - stagePos.x) / scale,
    y: (p.y - stagePos.y) / scale,
  };
}

export function encodeAwarenessJson(obj: unknown): Uint8Array {
  const enc = new TextEncoder().encode(JSON.stringify(obj));
  const buf = new Uint8Array(1 + enc.length);
  buf[0] = OP_AWARENESS;
  buf.set(enc, 1);
  return buf;
}

export function elementBounds(el: BoardElement) {
  if (el.type === "line") {
    const ox = el.x;
    const oy = el.y;
    let minX = Number.POSITIVE_INFINITY;
    let minY = Number.POSITIVE_INFINITY;
    let maxX = Number.NEGATIVE_INFINITY;
    let maxY = Number.NEGATIVE_INFINITY;
    for (let i = 0; i < el.points.length; i += 2) {
      const x = (el.points[i] ?? 0) + ox;
      const y = (el.points[i + 1] ?? 0) + oy;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
    if (!Number.isFinite(minX)) {
      return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
    }
    return { minX, minY, maxX, maxY };
  }
  if (el.type === "text") {
    const textHeight = estimateTextBlockHeight({
      text: el.text,
      width: el.width,
      fontSize: el.fontSize,
      fontFamily: el.fontFamily,
      bold: el.bold,
      italic: el.italic,
    });
    const visualHeight =
      el.textKind === "sticker" ? Math.max(textHeight, el.width) : textHeight;
    return {
      minX: el.x,
      minY: el.y,
      maxX: el.x + el.width,
      maxY: el.y + visualHeight,
    };
  }
  if (el.type === "frame") {
    return frameOuterBounds(el);
  }
  return {
    minX: el.x,
    minY: el.y,
    maxX: el.x + el.width,
    maxY: el.y + el.height,
  };
}

export function translateYMapElementByDelta(
  map: Y.Map<unknown>,
  dx: number,
  dy: number,
) {
  const type = map.get("type");
  if (type === "line") {
    const ox = Number(map.get("x") ?? 0);
    const oy = Number(map.get("y") ?? 0);
    map.set("x", ox + dx);
    map.set("y", oy + dy);
    return;
  }
  const ox = Number(map.get("x") ?? 0);
  const oy = Number(map.get("y") ?? 0);
  map.set("x", ox + dx);
  map.set("y", oy + dy);
}

export function estimateTextBlockHeight(input: {
  text: string;
  width: number;
  fontSize: number;
  fontFamily: string;
  bold: boolean;
  italic: boolean;
}) {
  const safeWidth = Math.max(1, input.width);
  const lineHeight = input.fontSize * TEXT_LINE_HEIGHT;
  const weight = input.bold ? "700" : "400";
  const style = input.italic ? "italic" : "normal";
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return lineHeight + TEXT_BLOCK_PADDING;
  }
  ctx.font = `${style} ${weight} ${input.fontSize}px "${input.fontFamily}", sans-serif`;
  let rowCount = 1;
  let lineWidth = 0;
  const raw = input.text.length > 0 ? input.text : " ";
  for (let i = 0; i < raw.length; i += 1) {
    const ch = raw[i] ?? "";
    if (ch === "\n") {
      rowCount += 1;
      lineWidth = 0;
      continue;
    }
    const w = ctx.measureText(ch).width;
    if (lineWidth > 0 && lineWidth + w > safeWidth) {
      rowCount += 1;
      lineWidth = w;
      continue;
    }
    lineWidth += w;
  }
  return rowCount * lineHeight + TEXT_BLOCK_PADDING;
}

export function lineEndpointAngle(points: number[], at: "start" | "end"): number {
  if (points.length < 4) return 0;
  if (at === "start") {
    const x0 = points[0] ?? 0;
    const y0 = points[1] ?? 0;
    const x1 = points[2] ?? 0;
    const y1 = points[3] ?? 0;
    return Math.atan2(y0 - y1, x0 - x1);
  }
  const n = points.length;
  const x0 = points[n - 2] ?? 0;
  const y0 = points[n - 1] ?? 0;
  const x1 = points[n - 4] ?? 0;
  const y1 = points[n - 3] ?? 0;
  return Math.atan2(y0 - y1, x0 - x1);
}

export function arrowCapPoints(
  x: number,
  y: number,
  angle: number,
  size: number,
): number[] {
  const backX = x + Math.cos(angle) * size;
  const backY = y + Math.sin(angle) * size;
  const leftX = backX + Math.cos(angle + Math.PI / 2) * (size * 0.58);
  const leftY = backY + Math.sin(angle + Math.PI / 2) * (size * 0.58);
  const rightX = backX + Math.cos(angle - Math.PI / 2) * (size * 0.58);
  const rightY = backY + Math.sin(angle - Math.PI / 2) * (size * 0.58);
  return [x, y, leftX, leftY, rightX, rightY];
}

export function boxesIntersect(
  a: { minX: number; minY: number; maxX: number; maxY: number },
  b: { minX: number; minY: number; maxX: number; maxY: number },
) {
  return !(
    a.maxX < b.minX ||
    a.minX > b.maxX ||
    a.maxY < b.minY ||
    a.minY > b.maxY
  );
}

export function isEventInsideNodeId(
  target: Konva.Node | null,
  nodeId: string,
): boolean {
  let current: Konva.Node | null = target;
  while (current) {
    if (typeof current.id === "function" && current.id() === nodeId) {
      return true;
    }
    current = current.getParent();
  }
  return false;
}

export function clampStagePosition(
  pos: { x: number; y: number },
  bounds: CanvasBounds,
  viewport: { w: number; h: number },
  scale: number,
) {
  const minStageX = viewport.w - (bounds.maxX + BOUNDS_PAD) * scale;
  const maxStageX = -(bounds.minX - BOUNDS_PAD) * scale;
  const minStageY = viewport.h - (bounds.maxY + BOUNDS_PAD) * scale;
  const maxStageY = -(bounds.minY - BOUNDS_PAD) * scale;

  return {
    x: Math.min(maxStageX, Math.max(minStageX, pos.x)),
    y: Math.min(maxStageY, Math.max(minStageY, pos.y)),
  };
}
