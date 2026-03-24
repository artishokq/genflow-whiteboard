import { useCallback, useEffect, useMemo, useState } from "react";
import type { TFunction } from "i18next";

import {
  addCommentMessageRequest,
  createCommentThreadRequest,
  deleteCommentThreadRequest,
  getBoardCommentsRequest,
  updateCommentThreadStatusRequest,
  type CommentThread,
} from "../../../entities/comment";
import type { BoardAccessRole } from "../../../shared/api/boardsApi";
import { getApiErrorMessage } from "../../../shared/api/getApiErrorMessage";

type Params = {
  boardId: string | undefined;
  shareToken: string | undefined;
  t: TFunction;
};

export function useBoardComments({ boardId, shareToken, t }: Params) {
  const [threads, setThreads] = useState<CommentThread[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [myRole, setMyRole] = useState<BoardAccessRole | null>(null);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!boardId) {
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const payload = await getBoardCommentsRequest(boardId, { shareToken });
      setThreads(payload.threads);
      setMyRole(payload.myRole);
      if (
        activeThreadId &&
        !payload.threads.some((thread) => thread.id === activeThreadId)
      ) {
        setActiveThreadId(null);
      }
    } catch (e) {
      setError(getApiErrorMessage(e, t("errors.generic"), t));
    } finally {
      setLoading(false);
    }
  }, [activeThreadId, boardId, shareToken, t]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const activeThread = useMemo(
    () => threads.find((thread) => thread.id === activeThreadId) ?? null,
    [activeThreadId, threads],
  );

  const canResolve = myRole === "owner" || myRole === "editor";

  const createThreadAt = useCallback(
    async (anchorX: number, anchorY: number, text: string) => {
      if (!boardId) return null;
      setBusy(true);
      setError(null);
      try {
        const result = await createCommentThreadRequest(
          boardId,
          { anchorX, anchorY, text },
          { shareToken },
        );
        await refresh();
        setActiveThreadId(result.threadId);
        return result.threadId;
      } catch (e) {
        setError(getApiErrorMessage(e, t("errors.generic"), t));
        return null;
      } finally {
        setBusy(false);
      }
    },
    [boardId, refresh, shareToken, t],
  );

  const addMessage = useCallback(
    async (threadId: string, text: string) => {
      if (!boardId) return;
      setBusy(true);
      setError(null);
      try {
        await addCommentMessageRequest(boardId, threadId, text, { shareToken });
        await refresh();
      } catch (e) {
        setError(getApiErrorMessage(e, t("errors.generic"), t));
      } finally {
        setBusy(false);
      }
    },
    [boardId, refresh, shareToken, t],
  );

  const setThreadStatus = useCallback(
    async (threadId: string, status: "open" | "resolved") => {
      if (!boardId || !canResolve) return;
      setBusy(true);
      setError(null);
      try {
        await updateCommentThreadStatusRequest(boardId, threadId, status, { shareToken });
        await refresh();
      } catch (e) {
        setError(getApiErrorMessage(e, t("errors.generic"), t));
      } finally {
        setBusy(false);
      }
    },
    [boardId, canResolve, refresh, shareToken, t],
  );

  const deleteThread = useCallback(
    async (threadId: string) => {
      if (!boardId) return;
      setBusy(true);
      setError(null);
      try {
        await deleteCommentThreadRequest(boardId, threadId, { shareToken });
        if (activeThreadId === threadId) {
          setActiveThreadId(null);
        }
        await refresh();
      } catch (e) {
        setError(getApiErrorMessage(e, t("errors.generic"), t));
      } finally {
        setBusy(false);
      }
    },
    [activeThreadId, boardId, refresh, shareToken, t],
  );

  return {
    threads,
    activeThreadId,
    setActiveThreadId,
    activeThread,
    loading,
    busy,
    error,
    myRole,
    canResolve,
    refresh,
    createThreadAt,
    addMessage,
    setThreadStatus,
    deleteThread,
  };
}
