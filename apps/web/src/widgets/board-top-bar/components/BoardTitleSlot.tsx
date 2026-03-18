import type { RefObject } from "react";
import { useTranslation } from "react-i18next";

import styles from "../BoardTopBar.module.css";

type BoardTitleSlotProps = {
  canRename?: boolean;
  loading: boolean;
  error: string | null;
  title: string | null;
  renamingBoard: boolean;
  renameDraft: string;
  renameBusy: boolean;
  renameInputRef: RefObject<HTMLInputElement | null>;
  onRenameDraftChange: (value: string) => void;
  beginRename: () => void;
  cancelRename: () => void;
  commitRename: () => Promise<void>;
};

export function BoardTitleSlot({
  canRename = true,
  loading,
  error,
  title,
  renamingBoard,
  renameDraft,
  renameBusy,
  renameInputRef,
  onRenameDraftChange,
  beginRename,
  cancelRename,
  commitRename,
}: BoardTitleSlotProps) {
  const { t } = useTranslation();

  if (loading) {
    return (
      <span className={styles.boardTitleMuted}>{t("board.loadingMeta")}</span>
    );
  }
  if (error) {
    return <span className={styles.boardTitleError}>{error}</span>;
  }
  if (renamingBoard) {
    return (
      <input
        ref={renameInputRef}
        className={styles.boardRenameInput}
        value={renameDraft}
        disabled={renameBusy}
        aria-label={t("board.renameBoardAria")}
        onChange={(e) => onRenameDraftChange(e.target.value)}
        onBlur={() => void commitRename()}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            void commitRename();
          } else if (e.key === "Escape") {
            e.preventDefault();
            cancelRename();
          }
        }}
      />
    );
  }
  if (!canRename) {
    return <span className={styles.boardTitleStatic}>{title}</span>;
  }
  return (
    <button
      type="button"
      className={styles.boardTitleButton}
      onClick={beginRename}
      title={t("board.clickToRename")}
    >
      {title}
    </button>
  );
}
