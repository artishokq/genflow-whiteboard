import { useEffect } from "react";
import { useTranslation } from "react-i18next";

import styles from "./Header.module.css";

export function Header() {
  const { t, i18n } = useTranslation();
  const language = i18n.resolvedLanguage?.startsWith("ru") ? "ru" : "en";

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  const handleChangeLanguage = (nextLanguage: "ru" | "en") => {
    void i18n.changeLanguage(nextLanguage);
  };

  return (
    <header className={styles.header}>
      <p className={styles.title}>{t("appName")}</p>
      <div className={styles.languageSwitch} aria-label="Language switcher">
        <button
          type="button"
          className={`${styles.languageButton} ${language === "ru" ? styles.active : ""}`}
          onClick={() => handleChangeLanguage("ru")}
        >
          RU
        </button>
        <button
          type="button"
          className={`${styles.languageButton} ${language === "en" ? styles.active : ""}`}
          onClick={() => handleChangeLanguage("en")}
        >
          EN
        </button>
      </div>
    </header>
  );
}
