import { useEffect, useState } from "react";
import type { TFunction } from "i18next";

import {
  type BoardAccessRole,
  getBoardRequest,
} from "../../shared/api/boardsApi";
import { getApiErrorMessage } from "../../shared/api/getApiErrorMessage";

export function useLoadBoardMeta(
  boardId: string | undefined,
  shareToken: string | undefined,
  t: TFunction,
) {
  const [title, setTitle] = useState<string | null>(null);
  const [myRole, setMyRole] = useState<BoardAccessRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!boardId) {
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    setMyRole(null);

    void (async () => {
      try {
        const { board, myRole: role } = await getBoardRequest(boardId, {
          shareToken: shareToken ?? undefined,
        });
        if (!cancelled) {
          setTitle(board.title);
          setMyRole(role);
        }
      } catch (e) {
        if (!cancelled) {
          setError(getApiErrorMessage(e, t("errors.generic"), t));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [boardId, shareToken, t]);

  return { title, setTitle, loading, error, setError, myRole };
}
