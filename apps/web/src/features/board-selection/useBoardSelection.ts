import { useCallback, useMemo } from "react";
import type Konva from "konva";

import type { BoardElement, BoardFrameElement, BoardTool } from "../../entities/board";
import { isFreehandBrushLine } from "../../entities/board";

export function useBoardSelection({
  elements,
  tool,
  selectedIds,
  setSelectedIds,
  setActiveTextId,
  editingTextId,
}: {
  elements: BoardElement[];
  tool: BoardTool;
  selectedIds: string[];
  setSelectedIds: React.Dispatch<React.SetStateAction<string[]>>;
  setActiveTextId: React.Dispatch<React.SetStateAction<string | null>>;
  editingTextId: string | null;
}) {
  const activeTextElement = useMemo(() => {
    const activeTextId = selectedIds.length === 1 ? selectedIds[0] : null;
    if (!activeTextId) return null;
    const found = elements.find(
      (el): el is Extract<BoardElement, { type: "text" }> =>
        el.type === "text" && el.id === activeTextId,
    );
    return found ?? null;
  }, [elements, selectedIds]);

  const activeShapeElement = useMemo(() => {
    if (tool !== "select" || selectedIds.length !== 1) {
      return null;
    }
    const id = selectedIds[0];
    const found = elements.find((el) => el.id === id);
    if (!found) return null;
    if (found.type === "rect" || found.type === "line") {
      if (found.type === "line" && isFreehandBrushLine(found)) {
        return null;
      }
      return found;
    }
    return null;
  }, [elements, selectedIds, tool]);

  const activeFrameElement = useMemo(() => {
    if (tool !== "select" || selectedIds.length !== 1) {
      return null;
    }
    const id = selectedIds[0];
    const found = elements.find(
      (el): el is BoardFrameElement => el.type === "frame" && el.id === id,
    );
    return found ?? null;
  }, [elements, selectedIds, tool]);

  const editingTextElement = useMemo(() => {
    if (!editingTextId) return null;
    const found = elements.find(
      (el): el is Extract<BoardElement, { type: "text" }> =>
        el.type === "text" && el.id === editingTextId,
    );
    return found ?? null;
  }, [editingTextId, elements]);

  const transformableIds = useMemo(() => {
    return selectedIds.filter((id) => {
      if (editingTextId === id) {
        return false;
      }
      const el = elements.find((e) => e.id === id);
      if (!el) {
        return false;
      }
      if (el.type === "line") {
        if (selectedIds.length > 1) {
          // In multi-select all lines (including freehand strokes)
          // must participate in one shared transformer box.
          return true;
        }
        if (isFreehandBrushLine(el)) {
          return true;
        }
        // Keep custom line-point editing UX for single selected line/arrow.
        return false;
      }
      if (el.type === "frame" && selectedIds.length !== 1) {
        return false;
      }
      return true;
    });
  }, [editingTextId, elements, selectedIds]);

  const singleSelectedFrame = useMemo(() => {
    if (transformableIds.length !== 1) {
      return null;
    }
    const id = transformableIds[0];
    const el = elements.find(
      (item): item is BoardFrameElement =>
        item.id === id && item.type === "frame",
    );
    return el ?? null;
  }, [elements, transformableIds]);

  const singleSelectedText = useMemo(() => {
    if (transformableIds.length !== 1) {
      return null;
    }
    const id = transformableIds[0];
    const el = elements.find(
      (item): item is Extract<BoardElement, { type: "text" }> =>
        item.id === id && item.type === "text",
    );
    return el ?? null;
  }, [elements, transformableIds]);

  const singleSelectedLine = useMemo(() => {
    if (selectedIds.length !== 1 || tool !== "select") {
      return null;
    }
    const id = selectedIds[0];
    const el = elements.find(
      (item): item is Extract<BoardElement, { type: "line" }> =>
        item.id === id && item.type === "line",
    );
    if (!el || isFreehandBrushLine(el)) {
      return null;
    }
    return el;
  }, [elements, selectedIds, tool]);

  const selectShape = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>, id: string) => {
      if (tool !== "select") {
        return;
      }
      e.cancelBubble = true;
      setActiveTextId(null);
      const additive = e.evt.shiftKey || e.evt.metaKey || e.evt.ctrlKey;
      setSelectedIds((prev) => {
        if (additive) {
          return prev.includes(id)
            ? prev.filter((x) => x !== id)
            : [...prev, id];
        }
        // Keep group selection when user starts dragging from an already selected item.
        if (prev.length > 1 && prev.includes(id)) {
          return prev;
        }
        return [id];
      });
    },
    [setActiveTextId, setSelectedIds, tool],
  );

  return {
    activeTextElement,
    activeShapeElement,
    activeFrameElement,
    editingTextElement,
    transformableIds,
    singleSelectedFrame,
    singleSelectedText,
    singleSelectedLine,
    selectShape,
  };
}
