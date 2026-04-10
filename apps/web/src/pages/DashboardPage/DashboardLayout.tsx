import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { NavLink, Outlet } from "react-router-dom";

import {
  createBoardSectionRequest,
  deleteBoardSectionRequest,
  listBoardSectionsRequest,
  renameBoardSectionRequest,
  reorderBoardSectionsRequest,
  type BoardSectionSummary,
} from "../../shared/api/boardsApi";
import { getApiErrorMessage } from "../../shared/api/getApiErrorMessage";
import { Header } from "../../widgets/Header/Header";
import styles from "./DashboardPage.module.css";

function navLinkClassName({ isActive }: { isActive: boolean }) {
  return `${styles.sectionLink} ${isActive ? styles.sectionLinkActive : ""}`.trim();
}

export type DashboardOutletContext = {
  searchQuery: string;
  sections: BoardSectionSummary[];
  reloadSections: () => Promise<void>;
};

function DashboardLayout() {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState("");
  const [sections, setSections] = useState<BoardSectionSummary[]>([]);
  const [sectionModalOpen, setSectionModalOpen] = useState(false);
  const [renameModalOpen, setRenameModalOpen] = useState(false);
  const [renameSectionId, setRenameSectionId] = useState<string | null>(null);
  const [sectionName, setSectionName] = useState("");
  const [processingSection, setProcessingSection] = useState(false);
  const [dragSectionId, setDragSectionId] = useState<string | null>(null);
  const [sectionMenu, setSectionMenu] = useState<{
    sectionId: string;
    x: number;
    y: number;
  } | null>(null);
  const [sectionsError, setSectionsError] = useState<string | null>(null);

  const loadSections = useCallback(async () => {
    const { sections: list } = await listBoardSectionsRequest();
    setSections(list);
  }, []);

  useEffect(() => {
    void loadSections().catch(() => {
      setSectionsError(t("errors.generic"));
    });
  }, [loadSections, t]);

  useEffect(() => {
    if (!sectionMenu) return;
    const closeMenu = () => setSectionMenu(null);
    window.addEventListener("click", closeMenu);
    window.addEventListener("scroll", closeMenu, true);
    return () => {
      window.removeEventListener("click", closeMenu);
      window.removeEventListener("scroll", closeMenu, true);
    };
  }, [sectionMenu]);

  const handleCreateSection = async () => {
    const trimmed = sectionName.trim();
    if (!trimmed) {
      return;
    }
    setProcessingSection(true);
    setSectionsError(null);
    try {
      await createBoardSectionRequest(trimmed);
      await loadSections();
      setSectionName("");
      setSectionModalOpen(false);
    } catch (e) {
      setSectionsError(getApiErrorMessage(e, t("errors.generic"), t));
    } finally {
      setProcessingSection(false);
    }
  };

  const handleRenameSection = async () => {
    if (!renameSectionId) {
      return;
    }
    const trimmed = sectionName.trim();
    if (!trimmed) {
      return;
    }
    setProcessingSection(true);
    setSectionsError(null);
    try {
      await renameBoardSectionRequest(renameSectionId, trimmed);
      await loadSections();
      setRenameModalOpen(false);
      setRenameSectionId(null);
      setSectionName("");
    } catch (e) {
      setSectionsError(getApiErrorMessage(e, t("errors.generic"), t));
    } finally {
      setProcessingSection(false);
    }
  };

  const handleDeleteSection = async (sectionId: string) => {
    setProcessingSection(true);
    setSectionsError(null);
    try {
      await deleteBoardSectionRequest(sectionId);
      await loadSections();
    } catch (e) {
      setSectionsError(getApiErrorMessage(e, t("errors.generic"), t));
    } finally {
      setProcessingSection(false);
    }
  };

  const reorderSections = async (sourceId: string, targetId: string) => {
    if (sourceId === targetId) return;
    const sourceIndex = sections.findIndex((s) => s.id === sourceId);
    const targetIndex = sections.findIndex((s) => s.id === targetId);
    if (sourceIndex < 0 || targetIndex < 0) return;

    const reordered = [...sections];
    const [moved] = reordered.splice(sourceIndex, 1);
    if (!moved) return;
    reordered.splice(targetIndex, 0, moved);
    setSections(reordered);
    try {
      await reorderBoardSectionsRequest(reordered.map((s) => s.id));
    } catch (e) {
      await loadSections();
      setSectionsError(getApiErrorMessage(e, t("errors.generic"), t));
    }
  };

  return (
    <div className={styles.page}>
      <Header userOnly />
      <main className={styles.main}>
        <aside className={styles.sidebar}>
          <input
            type="search"
            className={styles.search}
            placeholder={t("dashboard.searchPlaceholder")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />

          <nav className={styles.sections} aria-label={t("dashboard.sectionsAriaLabel")}>
            <NavLink to="/dashboard/personal" className={navLinkClassName} end>
              <img
                src="/assets/tools/personal_icon.svg"
                alt=""
                className={styles.sectionLinkIcon}
                aria-hidden
              />
              <span className={styles.sectionLinkText}>{t("dashboard.personal")}</span>
            </NavLink>
            <NavLink to="/dashboard/recent" className={navLinkClassName}>
              <img
                src="/assets/tools/recent_icon.svg"
                alt=""
                className={styles.sectionLinkIcon}
                aria-hidden
              />
              <span className={styles.sectionLinkText}>{t("dashboard.recent")}</span>
            </NavLink>
            <NavLink to="/dashboard/starred" className={navLinkClassName}>
              <img
                src="/assets/tools/stared_icon.svg"
                alt=""
                className={styles.sectionLinkIcon}
                aria-hidden
              />
              <span className={styles.sectionLinkText}>{t("dashboard.starred")}</span>
            </NavLink>
            {sections.map((section) => (
              <div
                key={section.id}
                className={styles.sectionRow}
                draggable
                onDragStart={() => setDragSectionId(section.id)}
                onDragOver={(e) => {
                  e.preventDefault();
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  if (!dragSectionId) return;
                  void reorderSections(dragSectionId, section.id);
                  setDragSectionId(null);
                }}
                onDragEnd={() => setDragSectionId(null)}
              >
                <NavLink to={`/dashboard/section/${section.id}`} className={navLinkClassName}>
                  <span className={styles.sectionLinkText}>{section.name}</span>
                </NavLink>
                <button
                  type="button"
                  className={styles.sectionRowMenu}
                  onClick={(e) => {
                    e.stopPropagation();
                    const rect = e.currentTarget.getBoundingClientRect();
                    setSectionMenu({ sectionId: section.id, x: rect.left, y: rect.bottom + 4 });
                  }}
                  aria-label={t("dashboard.sectionActions")}
                >
                  ⋯
                </button>
              </div>
            ))}
          </nav>

          <button
            type="button"
            className={styles.addSectionButton}
            aria-label={t("dashboard.newSection")}
            onClick={() => setSectionModalOpen(true)}
          >
            <span className={styles.addSectionIcon}>+</span>
          </button>
          {sectionsError ? <p className={styles.feedbackError}>{sectionsError}</p> : null}
        </aside>

        <section className={styles.content}>
          <Outlet
            context={{ searchQuery, sections, reloadSections: loadSections } satisfies DashboardOutletContext}
          />
        </section>
      </main>
      {sectionModalOpen ? (
        <div className={styles.modalOverlay} role="presentation">
          <div className={styles.modalCard} role="dialog" aria-modal>
            <p className={styles.modalTitle}>{t("dashboard.newSectionTitle")}</p>
            <input
              autoFocus
              className={styles.renameInput}
              value={sectionName}
              onChange={(e) => setSectionName(e.target.value)}
              placeholder={t("dashboard.newSectionPlaceholder")}
              maxLength={64}
            />
            <div className={styles.modalActions}>
              <button
                type="button"
                className={styles.modalSecondary}
                onClick={() => {
                  if (processingSection) return;
                  setSectionModalOpen(false);
                  setSectionName("");
                }}
                disabled={processingSection}
              >
                {t("dashboard.cancelAction")}
              </button>
              <button
                type="button"
                className={styles.modalDanger}
                onClick={() => void handleCreateSection()}
                disabled={processingSection || !sectionName.trim()}
              >
                {processingSection ? t("dashboard.creatingSection") : t("dashboard.createSection")}
              </button>
            </div>
          </div>
        </div>
      ) : null}
      {renameModalOpen ? (
        <div className={styles.modalOverlay} role="presentation">
          <div className={styles.modalCard} role="dialog" aria-modal>
            <p className={styles.modalTitle}>{t("dashboard.renameSectionTitle")}</p>
            <input
              autoFocus
              className={styles.renameInput}
              value={sectionName}
              onChange={(e) => setSectionName(e.target.value)}
              placeholder={t("dashboard.newSectionPlaceholder")}
              maxLength={64}
            />
            <div className={styles.modalActions}>
              <button
                type="button"
                className={styles.modalSecondary}
                onClick={() => {
                  if (processingSection) return;
                  setRenameModalOpen(false);
                  setRenameSectionId(null);
                  setSectionName("");
                }}
                disabled={processingSection}
              >
                {t("dashboard.cancelAction")}
              </button>
              <button
                type="button"
                className={styles.modalDanger}
                onClick={() => void handleRenameSection()}
                disabled={processingSection || !sectionName.trim()}
              >
                {processingSection ? t("dashboard.renamingSection") : t("dashboard.renameSection")}
              </button>
            </div>
          </div>
        </div>
      ) : null}
      {sectionMenu ? (
        <div
          className={styles.contextMenu}
          style={{ top: sectionMenu.y, left: sectionMenu.x }}
          role="menu"
        >
          <button
            type="button"
            className={styles.contextMenuItem}
            onClick={() => {
              const target = sections.find((s) => s.id === sectionMenu.sectionId);
              if (!target) return;
              setRenameSectionId(target.id);
              setSectionName(target.name);
              setRenameModalOpen(true);
              setSectionMenu(null);
            }}
          >
            {t("dashboard.renameSection")}
          </button>
          <button
            type="button"
            className={`${styles.contextMenuItem} ${styles.contextMenuDanger}`}
            onClick={() => {
              void handleDeleteSection(sectionMenu.sectionId);
              setSectionMenu(null);
            }}
          >
            {t("dashboard.deleteSection")}
          </button>
        </div>
      ) : null}
    </div>
  );
}

export default DashboardLayout;
