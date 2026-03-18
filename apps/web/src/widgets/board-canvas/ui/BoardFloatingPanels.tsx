import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import type { CommentThread } from "../../../entities/comment";
import type { AiGenerationDraft } from "../../../features/board-ai-generation";
import { boardImageSrc } from "../../../shared/api/boardsApi";
import { UserAvatar } from "../../../shared/ui/UserAvatar/UserAvatar";

export function BoardFloatingPanels({
  scale,
  stagePos,
  boardId,
  shareToken,
  accessToken,
  pendingCommentAnchor,
  activeCommentThread,
  commentBusy,
  commentError,
  onCreateCommentThread,
  onCancelCommentCreate,
  onCloseCommentThread,
  onReplyCommentThread,
  onToggleCommentThreadResolved,
  canDeleteActiveCommentThread,
  onDeleteCommentThread,
  pendingGenerationAnchor,
  pendingGenerationMode,
  generationDraft,
  generationBusy,
  generationError,
  onSubmitGenerationPrompt,
  onCancelGenerationPrompt,
  onStopGeneration,
  onAcceptGenerationResult,
  onRejectGeneration,
}: {
  scale: number;
  stagePos: { x: number; y: number };
  boardId: string;
  shareToken?: string | null;
  accessToken: string | null;
  pendingCommentAnchor: { x: number; y: number } | null;
  activeCommentThread: CommentThread | null;
  commentBusy: boolean;
  commentError: string | null;
  onCreateCommentThread?: (x: number, y: number, text: string) => Promise<void>;
  onCancelCommentCreate?: () => void;
  onCloseCommentThread?: () => void;
  onReplyCommentThread?: (threadId: string, text: string) => Promise<void>;
  onToggleCommentThreadResolved?: (
    threadId: string,
    status: "open" | "resolved",
  ) => Promise<void>;
  canDeleteActiveCommentThread: boolean;
  onDeleteCommentThread?: (threadId: string) => Promise<void>;
  pendingGenerationAnchor: { x: number; y: number } | null;
  pendingGenerationMode: "text" | "image" | "video" | null;
  generationDraft: AiGenerationDraft | null;
  generationBusy: boolean;
  generationError: string | null;
  onSubmitGenerationPrompt?: (
    mode: "text" | "image" | "video",
    x: number,
    y: number,
    prompt: string,
  ) => Promise<void>;
  onCancelGenerationPrompt?: () => void;
  onStopGeneration?: () => void;
  onAcceptGenerationResult?: () => void;
  onRejectGeneration?: () => void;
}) {
  const { t } = useTranslation();
  const [commentDraft, setCommentDraft] = useState("");
  const [replyDraft, setReplyDraft] = useState("");
  const [generationPromptDraft, setGenerationPromptDraft] = useState("");

  useEffect(() => {
    if (!pendingGenerationAnchor) {
      setGenerationPromptDraft("");
    }
  }, [pendingGenerationAnchor]);

  const toScreen = (wx: number, wy: number) => ({
    x: wx * scale + stagePos.x,
    y: wy * scale + stagePos.y,
  });

  const pendingCommentPos = pendingCommentAnchor
    ? toScreen(pendingCommentAnchor.x, pendingCommentAnchor.y)
    : null;
  const activeCommentPos = activeCommentThread
    ? toScreen(activeCommentThread.anchorX, activeCommentThread.anchorY)
    : null;
  const pendingGenerationPos = pendingGenerationAnchor
    ? toScreen(pendingGenerationAnchor.x, pendingGenerationAnchor.y)
    : null;
  const generationDraftPos = generationDraft
    ? toScreen(generationDraft.anchorX, generationDraft.anchorY)
    : null;
  const generationPreviewSrc =
    generationDraft?.result?.assetUrl && generationDraft.mode !== "text"
      ? boardImageSrc(boardId, generationDraft.result.assetUrl, accessToken, shareToken)
      : null;

  const generationStateTitle = useMemo(() => {
    if (!generationDraft) return "";
    if (generationDraft.status === "generating") return t("board.generationGenerating");
    if (generationDraft.status === "ready") return t("board.generationReady");
    return t("board.generationFailed");
  }, [generationDraft, t]);

  return (
    <>
      {pendingCommentAnchor && pendingCommentPos ? (
        <div
          style={{
            position: "absolute",
            left: pendingCommentPos.x + 12,
            top: pendingCommentPos.y - 12,
            width: "min(420px, calc(100vw - 2rem))",
            maxWidth: "88vw",
            borderRadius: 16,
            border: "1px solid rgba(139,126,200,0.22)",
            background: "rgba(255,255,255,0.98)",
            boxShadow: "0 12px 28px rgba(45,42,95,0.18)",
            padding: "0.65rem 0.8rem",
            zIndex: 33,
          }}
        >
          <textarea
            value={commentDraft}
            onChange={(e) => setCommentDraft(e.target.value)}
            placeholder={t("board.commentsStartPlaceholder")}
            style={{
              width: "100%",
              minHeight: 44,
              border: "none",
              outline: "none",
              resize: "vertical",
              font: "inherit",
              color: "#58607a",
            }}
            autoFocus
          />
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <button
              type="button"
              onClick={() => {
                setCommentDraft("");
                onCancelCommentCreate?.();
              }}
              style={{
                border: "none",
                background: "transparent",
                color: "#5b6381",
                fontSize: 13,
                cursor: "pointer",
              }}
            >
              {t("dashboard.cancelAction")}
            </button>
            <button
              type="button"
              disabled={commentBusy || commentDraft.trim().length === 0}
              onClick={async () => {
                const text = commentDraft.trim();
                if (!text || !onCreateCommentThread || !pendingCommentAnchor) return;
                await onCreateCommentThread(
                  pendingCommentAnchor.x,
                  pendingCommentAnchor.y,
                  text,
                );
                setCommentDraft("");
              }}
              style={{
                border: "none",
                borderRadius: 8,
                padding: "0.3rem 0.56rem",
                background: "rgba(74,95,193,0.15)",
                color: "#2d2a55",
                cursor: "pointer",
              }}
            >
              {t("board.commentsCreate")}
            </button>
          </div>
        </div>
      ) : null}
      {pendingGenerationAnchor && pendingGenerationPos && pendingGenerationMode ? (
        <div
          style={{
            position: "absolute",
            left: pendingGenerationPos.x + 12,
            top: pendingGenerationPos.y - 12,
            width: "min(440px, calc(100vw - 2rem))",
            maxWidth: "88vw",
            borderRadius: 16,
            border: "1px solid rgba(139,126,200,0.22)",
            background: "rgba(255,255,255,0.98)",
            boxShadow: "0 12px 28px rgba(45,42,95,0.18)",
            padding: "0.65rem 0.8rem",
            zIndex: 33,
          }}
        >
          <textarea
            value={generationPromptDraft}
            onChange={(e) => setGenerationPromptDraft(e.target.value)}
            placeholder={t("board.generationPromptPlaceholder")}
            style={{
              width: "100%",
              minHeight: 44,
              border: "none",
              outline: "none",
              resize: "vertical",
              font: "inherit",
              color: "#58607a",
            }}
            autoFocus
          />
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <button
              type="button"
              onClick={() => {
                setGenerationPromptDraft("");
                onCancelGenerationPrompt?.();
              }}
              style={{
                border: "none",
                background: "transparent",
                color: "#5b6381",
                fontSize: 13,
                cursor: "pointer",
              }}
            >
              {t("dashboard.cancelAction")}
            </button>
            <button
              type="button"
              disabled={generationBusy || generationPromptDraft.trim().length === 0}
              onClick={async () => {
                const text = generationPromptDraft.trim();
                if (!text || !onSubmitGenerationPrompt || !pendingGenerationAnchor) return;
                await onSubmitGenerationPrompt(
                  pendingGenerationMode,
                  pendingGenerationAnchor.x,
                  pendingGenerationAnchor.y,
                  text,
                );
                setGenerationPromptDraft("");
              }}
              style={{
                border: "none",
                borderRadius: 8,
                padding: "0.3rem 0.56rem",
                background: "rgba(74,95,193,0.15)",
                color: "#2d2a55",
                cursor: "pointer",
              }}
            >
              {t("board.generationGenerate")}
            </button>
          </div>
          {generationError ? (
            <p style={{ margin: "6px 0 0", fontSize: 12, color: "#8a2020" }}>
              {generationError}
            </p>
          ) : null}
        </div>
      ) : null}
      {generationDraft && generationDraftPos ? (
        <div
          style={{
            position: "absolute",
            left: generationDraftPos.x + 12,
            top: generationDraftPos.y + 12,
            width: "min(460px, calc(100vw - 2rem))",
            maxWidth: "92vw",
            borderRadius: 16,
            border: "1px solid rgba(139,126,200,0.22)",
            background: "rgba(255,255,255,0.98)",
            boxShadow: "0 12px 28px rgba(45,42,95,0.18)",
            zIndex: 33,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "0.6rem 0.8rem",
              borderBottom: "1px solid rgba(45,42,95,0.1)",
            }}
          >
            <strong style={{ color: "#2d2a55", fontSize: 14 }}>{generationStateTitle}</strong>
            {generationDraft.status === "generating" ? (
              <button
                type="button"
                onClick={onStopGeneration}
                style={{
                  border: "1px solid rgba(200,80,80,0.5)",
                  borderRadius: 8,
                  padding: "0.24rem 0.5rem",
                  background: "transparent",
                  color: "#8a2020",
                  cursor: "pointer",
                }}
              >
                {t("board.generationStop")}
              </button>
            ) : null}
          </div>
          <div style={{ padding: "0.75rem 0.85rem", display: "grid", gap: 10 }}>
            {generationDraft.status === "generating" ? (
              <p style={{ margin: 0, color: "#5b6381" }}>{t("board.generationWait")}</p>
            ) : null}
            {generationDraft.status === "ready" && generationDraft.mode === "text" ? (
              <div
                style={{
                  maxHeight: "40vh",
                  overflow: "auto",
                  padding: "0.6rem",
                  borderRadius: 10,
                  background: "rgba(32,40,70,0.04)",
                  whiteSpace: "pre-wrap",
                  color: "#2d2a55",
                }}
              >
                {generationDraft.result?.text || ""}
              </div>
            ) : null}
            {generationDraft.status === "ready" &&
            (generationDraft.mode === "image" || generationDraft.mode === "video") &&
            generationPreviewSrc ? (
              <div
                style={{
                  borderRadius: 10,
                  overflow: "hidden",
                  border: "1px solid rgba(45,42,95,0.1)",
                }}
              >
                {generationDraft.mode === "video" ? (
                  <video
                    src={generationPreviewSrc}
                    controls
                    style={{ width: "100%", display: "block", objectFit: "cover" }}
                  />
                ) : (
                  <img
                    src={generationPreviewSrc}
                    alt=""
                    style={{ width: "100%", display: "block", objectFit: "cover" }}
                  />
                )}
              </div>
            ) : null}
            {generationDraft.error || generationError ? (
              <p style={{ margin: 0, fontSize: 13, color: "#8a2020" }}>
                {generationDraft.error || generationError}
              </p>
            ) : null}
          </div>
          {generationDraft.status === "ready" ? (
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: 8,
                padding: "0.6rem 0.8rem",
                borderTop: "1px solid rgba(45,42,95,0.1)",
              }}
            >
              <button
                type="button"
                onClick={onRejectGeneration}
                style={{
                  border: "none",
                  borderRadius: 8,
                  padding: "0.3rem 0.55rem",
                  background: "rgba(45,42,95,0.08)",
                  color: "#424a68",
                  cursor: "pointer",
                }}
              >
                {t("board.generationDiscard")}
              </button>
              <button
                type="button"
                onClick={onAcceptGenerationResult}
                style={{
                  border: "none",
                  borderRadius: 8,
                  padding: "0.3rem 0.55rem",
                  background: "#4a5fc1",
                  color: "#fff",
                  cursor: "pointer",
                }}
              >
                {t("board.generationAccept")}
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
      {activeCommentThread && activeCommentPos ? (
        <div
          style={{
            position: "absolute",
            left: activeCommentPos.x + 12,
            top: activeCommentPos.y + 12,
            width: "min(420px, calc(100vw - 2rem))",
            maxWidth: "90vw",
            borderRadius: 16,
            border: "1px solid rgba(139,126,200,0.22)",
            background: "rgba(255,255,255,0.98)",
            boxShadow: "0 12px 28px rgba(45,42,95,0.18)",
            zIndex: 33,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 10,
              padding: "0.55rem 0.8rem",
              borderBottom: "1px solid rgba(45,42,95,0.1)",
            }}
          >
            <div style={{ fontWeight: 700, color: "#2d2a55", fontSize: 14 }}>
              {t("board.commentsTitle")}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <button
                type="button"
                disabled={commentBusy || !onToggleCommentThreadResolved}
                onClick={() =>
                  void onToggleCommentThreadResolved?.(
                    activeCommentThread.id,
                    activeCommentThread.status === "open" ? "resolved" : "open",
                  )
                }
                style={{
                  border: "none",
                  borderRadius: 8,
                  padding: "0.24rem 0.46rem",
                  background: "rgba(74,95,193,0.12)",
                  color: "#2d2a55",
                  fontSize: 12,
                  cursor: "pointer",
                }}
              >
                {activeCommentThread.status === "open"
                  ? t("board.commentsResolve")
                  : t("board.commentsReopen")}
              </button>
              {canDeleteActiveCommentThread ? (
                <button
                  type="button"
                  disabled={commentBusy || !onDeleteCommentThread}
                  onClick={() => void onDeleteCommentThread?.(activeCommentThread.id)}
                  style={{
                    border: "none",
                    borderRadius: 8,
                    padding: "0.24rem 0.46rem",
                    background: "rgba(200,80,80,0.14)",
                    color: "#8a2020",
                    fontSize: 12,
                    cursor: "pointer",
                  }}
                >
                  {t("board.commentsDeleteThread")}
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => onCloseCommentThread?.()}
                style={{
                  border: "none",
                  background: "transparent",
                  fontSize: 18,
                  lineHeight: 1,
                  color: "#565e79",
                  cursor: "pointer",
                }}
              >
                ×
              </button>
            </div>
          </div>
          <div
            style={{
              maxHeight: "48vh",
              overflow: "auto",
              padding: "0.65rem 0.8rem",
              display: "grid",
              gap: 10,
            }}
          >
            {activeCommentThread.messages.map((m) => (
              <div key={m.id} style={{ display: "grid", gap: 4 }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      minWidth: 0,
                    }}
                  >
                    <UserAvatar
                      userId={m.authorId}
                      firstName={m.authorFirstName}
                      lastName={m.authorLastName}
                      email={m.authorEmail}
                      avatarObjectKey={m.authorAvatarObjectKey ?? null}
                      accessToken={accessToken}
                      sizePx={32}
                    />
                    <strong
                      style={{
                        color: "#262c45",
                        fontSize: 14,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {[m.authorFirstName, m.authorLastName].filter(Boolean).join(" ").trim() ||
                        m.authorEmail}
                    </strong>
                  </div>
                  <span style={{ color: "#6b7391", fontSize: 12, flexShrink: 0 }}>
                    {new Date(m.createdAt).toLocaleString()}
                  </span>
                </div>
                <p style={{ margin: 0, color: "#2d2a55", fontSize: 15 }}>{m.text}</p>
              </div>
            ))}
          </div>
          <div
            style={{
              borderTop: "1px solid rgba(45,42,95,0.1)",
              padding: "0.55rem 0.8rem",
            }}
          >
            <textarea
              value={replyDraft}
              onChange={(e) => setReplyDraft(e.target.value)}
              placeholder={t("board.commentsReplyPlaceholder")}
              style={{
                width: "100%",
                minHeight: 38,
                border: "none",
                outline: "none",
                resize: "vertical",
                font: "inherit",
                color: "#58607a",
              }}
            />
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button
                type="button"
                disabled={commentBusy || replyDraft.trim().length === 0}
                onClick={async () => {
                  const text = replyDraft.trim();
                  if (!text || !onReplyCommentThread) return;
                  await onReplyCommentThread(activeCommentThread.id, text);
                  setReplyDraft("");
                }}
                style={{
                  border: "none",
                  borderRadius: 8,
                  padding: "0.3rem 0.56rem",
                  background: "rgba(74,95,193,0.15)",
                  color: "#2d2a55",
                  cursor: "pointer",
                }}
              >
                {t("board.commentsSend")}
              </button>
            </div>
            {commentError ? (
              <p style={{ margin: "6px 0 0", fontSize: 12, color: "#8a2020" }}>
                {commentError}
              </p>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  );
}
