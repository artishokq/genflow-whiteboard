import {
  useCallback,
  useMemo,
  useRef,
  type Dispatch,
  type SetStateAction,
} from "react";
import type Konva from "konva";
import * as Y from "yjs";

import { LOCAL_HISTORY_ORIGIN, runTrackedAction } from "../board-history";
import {
  pointInFrame,
  resolveFrameIdAt,
  type BoardElement,
  type BoardTool,
} from "../../entities/board";
import {
  boxesIntersect,
  elementBounds,
  findYMapById,
  isEventInsideNodeId,
  pointerToWorld,
} from "../../widgets/board-canvas/model/geometry";
import type {
  BoardCanvasProps,
  ContextMenuState,
  MarqueeBox,
} from "../../widgets/board-canvas/model/types";

type BrushSettings = NonNullable<BoardCanvasProps["brushSettings"]>;

function distancePointToSegment(
  px: number,
  py: number,
  ax: number,
  ay: number,
  bx: number,
  by: number,
): number {
  const abx = bx - ax;
  const aby = by - ay;
  const ab2 = abx * abx + aby * aby;
  if (ab2 <= 1e-9) {
    return Math.hypot(px - ax, py - ay);
  }
  const t = Math.max(0, Math.min(1, ((px - ax) * abx + (py - ay) * aby) / ab2));
  const qx = ax + abx * t;
  const qy = ay + aby * t;
  return Math.hypot(px - qx, py - qy);
}

function pointInPolygon(px: number, py: number, points: Array<[number, number]>): boolean {
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const [xi, yi] = points[i]!;
    const [xj, yj] = points[j]!;
    const intersects =
      yi > py !== yj > py &&
      px < ((xj - xi) * (py - yi)) / ((yj - yi) || 1e-9) + xi;
    if (intersects) {
      inside = !inside;
    }
  }
  return inside;
}

function hitLineElement(el: Extract<BoardElement, { type: "line" }>, wx: number, wy: number, radius: number): boolean {
  const pts = el.points;
  if (pts.length < 2) return false;
  const threshold = Math.max(radius, el.strokeWidth / 2 + radius * 0.35);
  for (let i = 0; i + 3 < pts.length; i += 2) {
    const ax = (pts[i] ?? 0) + el.x;
    const ay = (pts[i + 1] ?? 0) + el.y;
    const bx = (pts[i + 2] ?? 0) + el.x;
    const by = (pts[i + 3] ?? 0) + el.y;
    if (distancePointToSegment(wx, wy, ax, ay, bx, by) <= threshold) {
      return true;
    }
  }
  const sx = (pts[0] ?? 0) + el.x;
  const sy = (pts[1] ?? 0) + el.y;
  const ex = (pts[pts.length - 2] ?? 0) + el.x;
  const ey = (pts[pts.length - 1] ?? 0) + el.y;
  return (
    Math.hypot(wx - sx, wy - sy) <= threshold ||
    Math.hypot(wx - ex, wy - ey) <= threshold
  );
}

