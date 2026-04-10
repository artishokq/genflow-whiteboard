import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useOutletContext, useParams } from "react-router-dom";

import {
  listBoardsInSectionRequest,
  reorderBoardsInSectionRequest,
  type BoardSummary,
} from "../../shared/api/boardsApi";
import { getApiErrorMessage } from "../../shared/api/getApiErrorMessage";
import { BoardCardActionOverlays } from "./BoardCardActionOverlays";
import { DashboardBoardPreview } from "./DashboardBoardPreview";
import type { DashboardOutletContext } from "./DashboardLayout";
import { useBoardCardActions } from "./useBoardCardActions";
import styles from "./DashboardPage.module.css";

function boardRoleLabelKey(role: BoardSummary["myRole"]) {
  if (role === "owner") return "dashboard.roleOwner";
  if (role === "editor") return "dashboard.roleEditor";
  return "dashboard.roleViewer";
}

export function DashboardCustomSectionPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { sectionId } = useParams<{ sectionId: string }>();
  const { searchQuery, reloadSections } = useOutletContext<DashboardOutletContext>();
  const [boards, setBoards] = useState<BoardSummary[]>([]);
  const [sectionTitle, setSectionTitle] = useState("");
  const [dragBoardId, setDragBoardId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!sectionId) {
      setError(t("errors.generic"));
      setLoading(false);
      return;
    }
    let mounted = true;
    void (async () => {
      try {
        const { section, boards: list } = await listBoardsInSectionRequest(sectionId);
        if (!mounted) return;
        setSectionTitle(section.name);
        setBoards(list);
      } catch (e) {
        if (!mounted) return;
        setError(getApiErrorMessage(e, t("errors.generic"), t));
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    })();
    return () => {
      mounted = false;
    };
  }, [sectionId, t]);

  const normalizedSearch = searchQuery.trim().toLocaleLowerCase();
  const filteredBoards = useMemo(() => {
    if (!normalizedSearch) {
      return boards;
    }
    return boards.filter((b) => b.title.toLocaleLowerCase().includes(normalizedSearch));
  }, [boards, normalizedSearch]);

  const actions = useBoardCardActions({
    boards,
    setBoards,
    t,
    reloadSections,
    setError,
    currentSectionId: sectionId,
  });

  if (error) {
    return <p className={styles.feedbackError}>{error}</p>;
  }
  if (loading) {
    return <p className={styles.feedbackMuted}>{t("dashboard.loadingBoards")}</p>;
  }
  if (filteredBoards.length === 0) {
    return (
      <p className={styles.emptyHint}>
        {normalizedSearch ? t("dashboard.emptySearch") : t("dashboard.emptySection")}
      </p>
    );
  }

  return (
    <div>
      <h2 className={styles.sectionTitle}>{sectionTitle}</h2>
      <div className={styles.userBoardsGrid}>
      {filteredBoards.map((board) => (
        <article
          key={board.id}
          className={`${styles.userBoardCard} ${styles.templateInteractive}`}
          draggable
          onDragStart={() => setDragBoardId(board.id)}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            if (!dragBoardId || dragBoardId === board.id || !sectionId) {
              return;
            }
            const sourceIndex = boards.findIndex((b) => b.id === dragBoardId);
            const targetIndex = boards.findIndex((b) => b.id === board.id);
            if (sourceIndex < 0 || targetIndex < 0) {
              return;
            }
            const reordered = [...boards];
            const [moved] = reordered.splice(sourceIndex, 1);
            if (!moved) return;
            reordered.splice(targetIndex, 0, moved);
            setBoards(reordered);
            void reorderBoardsInSectionRequest(
              sectionId,
              reordered.map((item) => item.id),
            ).catch((err) => {
              setError(getApiErrorMessage(err, t("errors.generic"), t));
            });
            setDragBoardId(null);
          }}
          onDragEnd={() => setDragBoardId(null)}
          onContextMenu={(e) => {
            e.preventDefault();
            actions.setMenuState({ boardId: board.id, x: e.clientX, y: e.clientY });
          }}
          onClick={() => {
            if (actions.renamingBoardId === board.id) return;
            navigate(`/board/${board.id}`);
          }}
          onKeyDown={(e) => {
            if (actions.renamingBoardId === board.id) return;
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              navigate(`/board/${board.id}`);
            }
          }}
          tabIndex={0}
          role="button"
        >
          <div className={styles.userBoardPreview} aria-hidden>
            <DashboardBoardPreview boardId={board.id} updatedAt={board.updatedAt} />
          </div>
          <div className={styles.userBoardMeta}>
            <div className={styles.userBoardTitleRow}>
              {actions.renamingBoardId === board.id ? (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    void actions.handleRenameSubmit(board.id);
                  }}
                >
                  <input
                    autoFocus
                    className={styles.renameInput}
                    value={actions.renameValue}
                    onChange={(e) => actions.setRenameValue(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    onBlur={() => {
                      void actions.handleRenameSubmit(board.id);
                    }}
                    disabled={actions.processingBoardId === board.id}
                    maxLength={200}
                  />
                </form>
              ) : (
                <p className={styles.userBoardTitle}>{board.title}</p>
              )}
              <span className={styles.boardRoleBadge}>{t(boardRoleLabelKey(board.myRole))}</span>
            </div>
          </div>
        </article>
      ))}
      </div>
      <BoardCardActionOverlays
        t={t}
        menuState={actions.menuState}
        menuBoard={actions.menuBoard}
        processingBoardId={actions.processingBoardId}
        deleteTarget={actions.deleteTarget}
        sectionPickerBoard={actions.sectionPickerBoard}
        sectionChoices={actions.sectionChoices}
        sectionUpdatingId={actions.sectionUpdatingId}
        includeRemoveFromCurrentSection
        onCloseMenu={() => actions.setMenuState(null)}
        onToggleStar={actions.handleToggleStar}
        onOpenSectionPicker={actions.handleOpenSectionPicker}
        onStartRename={(board) => {
          actions.setRenamingBoardId(board.id);
          actions.setRenameValue(board.title);
          actions.setMenuState(null);
        }}
        onRequestDelete={actions.setDeleteTarget}
        onConfirmDelete={() => void actions.handleDeleteBoard()}
        onCancelDelete={() => actions.setDeleteTarget(null)}
        onCloseSectionPicker={() => actions.setSectionPickerBoard(null)}
        onToggleSection={(sectionId, nextIncluded) =>
          void actions.handleToggleBoardSection(sectionId, nextIncluded)
        }
        onRemoveFromCurrentSection={(boardId) =>
          void actions.handleRemoveFromCurrentSection(boardId)
        }
      />
    </div>
   );
}
