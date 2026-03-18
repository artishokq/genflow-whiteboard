import { useMemo } from "react";

import type { BoardElement } from "../../../entities/board";
import { boardImageSrc } from "../../../shared/api/boardsApi";

export function BoardVideoOverlayLayer({
  sortedElements,
  boardId,
  accessToken,
  shareToken,
  scale,
  stagePos,
  videoDragPreview,
  videoTransformPreview,
  multiSelectionPreviewDelta,
  selectedIds,
  tool,
}: {
  sortedElements: BoardElement[];
  boardId: string;
  accessToken: string | null;
  shareToken?: string | null;
  scale: number;
  stagePos: { x: number; y: number };
  videoDragPreview: { id: string; x: number; y: number } | null;
  videoTransformPreview: {
    id: string;
    x: number;
    y: number;
    width: number;
    height: number;
  } | null;
  multiSelectionPreviewDelta?: { dx: number; dy: number } | null;
  selectedIds: string[];
  tool: string;
}) {
  const videoOverlayItems = useMemo(() => {
    return sortedElements
      .filter(
        (el): el is Extract<BoardElement, { type: "video" }> => el.type === "video",
      )
      .map((el) => ({
        id: el.id,
        src: boardImageSrc(boardId, el.videoFile, accessToken, shareToken),
        left:
          (videoTransformPreview?.id === el.id
            ? videoTransformPreview.x
            : videoDragPreview?.id === el.id
              ? videoDragPreview.x
              : el.x) *
            scale +
          ((multiSelectionPreviewDelta && selectedIds.includes(el.id)
            ? multiSelectionPreviewDelta.dx
            : 0) *
            scale) +
          stagePos.x,
        top:
          (videoTransformPreview?.id === el.id
            ? videoTransformPreview.y
            : videoDragPreview?.id === el.id
              ? videoDragPreview.y
              : el.y) *
            scale +
          ((multiSelectionPreviewDelta && selectedIds.includes(el.id)
            ? multiSelectionPreviewDelta.dy
            : 0) *
            scale) +
          stagePos.y,
        width: Math.max(
          32,
          (videoTransformPreview?.id === el.id
            ? videoTransformPreview.width
            : el.width) * scale,
        ),
        height: Math.max(
          32,
          (videoTransformPreview?.id === el.id
            ? videoTransformPreview.height
            : el.height) * scale,
        ),
      }));
  }, [
    accessToken,
    boardId,
    multiSelectionPreviewDelta,
    scale,
    selectedIds,
    shareToken,
    sortedElements,
    stagePos.x,
    stagePos.y,
    videoDragPreview,
    videoTransformPreview,
  ]);

  return (
    <>
      {videoOverlayItems.map((video) => (
        <div
          key={video.id}
          style={{
            position: "absolute",
            left: video.left,
            top: video.top,
            width: video.width,
            height: video.height,
            padding: 8,
            boxSizing: "border-box",
            pointerEvents: tool === "select" ? "none" : "auto",
            zIndex: 3,
          }}
        >
          <video
            src={video.src}
            controls
            preload="metadata"
            style={{
              width: "100%",
              height: "100%",
              display: "block",
              borderRadius: 8,
              background: "#101425",
            }}
          />
        </div>
      ))}
    </>
  );
}
