import { useEffect, type Dispatch, type RefObject, type SetStateAction } from "react";
import * as Y from "yjs";
import { runTrackedAction } from "../board-history";
import { generateId } from "../../shared/lib/generateId";

import {
  framePresetSize,
  resolveFrameIdAt,
  type BoardElement,
  type BoardTool,
} from "../../entities/board";
import { STICKER_BASE_COLORS } from "../../widgets/board-canvas/model/constants";
import type { BoardCanvasProps } from "../../widgets/board-canvas/model/types";

type ShapeKind = NonNullable<BoardCanvasProps["selectedShapeKind"]>;
type FramePreset = NonNullable<BoardCanvasProps["selectedFramePreset"]>;

export function useBoardCreateCaptureFallback({
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
  historyActor,
  readOnly = false,
}: {
  rootRef: RefObject<HTMLDivElement | null>;
  tool: BoardTool;
  stagePos: { x: number; y: number };
  scale: number;
  ydoc: Y.Doc;
  yElements: Y.Array<Y.Map<unknown>>;
  elements: BoardElement[];
  selectedShapeKind: ShapeKind;
  selectedFramePreset: FramePreset;
  editingTextId: string | null;
  addShapeAt: (wx: number, wy: number) => void;
  addStickerAt: (wx: number, wy: number) => void;
  addFrameAt: (wx: number, wy: number) => void;
  addTextAt: (wx: number, wy: number) => void;
  setSelectedIds: Dispatch<SetStateAction<string[]>>;
  setActiveTextId: Dispatch<SetStateAction<string | null>>;
  setEditingTextId: Dispatch<SetStateAction<string | null>>;
  setEditingTextareaHeight: Dispatch<SetStateAction<number>>;
  setTool: (next: BoardTool) => void;
  historyActor: string;
  readOnly?: boolean;
}) {
  useEffect(() => {
    const onStageContainerPointerDown = (evt: PointerEvent) => {
      if (readOnly) {
        return;
      }
      if (
        tool !== "shape" &&
        tool !== "text" &&
        tool !== "sticker" &&
        tool !== "frame"
      ) {
        return;
      }
      if (evt.button !== 0) {
        return;
      }

      const root = rootRef.current;
      if (!root) {
        return;
      }
      const container = root.querySelector(".konvajs-content");
      if (!(container instanceof HTMLDivElement)) {
        return;
      }
      const target = evt.target as Node | null;
      if (!target || !container.contains(target)) {
        return;
      }
      if (
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLButtonElement ||
        target instanceof HTMLInputElement ||
        target instanceof HTMLSelectElement
      ) {
        return;
      }

      const rect = container.getBoundingClientRect();
      const wx = (evt.clientX - rect.left - stagePos.x) / scale;
      const wy = (evt.clientY - rect.top - stagePos.y) / scale;

      const createDirect = () => {
        if (tool === "shape") {
          runTrackedAction({
            ydoc,
            labelKey: "board.historyAction.createdShape",
            actor: historyActor,
            fn: () => {
            const map = new Y.Map<unknown>();
            const id = generateId();
            map.set("id", id);
            if (
              selectedShapeKind === "line" ||
              selectedShapeKind === "arrow" ||
              selectedShapeKind === "elbowArrow"
            ) {
              map.set("type", "line");
              map.set("lineKind", selectedShapeKind);
              map.set("x", 0);
              map.set("y", 0);
              map.set(
                "points",
                JSON.stringify(
                  selectedShapeKind === "elbowArrow"
                    ? [wx - 70, wy + 36, wx - 8, wy + 36, wx - 8, wy - 18, wx + 70, wy - 18]
                    : [wx - 70, wy, wx + 70, wy],
                ),
              );
              map.set("stroke", "#4a5fc1");
              map.set("strokeWidth", 3);
              map.set("opacity", 1);
              map.set("startCap", "none");
              map.set("endCap", selectedShapeKind === "line" ? "none" : "arrow");
              map.set("rounded", selectedShapeKind === "elbowArrow");
              map.set("composite", "source-over");
            } else {
              const isStrictEqualSides =
                selectedShapeKind === "square" || selectedShapeKind === "circle";
              const baseSize = 120;
              map.set("type", "rect");
              map.set("shapeKind", selectedShapeKind);
              map.set("x", wx - (isStrictEqualSides ? baseSize / 2 : 70));
              map.set("y", wy - (isStrictEqualSides ? baseSize / 2 : 50));
              map.set("width", isStrictEqualSides ? baseSize : 140);
              map.set("height", isStrictEqualSides ? baseSize : 100);
              map.set("fill", "#c8d4ff");
              map.set("fillOpacity", 0.62);
              map.set("stroke", "#4a5fc1");
              map.set("strokeOpacity", 1);
              map.set("strokeWidth", 2);
              map.set("opacity", 1);
            }
            const fid = resolveFrameIdAt(wx, wy, elements);
            if (fid) {
              map.set("frameId", fid);
            }
            yElements.push([map]);
            setSelectedIds([id]);
            },
          });
          setTool("select");
          return true;
        }
        if (tool === "sticker") {
          const id = generateId();
          runTrackedAction({
            ydoc,
            labelKey: "board.historyAction.createdSticker",
            actor: historyActor,
            fn: () => {
            const map = new Y.Map<unknown>();
            map.set("id", id);
            map.set("type", "text");
            map.set("textKind", "sticker");
            map.set("x", wx - 150);
            map.set("y", wy - 130);
            map.set("text", "");
            map.set("fontSize", 32);
            map.set("fontFamily", "Noto Sans");
            map.set("align", "left");
            map.set("fill", "#2f2744");
            map.set("background", STICKER_BASE_COLORS[0]);
            map.set("bold", false);
            map.set("italic", false);
            map.set("underline", false);
            map.set("strike", false);
            map.set("width", 300);
            const fid = resolveFrameIdAt(wx, wy, elements);
            if (fid) {
              map.set("frameId", fid);
            }
            yElements.push([map]);
            setSelectedIds([id]);
            setActiveTextId(id);
            },
          });
          setTool("select");
          return true;
        }
        if (tool === "frame") {
          const id = generateId();
          const { width, height } = framePresetSize(selectedFramePreset);
          runTrackedAction({
            ydoc,
            labelKey: "board.historyAction.createdFrame",
            actor: historyActor,
            fn: () => {
            const map = new Y.Map<unknown>();
            map.set("id", id);
            map.set("type", "frame");
            map.set("x", wx - width / 2);
            map.set("y", wy - height / 2);
            map.set("width", width);
            map.set("height", height);
            map.set("fill", "#faf6ee");
            map.set("name", "Frame");
            map.set("rotation", 0);
            yElements.push([map]);
            },
          });
          setSelectedIds([id]);
          setTool("select");
          return true;
        }
        if (tool === "text" && !editingTextId) {
          const id = generateId();
          runTrackedAction({
            ydoc,
            labelKey: "board.historyAction.createdText",
            actor: historyActor,
            fn: () => {
            const map = new Y.Map<unknown>();
            map.set("id", id);
            map.set("type", "text");
            map.set("textKind", "plain");
            map.set("x", wx);
            map.set("y", wy);
            map.set("text", "");
            map.set("fontSize", 48);
            map.set("fontFamily", "Noto Sans");
            map.set("align", "left");
            map.set("fill", "#1a1d33");
            map.set("background", "transparent");
            map.set("bold", false);
            map.set("italic", false);
            map.set("underline", false);
            map.set("strike", false);
            map.set("width", 220);
            const fid = resolveFrameIdAt(wx, wy, elements);
            if (fid) {
              map.set("frameId", fid);
            }
            yElements.push([map]);
            },
          });
          setSelectedIds([id]);
          setActiveTextId(id);
          setEditingTextId(id);
          setEditingTextareaHeight(0);
          setTool("select");
          return true;
        }
        return false;
      };

      if (createDirect()) {
        evt.preventDefault();
        evt.stopPropagation();
        return;
      }

      if (tool === "shape") {
        addShapeAt(wx, wy);
      } else if (tool === "sticker") {
        addStickerAt(wx, wy);
      } else if (tool === "frame") {
        addFrameAt(wx, wy);
      } else if (tool === "text" && !editingTextId) {
        addTextAt(wx, wy);
      } else {
        return;
      }
      evt.preventDefault();
      evt.stopPropagation();
    };

    window.addEventListener("pointerdown", onStageContainerPointerDown, true);
    return () => {
      window.removeEventListener("pointerdown", onStageContainerPointerDown, true);
    };
  }, [
    addFrameAt,
    addShapeAt,
    addStickerAt,
    addTextAt,
    editingTextId,
    elements,
    rootRef,
    scale,
    selectedFramePreset,
    selectedShapeKind,
    setActiveTextId,
    setEditingTextId,
    setEditingTextareaHeight,
    setSelectedIds,
    setTool,
    stagePos.x,
    stagePos.y,
    tool,
    historyActor,
    readOnly,
    yElements,
    ydoc,
  ]);
}

