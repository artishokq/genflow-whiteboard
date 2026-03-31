import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useOutletContext } from "react-router-dom";

import {
  createBoardRequest,
  listBoardsRequest,
  type BoardTemplateId,
  type BoardSummary,
} from "../../shared/api/boardsApi";
import { getApiErrorMessage } from "../../shared/api/getApiErrorMessage";
import { BoardCardActionOverlays } from "./BoardCardActionOverlays";
import { DashboardBoardPreview } from "./DashboardBoardPreview";
import type { DashboardOutletContext } from "./DashboardLayout";
import { useBoardCardActions } from "./useBoardCardActions";
import styles from "./DashboardPage.module.css";

function formatBoardUpdatedAt(
  value: string,
  locale: string,
  t: (key: string, options?: Record<string, unknown>) => string,
) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return t("dashboard.editedUnknown");
  }

  const now = Date.now();
  const diffMs = now - date.getTime();
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diffMs < minute) {
    return t("dashboard.editedJustNow");
  }

  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  if (diffMs < hour) {
    return t("dashboard.editedAgo", {
      value: rtf.format(-Math.round(diffMs / minute), "minute"),
    });
  }
  if (diffMs < day) {
    return t("dashboard.editedAgo", {
      value: rtf.format(-Math.round(diffMs / hour), "hour"),
    });
  }
  if (diffMs < day * 7) {
    return t("dashboard.editedAgo", {
      value: rtf.format(-Math.round(diffMs / day), "day"),
    });
  }

  return t("dashboard.editedOnDate", {
    date: new Intl.DateTimeFormat(locale, {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(date),
  });
}

function boardRoleLabelKey(role: BoardSummary["myRole"]) {
  if (role === "owner") return "dashboard.roleOwner";
  if (role === "editor") return "dashboard.roleEditor";
  return "dashboard.roleViewer";
}

export function DashboardPersonalPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { searchQuery, reloadSections } = useOutletContext<DashboardOutletContext>();
  const [boards, setBoards] = useState<BoardSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [hoveredBoardId, setHoveredBoardId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadBoards = useCallback(async () => {
    setError(null);
    try {
      const { boards: list } = await listBoardsRequest();
      setBoards(list);
    } catch (e) {
      setError(getApiErrorMessage(e, t("errors.generic"), t));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void loadBoards();
  }, [loadBoards]);

  const handleCreateBoard = async (templateId: BoardTemplateId) => {
    setCreating(true);
    setError(null);
    try {
      const { board } = await createBoardRequest({ templateId });
      navigate(`/board/${board.id}`);
    } catch (e) {
      setError(getApiErrorMessage(e, t("errors.generic"), t));
    } finally {
      setCreating(false);
    }
  };

  const openBoard = (id: string) => {
    navigate(`/board/${id}`);
  };

  const actions = useBoardCardActions({
    boards,
    setBoards,
    t,
    reloadSections,
    setError,
  });
  const normalizedSearch = searchQuery.trim().toLocaleLowerCase();
  const filteredBoards = useMemo(() => {
    if (!normalizedSearch) {
      return boards;
    }
    return boards.filter((b) => b.title.toLocaleLowerCase().includes(normalizedSearch));
  }, [boards, normalizedSearch]);

  const templates: Array<{
    id: BoardTemplateId;
    icon: string;
    titleKey: string;
    hintKey: string;
  }> = [
    {
      id: "blank",
      icon: "+",
      titleKey: "dashboard.templateBlankTitle",
      hintKey: "dashboard.templateBlankHint",
    },
    {
      id: "flowchart",
      icon: "F",
      titleKey: "dashboard.templateFlowchartTitle",
      hintKey: "dashboard.templateFlowchartHint",
    },
    {
      id: "mindmap",
      icon: "M",
      titleKey: "dashboard.templateMindmapTitle",
      hintKey: "dashboard.templateMindmapHint",
    },
    {
      id: "retrospective",
      icon: "R",
      titleKey: "dashboard.templateRetroTitle",
      hintKey: "dashboard.templateRetroHint",
    },
  ];

  return (
    <>
      {error ? <p className={styles.feedbackError}>{error}</p> : null}
      {loading ? (
        <p className={styles.feedbackMuted}>{t("dashboard.loadingBoards")}</p>
      ) : null}

      <section className={styles.dashboardSection}>
        <div className={styles.sectionHeaderRow}>
          <h2 className={styles.sectionTitle}>{t("dashboard.templatesTitle")}</h2>
        </div>
        <div className={styles.templatesBlock}>
          {templates.map((template) => (
            <button
              key={template.id}
              type="button"
              className={`${styles.templateCard} ${styles.templateInteractive}`}
              onClick={() => void handleCreateBoard(template.id)}
              disabled={creating || loading}
            >
              <div className={styles.templatePreview}>
                <span className={styles.templatePlus} aria-hidden>
                  {creating ? "…" : template.icon}
                </span>
              </div>
              <p className={styles.templateTitle}>{t(template.titleKey)}</p>
              <p className={styles.templateHint}>{t(template.hintKey)}</p>
            </button>
          ))}
        </div>
      </section>

      <section className={styles.dashboardSection}>
        <div className={styles.sectionHeaderRow}>
          <h2 className={styles.sectionTitle}>{t("dashboard.userBoardsTitle")}</h2>
        </div>
        <div className={styles.userBoardsGrid}>
          {filteredBoards.map((b) => (
            <article
              key={b.id}
              className={`${styles.userBoardCard} ${styles.templateInteractive}`}
              onMouseEnter={() => setHoveredBoardId(b.id)}
              onMouseLeave={() => setHoveredBoardId((prev) => (prev === b.id ? null : prev))}
              onContextMenu={(e) => {
                e.preventDefault();
                actions.setMenuState({ boardId: b.id, x: e.clientX, y: e.clientY });
              }}
              onClick={() => {
                if (actions.renamingBoardId === b.id) return;
                openBoard(b.id);
              }}
              onKeyDown={(e) => {
                if (actions.renamingBoardId === b.id) return;
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  openBoard(b.id);
                }
              }}
              tabIndex={0}
              role="button"
            >
              <button
                type="button"
                className={`${styles.boardStarButton} ${
                  b.isStarred ? styles.boardStarButtonActive : ""
                } ${hoveredBoardId === b.id || b.isStarred ? styles.boardStarVisible : ""}`}
                onClick={(e) => {
                  e.stopPropagation();
                  actions.handleToggleStar(b.id);
                }}
                aria-label={
                  b.isStarred
                    ? t("dashboard.removeFromStarred")
                    : t("dashboard.addToStarred")
                }
              >
                ★
              </button>
              <div className={styles.userBoardPreview} aria-hidden>
                <DashboardBoardPreview boardId={b.id} updatedAt={b.updatedAt} />
              </div>
              <div className={styles.userBoardMeta}>
                {actions.renamingBoardId === b.id ? (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      void actions.handleRenameSubmit(b.id);
                    }}
                  >
                    <input
                      autoFocus
                      className={styles.renameInput}
                      value={actions.renameValue}
                      onChange={(e) => actions.setRenameValue(e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      onBlur={() => {
                        void actions.handleRenameSubmit(b.id);
                      }}
                      disabled={actions.processingBoardId === b.id}
                      maxLength={200}
                    />
                  </form>
                ) : (
                  <div className={styles.userBoardTitleRow}>
                    <p className={styles.userBoardTitle}>{b.title}</p>
                    <span className={styles.boardRoleBadge}>
                      {t(boardRoleLabelKey(b.myRole))}
                    </span>
                  </div>
                )}
                <p className={styles.userBoardEdited}>
                  {formatBoardUpdatedAt(
                    b.updatedAt,
                    i18n.resolvedLanguage?.startsWith("ru") ? "ru" : "en",
                    t,
                  )}
                </p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <BoardCardActionOverlays
        t={t}
        menuState={actions.menuState}
        menuBoard={actions.menuBoard}
        processingBoardId={actions.processingBoardId}
        deleteTarget={actions.deleteTarget}
        sectionPickerBoard={actions.sectionPickerBoard}
        sectionChoices={actions.sectionChoices}
        sectionUpdatingId={actions.sectionUpdatingId}
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
      />

      {!loading && filteredBoards.length === 0 ? (
        <p className={styles.emptyHint}>
          {normalizedSearch ? t("dashboard.emptySearch") : t("dashboard.emptyState")}
        </p>
      ) : null}
    </>
  );
}
