import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Navigate, useParams, useSearchParams } from "react-router-dom";

import { BoardExportMenu } from "../../features/board-export";
import { BoardHistoryMenu } from "../../features/board-history";
import type { BoardHistoryEntry } from "../../features/board-history";
import { BoardCommentsPanel, useBoardComments } from "../../features/board-comments";
import { useBoardAiGeneration } from "../../features/board-ai-generation";
import { useLoadBoardMeta } from "../../features/load-board-meta";
import { BoardSettingsMenu, useBoardSettings } from "../../features/board-settings";
import { useRenameBoard } from "../../features/rename-board";
import { BoardShareMenu } from "../../features/board-share";
import { claimBoardAccessRequest } from "../../shared/api/boardsApi";
import { useAuthStore } from "../../shared/store/authStore";
import { BoardCanvas, type BoardCanvasHandle } from "../../widgets/board-canvas";
import { BoardTitleSlot, BoardTopBar } from "../../widgets/board-top-bar";
import { COMMENT_ICON } from "../../widgets/board-top-bar/model/constants";
import { BoardToolDock, useBoardDock } from "../../widgets/board-tool-dock";

import styles from "./BoardPage.module.css";

export default function BoardPage() {
  const { t } = useTranslation();
  const { boardId } = useParams<{ boardId: string }>();
  const [searchParams] = useSearchParams();
  const shareToken = useMemo(() => {
    const raw = searchParams.get("share");
    return raw && raw.trim() ? raw.trim() : undefined;
  }, [searchParams]);

  const canvasRef = useRef<BoardCanvasHandle>(null);
  const [zoomPercent, setZoomPercent] = useState(100);
  const [pendingCommentAnchor, setPendingCommentAnchor] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [historyState, setHistoryState] = useState<{
    canUndo: boolean;
    canRedo: boolean;
    entries: BoardHistoryEntry[];
  }>({
    canUndo: false,
    canRedo: false,
    entries: [],
  });
  const [commentsPanelOpen, setCommentsPanelOpen] = useState(false);

  const { title, setTitle, loading, error, setError, myRole } = useLoadBoardMeta(
    boardId,
    shareToken,
    t,
  );

  const readOnly = myRole === "viewer";
  const canRename = myRole === "owner";

  const rename = useRenameBoard({
    boardId,
    title,
    loading,
    error,
    setTitle,
    setError,
    t,
    canRename,
  });

  const dock = useBoardDock(canvasRef);
  const boardSettings = useBoardSettings();
  const lastClaimRef = useRef<string | null>(null);

  const comments = useBoardComments({ boardId, shareToken, t });
  const ai = useBoardAiGeneration({ boardId, shareToken, t });
  const currentUserId = useAuthStore((s) => s.user?.id ?? null);

  useEffect(() => {
    if (!boardId || !shareToken) {
      return;
    }
    const key = `${boardId}:${shareToken}`;
    if (lastClaimRef.current === key) {
      return;
    }
    lastClaimRef.current = key;
    void claimBoardAccessRequest(boardId, shareToken).catch(() => {
      // Board can still be accessible by direct share token even if claim fails.
    });
  }, [boardId, shareToken]);

  useEffect(() => {
    if (readOnly) {
      dock.setActiveTool("hand");
    }
  }, [readOnly, dock]);

  useEffect(() => {
    if (dock.activeTool !== "comment") {
      setPendingCommentAnchor(null);
    }
  }, [dock.activeTool]);

  useEffect(() => {
    if (dock.activeTool === "comment") {
      ai.setAiMode(null);
    }
  }, [ai.setAiMode, dock.activeTool]);

  const aiToolOriginRef = useRef<typeof dock.activeTool | null>(null);
  useEffect(() => {
    if (!ai.mode) {
      aiToolOriginRef.current = null;
      return;
    }
    if (aiToolOriginRef.current === null) {
      aiToolOriginRef.current = dock.activeTool;
      return;
    }
    if (dock.activeTool !== aiToolOriginRef.current) {
      ai.setAiMode(null);
    }
  }, [ai.mode, ai.setAiMode, dock.activeTool]);

  if (!boardId) {
    return <Navigate to="/dashboard/personal" replace />;
  }

  return (
    <div className={styles.page}>
      {readOnly ? (
        <div className={styles.viewerBanner} role="status">
          {t("board.viewerBanner")}
        </div>
      ) : null}
      <BoardTopBar
        titleSlot={
          <BoardTitleSlot
            canRename={canRename}
            loading={loading}
            error={error}
            title={title}
            renamingBoard={rename.renamingBoard}
            renameDraft={rename.renameDraft}
            renameBusy={rename.renameBusy}
            renameInputRef={rename.renameInputRef}
            onRenameDraftChange={rename.setRenameDraft}
            beginRename={rename.beginRename}
            cancelRename={rename.cancelRename}
            commitRename={rename.commitRename}
          />
        }
        exportSlot={({ buttonClassName, iconClassName }) => (
          <BoardExportMenu
            buttonClassName={buttonClassName}
            iconClassName={iconClassName}
            onExportPngViewport={(pixelRatio) =>
              void canvasRef.current?.exportPngViewport(pixelRatio)
            }
            onExportPngFull={(pixelRatio) =>
              void canvasRef.current?.exportPngFullBoard(pixelRatio)
            }
            onExportJson={() => canvasRef.current?.exportJsonBackup()}
          />
        )}
        settingsSlot={({ buttonClassName, iconClassName }) => (
          <BoardSettingsMenu
            settings={boardSettings.settings}
            onShowGridChange={boardSettings.setShowGrid}
            onBoardColorChange={boardSettings.setBoardColor}
            buttonClassName={buttonClassName}
            iconClassName={iconClassName}
          />
        )}
        historySlot={({ buttonClassName, iconClassName }) => (
          <BoardHistoryMenu
            buttonClassName={buttonClassName}
            iconClassName={iconClassName}
            entries={historyState.entries}
            canUndo={historyState.canUndo}
            canRedo={historyState.canRedo}
            onUndo={() => canvasRef.current?.undo()}
            onRedo={() => canvasRef.current?.redo()}
          />
        )}
        commentsSlot={({ buttonClassName, iconClassName }) => (
          <button
            type="button"
            className={buttonClassName}
            aria-label={t("board.commentsTitle")}
            title={t("board.commentsTitle")}
            onClick={() => setCommentsPanelOpen((prev) => !prev)}
          >
            <img src={COMMENT_ICON} alt="" className={iconClassName} />
          </button>
        )}
        shareSlot={
          myRole === "owner"
            ? ({ buttonClassName, iconClassName }) => (
                <BoardShareMenu
                  boardId={boardId}
                  buttonClassName={buttonClassName}
                  iconClassName={iconClassName}
                />
              )
            : undefined
        }
      />
      {!error && !loading ? (
        <BoardCanvas
          ref={canvasRef}
          boardId={boardId}
          shareToken={shareToken}
          readOnly={readOnly}
          tool={dock.activeTool}
          selectedShapeKind={dock.selectedShapeKind}
          selectedFramePreset={dock.selectedFramePreset}
          brushSettings={dock.brushSettings}
          showGrid={boardSettings.settings.showGrid}
          boardColor={boardSettings.settings.boardColor}
          onToolChange={dock.setActiveTool}
          onScaleChange={(scale) => setZoomPercent(Math.round(scale * 100))}
          onHistoryChange={setHistoryState}
          commentThreads={comments.threads}
          activeCommentThreadId={comments.activeThreadId}
          onCommentThreadPick={(threadId) => {
            comments.setActiveThreadId(threadId);
            setPendingCommentAnchor(null);
          }}
          onCreateCommentAt={(x, y) => {
            setPendingCommentAnchor({ x, y });
            comments.setActiveThreadId(null);
          }}
          pendingCommentAnchor={pendingCommentAnchor}
          activeCommentThread={comments.activeThread}
          commentBusy={comments.busy}
          commentError={comments.error}
          onCreateCommentThread={async (x, y, text) => {
            await comments.createThreadAt(x, y, text);
            setPendingCommentAnchor(null);
            dock.setActiveTool("select");
          }}
          onCancelCommentCreate={() => setPendingCommentAnchor(null)}
          onCloseCommentThread={() => comments.setActiveThreadId(null)}
          onReplyCommentThread={comments.addMessage}
          onToggleCommentThreadResolved={comments.setThreadStatus}
          canDeleteActiveCommentThread={
            !!comments.activeThread &&
            (myRole === "owner" || comments.activeThread.createdBy === currentUserId)
          }
          onDeleteCommentThread={comments.deleteThread}
          aiMode={ai.mode}
          onCreateGenerationAt={(x, y) => {
            ai.beginAt(x, y);
            dock.setActiveTool("select");
          }}
          pendingGenerationAnchor={ai.pendingAnchor}
          pendingGenerationMode={ai.pendingMode}
          generationDraft={ai.draft}
          generationBusy={ai.busy}
          generationError={ai.error}
          onSubmitGenerationPrompt={async (mode, x, y, prompt) => {
            await ai.submitPrompt(mode, { x, y }, prompt);
          }}
          onCancelGenerationPrompt={ai.cancelPrompt}
          onStopGeneration={ai.stopDraft}
          onAcceptGeneration={() => ai.rejectDraft()}
          onRejectGeneration={ai.rejectDraft}
        />
      ) : null}
      {commentsPanelOpen ? (
        <BoardCommentsPanel
          threads={comments.threads}
          loading={comments.loading}
          error={comments.error}
          onPickThread={(id) => {
            const thread = comments.threads.find((it) => it.id === id);
            if (thread) {
              canvasRef.current?.focusOnPoint(thread.anchorX, thread.anchorY);
            }
            comments.setActiveThreadId(id);
            setPendingCommentAnchor(null);
            setCommentsPanelOpen(false);
          }}
          onClose={() => setCommentsPanelOpen(false)}
        />
      ) : null}
      <BoardToolDock
        canvasRef={canvasRef}
        disabled={!!error || loading || readOnly}
        zoomPercent={zoomPercent}
        dock={dock}
        aiMode={ai.mode}
        onSelectAiMode={(mode) => {
          ai.setAiMode(mode);
        }}
      />
    </div>
  );
}
