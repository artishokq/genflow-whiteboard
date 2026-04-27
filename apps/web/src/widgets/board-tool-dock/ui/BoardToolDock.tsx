import type { RefObject } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import type { BoardTool, FramePreset } from "../../../entities/board";
import type { BoardCanvasHandle } from "../../board-canvas";

import {
  AI_ICON,
  ARROW_ICON,
  CLIP_ICON,
  COMMENT_ICON,
  ELBOW_ARROW_ICON,
  ERASER_ICON,
  ELLIPSE_ICON,
  FRAME_ICON,
  FRAME_PRESET_OPTIONS,
  HIGHLIGHTER_ICON,
  IMAGE_ICON,
  LINE_ICON,
  MOUSE_ICON,
  PENCIL_ICON,
  REDO_ICON,
  SQUARE_ICON,
  STAR_ICON,
  STICKER_ICON,
  TEXT_ICON,
  TRIANGLE_ICON,
  UNDO_ICON,
} from "../model/constants";
import type { BoardDockState } from "../model/useBoardDock";
import type { ShapeKind } from "../model/types";
import styles from "../BoardToolDock.module.css";

export type BoardToolDockProps = {
  canvasRef: RefObject<BoardCanvasHandle | null>;
  disabled: boolean;
  zoomPercent: number;
  dock: BoardDockState;
  aiMode?: "text" | "image" | "video" | null;
  onSelectAiMode?: (mode: "text" | "image" | "video") => void;
};

