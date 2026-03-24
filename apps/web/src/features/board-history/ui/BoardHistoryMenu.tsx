import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import type { BoardHistoryEntry } from "../model/historyOrigins";
import styles from "./BoardHistoryMenu.module.css";

const HISTORY_ICON = "/assets/actions/history_icon.svg";

type BoardHistoryMenuProps = {
  entries: BoardHistoryEntry[];
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  buttonClassName: string;
  iconClassName: string;
};

export function BoardHistoryMenu({
  entries,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  buttonClassName,
  iconClassName,
}: BoardHistoryMenuProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown, true);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown, true);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div className={styles.wrap} ref={rootRef}>
      <button
        type="button"
        className={buttonClassName}
        aria-label={t("board.history")}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
      >
        <img src={HISTORY_ICON} alt="" className={iconClassName} />
      </button>
      {open ? (
        <div className={styles.popover} role="dialog" aria-label={t("board.historyTitle")}>
          <p className={styles.header}>{t("board.historyTitle")}</p>
          <div className={styles.actions}>
            <button type="button" className={styles.actionBtn} onClick={onUndo} disabled={!canUndo}>
              {t("board.undo")}
            </button>
            <button type="button" className={styles.actionBtn} onClick={onRedo} disabled={!canRedo}>
              {t("board.redo")}
            </button>
          </div>
          {entries.length === 0 ? (
            <p className={styles.empty}>{t("board.historyEmpty")}</p>
          ) : (
            <ul className={styles.list}>
              {entries.map((item) => (
                <li key={item.id} className={styles.item}>
                  <span className={styles.label}>{t(item.labelKey, item.labelValues)}</span>
                  <span className={styles.meta}>
                    {item.actor} - {new Date(item.at).toLocaleTimeString()}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}
