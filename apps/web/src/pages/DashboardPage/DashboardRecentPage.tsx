import { useTranslation } from "react-i18next";

import styles from "./DashboardPage.module.css";

export function DashboardRecentPage() {
  const { t } = useTranslation();

  return <p className={styles.emptyHint}>{t("dashboard.emptyRecent")}</p>;
}
