import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router-dom";

import { logoutRequest } from "../../shared/api/authApi";
import { useAuthStore } from "../../shared/store/authStore";
import { UserAvatar } from "../../shared/ui/UserAvatar/UserAvatar";
import styles from "./Header.module.css";

type HeaderUserMenuProps = {
  userButtonClassName?: string;
  wrapClassName?: string;
};

export function HeaderUserMenu({
  userButtonClassName,
  wrapClassName,
}: HeaderUserMenuProps) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const accessToken = useAuthStore((s) => s.accessToken);
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const language = i18n.resolvedLanguage?.startsWith("ru") ? "ru" : "en";
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

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

  const toggleMenuLanguage = () => {
    void i18n.changeLanguage(language === "ru" ? "en" : "ru");
    setMenuOpen(false);
  };

  const handleLogout = () => {
    setMenuOpen(false);
    void (async () => {
      try {
        await logoutRequest();
      } catch {
        /* still clear local session */
      } finally {
        clearAuth();
        void navigate("/login", { replace: true });
      }
    })();
  };

  const closeMenu = () => setMenuOpen(false);

  const wrapClass = [styles.userMenuWrap, wrapClassName]
    .filter(Boolean)
    .join(" ");
  const btnClass = [styles.userButton, userButtonClassName]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={wrapClass} ref={menuRef}>
      <button
        type="button"
        className={btnClass}
        aria-label={t("dashboard.userButton")}
        aria-expanded={menuOpen}
        aria-haspopup="menu"
        onClick={() => setMenuOpen((open) => !open)}
      >
        {user ? (
          <UserAvatar
            userId={user.id}
            firstName={user.firstName}
            lastName={user.lastName}
            email={user.email}
            avatarObjectKey={user.avatarObjectKey ?? null}
            accessToken={accessToken}
            sizePx={36}
            className={styles.headerAvatar}
          />
        ) : (
          <span className={styles.userIcon} aria-hidden>
            ?
          </span>
        )}
      </button>
      {menuOpen ? (
        <div className={styles.dropdown} role="menu">
          <div className={styles.dropdownHeader}>
            {user ? (
              <UserAvatar
                userId={user.id}
                firstName={user.firstName}
                lastName={user.lastName}
                email={user.email}
                avatarObjectKey={user.avatarObjectKey ?? null}
                accessToken={accessToken}
                sizePx={36}
                className={styles.dropdownAvatarImg}
              />
            ) : (
              <span className={styles.dropdownAvatar} aria-hidden>
                ?
              </span>
            )}
            <span className={styles.dropdownName}>
              {user?.firstName?.trim() || t("header.userDisplayName")}
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
              &#9678;
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
              &rarr;
            </span>
            {t("header.menuLogout")}
          </button>
        </div>
      ) : null}
    </div>
  );
}
