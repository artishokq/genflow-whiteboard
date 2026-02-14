import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import { Header } from "../../widgets/Header/Header";
import styles from "./ProfilePage.module.css";

function ProfilePage() {
  const { t } = useTranslation();

  return (
    <div className={styles.page}>
      <Header userOnly />
      <main className={styles.main}>
        <h1 className={styles.title}>{t("profile.title")}</h1>
        <p className={styles.hint}>{t("profile.placeholder")}</p>
        <Link className={styles.backLink} to="/dashboard">
          {t("profile.backToDashboard")}
        </Link>
      </main>
    </div>
  );
}

export default ProfilePage;
