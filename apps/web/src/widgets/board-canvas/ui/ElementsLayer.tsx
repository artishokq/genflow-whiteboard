import type Konva from "konva";
import type * as Y from "yjs";
import { useEffect, useRef, useState } from "react";
import {
  Circle,
  Group,
  Layer,
  Line,
  Rect,
  Star,
  Text as KonvaText,
} from "react-konva";

import type { BoardElement, BoardFrameElement } from "../../../entities/board";
import { runTrackedAction } from "../../../features/board-history";
import type { ContextMenuState } from "../model/types";
import { boardImageSrc } from "../../../shared/api/boardsApi";
import { KonvaBoardImage } from "../KonvaBoardImage";

type ElementsLayerCtx = {
  sortedElements: BoardElement[];
  tool: string;
  frameLabelLocalPosition: (el: BoardFrameElement, pad: number) => { x: number; y: number };
  FRAME_LABEL_OUTSIDE_PAD: number;
  selectShape: (e: Konva.KonvaEventObject<MouseEvent>, id: string) => void;
  shouldSuppressContextMenu: (x: number, y: number) => boolean;
  isPanning: boolean;
  setContextMenu: React.Dispatch<React.SetStateAction<ContextMenuState | null>>;
  selectedIds: string[];
  frameTransformBaseRef: React.MutableRefObject<unknown>;
  applyFrameTransform: (node: Konva.Node, el: BoardFrameElement, commit: boolean) => void;
  commitFramePositionFromNode: (id: string, node: Konva.Group) => void;
  ydoc: Y.Doc;
  findYMapById: (
    arr: Y.Array<Y.Map<unknown>>,
    id: string,
  ) => Y.Map<unknown> | null;
  yElements: Y.Array<Y.Map<unknown>>;
  historyActor: string;
  lineDragPreview: { lineId: string; x: number; y: number } | null;
  isFreehandBrushLine: (el: BoardElement) => boolean;
  elementBounds: (el: BoardElement) => {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
  };
  lineGroupDragStartRef: React.MutableRefObject<{
    id: string;
    gx: number;
    gy: number;
    lineX: number;
    lineY: number;
  } | null>;
  lineTransformBaseRef: React.MutableRefObject<unknown>;
  activeTransformAnchorRef: React.MutableRefObject<string | null>;
  trRef: React.RefObject<Konva.Transformer | null>;
  applyFreehandLineTransform: (node: Konva.Node, commit: boolean) => void;
  hitStroke: number;
  singleSelectedLine: Extract<BoardElement, { type: "line" }> | null;
  lineEndpointAngle: (points: number[], side: "start" | "end") => number;
  arrowCapPoints: (x: number, y: number, angle: number, size: number) => number[];
  setLineDragPreview: React.Dispatch<
    React.SetStateAction<{ lineId: string; x: number; y: number } | null>
  >;
  updateLineDraft: (
    lineId: string,
    fallbackPoints: number[],
    updater: (points: number[]) => void,
  ) => void;
  lineEditDraftRef: React.MutableRefObject<{ lineId: string; points: number[] } | null>;
  startLineDraft: (lineId: string, points: number[]) => void;
  commitAndClearLineDraft: (lineId: string) => void;
  midpointDragRef: React.MutableRefObject<{ lineId: string; insertedPointIndex: number } | null>;
  estimateTextBlockHeight: (args: {
    text: string;
    width: number;
    fontSize: number;
    fontFamily: string;
    bold: boolean;
    italic: boolean;
  }) => number;
  editingTextId: string | null;
  beginTextEditing: (id: string) => void;
  setSelectedIds: React.Dispatch<React.SetStateAction<string[]>>;
  setActiveTextId: React.Dispatch<React.SetStateAction<string | null>>;
  setEditingTextId: React.Dispatch<React.SetStateAction<string | null>>;
  updateTextElement: (id: string, updater: (map: Y.Map<unknown>) => void) => void;
  textTransformBaseRef: React.MutableRefObject<unknown>;
  applyTextTransform: (node: Konva.Node, el: Extract<BoardElement, { type: "text" }>, commit: boolean) => void;
  STICKER_PADDING: number;
  TEXT_LINE_HEIGHT: number;
  boardId: string;
  accessToken: string | null;
  shareToken?: string | null;
  readOnly?: boolean;
  videoDragPreview: { id: string; x: number; y: number } | null;
  setVideoDragPreview: React.Dispatch<
    React.SetStateAction<{ id: string; x: number; y: number } | null>
  >;
  videoTransformPreview: {
    id: string;
    x: number;
    y: number;
    width: number;
    height: number;
  } | null;
  setVideoTransformPreview: React.Dispatch<
    React.SetStateAction<{
      id: string;
      x: number;
      y: number;
      width: number;
      height: number;
    } | null>
  >;
  multiSelectionPreviewDelta?: { dx: number; dy: number } | null;
};

