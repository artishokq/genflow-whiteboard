import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

import { Header } from "../../widgets/Header/Header";
import styles from "./InfoPage.module.css";

function InfoPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }
    navigate("/dashboard", { replace: true });
  };

  return (
    <div className={styles.page}>
      <Header userOnly />
      <main className={styles.main}>
        <h1 className={styles.title}>{t("info.title")}</h1>
        <p className={styles.body}>{t("info.body")}</p>
        <p className={styles.body}>{t("info.coursework")}</p>
        <p className={styles.body}>
          {t("info.sourceCode")}{" "}
          <a
            className={styles.link}
            href="https://github.com/artishokq/genflow-whiteboard"
            target="_blank"
            rel="noreferrer"
          >
            github.com/artishokq/genflow-whiteboard
          </a>
        </p>
        <button type="button" className={styles.backLink} onClick={handleBack}>
          {t("info.back")}
        </button>
      </main>
    </div>
  );
}

export default InfoPage;