export function BoardToolDock({
  canvasRef,
  disabled,
  zoomPercent,
  dock,
  aiMode = null,
  onSelectAiMode,
}: BoardToolDockProps) {
  const { t } = useTranslation();
  const [aiMenuOpen, setAiMenuOpen] = useState(false);
  const aiMenuRef = useRef<HTMLDivElement>(null);
  const {
    activeTool,
    setActiveTool,
    brushPanelOpen,
    brushKind,
    selectedBrushPresetIndex,
    brushPresetsForKind,
    activeBrushSlot,
    editingBrushPreset,
    brushPreviewSize,
    shapePanelOpen,
    setShapePanelOpen,
    selectedShapeKind,
    setSelectedShapeKind,
    framePanelOpen,
    setFramePanelOpen,
    selectedFramePreset,
    setSelectedFramePreset,
    handlePencilButtonClick,
    handleBrushKindChange,
    updateBrushWidth,
    updateBrushColor,
    setSelectedPencilPreset,
    setSelectedHighlighterPreset,
    setActiveBrushSlot,
  } = dock;

  const shapeIconByKind: Record<ShapeKind, string> = useMemo(
    () => ({
      square: SQUARE_ICON,
      triangle: TRIANGLE_ICON,
      circle: ELLIPSE_ICON,
      star: STAR_ICON,
      line: LINE_ICON,
      arrow: ARROW_ICON,
      elbowArrow: ELBOW_ARROW_ICON,
    }),
    [],
  );

  const shapeLabelByKind: Record<ShapeKind, string> = useMemo(
    () => ({
      square: t("board.addRectangle"),
      triangle: "Triangle",
      circle: "Circle",
      star: "Star",
      line: "Line",
      arrow: "Arrow",
      elbowArrow: "Elbow arrow",
    }),
    [t],
  );

  const framePresetLabel: Record<FramePreset, string> = useMemo(
    () => ({
      custom: "Custom",
      a4: "A4",
      "16:9": "16 : 9",
      "4:3": "4 : 3",
      "1:1": "1 : 1",
      mobile: "Mobile",
      desktop: "Desktop",
    }),
    [],
  );
  const isToolActive = useCallback(
    (toolName: BoardTool) => !aiMenuOpen && !aiMode && activeTool === toolName,
    [activeTool, aiMenuOpen, aiMode],
  );

  useEffect(() => {
    if (!aiMenuOpen) {
      return;
    }
    const onPointerDown = (event: PointerEvent) => {
      if (aiMenuRef.current && !aiMenuRef.current.contains(event.target as Node)) {
        setAiMenuOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setAiMenuOpen(false);
      }
    };
    document.addEventListener("pointerdown", onPointerDown, true);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown, true);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [aiMenuOpen]);

  return (
    <div className={styles.floatingDock}>
      <div className={styles.dockSection}>
        <button
          type="button"
          className={styles.dockIconButton}
          onClick={() => canvasRef.current?.undo()}
          disabled={disabled || !canvasRef.current?.canUndo()}
          aria-label={t("board.undo")}
          title={t("board.undo")}
        >
          <img src={UNDO_ICON} alt="" className={styles.dockToolIcon} />
        </button>
        <button
          type="button"
          className={styles.dockIconButton}
          onClick={() => canvasRef.current?.redo()}
          disabled={disabled || !canvasRef.current?.canRedo()}
          aria-label={t("board.redo")}
          title={t("board.redo")}
        >
          <img src={REDO_ICON} alt="" className={styles.dockToolIcon} />
        </button>
      </div>
      <div className={styles.dockSection}>
        <button
          type="button"
          className={`${styles.dockToolIconButton} ${isToolActive("select") ? styles.dockToolButtonActive : ""}`}
          disabled={disabled}
          onClick={() => {
            canvasRef.current?.setTool(
              activeTool === "select" ? "hand" : "select",
            );
          }}
          aria-label={t("board.toolSelect")}
          title={t("board.toolSelect")}
        >
          <img
            src={MOUSE_ICON}
            alt=""
            className={`${styles.dockToolIcon} ${styles.dockToolIconMouse}`}
          />
        </button>
        <div className={styles.toolPopupAnchor}>
          <button
            type="button"
            className={`${styles.dockToolIconButton} ${isToolActive("pencil") ? styles.dockToolButtonActive : ""}`}
            disabled={disabled}
            onClick={handlePencilButtonClick}
            aria-label={t("board.toolPencil")}
            title={t("board.toolPencil")}
          >
            <img
              src={
                brushKind === "highlighter"
                  ? HIGHLIGHTER_ICON
                  : brushKind === "eraser"
                    ? ERASER_ICON
                    : PENCIL_ICON
              }
              alt=""
              className={`${styles.dockToolIcon} ${styles.dockToolIconPencil}`}
            />
          </button>
          {brushPanelOpen && activeTool === "pencil" ? (
            <>
              {activeBrushSlot !== null ? (
                <div className={styles.brushEditorPopup}>
                  <div className={styles.brushControlRow}>
                    <input
                      type="range"
                      min={1}
                      max={brushKind === "highlighter" ? 48 : 36}
                      value={editingBrushPreset.width}
                      onChange={(e) =>
                        updateBrushWidth(Number(e.target.value))
                      }
                      className={styles.brushRange}
                    />
                  </div>
                  {brushKind !== "eraser" ? (
                    <div className={styles.brushControlRow}>
                      <input
                        type="color"
                        value={editingBrushPreset.color}
                        onChange={(e) => updateBrushColor(e.target.value)}
                        className={styles.colorInput}
                      />
                    </div>
                  ) : null}
                </div>
              ) : null}
              <div className={styles.toolPopup}>
                <div className={styles.subtoolsRow}>
                  <button
                    type="button"
                    className={`${styles.subtoolButton} ${brushKind === "pencil" ? styles.subtoolButtonActive : ""}`}
                    onClick={() => handleBrushKindChange("pencil")}
                    title={t("board.toolPencil")}
                  >
                    <img
                      src={PENCIL_ICON}
                      alt=""
                      className={`${styles.dockToolIcon} ${styles.dockToolIconPencil}`}
                    />
                  </button>
                  <button
                    type="button"
                    className={`${styles.subtoolButton} ${brushKind === "highlighter" ? styles.subtoolButtonActive : ""}`}
                    onClick={() => handleBrushKindChange("highlighter")}
                    title="Highlighter"
                  >
                    <img
                      src={HIGHLIGHTER_ICON}
                      alt=""
                      className={`${styles.dockToolIcon} ${styles.dockToolIconPencil}`}
                    />
                  </button>
                  <button
                    type="button"
                    className={`${styles.subtoolButton} ${brushKind === "eraser" ? styles.subtoolButtonActive : ""}`}
                    onClick={() => handleBrushKindChange("eraser")}
                    title="Eraser"
                  >
                    <img
                      src={ERASER_ICON}
                      alt=""
                      className={`${styles.dockToolIcon} ${styles.dockToolIconPencil}`}
                    />
                  </button>
                  <div className={styles.subtoolsDivider} />
                  <div className={styles.brushPresetsRow}>
                    {brushPresetsForKind.map((preset, idx) => {
                      const isSelected = selectedBrushPresetIndex === idx;
                      return (
                        <button
                          key={`${brushKind}-${idx}`}
                          type="button"
                          className={`${styles.brushPresetCircle} ${isSelected ? styles.brushPresetCircleActive : ""}`}
                          onClick={() => {
                            if (brushKind === "pencil") {
                              setSelectedPencilPreset(idx);
                            } else if (brushKind === "highlighter") {
                              setSelectedHighlighterPreset(idx);
                            }
                            setActiveBrushSlot((prev) =>
                              prev === idx ? null : idx,
                            );
                          }}
                        >
                          <span
                            className={
                              brushKind === "eraser"
                                ? styles.brushPresetInnerEraser
                                : styles.brushPresetInner
                            }
                            style={{
                              width: brushPreviewSize(preset.width),
                              height: brushPreviewSize(preset.width),
                              background:
                                brushKind === "eraser"
                                  ? "#ffffff"
                                  : preset.color,
                              opacity: brushKind === "highlighter" ? 0.55 : 1,
                            }}
                          />
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </>
          ) : null}
        </div>
        <button
          type="button"
          className={`${styles.dockToolIconButton} ${isToolActive("text") ? styles.dockToolButtonActive : ""}`}
          disabled={disabled}
          onClick={() => {
            setActiveTool("text");
            canvasRef.current?.setTool("text");
          }}
          aria-label={t("board.toolText")}
          title={t("board.toolText")}
        >
          <img
            src={TEXT_ICON}
            alt=""
            className={`${styles.dockToolIcon} ${styles.dockToolIconText}`}
          />
        </button>
        <button
          type="button"
          className={styles.dockToolIconButton}
          disabled={disabled}
          onClick={() => canvasRef.current?.pickImageFile()}
          aria-label={t("board.toolImage")}
          title={t("board.toolImage")}
        >
          <img
            src={IMAGE_ICON}
            alt=""
            className={`${styles.dockToolIcon} ${styles.dockToolIconImage}`}
          />
        </button>
        <div className={styles.toolPopupAnchor}>
          <button
            type="button"
            className={`${styles.dockToolIconButton} ${isToolActive("shape") ? styles.dockToolButtonActive : ""}`}
            disabled={disabled}
            onClick={() => {
              setShapePanelOpen((prev) => !prev);
              setActiveTool("shape");
              canvasRef.current?.setTool("shape");
            }}
            aria-label={shapeLabelByKind[selectedShapeKind]}
            title={shapeLabelByKind[selectedShapeKind]}
          >
            <img
              src={shapeIconByKind[selectedShapeKind]}
              alt=""
              className={`${styles.dockToolIcon} ${styles.dockToolIconSquare}`}
            />
          </button>
          {shapePanelOpen ? (
            <div className={styles.toolPopup}>
              <div className={styles.subtoolsRow}>
                {(
                  [
                    "square",
                    "triangle",
                    "circle",
                    "star",
                    "line",
                    "arrow",
                    "elbowArrow",
                  ] as ShapeKind[]
                ).map((shape) => (
                  <button
                    key={shape}
                    type="button"
                    className={`${styles.subtoolButton} ${selectedShapeKind === shape ? styles.subtoolButtonActive : ""}`}
                    onClick={() => {
                      setSelectedShapeKind(shape);
                      setShapePanelOpen(false);
                      setActiveTool("shape");
                      canvasRef.current?.setTool("shape");
                    }}
                    title={shapeLabelByKind[shape]}
                  >
                    <img
                      src={shapeIconByKind[shape]}
                      alt=""
                      className={`${styles.dockToolIcon} ${styles.dockToolIconSquare}`}
                    />
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </div>
        <button
          type="button"
          className={`${styles.dockToolIconButton} ${isToolActive("sticker") ? styles.dockToolButtonActive : ""}`}
          disabled={disabled}
          onClick={() => {
            setActiveTool("sticker");
            canvasRef.current?.setTool("sticker");
          }}
          aria-label="Sticker"
          title="Sticker"
        >
          <img
            src={STICKER_ICON}
            alt=""
            className={`${styles.dockToolIcon} ${styles.dockToolIconSticker}`}
          />
        </button>
        <div className={styles.toolPopupAnchor}>
          <button
            type="button"
            className={`${styles.dockToolIconButton} ${isToolActive("frame") ? styles.dockToolButtonActive : ""}`}
            disabled={disabled}
            onClick={() => {
              setFramePanelOpen((prev) => !prev);
              setActiveTool("frame");
              canvasRef.current?.setTool("frame");
            }}
            aria-label="Frame"
            title="Frame"
          >
            <img
              src={FRAME_ICON}
              alt=""
              className={`${styles.dockToolIcon} ${styles.dockToolIconFrame}`}
            />
          </button>
          {framePanelOpen ? (
            <div className={styles.toolPopup}>
              <div
                className={styles.subtoolsRow}
                style={{
                  flexWrap: "nowrap",
                  gap: 4,
                  justifyContent: "flex-start",
                  maxWidth: "min(90vw, 520px)",
                  overflowX: "auto",
                }}
              >
                {FRAME_PRESET_OPTIONS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    className={`${styles.subtoolButton} ${selectedFramePreset === preset ? styles.subtoolButtonActive : ""}`}
                    style={{
                      minWidth: "5.5rem",
                      width: "auto",
                      paddingLeft: 10,
                      paddingRight: 10,
                    }}
                    onClick={() => {
                      setSelectedFramePreset(preset);
                      setFramePanelOpen(false);
                      setActiveTool("frame");
                      canvasRef.current?.setTool("frame");
                    }}
                    title={framePresetLabel[preset]}
                  >
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        color: "#26214f",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {framePresetLabel[preset]}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </div>
        <div className={styles.toolPopupAnchor} ref={aiMenuRef}>
          <button
            type="button"
            className={`${styles.dockToolIconButton} ${aiMenuOpen || aiMode ? styles.dockToolButtonActive : ""}`}
            disabled={disabled}
            onClick={() => setAiMenuOpen((prev) => !prev)}
            aria-label="AI"
            title="AI"
          >
            <img
              src={AI_ICON}
              alt=""
              className={`${styles.dockToolIcon} ${styles.dockToolIconAi}`}
            />
          </button>
          {aiMenuOpen ? (
            <div className={styles.aiPopup} role="menu" aria-label="AI actions">
              <button
                type="button"
                className={styles.aiOptionButton}
                aria-label={t("board.toolText")}
                title={t("board.comingSoon")}
                onClick={() => {
                  onSelectAiMode?.("text");
                  setAiMenuOpen(false);
                }}
              >
                <img src={TEXT_ICON} alt="" className={styles.dockToolIcon} />
              </button>
              <button
                type="button"
                className={styles.aiOptionButton}
                aria-label={t("board.toolImage")}
                title={t("board.comingSoon")}
                onClick={() => {
                  onSelectAiMode?.("image");
                  setAiMenuOpen(false);
                }}
              >
                <img src={IMAGE_ICON} alt="" className={styles.dockToolIcon} />
              </button>
              <button
                type="button"
                className={styles.aiOptionButton}
                aria-label="Video"
                title={t("board.comingSoon")}
                onClick={() => {
                  onSelectAiMode?.("video");
                  setAiMenuOpen(false);
                }}
              >
                <img src={CLIP_ICON} alt="" className={styles.dockToolIcon} />
              </button>
            </div>
          ) : null}
        </div>
        <button
          type="button"
          className={`${styles.dockToolIconButton} ${isToolActive("comment") ? styles.dockToolButtonActive : ""}`}
          disabled={disabled}
          aria-label={t("board.commentsTool")}
          title={t("board.commentsTool")}
          onClick={() => {
            canvasRef.current?.setTool("comment");
            setActiveTool("comment");
          }}
        >
          <img
            src={COMMENT_ICON}
            alt=""
            className={`${styles.dockToolIcon} ${styles.dockToolIconComment}`}
          />
        </button>
      </div>
      <div className={styles.dockSection}>
        <button
          type="button"
          className={styles.dockIconButton}
          onClick={() => canvasRef.current?.zoomOut()}
          disabled={disabled}
          aria-label={t("board.zoomOut")}
          title={t("board.zoomOut")}
        >
          −
        </button>
        <button
          type="button"
          className={styles.zoomPercent}
          onClick={() => canvasRef.current?.resetZoom()}
          disabled={disabled}
          title={t("board.resetZoom")}
        >
          {zoomPercent}%
        </button>
        <button
          type="button"
          className={styles.dockIconButton}
          onClick={() => canvasRef.current?.zoomIn()}
          disabled={disabled}
          aria-label={t("board.zoomIn")}
          title={t("board.zoomIn")}
        >
          +
        </button>
      </div>
    </div>
  );
}
