import { useCallback, useMemo, useRef, useState } from "react";
import type { TFunction } from "i18next";

import {
  createAiGenerationRequest,
  getAiGenerationStatusRequest,
  type AiGenerationMode,
} from "../../../shared/api/aiApi";
import { getApiErrorMessage } from "../../../shared/api/getApiErrorMessage";

type DraftStatus = "generating" | "ready" | "failed";

type DraftResult = {
  text?: string;
  assetUrl?: string;
  width?: number;
  height?: number;
};

export type AiGenerationDraft = {
  requestId: string;
  mode: AiGenerationMode;
  prompt: string;
  anchorX: number;
  anchorY: number;
  status: DraftStatus;
  progress: number | null;
  result: DraftResult | null;
  error: string | null;
};

type Params = {
  boardId: string | undefined;
  shareToken: string | undefined;
  t: TFunction;
};

function isDoneStatus(status: string): boolean {
  const s = status.toLowerCase();
  return s === "success" || s === "completed" || s === "done" || s === "ready";
}

function isFailedStatus(status: string): boolean {
  const s = status.toLowerCase();
  return s === "failed" || s === "error" || s === "cancelled" || s === "canceled";
}

function firstAssetRef(values: string[]): string | null {
  for (const value of values) {
    const trimmed = value.trim();
    if (trimmed) {
      return trimmed;
    }
  }
  return null;
}

function firstText(values: string[]): string {
  const compact = values.map((v) => v.trim()).filter(Boolean);
  return compact[0] ?? "";
}

async function loadImageSize(url: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const w = Math.max(1, img.naturalWidth || img.width || 800);
      const h = Math.max(1, img.naturalHeight || img.height || 600);
      const maxEdge = 900;
      if (Math.max(w, h) <= maxEdge) {
        resolve({ width: w, height: h });
        return;
      }
      const s = maxEdge / Math.max(w, h);
      resolve({ width: Math.round(w * s), height: Math.round(h * s) });
    };
    img.onerror = () => resolve({ width: 800, height: 600 });
    img.src = url;
  });
}

export function useBoardAiGeneration({ boardId, shareToken, t }: Params) {
  const [mode, setMode] = useState<AiGenerationMode | null>(null);
  const [pendingPrompt, setPendingPrompt] = useState<{
    x: number;
    y: number;
    mode: AiGenerationMode;
  } | null>(null);
  const [draft, setDraft] = useState<AiGenerationDraft | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pollTimerRef = useRef<number | null>(null);

  const clearPoll = useCallback(() => {
    if (pollTimerRef.current !== null) {
      window.clearTimeout(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  }, []);

  const setAiMode = useCallback((next: AiGenerationMode | null) => {
    setMode(next);
    setPendingPrompt(null);
    setError(null);
  }, []);

  const beginAt = useCallback((x: number, y: number) => {
    setPendingPrompt((prev) => {
      const selectedMode = mode ?? prev?.mode;
      if (!selectedMode) {
        return prev;
      }
      return { x, y, mode: selectedMode };
    });
    setMode(null);
    setError(null);
  }, [mode]);

  const cancelPrompt = useCallback(() => {
    setPendingPrompt(null);
    setError(null);
  }, []);

  const stopDraft = useCallback(() => {
    clearPoll();
    setDraft((prev) =>
      prev
        ? {
            ...prev,
            status: "failed",
            error: t("board.generationStopped"),
          }
        : prev,
    );
  }, [clearPoll, t]);

  const poll = useCallback(
    async (requestId: string, selectedMode: AiGenerationMode) => {
      if (!boardId) return;
      try {
        const status = await getAiGenerationStatusRequest(boardId, requestId, { shareToken });
        const done = isDoneStatus(status.status);
        const failed = isFailedStatus(status.status);
        if (failed) {
          clearPoll();
          setDraft((prev) =>
            prev
              ? {
                  ...prev,
                  status: "failed",
                  progress: status.progress,
                  error: t("errors.generic"),
                }
              : prev,
          );
          return;
        }
        if (!done) {
          setDraft((prev) =>
            prev
              ? {
                  ...prev,
                  progress: status.progress,
                }
              : prev,
          );
          pollTimerRef.current = window.setTimeout(() => {
            void poll(requestId, selectedMode);
          }, 1500);
          return;
        }
        clearPoll();
        if (selectedMode === "text") {
          const text = firstText(status.result);
          setDraft((prev) =>
            prev
              ? {
                  ...prev,
                  status: "ready",
                  progress: 100,
                  result: { text },
                  error: null,
                }
              : prev,
          );
          return;
        }
        const assetRef = firstAssetRef(status.result);
        if (!assetRef) {
          setDraft((prev) =>
            prev
              ? {
                  ...prev,
                  status: "failed",
                  error: t("errors.generic"),
                }
              : prev,
          );
          return;
        }
        if (selectedMode === "image") {
          const dims = /^https?:\/\//i.test(assetRef)
            ? await loadImageSize(assetRef)
            : { width: 800, height: 600 };
          setDraft((prev) =>
            prev
              ? {
                  ...prev,
                  status: "ready",
                  progress: 100,
                  result: { assetUrl: assetRef, width: dims.width, height: dims.height },
                  error: null,
                }
              : prev,
          );
          return;
        }
        setDraft((prev) =>
          prev
            ? {
                ...prev,
                status: "ready",
                progress: 100,
                result: { assetUrl: assetRef },
                error: null,
              }
            : prev,
        );
      } catch (e) {
        clearPoll();
        setDraft((prev) =>
          prev
            ? {
                ...prev,
                status: "failed",
                error: getApiErrorMessage(e, t("errors.generic"), t),
              }
            : prev,
        );
      }
    },
    [boardId, clearPoll, shareToken, t],
  );

  const submitPrompt = useCallback(
    async (
      selectedMode: AiGenerationMode,
      anchor: { x: number; y: number },
      prompt: string,
    ) => {
      if (!boardId) {
        return;
      }
      clearPoll();
      setBusy(true);
      setError(null);
      setPendingPrompt(null);
      setDraft({
        requestId: "",
        mode: selectedMode,
        prompt,
        anchorX: anchor.x,
        anchorY: anchor.y,
        status: "generating",
        progress: 0,
        result: null,
        error: null,
      });
      try {
        const created = await createAiGenerationRequest(
          boardId,
          { mode: selectedMode, prompt },
          { shareToken },
        );
        setDraft((prev) =>
          prev
            ? {
                ...prev,
                requestId: created.requestId,
              }
            : prev,
        );
        void poll(created.requestId, selectedMode);
      } catch (e) {
        setDraft(null);
        setError(getApiErrorMessage(e, t("errors.generic"), t));
      } finally {
        setBusy(false);
      }
    },
    [boardId, clearPoll, poll, shareToken, t],
  );

  const rejectDraft = useCallback(() => {
    clearPoll();
    setDraft(null);
  }, [clearPoll]);

  const acceptPayload = useMemo(() => {
    if (!draft || draft.status !== "ready") return null;
    return {
      mode: draft.mode,
      anchor: { x: draft.anchorX, y: draft.anchorY },
      result: draft.result,
    };
  }, [draft]);

  return {
    mode,
    setAiMode,
    pendingAnchor: pendingPrompt ? { x: pendingPrompt.x, y: pendingPrompt.y } : null,
    pendingMode: pendingPrompt?.mode ?? null,
    beginAt,
    cancelPrompt,
    submitPrompt,
    draft,
    busy,
    error,
    stopDraft,
    rejectDraft,
    setDraft,
    clearPoll,
    acceptPayload,
  };
}