function hitRectElement(el: Extract<BoardElement, { type: "rect" }>, wx: number, wy: number, radius: number): boolean {
  const kind = el.shapeKind ?? "square";
  if (kind === "square") {
    return (
      wx >= el.x - radius &&
      wx <= el.x + el.width + radius &&
      wy >= el.y - radius &&
      wy <= el.y + el.height + radius
    );
  }
  if (kind === "circle") {
    const cx = el.x + el.width / 2;
    const cy = el.y + el.height / 2;
    const rx = Math.max(1, el.width / 2) + radius;
    const ry = Math.max(1, el.height / 2) + radius;
    const dx = (wx - cx) / rx;
    const dy = (wy - cy) / ry;
    return dx * dx + dy * dy <= 1;
  }
  if (kind === "triangle") {
    const p0: [number, number] = [el.x + el.width / 2, el.y];
    const p1: [number, number] = [el.x + el.width, el.y + el.height];
    const p2: [number, number] = [el.x, el.y + el.height];
    if (pointInPolygon(wx, wy, [p0, p1, p2])) return true;
    return (
      distancePointToSegment(wx, wy, p0[0], p0[1], p1[0], p1[1]) <= radius ||
      distancePointToSegment(wx, wy, p1[0], p1[1], p2[0], p2[1]) <= radius ||
      distancePointToSegment(wx, wy, p2[0], p2[1], p0[0], p0[1]) <= radius
    );
  }
  const cx = el.x + el.width / 2;
  const cy = el.y + el.height / 2;
  const outer = Math.max(8, Math.min(el.width, el.height) * 0.5);
  const inner = Math.max(4, Math.min(el.width, el.height) * 0.2);
  const star: Array<[number, number]> = [];
  for (let i = 0; i < 10; i += 1) {
    const angle = -Math.PI / 2 + i * (Math.PI / 5);
    const r = i % 2 === 0 ? outer : inner;
    star.push([cx + Math.cos(angle) * r, cy + Math.sin(angle) * r]);
  }
  if (pointInPolygon(wx, wy, star)) return true;
  for (let i = 0; i < star.length; i += 1) {
    const a = star[i]!;
    const b = star[(i + 1) % star.length]!;
    if (distancePointToSegment(wx, wy, a[0], a[1], b[0], b[1]) <= radius) {
      return true;
    }
  }
  return false;
}

function hitElement(el: BoardElement, wx: number, wy: number, radius: number): boolean {
  if (el.type === "line") {
    return hitLineElement(el, wx, wy, radius);
  }
  if (el.type === "rect") {
    return hitRectElement(el, wx, wy, radius);
  }
  if (el.type === "frame") {
    if (pointInFrame(wx, wy, el)) return true;
    return (
      wx >= el.x - radius &&
      wx <= el.x + el.width + radius &&
      wy >= el.y - radius &&
      wy <= el.y + el.height + radius
    );
  }
  if (el.type === "text") {
    const textHeight = Math.max(el.fontSize, Math.ceil(el.text.split("\n").length * el.fontSize * 1.2));
    const h = el.textKind === "sticker" ? Math.max(textHeight, el.width) : textHeight;
    return wx >= el.x - radius && wx <= el.x + el.width + radius && wy >= el.y - radius && wy <= el.y + h + radius;
  }
  return (
    wx >= el.x - radius &&
    wx <= el.x + el.width + radius &&
    wy >= el.y - radius &&
    wy <= el.y + el.height + radius
  );
}

/**
 * Empty board / non-interactive hit.
 */
function isBackgroundBoardPointer(stage: Konva.Stage, evtTarget: Konva.Node) {
  const ptr = stage.getPointerPosition();
  if (ptr) {
    const hit = stage.getIntersection(ptr);
    if (hit == null) {
      return true;
    }
    if (hit.getClassName() === "Layer") {
      return true;
    }
  }
  return (
    evtTarget === stage ||
    evtTarget.getParent() === stage ||
    evtTarget.getClassName() === "Layer"
  );
}

function isTransformerTarget(target: Konva.Node): boolean {
  let current: Konva.Node | null = target;
  while (current) {
    if (current.getClassName() === "Transformer") {
      return true;
    }
    current = current.getParent();
  }
  return false;
}

