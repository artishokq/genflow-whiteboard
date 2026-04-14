import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Link, useLocation } from "react-router-dom";

import styles from "./Header.module.css";
import { HeaderUserMenu } from "./HeaderUserMenu";

type HeaderProps = {
  userOnly?: boolean;
};

export function Header({ userOnly = false }: HeaderProps) {
  const { t, i18n } = useTranslation();
  const { pathname } = useLocation();
  const language = i18n.resolvedLanguage?.startsWith("ru") ? "ru" : "en";

  const isAuthRoute =
    pathname === "/" ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/register") ||
    pathname.startsWith("/recover");
  const shouldShowLoginAction =
    pathname.startsWith("/register") || pathname.startsWith("/recover");

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  const handleChangeLanguage = (nextLanguage: "ru" | "en") => {
    void i18n.changeLanguage(nextLanguage);
  };

  return (
    <header className={styles.header}>
      {userOnly ? (
        <Link to="/dashboard" className={styles.titleLink}>
          <p className={styles.title}>{t("appName")}</p>
        </Link>
      ) : (
        <p className={styles.title}>{t("appName")}</p>
      )}
      <div className={styles.rightControls}>
        {userOnly ? (
          <HeaderUserMenu />
        ) : (
          <>
            {isAuthRoute && (
              <Link
                className={styles.navAction}
                to={shouldShowLoginAction ? "/login" : "/register"}
              >
                {shouldShowLoginAction
                  ? t("header.goToLogin")
                  : t("header.goToRegister")}
              </Link>
            )}
            <div
              className={styles.languageSwitch}
              aria-label="Language switcher"
            >
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
          </>
        )}
      </div>
    </header>
  );
}
