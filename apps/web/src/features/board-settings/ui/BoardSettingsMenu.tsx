import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import type { BoardViewSettings } from "../../../entities/board";
import styles from "./BoardSettingsMenu.module.css";

const BOARD_ICON = "/assets/tools/board_icon.svg";

type BoardSettingsMenuProps = {
  settings: BoardViewSettings;
  onShowGridChange: (next: boolean) => void;
  onBoardColorChange: (next: string) => void;
  buttonClassName: string;
  iconClassName: string;
};

export function BoardSettingsMenu({
  settings,
  onShowGridChange,
  onBoardColorChange,
  buttonClassName,
  iconClassName,
}: BoardSettingsMenuProps) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const onPointerDown = (event: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.addEventListener("pointerdown", onPointerDown, true);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown, true);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [isOpen]);

  return (
    <div className={styles.wrap} ref={rootRef}>
      <button
        type="button"
        className={buttonClassName}
        aria-label={t("board.settingsButton")}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((prev) => !prev)}
      >
        <img src={BOARD_ICON} alt="" className={iconClassName} />
      </button>
      {isOpen ? (
        <div className={styles.popover} role="dialog" aria-label={t("board.settingsTitle")}>
          <p className={styles.title}>{t("board.settingsTitle")}</p>
          <div className={styles.block}>
            <label className={styles.row}>
              <span className={styles.label}>{t("board.settingsGridLabel")}</span>
              <input
                type="checkbox"
                className={styles.checkbox}
                checked={settings.showGrid}
                onChange={(event) => onShowGridChange(event.target.checked)}
              />
            </label>
          </div>
          <div className={styles.block}>
            <span className={styles.label}>{t("board.settingsColorLabel")}</span>
            <div className={styles.colorControls}>
              <input
                type="color"
                className={styles.colorPicker}
                value={settings.boardColor}
                onChange={(event) => onBoardColorChange(event.target.value)}
                aria-label={t("board.settingsColorLabel")}
              />
              <span className={styles.colorText}>{settings.boardColor}</span>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
