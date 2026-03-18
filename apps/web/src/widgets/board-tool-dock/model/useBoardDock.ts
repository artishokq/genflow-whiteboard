import type { RefObject } from "react";
import { useCallback, useMemo, useState } from "react";

import type { BoardTool, FramePreset } from "../../../entities/board";
import type { BoardCanvasHandle } from "../../board-canvas";

import {
  INITIAL_HIGHLIGHTER_PRESETS,
  INITIAL_PENCIL_PRESETS,
} from "./constants";
import type { BrushKind, BrushPreset, ShapeKind } from "./types";

export function useBoardDock(
  canvasRef: RefObject<BoardCanvasHandle | null>,
) {
  const [activeTool, setActiveToolInternal] = useState<BoardTool>("hand");
  const [brushPanelOpen, setBrushPanelOpen] = useState(false);
  const [brushKind, setBrushKind] = useState<BrushKind>("pencil");
  const [pencilPresets, setPencilPresets] = useState(INITIAL_PENCIL_PRESETS);
  const [highlighterPresets, setHighlighterPresets] = useState(
    INITIAL_HIGHLIGHTER_PRESETS,
  );
  const [selectedPencilPreset, setSelectedPencilPreset] = useState(0);
  const [selectedHighlighterPreset, setSelectedHighlighterPreset] = useState(0);
  const [activeBrushSlot, setActiveBrushSlot] = useState<number | null>(null);
  const [eraserSize, setEraserSize] = useState(22);
  const [shapePanelOpen, setShapePanelOpen] = useState(false);
  const [selectedShapeKind, setSelectedShapeKind] =
    useState<ShapeKind>("square");
  const [framePanelOpen, setFramePanelOpen] = useState(false);
  const [selectedFramePreset, setSelectedFramePreset] =
    useState<FramePreset>("custom");

  const closePanelsForTool = useCallback((next: BoardTool) => {
    if (next !== "pencil") {
      setBrushPanelOpen(false);
      setActiveBrushSlot(null);
    }
    if (next !== "shape") {
      setShapePanelOpen(false);
    }
    if (next !== "frame") {
      setFramePanelOpen(false);
    }
  }, []);

  const setActiveTool = useCallback(
    (next: BoardTool) => {
      setActiveToolInternal(next);
      closePanelsForTool(next);
    },
    [closePanelsForTool],
  );

  const selectedBrushPresetIndex =
    brushKind === "pencil"
      ? selectedPencilPreset
      : brushKind === "highlighter"
        ? selectedHighlighterPreset
        : 0;

  const brushPresetsForKind: BrushPreset[] =
    brushKind === "pencil"
      ? pencilPresets
      : brushKind === "highlighter"
        ? highlighterPresets
        : [{ color: "#ffffff", width: eraserSize }];

  const editingBrushIndex = activeBrushSlot ?? selectedBrushPresetIndex;
  const editingBrushPreset =
    brushPresetsForKind[editingBrushIndex] ?? brushPresetsForKind[0];

  const brushPreviewSize = useCallback(
    (width: number) => {
      const mult = brushKind === "highlighter" ? 0.95 : 0.78;
      return Math.max(8, Math.min(22, Math.round(width * mult + 4)));
    },
    [brushKind],
  );

  const activeBrushPreset =
    brushKind === "pencil"
      ? pencilPresets[selectedPencilPreset]
      : brushKind === "highlighter"
        ? highlighterPresets[selectedHighlighterPreset]
        : { color: "#000000", width: eraserSize };

  const brushSettings = useMemo(
    () => ({
      kind: brushKind,
      color: activeBrushPreset.color,
      width: activeBrushPreset.width,
    }),
    [activeBrushPreset.color, activeBrushPreset.width, brushKind],
  );

  const handlePencilButtonClick = useCallback(() => {
    if (activeTool !== "pencil") {
      canvasRef.current?.setTool("pencil");
      setBrushPanelOpen(true);
      return;
    }
    setBrushPanelOpen((prev) => {
      if (prev) {
        setActiveBrushSlot(null);
      }
      return !prev;
    });
  }, [activeTool, canvasRef]);

  const handleBrushKindChange = useCallback((next: BrushKind) => {
    setBrushKind(next);
    setActiveBrushSlot(null);
  }, []);

  const updateBrushWidth = useCallback(
    (nextWidth: number) => {
      const clamped = Math.max(1, Math.round(nextWidth));
      if (brushKind === "pencil") {
        const idx = activeBrushSlot ?? selectedPencilPreset;
        setPencilPresets((prev) =>
          prev.map((item, i) =>
            i === (activeBrushSlot ?? selectedPencilPreset)
              ? { ...item, width: clamped }
              : item,
          ),
        );
        setSelectedPencilPreset(idx);
        return;
      }
      if (brushKind === "highlighter") {
        const idx = activeBrushSlot ?? selectedHighlighterPreset;
        setHighlighterPresets((prev) =>
          prev.map((item, i) =>
            i === (activeBrushSlot ?? selectedHighlighterPreset)
              ? { ...item, width: clamped }
              : item,
          ),
        );
        setSelectedHighlighterPreset(idx);
        return;
      }
      setEraserSize(clamped);
    },
    [
      activeBrushSlot,
      brushKind,
      selectedHighlighterPreset,
      selectedPencilPreset,
    ],
  );

  const updateBrushColor = useCallback(
    (nextColor: string) => {
      if (brushKind === "pencil") {
        const idx = activeBrushSlot ?? selectedPencilPreset;
        setPencilPresets((prev) =>
          prev.map((item, i) =>
            i === (activeBrushSlot ?? selectedPencilPreset)
              ? { ...item, color: nextColor }
              : item,
          ),
        );
        setSelectedPencilPreset(idx);
        return;
      }
      if (brushKind === "highlighter") {
        const idx = activeBrushSlot ?? selectedHighlighterPreset;
        setHighlighterPresets((prev) =>
          prev.map((item, i) =>
            i === (activeBrushSlot ?? selectedHighlighterPreset)
              ? { ...item, color: nextColor }
              : item,
          ),
        );
        setSelectedHighlighterPreset(idx);
      }
    },
    [
      activeBrushSlot,
      brushKind,
      selectedHighlighterPreset,
      selectedPencilPreset,
    ],
  );

  return {
    activeTool,
    setActiveTool,
    brushPanelOpen,
    brushKind,
    selectedBrushPresetIndex,
    brushPresetsForKind,
    activeBrushSlot,
    editingBrushPreset,
    brushPreviewSize,
    brushSettings,
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
  };
}

export type BoardDockState = ReturnType<typeof useBoardDock>;
