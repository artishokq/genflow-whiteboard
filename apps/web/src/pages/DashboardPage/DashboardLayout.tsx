import { useTranslation } from "react-i18next";
import { NavLink, Outlet } from "react-router-dom";

import { Header } from "../../widgets/Header/Header";
import styles from "./DashboardPage.module.css";

function navLinkClassName({ isActive }: { isActive: boolean }) {
  return `${styles.sectionLink} ${isActive ? styles.sectionLinkActive : ""}`.trim();
}

function DashboardLayout() {
  const { t } = useTranslation();

  return (
    <div className={styles.page}>
      <Header userOnly />
      <main className={styles.main}>
        <aside className={styles.sidebar}>
          <input
            type="search"
            className={styles.search}
            placeholder={t("dashboard.searchPlaceholder")}
          />

          <nav className={styles.sections} aria-label={t("dashboard.sectionsAriaLabel")}>
            <NavLink to="/dashboard/personal" className={navLinkClassName} end>
              {t("dashboard.personal")}
            </NavLink>
            <NavLink to="/dashboard/recent" className={navLinkClassName}>
              {t("dashboard.recent")}
            </NavLink>
            <NavLink to="/dashboard/starred" className={navLinkClassName}>
              {t("dashboard.starred")}
            </NavLink>
          </nav>

          <button
            type="button"
            className={styles.addSectionButton}
            aria-label={t("dashboard.newSection")}
          >
            <span className={styles.addSectionIcon}>+</span>
          </button>
        </aside>

        <section className={styles.content}>
          <Outlet />
        </section>
      </main>
    </div>
  );
}

export default DashboardLayout;
