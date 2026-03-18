import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import { useTranslation } from "react-i18next";
import { Stage } from "react-konva";
import type Konva from "konva";
import * as Y from "yjs";

import { useAuthStore } from "../../shared/store/authStore";
import { useBoardClipboard } from "../../features/board-clipboard";
import { useBoardContextMenu } from "../../features/board-context-menu";
import { useBoardCreateCaptureFallback } from "../../features/board-create-capture-fallback/useBoardCreateCaptureFallback";
import { useBoardCreateActions } from "../../features/board-create-actions";
import { useBoardElementMutations } from "../../features/board-element-mutations";
import { useBoardExportActions } from "../../features/board-export";
import { useBoardGrid } from "../../features/board-grid";
import {
  LOCAL_HISTORY_ORIGIN,
  SYSTEM_HISTORY_ORIGIN,
  useBoardHistory,
} from "../../features/board-history";
import { useBoardImageUpload } from "../../features/board-image-upload";
import { useBoardRealtimeSync } from "../../features/board-realtime-sync";
import { useBoardSelection } from "../../features/board-selection";
import { useBoardStagePointerHandlers } from "../../features/board-stage-pointer";
import { useBoardStageInteractions } from "../../features/board-stage-interactions";
import { useBoardTextEditor } from "../../features/board-text-editor";
import {
  useBoardTransforms,
  useMultiSelectionLineTransform,
} from "../../features/board-transform";
import {
  type BoardTool,
  frameLabelLocalPosition,
  isFreehandBrushLine,
  sortElementsForPaint,
} from "../../entities/board";
import {
  BOUNDS_EXPAND_STEP,
  BOUNDS_EXPAND_TRIGGER,
  FRAME_LABEL_OUTSIDE_PAD,
  INITIAL_BOUNDS,
  STICKER_PADDING,
  TEXT_LINE_HEIGHT,
} from "./model/constants";
import {
  arrowCapPoints,
  elementBounds,
  estimateTextBlockHeight,
  findYMapById,
  lineEndpointAngle,
  translateYMapElementByDelta,
} from "./model/geometry";
import { useBoardCanvasYSync } from "./model/useBoardCanvasYSync";
import type {
  BoardCanvasHandle,
  BoardCanvasProps,
  LineEditDraftState,
  MarqueeBox,
  MidpointDragState,
} from "./model/types";
import { CanvasContextMenu } from "./ui/CanvasContextMenu";
import { BoardFloatingPanels } from "./ui/BoardFloatingPanels";
import { BoardVideoOverlayLayer } from "./ui/BoardVideoOverlayLayer";
import { CanvasOverlayLayers } from "./ui/CanvasOverlayLayers";
import { ElementsLayer } from "./ui/ElementsLayer";
import { FrameToolbar } from "./ui/FrameToolbar";
import { GridLayer } from "./ui/GridLayer";
import { ShapeToolbar } from "./ui/ShapeToolbar";
import { TextToolbar } from "./ui/TextToolbar";
import { TextEditorOverlay } from "./ui/TextEditorOverlay";