export function ElementsLayer({ ctx }: { ctx: ElementsLayerCtx }) {
  const {
    sortedElements,
    tool,
    frameLabelLocalPosition,
    FRAME_LABEL_OUTSIDE_PAD,
    selectShape,
    shouldSuppressContextMenu,
    isPanning,
    setContextMenu,
    selectedIds,
    frameTransformBaseRef,
    applyFrameTransform,
    commitFramePositionFromNode,
    ydoc,
    findYMapById,
    yElements,
    historyActor,
    lineDragPreview,
    isFreehandBrushLine,
    elementBounds,
    lineGroupDragStartRef,
    lineTransformBaseRef,
    activeTransformAnchorRef,
    trRef,
    applyFreehandLineTransform,
    hitStroke,
    singleSelectedLine,
    lineEndpointAngle,
    arrowCapPoints,
    setLineDragPreview,
    updateLineDraft,
    lineEditDraftRef,
    startLineDraft,
    commitAndClearLineDraft,
    midpointDragRef,
    estimateTextBlockHeight,
    editingTextId,
    beginTextEditing,
    setSelectedIds,
    setActiveTextId,
    textTransformBaseRef,
    applyTextTransform,
    STICKER_PADDING,
    TEXT_LINE_HEIGHT,
    boardId,
    accessToken,
    shareToken,
    readOnly = false,
    videoTransformPreview,
    setVideoDragPreview,
    setVideoTransformPreview,
    multiSelectionPreviewDelta = null,
  } = ctx;
  const [lineDraftView, setLineDraftView] = useState<{
    lineId: string;
    points: number[];
  } | null>(null);
  const draftRafRef = useRef<number | null>(null);
  const pendingDraftRef = useRef<{ lineId: string; points: number[] } | null>(null);
  const activeLineHandleDragRef = useRef<{
    kind: "vertex" | "midpoint";
    lineId: string;
    lineX: number;
    lineY: number;
    stage: Konva.Stage;
    basePoints: number[];
    pointIndex: number;
  } | null>(null);

  const scheduleDraftView = (draft: { lineId: string; points: number[] }) => {
    pendingDraftRef.current = draft;
    if (draftRafRef.current != null) return;
    draftRafRef.current = window.requestAnimationFrame(() => {
      draftRafRef.current = null;
      const next = pendingDraftRef.current;
      pendingDraftRef.current = null;
      if (next) {
        setLineDraftView(next);
      }
    });
  };

  const clearDraftView = () => {
    if (draftRafRef.current != null) {
      window.cancelAnimationFrame(draftRafRef.current);
      draftRafRef.current = null;
    }
    pendingDraftRef.current = null;
    setLineDraftView(null);
  };

  useEffect(
    () => () => {
      if (draftRafRef.current != null) {
        window.cancelAnimationFrame(draftRafRef.current);
      }
    },
    [],
  );

  useEffect(() => {
    const onPointerMove = (evt: PointerEvent) => {
      const drag = activeLineHandleDragRef.current;
      if (!drag) return;
      drag.stage.setPointersPositions(evt);
      const p = drag.stage.getPointerPosition();
      if (!p) return;
      const sx = drag.stage.scaleX() || 1;
      const sy = drag.stage.scaleY() || 1;
      const wx = (p.x - drag.stage.x()) / sx;
      const wy = (p.y - drag.stage.y()) / sy;
      const nx = wx - drag.lineX;
      const ny = wy - drag.lineY;

      updateLineDraft(drag.lineId, drag.basePoints, (pts) => {
        pts[drag.pointIndex] = nx;
        pts[drag.pointIndex + 1] = ny;
      });
      const draft = lineEditDraftRef.current;
      if (draft?.lineId === drag.lineId) {
        scheduleDraftView({
          lineId: drag.lineId,
          points: [...draft.points],
        });
      }
    };

    const onPointerUp = () => {
      const drag = activeLineHandleDragRef.current;
      if (!drag) return;
      if (drag.kind === "midpoint") {
        midpointDragRef.current = null;
      }
      commitAndClearLineDraft(drag.lineId);
      clearDraftView();
      activeLineHandleDragRef.current = null;
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerUp);
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerUp);
    };
  }, [commitAndClearLineDraft, lineEditDraftRef, midpointDragRef, updateLineDraft]);

  return (
    <Layer>
      {sortedElements.map((el) => {
        const selectedDx =
          multiSelectionPreviewDelta && selectedIds.includes(el.id)
            ? multiSelectionPreviewDelta.dx
            : 0;
        const selectedDy =
          multiSelectionPreviewDelta && selectedIds.includes(el.id)
            ? multiSelectionPreviewDelta.dy
            : 0;
        if (el.type === "frame") {
          const cx = el.x + selectedDx + el.width / 2;
          const cy = el.y + selectedDy + el.height / 2;
          const hw = el.width / 2;
          const hh = el.height / 2;
          const labelLocal = frameLabelLocalPosition(
            el,
            FRAME_LABEL_OUTSIDE_PAD,
          );
          return (
            <Group
              key={el.id}
              id={el.id}
              x={cx}
              y={cy}
              rotation={el.rotation}
              listening={tool === "select"}
              draggable={tool === "select" && !readOnly}
              onMouseDown={(e) => selectShape(e, el.id)}
              onContextMenu={(e) => {
                e.evt.preventDefault();
                if (shouldSuppressContextMenu(e.evt.clientX, e.evt.clientY)) {
                  return;
                }
                if (isPanning) {
                  return;
                }
                setContextMenu({
                  x: e.evt.clientX,
                  y: e.evt.clientY,
                  kind: "shape",
                  targetIds:
                    selectedIds.includes(el.id) && selectedIds.length > 0
                      ? selectedIds
                      : [el.id],
                });
              }}
              onTransformStart={() => {
                frameTransformBaseRef.current = {
                  id: el.id,
                  width: el.width,
                  height: el.height,
                };
              }}
              onTransformEnd={(e) => {
                applyFrameTransform(e.target, el, true);
              }}
              onDragMove={(e) => {
                if (tool !== "select") return;
                commitFramePositionFromNode(el.id, e.target as Konva.Group);
              }}
              onDragEnd={(e) => {
                commitFramePositionFromNode(el.id, e.target as Konva.Group);
              }}
            >
              <Rect
                x={-hw}
                y={-hh}
                width={el.width}
                height={el.height}
                fill={el.fill}
                stroke="rgba(36,42,74,0.16)"
                strokeWidth={1}
                cornerRadius={2}
                listening={tool === "select"}
              />
              <Group
                x={labelLocal.x}
                y={labelLocal.y}
                rotation={-el.rotation}
                listening={false}
              >
                <KonvaText
                  x={0}
                  y={0}
                  text={el.name}
                  fontSize={13}
                  fontFamily="Noto Sans, Inter, sans-serif"
                  fill="#3d4160"
                  align="left"
                  verticalAlign="bottom"
                  listening={false}
                />
              </Group>
            </Group>
          );
        }
        if (el.type === "rect") {
          const shapeKind = el.shapeKind ?? "square";
          const shapeNode =
            shapeKind === "circle" ? (
              <>
                <Circle
                  x={el.width / 2}
                  y={el.height / 2}
                  radius={Math.max(1, Math.min(el.width, el.height) / 2)}
                  fill={el.fill}
                  opacity={el.fillOpacity}
                  listening={false}
                />
                <Circle
                  x={el.width / 2}
                  y={el.height / 2}
                  radius={Math.max(1, Math.min(el.width, el.height) / 2)}
                  fill="transparent"
                  stroke={el.stroke}
                  opacity={el.strokeOpacity}
                  strokeWidth={el.strokeWidth}
                  listening={false}
                />
              </>
            ) : shapeKind === "triangle" ? (
              <>
                <Line
                  points={[el.width / 2, 0, el.width, el.height, 0, el.height]}
                  closed
                  fill={el.fill}
                  opacity={el.fillOpacity}
                  lineJoin="round"
                  listening={false}
                />
                <Line
                  points={[el.width / 2, 0, el.width, el.height, 0, el.height]}
                  closed
                  fill="transparent"
                  stroke={el.stroke}
                  opacity={el.strokeOpacity}
                  strokeWidth={el.strokeWidth}
                  lineJoin="round"
                  listening={false}
                />
              </>
            ) : shapeKind === "star" ? (
              <>
                <Star
                  x={el.width / 2}
                  y={el.height / 2}
                  numPoints={5}
                  innerRadius={Math.max(4, Math.min(el.width, el.height) * 0.2)}
                  outerRadius={Math.max(8, Math.min(el.width, el.height) * 0.5)}
                  fill={el.fill}
                  opacity={el.fillOpacity}
                  listening={false}
                />
                <Star
                  x={el.width / 2}
                  y={el.height / 2}
                  numPoints={5}
                  innerRadius={Math.max(4, Math.min(el.width, el.height) * 0.2)}
                  outerRadius={Math.max(8, Math.min(el.width, el.height) * 0.5)}
                  fill="transparent"
                  stroke={el.stroke}
                  opacity={el.strokeOpacity}
                  strokeWidth={el.strokeWidth}
                  listening={false}
                />
              </>
            ) : (
              <>
                <Rect
                  x={0}
                  y={0}
                  width={el.width}
                  height={el.height}
                  fill={el.fill}
                  opacity={el.fillOpacity}
                  cornerRadius={shapeKind === "square" ? 8 : 0}
                  listening={false}
                />
                <Rect
                  x={0}
                  y={0}
                  width={el.width}
                  height={el.height}
                  fill="transparent"
                  stroke={el.stroke}
                  opacity={el.strokeOpacity}
                  strokeWidth={el.strokeWidth}
                  cornerRadius={shapeKind === "square" ? 8 : 0}
                  listening={false}
                />
              </>
            );
          return (
            <Group
              key={el.id}
              id={el.id}
              x={el.x + selectedDx}
              y={el.y + selectedDy}
              width={el.width}
              height={el.height}
              opacity={el.opacity}
              listening={tool === "select"}
              draggable={tool === "select" && !readOnly}
              onMouseDown={(e) => selectShape(e, el.id)}
              onContextMenu={(e) => {
                e.evt.preventDefault();
                if (shouldSuppressContextMenu(e.evt.clientX, e.evt.clientY)) {
                  return;
                }
                if (isPanning) {
                  return;
                }
                setContextMenu({
                  x: e.evt.clientX,
                  y: e.evt.clientY,
                  kind: "shape",
                  targetIds:
                    selectedIds.includes(el.id) && selectedIds.length > 0
                      ? selectedIds
                      : [el.id],
                });
              }}
              onDragEnd={(e) => {
                const node = e.target;
                runTrackedAction({
                  ydoc,
                  labelKey: "board.historyAction.movedShape",
                  actor: historyActor,
                  fn: () => {
                  const map = findYMapById(yElements, el.id);
                  if (map) {
                    map.set("x", node.x());
                    map.set("y", node.y());
                  }
                  },
                });
              }}
              onTransformEnd={(e) => {
                const node = e.target;
                runTrackedAction({
                  ydoc,
                  labelKey: "board.historyAction.resizedShape",
                  actor: historyActor,
                  fn: () => {
                  const map = findYMapById(yElements, el.id);
                  if (!map) {
                    return;
                  }
                  const sx = node.scaleX();
                  const sy = node.scaleY();
                  map.set("x", node.x());
                  map.set("y", node.y());
                  const nextWidth = Math.max(8, node.width() * sx);
                  const nextHeight = Math.max(8, node.height() * sy);
                  if (shapeKind === "square" || shapeKind === "circle") {
                    const side = Math.max(nextWidth, nextHeight);
                    map.set("width", side);
                    map.set("height", side);
                    node.width(side);
                    node.height(side);
                  } else {
                    map.set("width", nextWidth);
                    map.set("height", nextHeight);
                  }
                  node.scaleX(1);
                  node.scaleY(1);
                  },
                });
              }}
            >
              <Rect
                x={0}
                y={0}
                width={el.width}
                height={el.height}
                fill="rgba(0,0,0,0.001)"
                listening={tool === "select"}
              />
              {shapeNode}
            </Group>
          );
        }
        if (el.type === "line") {
          const lineBaseX = lineDragPreview?.lineId === el.id ? lineDragPreview.x : el.x;
          const lineBaseY = lineDragPreview?.lineId === el.id ? lineDragPreview.y : el.y;
          const lineX = lineBaseX + selectedDx;
          const lineY = lineBaseY + selectedDy;
          const effectivePoints = el.points;

          if (isFreehandBrushLine(el)) {
            const b = elementBounds(el);
            const bw = Math.max(1, b.maxX - b.minX);
            const bh = Math.max(1, b.maxY - b.minY);
            return (
              <Group
                key={el.id}
                id={el.id}
                x={b.minX + selectedDx}
                y={b.minY + selectedDy}
                listening={tool === "select"}
                draggable={tool === "select" && !readOnly}
                onMouseDown={(e) => selectShape(e, el.id)}
                onContextMenu={(e) => {
                  e.evt.preventDefault();
                  if (shouldSuppressContextMenu(e.evt.clientX, e.evt.clientY)) {
                    return;
                  }
                  if (isPanning) {
                    return;
                  }
                  setContextMenu({
                    x: e.evt.clientX,
                    y: e.evt.clientY,
                    kind: "shape",
                    targetIds:
                      selectedIds.includes(el.id) && selectedIds.length > 0
                        ? selectedIds
                        : [el.id],
                  });
                }}
                onDragStart={(e) => {
                  const g = e.target as Konva.Group;
                  lineGroupDragStartRef.current = {
                    id: el.id,
                    gx: g.x(),
                    gy: g.y(),
                    lineX: lineBaseX,
                    lineY: lineBaseY,
                  };
                }}
                onDragEnd={(e) => {
                  const g = e.target as Konva.Group;
                  const s = lineGroupDragStartRef.current;
                  lineGroupDragStartRef.current = null;
                  if (!s || s.id !== el.id) {
                    return;
                  }
                  const dx = g.x() - s.gx;
                  const dy = g.y() - s.gy;
                  if (dx === 0 && dy === 0) {
                    return;
                  }
                  runTrackedAction({
                    ydoc,
                    labelKey: "board.historyAction.movedStroke",
                    actor: historyActor,
                    fn: () => {
                    const map = findYMapById(yElements, el.id);
                    if (map) {
                      map.set("x", s.lineX + dx);
                      map.set("y", s.lineY + dy);
                    }
                    },
                  });
                }}
                onTransformStart={() => {
                  lineTransformBaseRef.current = {
                    id: el.id,
                    minX: b.minX,
                    minY: b.minY,
                    w: bw,
                    h: bh,
                    lineX,
                    lineY,
                    points: [...effectivePoints],
                  };
                  activeTransformAnchorRef.current =
                    trRef.current?.getActiveAnchor() ?? null;
                }}
                onTransformEnd={(e) => {
                  applyFreehandLineTransform(e.target, true);
                }}
              >
                <Rect
                  x={0}
                  y={0}
                  width={bw}
                  height={bh}
                  fill="rgba(0,0,0,0.001)"
                  listening={tool === "select"}
                />
                <Line
                  x={lineBaseX - b.minX}
                  y={lineBaseY - b.minY}
                  points={effectivePoints}
                  stroke={el.stroke}
                  strokeWidth={el.strokeWidth}
                  opacity={el.opacity}
                  globalCompositeOperation={el.composite}
                  lineCap="round"
                  lineJoin="round"
                  tension={0.35}
                  listening={tool === "select"}
                  hitStrokeWidth={hitStroke}
                  draggable={false}
                  onMouseDown={(e) => selectShape(e, el.id)}
                />
              </Group>
            );
          }

          const isLineEditing = singleSelectedLine?.id === el.id;
          const visiblePoints =
            isLineEditing && lineDraftView?.lineId === el.id
              ? lineDraftView.points
              : effectivePoints;
          return (
            <>
              <Line
                key={el.id}
                id={el.id}
                x={lineX}
                y={lineY}
                points={visiblePoints}
                stroke={el.stroke}
                strokeWidth={el.strokeWidth}
                opacity={el.opacity}
                globalCompositeOperation={el.composite}
                lineCap={el.rounded ? "round" : "butt"}
                lineJoin={el.rounded ? "round" : "miter"}
                tension={el.rounded ? 0.35 : 0}
                listening={tool === "select"}
                draggable={tool === "select" && !readOnly && !isLineEditing}
                hitStrokeWidth={hitStroke}
                onMouseDown={(e) => selectShape(e, el.id)}
                onContextMenu={(e) => {
                  e.evt.preventDefault();
                  if (shouldSuppressContextMenu(e.evt.clientX, e.evt.clientY)) {
                    return;
                  }
                  if (isPanning) {
                    return;
                  }
                  setContextMenu({
                    x: e.evt.clientX,
                    y: e.evt.clientY,
                    kind: "shape",
                    targetIds:
                      selectedIds.includes(el.id) && selectedIds.length > 0
                        ? selectedIds
                        : [el.id],
                  });
                }}
                onDragMove={(e) => {
                  const node = e.target;
                  setLineDragPreview({
                    lineId: el.id,
                    x: node.x(),
                    y: node.y(),
                  });
                  const stage = node.getStage();
                  if (!stage) return;
                  const ox = node.x();
                  const oy = node.y();
                  const startX = effectivePoints[0] ?? 0;
                  const startY = effectivePoints[1] ?? 0;
                  const endX = effectivePoints[effectivePoints.length - 2] ?? 0;
                  const endY = effectivePoints[effectivePoints.length - 1] ?? 0;
                  const startAngle = lineEndpointAngle(
                    effectivePoints,
                    "start",
                  );
                  const endAngle = lineEndpointAngle(effectivePoints, "end");
                  const capSize = Math.max(8, el.strokeWidth * 3.2);
                  const startArrow = stage.findOne(
                    `#${el.id}-start-cap-arrow`,
                  ) as Konva.Line | null;
                  if (startArrow) {
                    startArrow.points(
                      arrowCapPoints(
                        lineX + ox + startX,
                        lineY + oy + startY,
                        startAngle + Math.PI,
                        capSize,
                      ),
                    );
                  }
                  const endArrow = stage.findOne(
                    `#${el.id}-end-cap-arrow`,
                  ) as Konva.Line | null;
                  if (endArrow) {
                    endArrow.points(
                      arrowCapPoints(
                        lineX + ox + endX,
                        lineY + oy + endY,
                        endAngle + Math.PI,
                        capSize,
                      ),
                    );
                  }
                  const startCircle = stage.findOne(
                    `#${el.id}-start-cap-circle`,
                  ) as Konva.Circle | null;
                  if (startCircle) {
                    startCircle.x(lineX + ox + startX);
                    startCircle.y(lineY + oy + startY);
                  }
                  const endCircle = stage.findOne(
                    `#${el.id}-end-cap-circle`,
                  ) as Konva.Circle | null;
                  if (endCircle) {
                    endCircle.x(lineX + ox + endX);
                    endCircle.y(lineY + oy + endY);
                  }
                  const startSquare = stage.findOne(
                    `#${el.id}-start-cap-square`,
                  ) as Konva.Rect | null;
                  if (startSquare) {
                    const r = Math.max(4, el.strokeWidth * 1.8);
                    startSquare.x(lineX + ox + startX - r);
                    startSquare.y(lineY + oy + startY - r);
                  }
                  const endSquare = stage.findOne(
                    `#${el.id}-end-cap-square`,
                  ) as Konva.Rect | null;
                  if (endSquare) {
                    const r = Math.max(4, el.strokeWidth * 1.8);
                    endSquare.x(lineX + ox + endX - r);
                    endSquare.y(lineY + oy + endY - r);
                  }
                  node.getLayer()?.batchDraw();
                }}
                onDragEnd={(e) => {
                  const node = e.target;
                  const ox = node.x();
                  const oy = node.y();
                  setLineDragPreview(null);
                  runTrackedAction({
                    ydoc,
                    labelKey: "board.historyAction.movedLine",
                    actor: historyActor,
                    fn: () => {
                    const map = findYMapById(yElements, el.id);
                    if (!map) {
                      return;
                    }
                    const raw = map.get("points");
                    const pts =
                      typeof raw === "string"
                        ? (JSON.parse(raw) as number[])
                        : [];
                    for (let i = 0; i < pts.length; i += 2) {
                      pts[i] += ox;
                      pts[i + 1] += oy;
                    }
                    map.set("points", JSON.stringify(pts));
                    map.set("x", 0);
                    map.set("y", 0);
                    node.x(0);
                    node.y(0);
                    },
                  });
                }}
              />
              {/* caps + line editing handles preserved as-is */}
              {(() => {
                  const startX = visiblePoints[0] ?? 0;
                  const startY = visiblePoints[1] ?? 0;
                  const endX = visiblePoints[visiblePoints.length - 2] ?? 0;
                  const endY = visiblePoints[visiblePoints.length - 1] ?? 0;
                  const startAngle = lineEndpointAngle(visiblePoints, "start");
                  const endAngle = lineEndpointAngle(visiblePoints, "end");
                const capSize = Math.max(8, el.strokeWidth * 3.2);
                return (
                  <>
                    {el.startCap === "arrow" ? (
                      <Line
                        id={`${el.id}-start-cap-arrow`}
                        points={arrowCapPoints(
                          lineX + startX,
                          lineY + startY,
                          startAngle + Math.PI,
                          capSize,
                        )}
                        closed
                        fill={el.stroke}
                        stroke={el.stroke}
                        strokeWidth={1}
                        listening={false}
                      />
                    ) : el.startCap === "circle" ? (
                      <Circle
                        id={`${el.id}-start-cap-circle`}
                        x={lineX + startX}
                        y={lineY + startY}
                        radius={Math.max(4, el.strokeWidth * 1.8)}
                        fill="#ffffff"
                        stroke={el.stroke}
                        strokeWidth={Math.max(2, el.strokeWidth * 0.8)}
                        listening={false}
                      />
                    ) : el.startCap === "square" ? (
                      <Rect
                        id={`${el.id}-start-cap-square`}
                        x={lineX + startX - Math.max(4, el.strokeWidth * 1.8)}
                        y={lineY + startY - Math.max(4, el.strokeWidth * 1.8)}
                        width={Math.max(8, el.strokeWidth * 3.6)}
                        height={Math.max(8, el.strokeWidth * 3.6)}
                        fill="#ffffff"
                        stroke={el.stroke}
                        strokeWidth={Math.max(2, el.strokeWidth * 0.8)}
                        listening={false}
                      />
                    ) : null}
                    {el.endCap === "arrow" ? (
                      <Line
                        id={`${el.id}-end-cap-arrow`}
                        points={arrowCapPoints(
                          lineX + endX,
                          lineY + endY,
                          endAngle + Math.PI,
                          capSize,
                        )}
                        closed
                        fill={el.stroke}
                        stroke={el.stroke}
                        strokeWidth={1}
                        listening={false}
                      />
                    ) : el.endCap === "circle" ? (
                      <Circle
                        id={`${el.id}-end-cap-circle`}
                        x={lineX + endX}
                        y={lineY + endY}
                        radius={Math.max(4, el.strokeWidth * 1.8)}
                        fill="#ffffff"
                        stroke={el.stroke}
                        strokeWidth={Math.max(2, el.strokeWidth * 0.8)}
                        listening={false}
                      />
                    ) : el.endCap === "square" ? (
                      <Rect
                        id={`${el.id}-end-cap-square`}
                        x={lineX + endX - Math.max(4, el.strokeWidth * 1.8)}
                        y={lineY + endY - Math.max(4, el.strokeWidth * 1.8)}
                        width={Math.max(8, el.strokeWidth * 3.6)}
                        height={Math.max(8, el.strokeWidth * 3.6)}
                        fill="#ffffff"
                        stroke={el.stroke}
                        strokeWidth={Math.max(2, el.strokeWidth * 0.8)}
                        listening={false}
                      />
                    ) : null}
                    {isLineEditing
                      ? visiblePoints.map((_, i) => i).filter((i) => i % 2 === 0).map((i) => {
                          const px = visiblePoints[i] ?? 0;
                          const py = visiblePoints[i + 1] ?? 0;
                          return (
                            <Circle
                              key={`${el.id}-v-${i}`}
                              x={lineX + px}
                              y={lineY + py}
                              radius={Math.max(5, el.strokeWidth * 0.9)}
                              fill="#ffffff"
                              stroke="#4a5fc1"
                              strokeWidth={Math.max(1.5, el.strokeWidth * 0.35)}
                              draggable={false}
                              onMouseDown={(e) => {
                                if (tool !== "select") return;
                                e.cancelBubble = true;
                                const stage = e.target.getStage();
                                if (!stage) return;
                                startLineDraft(el.id, visiblePoints);
                                scheduleDraftView({ lineId: el.id, points: [...visiblePoints] });
                                activeLineHandleDragRef.current = {
                                  kind: "vertex",
                                  lineId: el.id,
                                  lineX,
                                  lineY,
                                  stage,
                                  basePoints: [...visiblePoints],
                                  pointIndex: i,
                                };
                              }}
                            />
                          );
                        })
                      : null}
                    {isLineEditing
                      ? visiblePoints
                          .map((_, i) => i)
                          .filter((i) => i % 2 === 0 && i + 3 < visiblePoints.length)
                          .map((i) => {
                            const x1 = visiblePoints[i] ?? 0;
                            const y1 = visiblePoints[i + 1] ?? 0;
                            const x2 = visiblePoints[i + 2] ?? 0;
                            const y2 = visiblePoints[i + 3] ?? 0;
                            const mx = (x1 + x2) / 2;
                            const my = (y1 + y2) / 2;
                            const insertAt = i + 2;
                            return (
                              <Rect
                                key={`${el.id}-m-${i}`}
                                x={lineX + mx - 4}
                                y={lineY + my - 4}
                                width={8}
                                height={8}
                                cornerRadius={2}
                                fill="#ffffff"
                                stroke="#4a5fc1"
                                strokeWidth={1.2}
                                draggable={false}
                                onMouseDown={(e) => {
                                  if (tool !== "select") return;
                                  e.cancelBubble = true;
                                  const stage = e.target.getStage();
                                  if (!stage) return;
                                  startLineDraft(el.id, visiblePoints);
                                  updateLineDraft(el.id, visiblePoints, (pts) => {
                                    pts.splice(insertAt, 0, mx, my);
                                  });
                                  const draft = lineEditDraftRef.current;
                                  if (draft?.lineId === el.id) {
                                    scheduleDraftView({
                                      lineId: el.id,
                                      points: [...draft.points],
                                    });
                                  }
                                  midpointDragRef.current = {
                                    lineId: el.id,
                                    insertedPointIndex: insertAt,
                                  };
                                  activeLineHandleDragRef.current = {
                                    kind: "midpoint",
                                    lineId: el.id,
                                    lineX,
                                    lineY,
                                    stage,
                                    basePoints: [...visiblePoints],
                                    pointIndex: insertAt,
                                  };
                                }}
                              />
                            );
                          })
                      : null}
                  </>
                );
              })()}
            </>
          );
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
          const fontStyle =
            `${el.bold ? "bold " : ""}${el.italic ? "italic" : ""}`.trim();
          const textDecoration =
            `${el.underline ? "underline " : ""}${el.strike ? "line-through" : ""}`.trim();
          const isSticker = el.textKind === "sticker";
          const stickerBoxHeight = Math.max(textHeight, el.width);
          return (
            <Group
              key={el.id}
              id={el.id}
              x={el.x + selectedDx}
              y={el.y + selectedDy}
              listening={tool === "select" || tool === "text"}
              draggable={tool === "select" && !readOnly && editingTextId !== el.id}
              onMouseDown={(e) => {
                if (tool === "text") {
                  e.cancelBubble = true;
                  beginTextEditing(el.id);
                  return;
                }
                if (tool === "select") {
                  e.cancelBubble = true;
                  const alreadySingleSelected =
                    selectedIds.length === 1 && selectedIds[0] === el.id;
                  if (alreadySingleSelected && editingTextId !== el.id) {
                    beginTextEditing(el.id);
                    return;
                  }
                  setSelectedIds([el.id]);
                  setActiveTextId(el.id);
                }
              }}
              onClick={(e) => {
                if (tool !== "select") return;
                selectShape(e, el.id);
                setActiveTextId(el.id);
              }}
              onDblClick={(e) => {
                if (tool !== "select") return;
                e.cancelBubble = true;
                beginTextEditing(el.id);
              }}
              onDblTap={(e) => {
                if (tool !== "select") return;
                e.cancelBubble = true;
                beginTextEditing(el.id);
              }}
              onDragStart={() => {
                if (tool !== "select") return;
                setSelectedIds([el.id]);
                setActiveTextId(el.id);
              }}
              onContextMenu={(e) => {
                e.evt.preventDefault();
                if (shouldSuppressContextMenu(e.evt.clientX, e.evt.clientY)) {
                  return;
                }
                if (isPanning) {
                  return;
                }
                setContextMenu({
                  x: e.evt.clientX,
                  y: e.evt.clientY,
                  kind: "shape",
                  targetIds:
                    selectedIds.includes(el.id) && selectedIds.length > 0
                      ? selectedIds
                      : [el.id],
                });
              }}
              onDragEnd={(e) => {
                const node = e.target;
                runTrackedAction({
                  ydoc,
                  labelKey: "board.historyAction.movedText",
                  actor: historyActor,
                  fn: () => {
                  const map = findYMapById(yElements, el.id);
                  if (map) {
                    map.set("x", node.x());
                    map.set("y", node.y());
                  }
                  },
                });
              }}
              onTransformStart={() => {
                textTransformBaseRef.current = {
                  id: el.id,
                  width: el.width,
                  fontSize: el.fontSize,
                };
              }}
              onTransformEnd={(e) => {
                applyTextTransform(e.target, el, true);
              }}
            >
              <Rect
                x={0}
                y={0}
                width={el.width}
                height={isSticker ? stickerBoxHeight : textHeight}
                fill="rgba(0,0,0,0.001)"
                listening={tool === "select" || tool === "text"}
              />
              {el.background !== "transparent" ? (
                <Rect
                  x={0}
                  y={0}
                  width={el.width}
                  height={isSticker ? stickerBoxHeight : textHeight}
                  fill={el.background}
                  cornerRadius={isSticker ? 10 : 6}
                  stroke={isSticker ? "rgba(36,42,74,0.12)" : undefined}
                  strokeWidth={isSticker ? 1 : 0}
                  shadowColor={isSticker ? "rgba(34, 40, 74, 0.32)" : undefined}
                  shadowBlur={isSticker ? 14 : 0}
                  shadowOffsetY={isSticker ? 5 : 0}
                  shadowOpacity={isSticker ? 0.24 : 0}
                  listening={false}
                />
              ) : null}
              <KonvaText
                id={`${el.id}-text`}
                x={isSticker ? STICKER_PADDING : 0}
                y={isSticker ? STICKER_PADDING : 0}
                width={
                  isSticker
                    ? Math.max(20, el.width - STICKER_PADDING * 2)
                    : el.width
                }
                text={el.text}
                fontSize={el.fontSize}
                fontFamily={el.fontFamily}
                fontStyle={fontStyle || "normal"}
                textDecoration={textDecoration}
                align={el.align}
                lineHeight={TEXT_LINE_HEIGHT}
                wrap="char"
                fill={el.fill}
                visible={editingTextId !== el.id}
                listening={false}
              />
            </Group>
          );
        }
        if (el.type === "image") {
          const src = boardImageSrc(
            boardId,
            el.imageFile,
            accessToken,
            shareToken,
          );
          return (
            <KonvaBoardImage
              key={el.id}
              id={el.id}
              src={src}
              x={el.x + selectedDx}
              y={el.y + selectedDy}
              width={el.width}
              height={el.height}
              listening={tool === "select"}
              onMouseDown={(e) => selectShape(e, el.id)}
              onContextMenu={(e) => {
                e.evt.preventDefault();
                if (shouldSuppressContextMenu(e.evt.clientX, e.evt.clientY)) {
                  return;
                }
                if (isPanning) {
                  return;
                }
                setContextMenu({
                  x: e.evt.clientX,
                  y: e.evt.clientY,
                  kind: "shape",
                  targetIds:
                    selectedIds.includes(el.id) && selectedIds.length > 0
                      ? selectedIds
                      : [el.id],
                  downloadImageFile: el.imageFile,
                });
              }}
              onDragEnd={(e) => {
                const node = e.target;
                runTrackedAction({
                  ydoc,
                  labelKey: "board.historyAction.movedImage",
                  actor: historyActor,
                  fn: () => {
                  const map = findYMapById(yElements, el.id);
                  if (map) {
                    map.set("x", node.x());
                    map.set("y", node.y());
                  }
                  },
                });
              }}
              onTransformEnd={(e) => {
                const node = e.target;
                runTrackedAction({
                  ydoc,
                  labelKey: "board.historyAction.resizedImage",
                  actor: historyActor,
                  fn: () => {
                  const map = findYMapById(yElements, el.id);
                  if (!map) {
                    return;
                  }
                  const sx = node.scaleX();
                  const sy = node.scaleY();
                  map.set("x", node.x());
                  map.set("y", node.y());
                  map.set("width", Math.max(16, node.width() * sx));
                  map.set("height", Math.max(16, node.height() * sy));
                  node.scaleX(1);
                  node.scaleY(1);
                  },
                });
              }}
            />
          );
        }
        if (el.type === "video") {
          const videoX =
            videoTransformPreview?.id === el.id
              ? videoTransformPreview.x
              : ctx.videoDragPreview?.id === el.id
                ? ctx.videoDragPreview.x
                : el.x + selectedDx;
          const videoY =
            videoTransformPreview?.id === el.id
              ? videoTransformPreview.y
              : ctx.videoDragPreview?.id === el.id
                ? ctx.videoDragPreview.y
                : el.y + selectedDy;
          return (
            <Group
              key={el.id}
              id={el.id}
              x={videoX}
              y={videoY}
              width={el.width}
              height={el.height}
              listening={tool === "select"}
              draggable={tool === "select" && !readOnly}
              onMouseDown={(e) => selectShape(e, el.id)}
              onContextMenu={(e) => {
                e.evt.preventDefault();
                if (shouldSuppressContextMenu(e.evt.clientX, e.evt.clientY)) {
                  return;
                }
                if (isPanning) {
                  return;
                }
                setContextMenu({
                  x: e.evt.clientX,
                  y: e.evt.clientY,
                  kind: "shape",
                  targetIds:
                    selectedIds.includes(el.id) && selectedIds.length > 0
                      ? selectedIds
                      : [el.id],
                });
              }}
              onDragEnd={(e) => {
                const node = e.target;
                setVideoDragPreview(null);
                runTrackedAction({
                  ydoc,
                  labelKey: "board.historyAction.movedVideo",
                  actor: historyActor,
                  fn: () => {
                    const map = findYMapById(yElements, el.id);
                    if (map) {
                      map.set("x", node.x());
                      map.set("y", node.y());
                    }
                  },
                });
              }}
              onTransform={(e) => {
                const node = e.target;
                setVideoTransformPreview({
                  id: el.id,
                  x: node.x(),
                  y: node.y(),
                  width: Math.max(32, node.width() * node.scaleX()),
                  height: Math.max(32, node.height() * node.scaleY()),
                });
              }}
              onDragMove={(e) => {
                const node = e.target;
                setVideoDragPreview({
                  id: el.id,
                  x: node.x(),
                  y: node.y(),
                });
              }}
              onTransformEnd={(e) => {
                const node = e.target;
                setVideoTransformPreview(null);
                runTrackedAction({
                  ydoc,
                  labelKey: "board.historyAction.resizedVideo",
                  actor: historyActor,
                  fn: () => {
                    const map = findYMapById(yElements, el.id);
                    if (!map) {
                      return;
                    }
                    const sx = node.scaleX();
                    const sy = node.scaleY();
                    map.set("x", node.x());
                    map.set("y", node.y());
                    map.set("width", Math.max(32, node.width() * sx));
                    map.set("height", Math.max(32, node.height() * sy));
                    node.scaleX(1);
                    node.scaleY(1);
                  },
                });
              }}
            >
              <Rect
                x={0}
                y={0}
                width={el.width}
                height={el.height}
                fill="rgba(0,0,0,0.001)"
                listening={tool === "select"}
              />
              <Rect
                x={0}
                y={0}
                width={el.width}
                height={el.height}
                fill="rgba(24, 28, 47, 0.22)"
                stroke="rgba(36,42,74,0.22)"
                strokeWidth={1}
                cornerRadius={8}
                listening={false}
              />
              <KonvaText
                x={12}
                y={12}
                text="Video"
                fontSize={13}
                fontFamily="Noto Sans, Inter, sans-serif"
                fill="#f8fbff"
                listening={false}
              />
            </Group>
          );
        }
        return null;
      })}
    </Layer>
  );
}
