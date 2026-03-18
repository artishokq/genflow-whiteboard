import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { HeaderUserMenu } from "../Header/HeaderUserMenu";

import styles from "./BoardTopBar.module.css";

type BoardTopBarProps = {
  titleSlot: React.ReactNode;
  exportSlot?: (classNames: { buttonClassName: string; iconClassName: string }) => React.ReactNode;
  settingsSlot?: (classNames: { buttonClassName: string; iconClassName: string }) => React.ReactNode;
  historySlot?: (classNames: { buttonClassName: string; iconClassName: string }) => React.ReactNode;
  commentsSlot?: (classNames: { buttonClassName: string; iconClassName: string }) => React.ReactNode;
  shareSlot?: (classNames: { buttonClassName: string; iconClassName: string }) => React.ReactNode;
};

export function BoardTopBar({
  titleSlot,
  exportSlot,
  settingsSlot,
  historySlot,
  commentsSlot,
  shareSlot,
}: BoardTopBarProps) {
  const { t } = useTranslation();

  return (
    <div className={styles.floatingTopBar} aria-label={t("board.topBarAria")}>
      <div className={styles.floatingPill}>
        <Link to="/dashboard" className={styles.appNameLink}>
          {t("appName")}
        </Link>
        <span className={styles.pillDivider} aria-hidden />
        <div className={styles.boardTitleSlot}>{titleSlot}</div>
        {exportSlot?.({
          buttonClassName: styles.iconAction,
          iconClassName: styles.pillIcon,
        })}
      </div>
      <div className={styles.floatingPill}>
        {settingsSlot?.({
          buttonClassName: styles.iconAction,
          iconClassName: styles.pillIcon,
        })}
        {historySlot?.({
          buttonClassName: styles.iconAction,
          iconClassName: styles.pillIcon,
        })}
        {commentsSlot?.({
          buttonClassName: styles.iconAction,
          iconClassName: styles.pillIcon,
        })}
        {shareSlot?.({
          buttonClassName: styles.iconAction,
          iconClassName: styles.pillIcon,
        })}
        <HeaderUserMenu
          userButtonClassName={styles.boardUserButton}
          wrapClassName={styles.boardUserWrap}
        />
      </div>
    </div>
  );
}
