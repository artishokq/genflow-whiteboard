import { useRef, type RefObject } from "react";
import type Konva from "konva";
import { Circle, Group, Image as KonvaImage, Layer, Rect, Text as KonvaText, Transformer } from "react-konva";
import useImage from "use-image";

import type { BoardElement, BoardFrameElement } from "../../../entities/board";
import type { CommentThread } from "../../../entities/comment";
import type { MarqueeBox, PeerCursor } from "../model/types";
import { COMMENT_DONE_ICON, COMMENT_ICON } from "../../board-top-bar/model/constants";
import { CommentThreadPin } from "./CommentThreadPin";

type CanvasOverlayLayersProps = {
  remotePeers: Record<string, PeerCursor>;
  scale: number;
  marquee: MarqueeBox | null;
  transformerListening: boolean;
  commentThreads: CommentThread[];
  activeCommentThreadId: string | null;
  accessToken: string | null;
  onCommentThreadPick?: (threadId: string) => void;
  trRef: RefObject<Konva.Transformer | null>;
  singleSelectedText: Extract<BoardElement, { type: "text" }> | null;
  singleSelectedFrame: BoardFrameElement | null;
  onTransformStart: () => void;
  onTransformEnd?: () => void;
  boundBoxFunc: (
    oldBox: { x: number; y: number; width: number; height: number },
    newBox: { x: number; y: number; width: number; height: number },
  ) => { x: number; y: number; width: number; height: number };
  multiSelectionBounds?: { x: number; y: number; width: number; height: number } | null;
  multiSelectionDraggable?: boolean;
  multiSelectionPreviewDelta?: { dx: number; dy: number } | null;
  onMultiSelectionDrag?: (
    phase: "start" | "move" | "end",
    delta: { dx: number; dy: number },
  ) => void;
};

export function CanvasOverlayLayers({
  remotePeers,
  scale,
  marquee,
  transformerListening,
  commentThreads,
  activeCommentThreadId,
  accessToken,
  onCommentThreadPick,
  trRef,
  singleSelectedText,
  singleSelectedFrame,
  onTransformStart,
  onTransformEnd,
  boundBoxFunc,
  multiSelectionBounds = null,
  multiSelectionDraggable = false,
  multiSelectionPreviewDelta = null,
  onMultiSelectionDrag,
}: CanvasOverlayLayersProps) {
  const [messageIcon] = useImage(COMMENT_ICON);
  const [messageDoneIcon] = useImage(COMMENT_DONE_ICON);
  const multiDragNodeRef = useRef<Konva.Rect | null>(null);

  return (
    <>
      <Layer listening={false}>
        {Object.values(remotePeers).map((p) =>
          p.x == null || p.y == null ? null : (
            <Group key={p.id} x={p.x} y={p.y} listening={false}>
              <Circle
                radius={5}
                fill={p.color}
                stroke="#fff"
                strokeWidth={1 / scale}
              />
              <KonvaText
                text={p.name}
                x={8 / scale}
                y={-6 / scale}
                fontSize={12 / scale}
                fill={p.color}
                listening={false}
              />
            </Group>
          ),
        )}
      </Layer>
      <Layer listening>
        {commentThreads.map((thread) => (
          <Group
            key={thread.id}
            x={thread.anchorX}
            y={thread.anchorY}
            onClick={() => onCommentThreadPick?.(thread.id)}
            onTap={() => onCommentThreadPick?.(thread.id)}
          >
            <CommentThreadPin
              thread={thread}
              scale={scale}
              accessToken={accessToken}
              messageIcon={messageIcon}
              messageDoneIcon={messageDoneIcon}
              isActive={thread.id === activeCommentThreadId}
            />
          </Group>
        ))}
      </Layer>
      <Layer listening={transformerListening}>
        {marquee ? (
          <Rect
            x={Math.min(marquee.startX, marquee.endX)}
            y={Math.min(marquee.startY, marquee.endY)}
            width={Math.abs(marquee.endX - marquee.startX)}
            height={Math.abs(marquee.endY - marquee.startY)}
            fill="rgba(74,95,193,0.14)"
            stroke="rgba(74,95,193,0.8)"
            strokeWidth={1 / scale}
            listening={false}
          />
        ) : null}
        {multiSelectionBounds ? (
          <>
            <Rect
              ref={multiDragNodeRef}
              x={multiSelectionBounds.x}
              y={multiSelectionBounds.y}
              width={multiSelectionBounds.width}
              height={multiSelectionBounds.height}
              fill="rgba(0,0,0,0.001)"
              listening={multiSelectionDraggable}
              draggable={multiSelectionDraggable}
              onDragStart={(e) => {
                e.cancelBubble = true;
                onMultiSelectionDrag?.("start", { dx: 0, dy: 0 });
              }}
              onDragMove={(e) => {
                e.cancelBubble = true;
                const node = e.target as Konva.Rect;
                onMultiSelectionDrag?.("move", {
                  dx: node.x() - multiSelectionBounds.x,
                  dy: node.y() - multiSelectionBounds.y,
                });
              }}
              onDragEnd={(e) => {
                e.cancelBubble = true;
                const node = e.target as Konva.Rect;
                onMultiSelectionDrag?.("end", {
                  dx: node.x() - multiSelectionBounds.x,
                  dy: node.y() - multiSelectionBounds.y,
                });
              }}
            />
          </>
        ) : null}
        <Transformer
          ref={trRef}
          listening={transformerListening}
          draggable={transformerListening && !multiSelectionBounds}
          rotateEnabled={false}
          shouldOverdrawWholeArea={false}
          borderEnabled
          borderStroke="rgba(74,95,193,0.95)"
          borderStrokeWidth={1.25 / scale}
          borderDash={[]}
          anchorStroke="rgba(74,95,193,0.95)"
          anchorFill="#ffffff"
          anchorSize={8 / scale}
          enabledAnchors={
            singleSelectedText
              ? [
                  "top-left",
                  "top-right",
                  "middle-left",
                  "middle-right",
                  "bottom-left",
                  "bottom-right",
                ]
              : singleSelectedFrame
                ? ["top-left", "top-right", "bottom-left", "bottom-right"]
                : undefined
          }
          onTransformStart={onTransformStart}
          onTransformEnd={onTransformEnd}
          boundBoxFunc={boundBoxFunc}
        />
      </Layer>
    </>
  );
}
