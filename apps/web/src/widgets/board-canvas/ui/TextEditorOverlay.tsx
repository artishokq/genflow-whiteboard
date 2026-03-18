import type { RefObject } from "react";

import type { BoardElement } from "../../../entities/board";

import {
  STICKER_PADDING,
  TEXT_BLOCK_PADDING,
  TEXT_LINE_HEIGHT,
} from "../model/constants";

type EditingTextElement = Extract<BoardElement, { type: "text" }>;

type TextEditorOverlayProps = {
  editingTextElement: EditingTextElement;
  textEditorRef: RefObject<HTMLTextAreaElement | null>;
  scale: number;
  stagePos: { x: number; y: number };
  editingTextareaHeight: number;
  updateTextValue: (next: string) => void;
  finishTextEditing: (id: string) => void;
};

export function TextEditorOverlay({
  editingTextElement,
  textEditorRef,
  scale,
  stagePos,
  editingTextareaHeight,
  updateTextValue,
  finishTextEditing,
}: TextEditorOverlayProps) {
  return (
    <textarea
      ref={textEditorRef}
      value={editingTextElement.text}
      onPointerDown={(e) => e.stopPropagation()}
      onChange={(e) => {
        updateTextValue(e.target.value);
      }}
      onBlur={() => {
        finishTextEditing(editingTextElement.id);
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.preventDefault();
          finishTextEditing(editingTextElement.id);
        }
      }}
      style={{
        position: "absolute",
        left: editingTextElement.x * scale + stagePos.x,
        top: editingTextElement.y * scale + stagePos.y,
        width: editingTextElement.width * scale,
        minHeight: Math.max(
          28,
          editingTextElement.fontSize * TEXT_LINE_HEIGHT * scale +
            TEXT_BLOCK_PADDING,
          editingTextElement.textKind === "sticker"
            ? editingTextElement.width * scale
            : 0,
        ),
        height:
          editingTextareaHeight > 0
            ? Math.max(
                editingTextareaHeight,
                editingTextElement.textKind === "sticker"
                  ? editingTextElement.width * scale
                  : 0,
              )
            : Math.max(
                28,
                editingTextElement.fontSize * TEXT_LINE_HEIGHT * scale +
                  TEXT_BLOCK_PADDING,
                editingTextElement.textKind === "sticker"
                  ? editingTextElement.width * scale
                  : 0,
              ),
        margin: 0,
        padding:
          editingTextElement.textKind === "sticker"
            ? `${Math.max(8, STICKER_PADDING * scale * 0.9)}px`
            : 0,
        border: "1px solid #49bee8",
        outline: "none",
        boxSizing: "border-box",
        resize: "none",
        overflow: "hidden",
        background:
          editingTextElement.background === "transparent"
            ? "transparent"
            : editingTextElement.background,
        color: editingTextElement.fill,
        fontFamily: editingTextElement.fontFamily,
        fontWeight: editingTextElement.bold ? 700 : 400,
        fontStyle: editingTextElement.italic ? "italic" : "normal",
        textDecoration:
          `${editingTextElement.underline ? "underline " : ""}${
            editingTextElement.strike ? "line-through" : ""
          }`.trim(),
        textAlign: editingTextElement.align,
        fontSize: editingTextElement.fontSize * scale,
        lineHeight: String(TEXT_LINE_HEIGHT),
        whiteSpace: "pre-wrap",
        wordBreak: "break-word",
        zIndex: 15,
      }}
    />
  );
}
