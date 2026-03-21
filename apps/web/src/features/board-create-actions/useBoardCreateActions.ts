import { useCallback } from "react";
import * as Y from "yjs";

import { runTrackedAction } from "../board-history";
import {
  framePresetSize,
  resolveFrameIdAt,
  type BoardElement,
  type BoardTool,
} from "../../entities/board";
import type { BoardCanvasProps } from "../../widgets/board-canvas/model/types";
import { STICKER_BASE_COLORS } from "../../widgets/board-canvas/model/constants";
import { findYMapById } from "../../widgets/board-canvas/model/geometry";

type SelectedShapeKind = NonNullable<BoardCanvasProps["selectedShapeKind"]>;
type SelectedFramePreset = NonNullable<BoardCanvasProps["selectedFramePreset"]>;

export function useBoardCreateActions({
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
  historyActor,
}: {
  ydoc: Y.Doc;
  yElements: Y.Array<Y.Map<unknown>>;
  elements: BoardElement[];
  selectedShapeKind: SelectedShapeKind;
  selectedFramePreset: SelectedFramePreset;
  setTool: (next: BoardTool) => void;
  setSelectedIds: React.Dispatch<React.SetStateAction<string[]>>;
  setActiveTextId: React.Dispatch<React.SetStateAction<string | null>>;
  setEditingTextId: React.Dispatch<React.SetStateAction<string | null>>;
  setEditingTextareaHeight: React.Dispatch<React.SetStateAction<number>>;
  historyActor: string;
}) {
  const addRectangle = useCallback(() => {
    runTrackedAction({
      ydoc,
      labelKey: "board.historyAction.createdRectangle",
      actor: historyActor,
      fn: () => {
        const map = new Y.Map<unknown>();
        const id = crypto.randomUUID();
        map.set("id", id);
        map.set("type", "rect");
        map.set("shapeKind", "square");
        map.set("x", 80 + Math.random() * 48);
        map.set("y", 80 + Math.random() * 48);
        map.set("width", 140);
        map.set("height", 96);
        map.set("fill", "#c8d4ff");
        map.set("fillOpacity", 0.62);
        map.set("stroke", "#4a5fc1");
        map.set("strokeOpacity", 1);
        map.set("strokeWidth", 2);
        map.set("opacity", 1);
        yElements.push([map]);
      },
    });
    setTool("select");
  }, [historyActor, setTool, ydoc, yElements]);

  const beginTextEditing = useCallback(
    (id: string) => {
      setSelectedIds([id]);
      setActiveTextId(id);
      setEditingTextId(id);
      setEditingTextareaHeight(0);
    },
    [
      setActiveTextId,
      setEditingTextId,
      setEditingTextareaHeight,
      setSelectedIds,
    ],
  );

  const addShapeAt = useCallback(
    (wx: number, wy: number) => {
      runTrackedAction({
        ydoc,
        labelKey: "board.historyAction.createdShape",
        actor: historyActor,
        fn: () => {
          const map = new Y.Map<unknown>();
          const id = crypto.randomUUID();
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
                  ? [
                      wx - 70,
                      wy + 36,
                      wx - 8,
                      wy + 36,
                      wx - 8,
                      wy - 18,
                      wx + 70,
                      wy - 18,
                    ]
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
    },
    [
      elements,
      historyActor,
      selectedShapeKind,
      setSelectedIds,
      setTool,
      ydoc,
      yElements,
    ],
  );

  const addTextAt = useCallback(
    (wx: number, wy: number) => {
      const id = crypto.randomUUID();
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
      beginTextEditing(id);
      setTool("select");
    },
    [beginTextEditing, elements, historyActor, setTool, ydoc, yElements],
  );

  const addStickerAt = useCallback(
    (wx: number, wy: number) => {
      const id = crypto.randomUUID();
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
    },
    [
      elements,
      historyActor,
      setActiveTextId,
      setSelectedIds,
      setTool,
      ydoc,
      yElements,
    ],
  );

  const addFrameAt = useCallback(
    (wx: number, wy: number) => {
      const { width, height } = framePresetSize(selectedFramePreset);
      const id = crypto.randomUUID();
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
    },
    [
      historyActor,
      selectedFramePreset,
      setSelectedIds,
      setTool,
      ydoc,
      yElements,
    ],
  );

  const addImageAt = useCallback(
    (filename: string, wx: number, wy: number, width = 200, height = 150) => {
      runTrackedAction({
        ydoc,
        labelKey: "board.historyAction.insertedImage",
        actor: historyActor,
        fn: () => {
          const map = new Y.Map<unknown>();
          const id = crypto.randomUUID();
          map.set("id", id);
          map.set("type", "image");
          map.set("x", wx - width / 2);
          map.set("y", wy - height / 2);
          map.set("width", width);
          map.set("height", height);
          map.set("imageFile", filename);
          const fid = resolveFrameIdAt(wx, wy, elements);
          if (fid) {
            map.set("frameId", fid);
          }
          yElements.push([map]);
        },
      });
    },
    [elements, historyActor, ydoc, yElements],
  );

  const addVideoAt = useCallback(
    (filename: string, wx: number, wy: number, width = 640, height = 360) => {
      runTrackedAction({
        ydoc,
        labelKey: "board.historyAction.insertedVideo",
        actor: historyActor,
        fn: () => {
          const map = new Y.Map<unknown>();
          const id = crypto.randomUUID();
          map.set("id", id);
          map.set("type", "video");
          map.set("x", wx - width / 2);
          map.set("y", wy - height / 2);
          map.set("width", width);
          map.set("height", height);
          map.set("videoFile", filename);
          const fid = resolveFrameIdAt(wx, wy, elements);
          if (fid) {
            map.set("frameId", fid);
          }
          yElements.push([map]);
        },
      });
    },
    [elements, historyActor, ydoc, yElements],
  );

  const addGeneratedTextAt = useCallback(
    (text: string, wx: number, wy: number) => {
      const id = crypto.randomUUID();
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
          map.set("text", text);
          map.set("fontSize", 22);
          map.set("fontFamily", "Noto Sans");
          map.set("align", "left");
          map.set("fill", "#1a1d33");
          map.set("background", "transparent");
          map.set("bold", false);
          map.set("italic", false);
          map.set("underline", false);
          map.set("strike", false);
          map.set("width", 520);
          const fid = resolveFrameIdAt(wx, wy, elements);
          if (fid) {
            map.set("frameId", fid);
          }
          yElements.push([map]);
        },
      });
      setSelectedIds([id]);
      setTool("select");
    },
    [elements, historyActor, setSelectedIds, setTool, ydoc, yElements],
  );

  const finishTextEditing = useCallback(
    (id: string) => {
      const map = findYMapById(yElements, id);
      const current =
        typeof map?.get("text") === "string"
          ? (map?.get("text") as string)
          : "";
      const textKind = map?.get("textKind") === "sticker" ? "sticker" : "plain";
      if (current.trim().length === 0 && textKind !== "sticker") {
        runTrackedAction({
          ydoc,
          labelKey: "board.historyAction.deletedEmptyText",
          actor: historyActor,
          fn: () => {
            for (let i = yElements.length - 1; i >= 0; i -= 1) {
              const m = yElements.get(i);
              if (m.get("id") === id) {
                yElements.delete(i, 1);
                break;
              }
            }
          },
        });
        setSelectedIds((prev) => prev.filter((x) => x !== id));
        setActiveTextId((prev) => (prev === id ? null : prev));
      }
      setEditingTextId((prev) => (prev === id ? null : prev));
      setEditingTextareaHeight(0);
    },
    [
      historyActor,
      setActiveTextId,
      setEditingTextId,
      setEditingTextareaHeight,
      setSelectedIds,
      ydoc,
      yElements,
    ],
  );

  return {
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
  };
}
