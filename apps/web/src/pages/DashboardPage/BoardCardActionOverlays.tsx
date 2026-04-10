import type { BoardSummary } from "../../shared/api/boardsApi";
import styles from "./DashboardPage.module.css";

type TranslateFn = (key: string, options?: Record<string, unknown>) => string;

type Props = {
  t: TranslateFn;
  menuState: { boardId: string; x: number; y: number } | null;
  menuBoard: BoardSummary | null;
  processingBoardId: string | null;
  deleteTarget: BoardSummary | null;
  sectionPickerBoard: BoardSummary | null;
  sectionChoices: Array<{ id: string; name: string; containsBoard: boolean }>;
  sectionUpdatingId: string | null;
  includeRemoveFromCurrentSection?: boolean;
  onCloseMenu: () => void;
  onToggleStar: (boardId: string) => void;
  onOpenSectionPicker: (board: BoardSummary) => void;
  onStartRename: (board: BoardSummary) => void;
  onRequestDelete: (board: BoardSummary) => void;
  onConfirmDelete: () => void;
  onCancelDelete: () => void;
  onCloseSectionPicker: () => void;
  onToggleSection: (sectionId: string, nextIncluded: boolean) => void;
  onRemoveFromCurrentSection?: (boardId: string) => void;
};

export function BoardCardActionOverlays({
  t,
  menuState,
  menuBoard,
  processingBoardId,
  deleteTarget,
  sectionPickerBoard,
  sectionChoices,
  sectionUpdatingId,
  includeRemoveFromCurrentSection = false,
  onCloseMenu,
  onToggleStar,
  onOpenSectionPicker,
  onStartRename,
  onRequestDelete,
  onConfirmDelete,
  onCancelDelete,
  onCloseSectionPicker,
  onToggleSection,
  onRemoveFromCurrentSection,
}: Props) {
  return (
    <>
      {menuState && menuBoard ? (
        <div
          className={styles.contextMenu}
          style={{ top: menuState.y, left: menuState.x }}
          role="menu"
        >
          {includeRemoveFromCurrentSection ? (
            <button
              type="button"
              className={styles.contextMenuItem}
              onClick={() => onRemoveFromCurrentSection?.(menuBoard.id)}
              disabled={processingBoardId === menuBoard.id}
            >
              {t("dashboard.removeFromCurrentSection")}
            </button>
          ) : null}
          <button
            type="button"
            className={styles.contextMenuItem}
            onClick={() => {
              onToggleStar(menuBoard.id);
              onCloseMenu();
            }}
          >
            {menuBoard.isStarred
              ? t("dashboard.removeFromStarred")
              : t("dashboard.addToStarred")}
          </button>
          <button
            type="button"
            className={styles.contextMenuItem}
            onClick={() => void onOpenSectionPicker(menuBoard)}
          >
            {t("dashboard.addToSection")}
          </button>
          {menuBoard.myRole === "owner" ? (
            <button
              type="button"
              className={styles.contextMenuItem}
              onClick={() => onStartRename(menuBoard)}
            >
              {t("dashboard.renameBoard")}
            </button>
          ) : null}
          <button
            type="button"
            className={`${styles.contextMenuItem} ${styles.contextMenuDanger}`}
            onClick={() => {
              onRequestDelete(menuBoard);
              onCloseMenu();
            }}
          >
            {menuBoard.myRole === "owner"
              ? t("dashboard.deleteBoard")
              : t("dashboard.leaveBoard")}
          </button>
        </div>
      ) : null}

      {deleteTarget ? (
        <div className={styles.modalOverlay} role="presentation">
          <div className={styles.modalCard} role="dialog" aria-modal>
            <p className={styles.modalTitle}>
              {deleteTarget.myRole === "owner"
                ? t("dashboard.deleteBoardTitle")
                : t("dashboard.leaveBoardTitle")}
            </p>
            <p className={styles.modalText}>
              {deleteTarget.myRole === "owner"
                ? t("dashboard.deleteBoardText", { title: deleteTarget.title })
                : t("dashboard.leaveBoardText", { title: deleteTarget.title })}
            </p>
            <div className={styles.modalActions}>
              <button
                type="button"
                className={styles.modalSecondary}
                onClick={onCancelDelete}
                disabled={processingBoardId === deleteTarget.id}
              >
                {t("dashboard.cancelAction")}
              </button>
              <button
                type="button"
                className={styles.modalDanger}
                onClick={onConfirmDelete}
                disabled={processingBoardId === deleteTarget.id}
              >
                {processingBoardId === deleteTarget.id
                  ? deleteTarget.myRole === "owner"
                    ? t("dashboard.deletingBoard")
                    : t("dashboard.leavingBoard")
                  : deleteTarget.myRole === "owner"
                    ? t("dashboard.confirmDeleteBoard")
                    : t("dashboard.confirmLeaveBoard")}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {sectionPickerBoard ? (
        <div className={styles.modalOverlay} role="presentation">
          <div className={styles.modalCard} role="dialog" aria-modal>
            <p className={styles.modalTitle}>{t("dashboard.addToSectionTitle")}</p>
            <p className={styles.modalText}>
              {t("dashboard.addToSectionText", { title: sectionPickerBoard.title })}
            </p>
            <div className={styles.sections} style={{ marginTop: "0.5rem" }}>
              {sectionChoices.map((section) => (
                <label key={section.id} className={styles.sectionLink}>
                  <input
                    type="checkbox"
                    checked={section.containsBoard}
                    disabled={sectionUpdatingId === section.id}
                    onChange={(e) =>
                      onToggleSection(section.id, e.currentTarget.checked)
                    }
                    style={{ marginRight: "0.5rem" }}
                  />
                  {section.name}
                </label>
              ))}
            </div>
            <div className={styles.modalActions}>
              <button
                type="button"
                className={styles.modalSecondary}
                onClick={onCloseSectionPicker}
                disabled={sectionUpdatingId !== null}
              >
                {t("dashboard.closeAction")}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