export function useBoardStagePointerHandlers({
  tool,
  elements,
  stagePos,
  scale,
  ydoc,
  yElements,
  editingTextId,
  finishTextEditing,
  setActiveTextId,
  setContextMenu,
  isPanning,
  setIsPanning,
  setStagePosClamped,
  setMarquee,
  setSelectedIds,
  marquee,
  shouldSuppressContextMenu,
  markContextMenuSuppressed,
  scheduleAwareness,
  flushAwareness,
  awarenessId,
  userFirstName,
  addShapeAt,
  addStickerAt,
  addFrameAt,
  addTextAt,
  brushSettings,
  pencilLineIdRef,
  stageRef,
  historyActor,
  readOnly = false,
  onCreateCommentAt,
  aiMode = null,
  onCreateGenerationAt,
}: {
  tool: BoardTool;
  elements: BoardElement[];
  stagePos: { x: number; y: number };
  scale: number;
  ydoc: Y.Doc;
  yElements: Y.Array<Y.Map<unknown>>;
  editingTextId: string | null;
  finishTextEditing: (id: string) => void;
  setActiveTextId: React.Dispatch<React.SetStateAction<string | null>>;
  setContextMenu: Dispatch<SetStateAction<ContextMenuState | null>>;
  isPanning: boolean;
  setIsPanning: React.Dispatch<React.SetStateAction<boolean>>;
  setStagePosClamped: (
    updater: (prev: { x: number; y: number }) => { x: number; y: number },
  ) => void;
  setMarquee: React.Dispatch<React.SetStateAction<MarqueeBox | null>>;
  setSelectedIds: React.Dispatch<React.SetStateAction<string[]>>;
  marquee: MarqueeBox | null;
  shouldSuppressContextMenu: (x: number, y: number) => boolean;
  markContextMenuSuppressed: (x: number, y: number) => void;
  scheduleAwareness: (pos: { x: number; y: number }) => void;
  flushAwareness: (payload: {
    id: string;
    name: string;
    color: string;
    x: number | null;
    y: number | null;
  }) => void;
  awarenessId: string;
  userFirstName: string;
  addShapeAt: (wx: number, wy: number) => void;
  addStickerAt: (wx: number, wy: number) => void;
  addFrameAt: (wx: number, wy: number) => void;
  addTextAt: (wx: number, wy: number) => void;
  brushSettings?: BoardCanvasProps["brushSettings"];
  pencilLineIdRef: React.MutableRefObject<string | null>;
  stageRef: React.MutableRefObject<Konva.Stage | null>;
  historyActor: string;
  readOnly?: boolean;
  onCreateCommentAt?: (x: number, y: number) => void;
  aiMode?: "text" | "image" | "video" | null;
  onCreateGenerationAt?: (x: number, y: number) => void;
}) {
  const panLast = useRef<{ x: number; y: number } | null>(null);
  const panStart = useRef<{ x: number; y: number } | null>(null);
  const rightDragMovedRef = useRef(false);
  const lastCreateRef = useRef<{ tool: BoardTool; at: number } | null>(null);
  const eraserDeletedIdsRef = useRef<Set<string>>(new Set());

  const eraseObjectsAt = useCallback(
    (wx: number, wy: number, eraserWidth: number) => {
      const radius = Math.max(6, eraserWidth / 2);
      const touched = elements
        .filter((el) => !eraserDeletedIdsRef.current.has(el.id))
        .filter((el) => hitElement(el, wx, wy, radius))
        .map((el) => el.id);
      if (touched.length === 0) {
        return;
      }

      const remove = new Set(touched);
      let expanded = true;
      while (expanded) {
        expanded = false;
        for (const el of elements) {
          if (remove.has(el.id)) {
            continue;
          }
          if (el.frameId && remove.has(el.frameId)) {
            remove.add(el.id);
            expanded = true;
          }
        }
      }

      runTrackedAction({
        ydoc,
        labelKey:
          remove.size > 1
            ? "board.historyAction.deletedItemsMany"
            : "board.historyAction.deletedItem",
        ...(remove.size > 1 ? { labelValues: { count: remove.size } } : {}),
        actor: historyActor,
        fn: () => {
          for (let i = yElements.length - 1; i >= 0; i--) {
            const map = yElements.get(i);
            const id = map.get("id");
            if (typeof id === "string" && remove.has(id)) {
              yElements.delete(i, 1);
            }
          }
        },
      });

      for (const id of remove) {
        eraserDeletedIdsRef.current.add(id);
      }
      setSelectedIds((prev) => prev.filter((id) => !remove.has(id)));
    },
    [elements, historyActor, setSelectedIds, yElements, ydoc],
  );

  const tryCreateByTool = useCallback(
    (
      toolNow: BoardTool,
      stage: Konva.Stage,
      evt: MouseEvent,
      forceText = false,
    ) => {
      if (evt.button !== 0) {
        return false;
      }
      const now = Date.now();
      const last = lastCreateRef.current;
      if (last && last.tool === toolNow && now - last.at < 60) {
        return true;
      }
      const { x: wx, y: wy } = pointerToWorld(stage, stagePos, scale, evt);
      if (toolNow === "shape") {
        addShapeAt(wx, wy);
        lastCreateRef.current = { tool: toolNow, at: now };
        return true;
      }
      if (toolNow === "sticker") {
        addStickerAt(wx, wy);
        lastCreateRef.current = { tool: toolNow, at: now };
        return true;
      }
      if (toolNow === "frame") {
        addFrameAt(wx, wy);
        lastCreateRef.current = { tool: toolNow, at: now };
        return true;
      }
      if (toolNow === "text" && (forceText || !editingTextId)) {
        addTextAt(wx, wy);
        lastCreateRef.current = { tool: toolNow, at: now };
        return true;
      }
      return false;
    },
    [addFrameAt, addShapeAt, addStickerAt, addTextAt, editingTextId, scale, stagePos],
  );

  return useMemo(
    () => ({
      onContextMenu: (e: Konva.KonvaEventObject<MouseEvent>) => {
        e.evt.preventDefault();
        if (readOnly) {
          return;
        }
        if (shouldSuppressContextMenu(e.evt.clientX, e.evt.clientY)) {
          return;
        }
        if (isPanning) {
          return;
        }
        const stage = e.target.getStage() ?? stageRef.current;
        if (!stage || e.target !== stage) {
          return;
        }
        setContextMenu({
          x: e.evt.clientX,
          y: e.evt.clientY,
          kind: "board",
          targetIds: [],
        });
      },
      onMouseDown: (e: Konva.KonvaEventObject<MouseEvent>) => {
        const stage = e.target.getStage() ?? stageRef.current;
        const onTransformer = isTransformerTarget(e.target);
        const isCanvasTarget =
          !!stage && !onTransformer && isBackgroundBoardPointer(stage, e.target);
        if (editingTextId) {
          const inEditingText = isEventInsideNodeId(e.target, editingTextId);
          if (!inEditingText) {
            finishTextEditing(editingTextId);
          }
        }
        if (isCanvasTarget && e.evt.button === 0 && tool !== "text") {
          setActiveTextId(null);
        }
        setContextMenu(null);
        if (e.evt.button === 2) {
          e.evt.preventDefault();
          rightDragMovedRef.current = false;
          setIsPanning(true);
          panLast.current = { x: e.evt.clientX, y: e.evt.clientY };
          panStart.current = { x: e.evt.clientX, y: e.evt.clientY };
          return;
        }
        if (e.evt.button === 1) {
          e.evt.preventDefault();
          setIsPanning(true);
          panLast.current = { x: e.evt.clientX, y: e.evt.clientY };
          return;
        }
        if (!stage) {
          return;
        }
        if (aiMode && e.evt.button === 0 && isCanvasTarget) {
          const { x: wx, y: wy } = pointerToWorld(stage, stagePos, scale, e.evt);
          onCreateGenerationAt?.(wx, wy);
          return;
        }
        if (tool === "hand" && e.evt.button === 0 && isCanvasTarget) {
          e.evt.preventDefault();
          setIsPanning(true);
          panLast.current = { x: e.evt.clientX, y: e.evt.clientY };
          return;
        }
        if (tool === "select" && e.evt.button === 0 && isCanvasTarget) {
          const { x: wx, y: wy } = pointerToWorld(stage, stagePos, scale, e.evt);
          setMarquee({ startX: wx, startY: wy, endX: wx, endY: wy });
          if (!e.evt.shiftKey && !e.evt.metaKey && !e.evt.ctrlKey) {
            setSelectedIds([]);
          }
          return;
        }
        if (tool === "comment" && e.evt.button === 0 && isCanvasTarget) {
          const { x: wx, y: wy } = pointerToWorld(stage, stagePos, scale, e.evt);
          onCreateCommentAt?.(wx, wy);
          return;
        }
        if (readOnly) {
          return;
        }
        const brush: BrushSettings =
          brushSettings ?? {
            kind: "pencil",
            color: "#2a2f55",
            width: 2.5,
          };
        const isObjectEraser = tool === "pencil" && brush.kind === "eraser";
        if (isObjectEraser && e.evt.button === 0) {
          const { x: wx, y: wy } = pointerToWorld(stage, stagePos, scale, e.evt);
          eraserDeletedIdsRef.current.clear();
          eraseObjectsAt(wx, wy, brush.width);
          return;
        }
        if (tool === "pencil" && e.evt.button === 0 && isCanvasTarget) {
          const { x: wx, y: wy } = pointerToWorld(stage, stagePos, scale, e.evt);
          runTrackedAction({
            ydoc,
            labelKey: "board.historyAction.startedStroke",
            actor: historyActor,
            fn: () => {
            const map = new Y.Map<unknown>();
            const id = crypto.randomUUID();
            map.set("id", id);
            map.set("type", "line");
            map.set("x", 0);
            map.set("y", 0);
            map.set("points", JSON.stringify([wx, wy]));
            map.set("stroke", brush.kind === "eraser" ? "#000000" : brush.color);
            map.set("strokeWidth", brush.width);
            map.set(
              "opacity",
              brush.kind === "highlighter"
                ? 0.35
                : brush.kind === "eraser"
                  ? 1
                  : 1,
            );
            map.set(
              "composite",
              brush.kind === "eraser" ? "destination-out" : "source-over",
            );
            map.set("startCap", "none");
            map.set("endCap", "none");
            map.set("rounded", true);
            map.set("brushStroke", true);
            const fid = resolveFrameIdAt(wx, wy, elements);
            if (fid) {
              map.set("frameId", fid);
            }
            yElements.push([map]);
            pencilLineIdRef.current = id;
            },
          });
          return;
        }
        if (tryCreateByTool(tool, stage, e.evt)) {
          return;
        }
        if (tool === "select" && isCanvasTarget) {
          setSelectedIds([]);
        }
      },
      onClick: (e: Konva.KonvaEventObject<MouseEvent>) => {
        if (readOnly) {
          return;
        }
        const stage = e.target.getStage() ?? stageRef.current;
        if (!stage) {
          return;
        }
        void tryCreateByTool(tool, stage, e.evt, true);
      },
      onMouseMove: (e: Konva.KonvaEventObject<MouseEvent>) => {
        const stage = e.target.getStage() ?? stageRef.current;
        if (isPanning && panLast.current) {
          if (e.evt.buttons === 0) {
            setIsPanning(false);
            panLast.current = null;
            panStart.current = null;
            return;
          }
          const dx = e.evt.clientX - panLast.current.x;
          const dy = e.evt.clientY - panLast.current.y;
          panLast.current = { x: e.evt.clientX, y: e.evt.clientY };
          if (e.evt.buttons === 2 && (Math.abs(dx) > 1 || Math.abs(dy) > 1)) {
            rightDragMovedRef.current = true;
          }
          setStagePosClamped((p) => ({ x: p.x + dx, y: p.y + dy }));
          return;
        }
        if (tool === "select" && marquee && stage) {
          const { x: wx, y: wy } = pointerToWorld(stage, stagePos, scale);
          setMarquee((prev) =>
            prev
              ? {
                  ...prev,
                  endX: wx,
                  endY: wy,
                }
              : prev,
          );
          return;
        }
        const brush: BrushSettings =
          brushSettings ?? {
            kind: "pencil",
            color: "#2a2f55",
            width: 2.5,
          };
        const isObjectEraser = tool === "pencil" && brush.kind === "eraser";
        if (!readOnly && isObjectEraser && stage && (e.evt.buttons & 1) === 1) {
          const { x: wx, y: wy } = pointerToWorld(stage, stagePos, scale);
          eraseObjectsAt(wx, wy, brush.width);
        }
        if (!readOnly && tool === "pencil" && pencilLineIdRef.current && stage) {
          const { x: wx, y: wy } = pointerToWorld(stage, stagePos, scale);
          const lid = pencilLineIdRef.current;
          ydoc.transact(() => {
            const map = findYMapById(yElements, lid);
            if (!map) {
              return;
            }
            const raw = map.get("points");
            const prev =
              typeof raw === "string" ? (JSON.parse(raw) as number[]) : [];
            prev.push(wx, wy);
            map.set("points", JSON.stringify(prev));
          }, LOCAL_HISTORY_ORIGIN);
        }
        if (stage) {
          const { x: wx, y: wy } = pointerToWorld(stage, stagePos, scale);
          scheduleAwareness({ x: wx, y: wy });
        }
      },
      onMouseUp: (e: Konva.KonvaEventObject<MouseEvent>) => {
        if (e.evt.button === 1) {
          setIsPanning(false);
          panLast.current = null;
        }
        if (e.evt.button === 2) {
          setIsPanning(false);
          panLast.current = null;
          const start = panStart.current;
          panStart.current = null;
          const movedByDistance = start
            ? Math.hypot(e.evt.clientX - start.x, e.evt.clientY - start.y) > 4
            : false;
          const stage = e.target.getStage() ?? stageRef.current;
          if (
            !readOnly &&
            stage &&
            !rightDragMovedRef.current &&
            !movedByDistance
          ) {
            if (e.target === stage) {
              setContextMenu({
                x: e.evt.clientX,
                y: e.evt.clientY,
                kind: "board",
                targetIds: [],
              });
            }
          }
          if (rightDragMovedRef.current || movedByDistance) {
            markContextMenuSuppressed(e.evt.clientX, e.evt.clientY);
          }
          rightDragMovedRef.current = false;
        }
        if (e.evt.button === 0 && marquee) {
          const selectionRect = {
            minX: Math.min(marquee.startX, marquee.endX),
            minY: Math.min(marquee.startY, marquee.endY),
            maxX: Math.max(marquee.startX, marquee.endX),
            maxY: Math.max(marquee.startY, marquee.endY),
          };
          const ids = elements
            .filter((el) => boxesIntersect(elementBounds(el), selectionRect))
            .map((el) => el.id);
          const additive = e.evt.shiftKey || e.evt.metaKey || e.evt.ctrlKey;
          setSelectedIds((prev) =>
            additive ? Array.from(new Set([...prev, ...ids])) : ids,
          );
          setMarquee(null);
        }
        pencilLineIdRef.current = null;
        eraserDeletedIdsRef.current.clear();
      },
      onMouseLeave: () => {
        setIsPanning(false);
        panLast.current = null;
        panStart.current = null;
        rightDragMovedRef.current = false;
        pencilLineIdRef.current = null;
        eraserDeletedIdsRef.current.clear();
        setMarquee(null);
        flushAwareness({
          id: awarenessId,
          name: userFirstName,
          color: "",
          x: null,
          y: null,
        });
      },
    }),
    [
      awarenessId,
      brushSettings,
      editingTextId,
      elements,
      finishTextEditing,
      flushAwareness,
      isPanning,
      markContextMenuSuppressed,
      marquee,
      readOnly,
      pencilLineIdRef,
      scale,
      scheduleAwareness,
      eraseObjectsAt,
      setActiveTextId,
      setContextMenu,
      setIsPanning,
      setMarquee,
      setSelectedIds,
      setStagePosClamped,
      shouldSuppressContextMenu,
      stageRef,
      stagePos,
      tool,
      tryCreateByTool,
      userFirstName,
      historyActor,
      onCreateCommentAt,
      aiMode,
      onCreateGenerationAt,
      yElements,
      ydoc,
    ],
  );
}
