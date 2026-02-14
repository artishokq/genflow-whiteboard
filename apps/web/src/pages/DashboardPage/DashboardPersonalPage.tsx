import { useTranslation } from "react-i18next";

import styles from "./DashboardPage.module.css";

export function DashboardPersonalPage() {
  const { t } = useTranslation();

  return (
    <>
      <div className={styles.templatesBlock}>
        <div className={styles.templateCard}>
          <div className={styles.templatePreview}>+</div>
          <p className={styles.templateTitle}>{t("dashboard.emptyTemplate")}</p>
        </div>
        <div className={styles.templateGhost} />
        <div className={styles.templateGhost} />
        <div className={styles.templateGhost} />
        <div className={styles.templateGhost} />
      </div>

      <p className={styles.emptyHint}>{t("dashboard.emptyState")}</p>
    </>
  );
}
