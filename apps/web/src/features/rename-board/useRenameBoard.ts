import { useCallback, useEffect, useRef, useState } from "react";
import type { TFunction } from "i18next";

import { patchBoardRequest } from "../../shared/api/boardsApi";
import { getApiErrorMessage } from "../../shared/api/getApiErrorMessage";

type UseRenameBoardParams = {
  boardId: string | undefined;
  title: string | null;
  loading: boolean;
  error: string | null;
  setTitle: (value: string) => void;
  setError: (value: string | null) => void;
  t: TFunction;
  canRename: boolean;
};

export function useRenameBoard({
  boardId,
  title,
  loading,
  error,
  setTitle,
  setError,
  t,
  canRename,
}: UseRenameBoardParams) {
  const renameInputRef = useRef<HTMLInputElement>(null);
  const [renamingBoard, setRenamingBoard] = useState(false);
  const [renameDraft, setRenameDraft] = useState("");
  const [renameBusy, setRenameBusy] = useState(false);

  useEffect(() => {
    if (!renamingBoard) return;
    const el = renameInputRef.current;
    if (!el) return;
    el.focus();
    el.select();
  }, [renamingBoard]);

  const beginRename = useCallback(() => {
    if (!canRename || !title || loading || error || !boardId || renameBusy) return;
    setRenameDraft(title);
    setRenamingBoard(true);
  }, [boardId, canRename, error, loading, renameBusy, title]);

  const cancelRename = useCallback(() => {
    setRenamingBoard(false);
    setRenameDraft("");
  }, []);

  const commitRename = useCallback(async () => {
    if (!boardId || !renamingBoard) return;
    const next = renameDraft.trim();
    if (!next) {
      cancelRename();
      return;
    }
    if (next === (title ?? "").trim()) {
      cancelRename();
      return;
    }
    setRenameBusy(true);
    try {
      const { board } = await patchBoardRequest(boardId, next);
      setTitle(board.title);
      setRenamingBoard(false);
      setRenameDraft("");
    } catch (e) {
      setError(getApiErrorMessage(e, t("errors.generic"), t));
      cancelRename();
    } finally {
      setRenameBusy(false);
    }
  }, [boardId, cancelRename, renameDraft, renamingBoard, setError, setTitle, t, title]);

  return {
    renameInputRef,
    renamingBoard,
    renameDraft,
    renameBusy,
    setRenameDraft,
    beginRename,
    cancelRename,
    commitRename,
  };
}
