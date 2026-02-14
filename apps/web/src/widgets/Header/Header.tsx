import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useLocation, useNavigate } from "react-router-dom";

import styles from "./Header.module.css";

type HeaderProps = {
  userOnly?: boolean;
};

export function Header({ userOnly = false }: HeaderProps) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const language = i18n.resolvedLanguage?.startsWith("ru") ? "ru" : "en";
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    if (!menuOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };

    document.addEventListener("pointerdown", handlePointerDown, true);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown, true);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [menuOpen]);

  const handleChangeLanguage = (nextLanguage: "ru" | "en") => {
    void i18n.changeLanguage(nextLanguage);
  };

  const toggleMenuLanguage = () => {
    void i18n.changeLanguage(language === "ru" ? "en" : "ru");
    setMenuOpen(false);
  };

  const handleLogout = () => {
    setMenuOpen(false);
    void navigate("/login");
  };

  const closeMenu = () => setMenuOpen(false);

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
          <div className={styles.userMenuWrap} ref={menuRef}>
            <button
              type="button"
              className={styles.userButton}
              aria-label={t("dashboard.userButton")}
              aria-expanded={menuOpen}
              aria-haspopup="menu"
              onClick={() => setMenuOpen((open) => !open)}
            >
              <span className={styles.userIcon}>:)</span>
            </button>
            {menuOpen ? (
              <div className={styles.dropdown} role="menu">
                <div className={styles.dropdownHeader}>
                  <span className={styles.dropdownAvatar} aria-hidden>
                    :)
                  </span>
                  <span className={styles.dropdownName}>
                    {t("header.userDisplayName")}
                  </span>
                </div>
                <div className={styles.dropdownDivider} />
                <Link
                  to="/profile"
                  className={styles.dropdownItem}
                  role="menuitem"
                  onClick={closeMenu}
                >
                  <span className={styles.dropdownItemIcon} aria-hidden>
                    ◎
                  </span>
                  {t("header.menuProfile")}
                </Link>
                <button
                  type="button"
                  className={styles.dropdownItem}
                  role="menuitem"
                  onClick={toggleMenuLanguage}
                >
                  <span className={styles.dropdownItemIcon} aria-hidden>
                    A
                  </span>
                  {language === "ru"
                    ? t("header.menuSwitchToEn")
                    : t("header.menuSwitchToRu")}
                </button>
                <Link
                  to="/info"
                  className={styles.dropdownItem}
                  role="menuitem"
                  onClick={closeMenu}
                >
                  <span className={styles.dropdownItemIcon} aria-hidden>
                    i
                  </span>
                  {t("header.menuInfo")}
                </Link>
                <div className={styles.dropdownDivider} />
                <button
                  type="button"
                  className={styles.dropdownItemDanger}
                  role="menuitem"
                  onClick={handleLogout}
                >
                  <span className={styles.dropdownItemIcon} aria-hidden>
                    →
                  </span>
                  {t("header.menuLogout")}
                </button>
              </div>
            ) : null}
          </div>
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
