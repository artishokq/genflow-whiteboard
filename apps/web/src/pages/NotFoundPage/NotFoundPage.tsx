import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import { Button } from "../../shared/ui/Button";
import { Header } from "../../widgets/Header/Header";
import styles from "./NotFoundPage.module.css";

function NotFoundPage() {
  const { t } = useTranslation();

  return (
    <div className={styles.page}>
      <Header />
      <main className={styles.main}>
        <div className={styles.card}>
          <p className={styles.code}>404</p>
          <h1 className={styles.title}>{t("notFound.title")}</h1>
          <p className={styles.description}>{t("notFound.description")}</p>
          <Link to="/login" className={styles.link}>
            <Button type="button">{t("notFound.goHome")}</Button>
          </Link>
        </div>
      </main>
    </div>
  );
}

export default NotFoundPage;
