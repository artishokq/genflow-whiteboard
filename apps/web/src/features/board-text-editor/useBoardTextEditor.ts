import { useCallback, useEffect, useRef, useState } from "react";

export function useBoardTextEditor({
  editingTextElement,
  scale,
}: {
  editingTextElement: unknown;
  scale: number;
}) {
  const textEditorRef = useRef<HTMLTextAreaElement>(null);
  const [editingTextareaHeight, setEditingTextareaHeight] = useState<number>(0);

  const syncEditingTextareaHeight = useCallback(() => {
    const textarea = textEditorRef.current;
    if (!textarea) return;
    textarea.style.height = "0px";
    const next = Math.max(28, textarea.scrollHeight);
    textarea.style.height = `${next}px`;
    setEditingTextareaHeight(next);
  }, []);

  useEffect(() => {
    if (!editingTextElement) return;
    syncEditingTextareaHeight();
  }, [editingTextElement, scale, syncEditingTextareaHeight]);

  return {
    textEditorRef,
    editingTextareaHeight,
    setEditingTextareaHeight,
    syncEditingTextareaHeight,
  };
}