export const BoardCanvas = forwardRef<BoardCanvasHandle, BoardCanvasProps>(
  function BoardCanvas(
    {
      boardId,
      shareToken = null,
      readOnly = false,
      tool,
      selectedShapeKind = "square",
      selectedFramePreset = "custom",
      onToolChange,
      onScaleChange,
      onHistoryChange,
      showGrid = true,
      boardColor = "#f5f7ff",
      brushSettings,
      commentThreads = [],
      activeCommentThreadId = null,
      onCommentThreadPick,
      onCreateCommentAt,
      pendingCommentAnchor = null,
      activeCommentThread = null,
      commentBusy = false,
      commentError = null,
      onCreateCommentThread,
      onCancelCommentCreate,
      onCloseCommentThread,
      onReplyCommentThread,
      onToggleCommentThreadResolved,
      canDeleteActiveCommentThread = false,
      onDeleteCommentThread,
      aiMode = null,
      onCreateGenerationAt,
      pendingGenerationAnchor = null,
      pendingGenerationMode = null,
      generationDraft = null,
      generationBusy = false,
      generationError = null,
      onSubmitGenerationPrompt,
      onCancelGenerationPrompt,
      onStopGeneration,
      onAcceptGeneration,
      onRejectGeneration,
    },
    ref,
  ) {
    const canWrite = !readOnly;
    const { t } = useTranslation();
    const accessToken = useAuthStore((s) => s.accessToken);
    const user = useAuthStore((s) => s.user);
    const ydoc = useMemo(() => {
      void boardId;
      return new Y.Doc();
    }, [boardId]);
    const yElements = useMemo(
      () => ydoc.getArray<Y.Map<unknown>>("elements"),
      [ydoc],
    );
    const yCanvas = useMemo(() => ydoc.getMap<unknown>("canvas"), [ydoc]);

    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [multiSelectionPreviewDelta, setMultiSelectionPreviewDelta] =
      useState<{
        dx: number;
        dy: number;
      } | null>(null);
    const [size] = useState({
      w: typeof window !== "undefined" ? window.innerWidth : 800,
      h:
        typeof window !== "undefined" ? Math.max(320, window.innerHeight) : 600,
    });
    const { canvasBounds, elements } = useBoardCanvasYSync({
      yCanvas,
      yElements,
      initialBounds: INITIAL_BOUNDS,
    });
    const [isPanning, setIsPanning] = useState(false);
    const [marquee, setMarquee] = useState<MarqueeBox | null>(null);
    const [, setActiveTextId] = useState<string | null>(null);
    const [editingTextId, setEditingTextId] = useState<string | null>(null);
    const [alignMenuOpen, setAlignMenuOpen] = useState(false);
    const [styleMenuOpen, setStyleMenuOpen] = useState(false);
    const [shapeFillMenuOpen, setShapeFillMenuOpen] = useState(false);
    const [shapeStrokeMenuOpen, setShapeStrokeMenuOpen] = useState(false);
    const [lineStartCapMenuOpen, setLineStartCapMenuOpen] = useState(false);
    const [lineEndCapMenuOpen, setLineEndCapMenuOpen] = useState(false);
    const rootRef = useRef<HTMLDivElement>(null);
    const [lineDragPreview, setLineDragPreview] = useState<{
      lineId: string;
      x: number;
      y: number;
    } | null>(null);

    const undoManager = useMemo(
      () =>
        new Y.UndoManager(yElements, {
          captureTimeout: 500,
          trackedOrigins: new Set([LOCAL_HISTORY_ORIGIN]),
        }),
      [yElements],
    );
    const history = useBoardHistory({
      undoManager,
      actorName: user?.firstName ?? "",
    });

    useEffect(() => {
      onHistoryChange?.({
        canUndo: history.canUndo,
        canRedo: history.canRedo,
        entries: history.entries,
      });
    }, [history.canRedo, history.canUndo, history.entries, onHistoryChange]);

    const {
      scale,
      stagePos,
      setStagePosClamped,
      handleWheel,
      zoomIn,
      zoomOut,
      resetZoom,
    } = useBoardStageInteractions({
      size,
      canvasBounds,
      onScaleChange,
    });

    const stageRef = useRef<Konva.Stage>(null);
    const trRef = useRef<Konva.Transformer>(null);
    const midpointDragRef = useRef<MidpointDragState | null>(null);
    const lineEditDraftRef = useRef<LineEditDraftState | null>(null);
    const pencilLineIdRef = useRef<string | null>(null);

    const {
      contextMenu,
      setContextMenu,
      shouldSuppressContextMenu,
      markContextMenuSuppressed,
    } = useBoardContextMenu();

    const {
      clipboardHasItems,
      copyIds,
      deleteIds,
      duplicateIds,
      pasteClipboard,
    } = useBoardClipboard({
      ydoc,
      yElements,
      findYMapById,
      selectedIds,
      setSelectedIds,
      editingTextId,
      historyActor: user?.firstName ?? "",
    });

    const setTool = useCallback(
      (next: BoardTool) => {
        onToolChange?.(next);
        pencilLineIdRef.current = null;
      },
      [onToolChange],
    );

    const {
      activeTextElement,
      activeShapeElement,
      activeFrameElement,
      editingTextElement,
      transformableIds,
      singleSelectedFrame,
      singleSelectedText,
      singleSelectedLine,
      selectShape,
    } = useBoardSelection({
      elements,
      tool,
      selectedIds,
      setSelectedIds,
      setActiveTextId,
      editingTextId,
    });

    const {
      textEditorRef,
      editingTextareaHeight,
      setEditingTextareaHeight,
      syncEditingTextareaHeight,
    } = useBoardTextEditor({
      editingTextElement,
      scale,
    });

    const {
      updateTextElement,
      updateShapeElement,
      commitFramePositionFromNode,
      startLineDraft,
      updateLineDraft,
      commitAndClearLineDraft,
    } = useBoardElementMutations({
      ydoc,
      yElements,
      lineEditDraftRef,
      historyActor: user?.firstName ?? "",
    });

    const {
      addRectangle,
      addShapeAt,
      beginTextEditing,
      addTextAt,
      addStickerAt,
      addFrameAt,
      addImageAt,
      addVideoAt,
      addGeneratedTextAt,
      finishTextEditing,
    } = useBoardCreateActions({
      ydoc,
      yElements,
      elements,
      selectedShapeKind,
      selectedFramePreset,
      setTool,
      setSelectedIds,
      setActiveTextId,
      setEditingTextId,
      setEditingTextareaHeight,
      historyActor: user?.firstName ?? "",
    });

    useEffect(() => {
      if (readOnly && editingTextId) {
        finishTextEditing(editingTextId);
      }
    }, [readOnly, editingTextId, finishTextEditing]);

    const beginTextEditingSafe = useCallback(
      (id: string) => {
        if (readOnly) {
          return;
        }
        beginTextEditing(id);
      },
      [beginTextEditing, readOnly],
    );

    const { fileInputRef, pickImageFile, onImageFile } = useBoardImageUpload({
      boardId,
      accessToken,
      shareToken,
      size,
      stagePos,
      scale,
      addImageAt,
      addVideoAt,
      setTool,
    });

    const {
      snapshotLoaded,
      loadError,
      remotePeers,
      scheduleAwareness,
      flushAwareness,
      awarenessId,
    } = useBoardRealtimeSync({
      boardId,
      ydoc,
      shareToken,
      canWrite,
    });

    const sortedElements = useMemo(
      () => sortElementsForPaint(elements),
      [elements],
    );
    const {
      exportPngViewport,
      exportPngFullBoard,
      exportJsonBackup,
      downloadBoardImage,
    } = useBoardExportActions({
      stageRef,
      boardColor,
      stagePos,
      scale,
      size,
      elements,
      canvasBounds,
      elementBounds,
      boardId,
      accessToken,
      shareToken,
    });

    useEffect(() => {
      if (!singleSelectedLine) {
        lineEditDraftRef.current = null;
      }
    }, [singleSelectedLine]);

    const effectiveLineDragPreview = singleSelectedLine
      ? lineDragPreview
      : null;

    const {
      activeTransformAnchorRef,
      textTransformBaseRef,
      frameTransformBaseRef,
      lineTransformBaseRef,
      lineGroupDragStartRef,
      applyTextTransform,
      applyFrameTransform,
      applyFreehandLineTransform,
    } = useBoardTransforms({
      trRef,
      updateTextElement,
      updateShapeElement,
      ydoc,
      yElements,
      findYMapById,
      historyActor: user?.firstName ?? "",
    });
    const multiSelectionLineTransform = useMultiSelectionLineTransform({
      trRef,
      elements,
      ydoc,
      yElements,
      findYMapById,
      historyActor: user?.firstName ?? "",
    });

    useEffect(() => {
      if (elements.length === 0) {
        return;
      }
      let minX = canvasBounds.minX;
      let minY = canvasBounds.minY;
      let maxX = canvasBounds.maxX;
      let maxY = canvasBounds.maxY;

      for (const el of elements) {
        const b = elementBounds(el);
        while (b.minX < minX + BOUNDS_EXPAND_TRIGGER) {
          minX -= BOUNDS_EXPAND_STEP;
        }
        while (b.minY < minY + BOUNDS_EXPAND_TRIGGER) {
          minY -= BOUNDS_EXPAND_STEP;
        }
        while (b.maxX > maxX - BOUNDS_EXPAND_TRIGGER) {
          maxX += BOUNDS_EXPAND_STEP;
        }
        while (b.maxY > maxY - BOUNDS_EXPAND_TRIGGER) {
          maxY += BOUNDS_EXPAND_STEP;
        }
      }

      if (
        minX === canvasBounds.minX &&
        minY === canvasBounds.minY &&
        maxX === canvasBounds.maxX &&
        maxY === canvasBounds.maxY
      ) {
        return;
      }

      ydoc.transact(() => {
        yCanvas.set("minX", minX);
        yCanvas.set("minY", minY);
        yCanvas.set("maxX", maxX);
        yCanvas.set("maxY", maxY);
      }, SYSTEM_HISTORY_ORIGIN);
    }, [elements, canvasBounds, ydoc, yCanvas]);

    useEffect(() => {
      const tr = trRef.current;
      if (!tr) {
        return;
      }
      const stage = tr.getStage();
      if (!stage) {
        return;
      }
      const idsForTransformer =
        transformableIds.length > 0
          ? transformableIds
          : tool === "select" && selectedIds.length > 1
            ? selectedIds
            : [];
      if (idsForTransformer.length === 0) {
        tr.nodes([]);
        tr.getLayer()?.batchDraw();
        return;
      }
      const nodes = idsForTransformer
        .map((id) => stage.findOne(`#${id}`))
        .filter(Boolean) as Konva.Node[];
      tr.nodes(nodes);
      tr.getLayer()?.batchDraw();
    }, [transformableIds, tool, selectedIds, elements, size]);

    useImperativeHandle(
      ref,
      () => ({
        setTool,
        focusOnPoint: (x, y) => {
          setStagePosClamped(() => ({
            x: size.w / 2 - x * scale,
            y: size.h / 2 - y * scale,
          }));
        },
        addRectangle,
        pickImageFile,
        undo: history.undo,
        redo: history.redo,
        canUndo: () => history.canUndo,
        canRedo: () => history.canRedo,
        getHistoryEntries: () => history.entries,
        exportPngViewport,
        exportPngFullBoard,
        exportJsonBackup,
        zoomIn,
        zoomOut,
        resetZoom,
      }),
      [
        setTool,
        setStagePosClamped,
        size.h,
        size.w,
        scale,
        addRectangle,
        pickImageFile,
        history,
        exportPngViewport,
        exportPngFullBoard,
        exportJsonBackup,
        zoomIn,
        zoomOut,
        resetZoom,
      ],
    );

    const grid = useBoardGrid({ size, stagePos, scale });

    const strokeW = 1 / scale;
    const hitStroke = 14 / scale;
    const multiSelectionBounds = useMemo(() => {
      if (tool !== "select" || selectedIds.length < 2) {
        return null;
      }
      const selected = elements.filter((el) => selectedIds.includes(el.id));
      if (selected.length < 2) {
        return null;
      }
      let minX = Number.POSITIVE_INFINITY;
      let minY = Number.POSITIVE_INFINITY;
      let maxX = Number.NEGATIVE_INFINITY;
      let maxY = Number.NEGATIVE_INFINITY;
      for (const el of selected) {
        const b = elementBounds(el);
        minX = Math.min(minX, b.minX);
        minY = Math.min(minY, b.minY);
        maxX = Math.max(maxX, b.maxX);
        maxY = Math.max(maxY, b.maxY);
      }
      if (!Number.isFinite(minX) || !Number.isFinite(minY)) {
        return null;
      }
      return {
        x: minX,
        y: minY,
        width: Math.max(1, maxX - minX),
        height: Math.max(1, maxY - minY),
      };
    }, [elements, selectedIds, tool]);
    const multiSelectionDraggable =
      !readOnly && tool === "select" && selectedIds.length > 1;
    const multiSelectionDragRef = useRef<{ dx: number; dy: number }>({
      dx: 0,
      dy: 0,
    });
    const stagePointerHandlers = useBoardStagePointerHandlers({
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
      userFirstName: user?.firstName ?? "",
      addShapeAt,
      addStickerAt,
      addFrameAt,
      addTextAt,
      brushSettings,
      pencilLineIdRef,
      stageRef,
      historyActor: user?.firstName ?? "",
      readOnly,
      onCreateCommentAt,
      aiMode,
      onCreateGenerationAt,
    });

    const [videoDragPreview, setVideoDragPreview] = useState<{
      id: string;
      x: number;
      y: number;
    } | null>(null);
    const [videoTransformPreview, setVideoTransformPreview] = useState<{
      id: string;
      x: number;
      y: number;
      width: number;
      height: number;
    } | null>(null);
    const handleAcceptGeneration = useCallback(() => {
      if (!generationDraft || generationDraft.status !== "ready") {
        return;
      }
      if (generationDraft.mode === "text") {
        const text = generationDraft.result?.text?.trim();
        if (text) {
          addGeneratedTextAt(
            text,
            generationDraft.anchorX,
            generationDraft.anchorY,
          );
        }
      } else if (generationDraft.mode === "image") {
        const file = generationDraft.result?.assetUrl?.trim();
        if (file) {
          addImageAt(
            file,
            generationDraft.anchorX,
            generationDraft.anchorY,
            generationDraft.result?.width ?? 760,
            generationDraft.result?.height ?? 520,
          );
        }
      } else {
        const videoFile = generationDraft.result?.assetUrl?.trim();
        if (videoFile) {
          addVideoAt(
            videoFile,
            generationDraft.anchorX,
            generationDraft.anchorY,
            640,
            360,
          );
        }
      }
      onAcceptGeneration?.();
    }, [
      addGeneratedTextAt,
      addImageAt,
      addVideoAt,
      generationDraft,
      onAcceptGeneration,
    ]);

    useBoardCreateCaptureFallback({
      rootRef,
      tool,
      stagePos,
      scale,
      ydoc,
      yElements,
      elements,
      selectedShapeKind,
      selectedFramePreset,
      editingTextId,
      addShapeAt,
      addStickerAt,
      addFrameAt,
      addTextAt,
      setSelectedIds,
      setActiveTextId,
      setEditingTextId,
      setEditingTextareaHeight,
      setTool,
      historyActor: user?.firstName ?? "",
      readOnly,
    });

    return (
      <div
        ref={rootRef}
        style={{ position: "relative", flex: 1, minHeight: 0 }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp,video/mp4,video/webm,video/quicktime"
          style={{ display: "none" }}
          onChange={onImageFile}
        />
        {!snapshotLoaded ? (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "grid",
              placeItems: "center",
              background: "var(--color-page-bg, #f0f2ff)",
              zIndex: 1,
            }}
          >
            {t("board.loadingCanvas")}
          </div>
        ) : null}
        {loadError ? (
          <div
            style={{
              position: "absolute",
              top: 8,
              left: 12,
              right: 12,
              padding: "8px 12px",
              borderRadius: 8,
              background: "rgba(200, 80, 80, 0.12)",
              color: "#8a2020",
              fontSize: 14,
              zIndex: 2,
            }}
          >
            {t("board.loadSnapshotError")}
          </div>
        ) : null}
        {activeTextElement && !readOnly ? (
          <TextToolbar
            activeTextElement={activeTextElement}
            alignMenuOpen={alignMenuOpen}
            setAlignMenuOpen={setAlignMenuOpen}
            styleMenuOpen={styleMenuOpen}
            setStyleMenuOpen={setStyleMenuOpen}
            updateTextElement={updateTextElement}
          />
        ) : null}
        {activeShapeElement && !readOnly ? (
          <ShapeToolbar
            activeShapeElement={activeShapeElement}
            hasTextToolbar={!!activeTextElement}
            shapeFillMenuOpen={shapeFillMenuOpen}
            setShapeFillMenuOpen={setShapeFillMenuOpen}
            shapeStrokeMenuOpen={shapeStrokeMenuOpen}
            setShapeStrokeMenuOpen={setShapeStrokeMenuOpen}
            lineStartCapMenuOpen={lineStartCapMenuOpen}
            setLineStartCapMenuOpen={setLineStartCapMenuOpen}
            lineEndCapMenuOpen={lineEndCapMenuOpen}
            setLineEndCapMenuOpen={setLineEndCapMenuOpen}
            updateShapeElement={updateShapeElement}
          />
        ) : null}
        {activeFrameElement && !readOnly ? (
          <FrameToolbar
            activeFrameElement={activeFrameElement}
            hasTextToolbar={!!activeTextElement}
            updateShapeElement={updateShapeElement}
          />
        ) : null}
        <Stage
          ref={stageRef}
          width={size.w}
          height={size.h}
          style={{
            cursor:
              tool === "hand" ? (isPanning ? "grabbing" : "grab") : "default",
            background: boardColor,
          }}
          scaleX={scale}
          scaleY={scale}
          x={stagePos.x}
          y={stagePos.y}
          onWheel={handleWheel}
          {...stagePointerHandlers}
        >
          {showGrid ? (
            <GridLayer
              xs={grid.xs}
              ys={grid.ys}
              worldTop={grid.worldTop}
              worldBottom={grid.worldBottom}
              worldLeft={grid.worldLeft}
              worldRight={grid.worldRight}
              pad={grid.pad}
              strokeW={strokeW}
            />
          ) : null}
          <ElementsLayer
            ctx={{
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
              historyActor: user?.firstName ?? "",
              lineDragPreview: effectiveLineDragPreview,
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
              beginTextEditing: beginTextEditingSafe,
              setSelectedIds,
              setActiveTextId,
              setEditingTextId,
              updateTextElement,
              textTransformBaseRef,
              applyTextTransform,
              STICKER_PADDING,
              TEXT_LINE_HEIGHT,
              boardId,
              accessToken,
              shareToken,
              readOnly,
              videoDragPreview,
              setVideoDragPreview,
              videoTransformPreview,
              setVideoTransformPreview,
              multiSelectionPreviewDelta,
            }}
          />
          <CanvasOverlayLayers
            remotePeers={remotePeers}
            scale={scale}
            marquee={marquee}
            transformerListening={
              !readOnly &&
              tool === "select" &&
              (transformableIds.length > 0 || selectedIds.length > 1)
            }
            commentThreads={commentThreads}
            activeCommentThreadId={activeCommentThreadId}
            accessToken={accessToken}
            onCommentThreadPick={onCommentThreadPick}
            trRef={trRef}
            singleSelectedText={singleSelectedText}
            singleSelectedFrame={singleSelectedFrame}
            onTransformStart={() => {
              activeTransformAnchorRef.current =
                trRef.current?.getActiveAnchor() ?? null;
              multiSelectionLineTransform.onTransformStart();
            }}
            onTransformEnd={() => {
              multiSelectionLineTransform.onTransformEnd();
            }}
            boundBoxFunc={multiSelectionLineTransform.boundBoxFunc}
            multiSelectionBounds={multiSelectionBounds}
            multiSelectionDraggable={multiSelectionDraggable}
            multiSelectionPreviewDelta={multiSelectionPreviewDelta}
            onMultiSelectionDrag={(phase, delta) => {
              if (!multiSelectionBounds || selectedIds.length < 2) {
                return;
              }
              if (phase === "start") {
                multiSelectionDragRef.current = { dx: 0, dy: 0 };
                setMultiSelectionPreviewDelta({ dx: 0, dy: 0 });
                return;
              }
              if (phase === "move") {
                multiSelectionDragRef.current = delta;
                setMultiSelectionPreviewDelta(delta);
                return;
              }
              const finalDelta = multiSelectionDragRef.current;
              setMultiSelectionPreviewDelta(null);
              multiSelectionDragRef.current = { dx: 0, dy: 0 };
              if (finalDelta.dx === 0 && finalDelta.dy === 0) {
                return;
              }
              ydoc.transact(() => {
                for (const id of selectedIds) {
                  const map = findYMapById(yElements, id);
                  if (!map) {
                    continue;
                  }
                  translateYMapElementByDelta(
                    map,
                    finalDelta.dx,
                    finalDelta.dy,
                  );
                }
              }, LOCAL_HISTORY_ORIGIN);
            }}
          />
        </Stage>
        <BoardVideoOverlayLayer
          sortedElements={sortedElements}
          boardId={boardId}
          accessToken={accessToken}
          shareToken={shareToken}
          scale={scale}
          stagePos={stagePos}
          videoDragPreview={videoDragPreview}
          videoTransformPreview={videoTransformPreview}
          multiSelectionPreviewDelta={multiSelectionPreviewDelta}
          selectedIds={selectedIds}
          tool={tool}
        />
        {editingTextElement && !readOnly ? (
          <TextEditorOverlay
            editingTextElement={editingTextElement}
            textEditorRef={textEditorRef}
            scale={scale}
            stagePos={stagePos}
            editingTextareaHeight={editingTextareaHeight}
            updateTextValue={(next) => {
              updateTextElement(editingTextElement.id, (map) => {
                map.set("text", next);
              });
              syncEditingTextareaHeight();
            }}
            finishTextEditing={finishTextEditing}
          />
        ) : null}
        {contextMenu ? (
          <CanvasContextMenu
            contextMenu={contextMenu}
            canPaste={clipboardHasItems}
            onCopy={copyIds}
            onDuplicate={duplicateIds}
            onDelete={deleteIds}
            onPaste={pasteClipboard}
            onDownloadImage={(file) => {
              void downloadBoardImage(file);
            }}
            onClose={() => setContextMenu(null)}
          />
        ) : null}
        <BoardFloatingPanels
          scale={scale}
          stagePos={stagePos}
          boardId={boardId}
          shareToken={shareToken}
          accessToken={accessToken}
          pendingCommentAnchor={pendingCommentAnchor}
          activeCommentThread={activeCommentThread}
          commentBusy={commentBusy}
          commentError={commentError}
          onCreateCommentThread={onCreateCommentThread}
          onCancelCommentCreate={onCancelCommentCreate}
          onCloseCommentThread={onCloseCommentThread}
          onReplyCommentThread={onReplyCommentThread}
          onToggleCommentThreadResolved={onToggleCommentThreadResolved}
          canDeleteActiveCommentThread={canDeleteActiveCommentThread}
          onDeleteCommentThread={onDeleteCommentThread}
          pendingGenerationAnchor={pendingGenerationAnchor}
          pendingGenerationMode={pendingGenerationMode}
          generationDraft={generationDraft}
          generationBusy={generationBusy}
          generationError={generationError}
          onSubmitGenerationPrompt={onSubmitGenerationPrompt}
          onCancelGenerationPrompt={onCancelGenerationPrompt}
          onStopGeneration={onStopGeneration}
          onAcceptGenerationResult={handleAcceptGeneration}
          onRejectGeneration={onRejectGeneration}
        />
      </div>
    );
  },
);
