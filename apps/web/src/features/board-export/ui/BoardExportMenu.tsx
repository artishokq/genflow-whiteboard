import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

const EXPORT_ICON = "/assets/actions/export_icon.svg";
const IMAGE_DOWNLOAD_ICON = "/assets/actions/image_download_icon.svg";
const JSON_ICON = "/assets/actions/json_icon.svg";

import styles from "./BoardExportMenu.module.css";

type BoardExportMenuProps = {
  buttonClassName: string;
  iconClassName: string;
  onExportPngViewport: (pixelRatio: number) => void;
  onExportPngFull: (pixelRatio: number) => void;
  onExportJson: () => void;
};

export function BoardExportMenu({
  buttonClassName,
  iconClassName,
  onExportPngViewport,
  onExportPngFull,
  onExportJson,
}: BoardExportMenuProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [scale, setScale] = useState<1 | 2 | 3>(2);
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
        aria-label={t("board.export")}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
      >
        <img src={EXPORT_ICON} alt="" className={iconClassName} />
      </button>
      {open ? (
        <div className={styles.popover} role="dialog" aria-label={t("board.exportTitle")}>
          <p className={styles.title}>{t("board.exportTitle")}</p>
          <div className={styles.scaleRow}>
            <span className={styles.scaleLabel}>{t("board.exportScale")}</span>
            <div className={styles.scaleButtons}>
              {[1, 2, 3].map((value) => (
                <button
                  key={value}
                  type="button"
                  className={`${styles.scaleBtn} ${scale === value ? styles.scaleBtnActive : ""}`}
                  onClick={() => setScale(value as 1 | 2 | 3)}
                >
                  {value}x
                </button>
              ))}
            </div>
          </div>
          <button
            type="button"
            className={styles.btn}
            onClick={() => {
              onExportPngViewport(scale);
              setOpen(false);
            }}
          >
            <span className={styles.btnInner}>
              <img src={IMAGE_DOWNLOAD_ICON} alt="" className={styles.itemIcon} />
              {t("board.exportPngViewport")}
            </span>
          </button>
          <button
            type="button"
            className={styles.btn}
            onClick={() => {
              onExportPngFull(scale);
              setOpen(false);
            }}
          >
            <span className={styles.btnInner}>
              <img src={IMAGE_DOWNLOAD_ICON} alt="" className={styles.itemIcon} />
              {t("board.exportPngFull")}
            </span>
          </button>
          <button
            type="button"
            className={styles.btn}
            onClick={() => {
              onExportJson();
              setOpen(false);
            }}
          >
            <span className={styles.btnInner}>
              <img src={JSON_ICON} alt="" className={styles.itemIcon} />
              {t("board.exportJsonBackup")}
            </span>
          </button>
        </div>
      ) : null}
    </div>
  );
}
