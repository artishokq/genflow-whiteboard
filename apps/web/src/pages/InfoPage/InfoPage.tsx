import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import { Header } from "../../widgets/Header/Header";
import styles from "./InfoPage.module.css";

function InfoPage() {
  const { t } = useTranslation();

  return (
    <div className={styles.page}>
      <Header userOnly />
      <main className={styles.main}>
        <h1 className={styles.title}>{t("info.title")}</h1>
        <p className={styles.body}>{t("info.body")}</p>
        <Link className={styles.backLink} to="/dashboard">
          {t("info.backToDashboard")}
        </Link>
      </main>
    </div>
  );
}

export default InfoPage;
