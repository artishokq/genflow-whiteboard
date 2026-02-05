import { useTranslation } from "react-i18next";

import styles from "./LoginForm.module.css";

export function LoginForm() {
  const { t } = useTranslation();
  return (
    <form className={styles.form} noValidate>
      <div className={styles.field}>
        <label className={styles.label} htmlFor="login-email">
        {t("auth.email")}
        </label>
        <input
          id="login-email"
          className={styles.input}
          type="email"
          name="email"
          autoComplete="email"
          placeholder="you@example.com"
        />
      </div>

      <div className={styles.field}>
        <label className={styles.label} htmlFor="login-password">
        {t("auth.password")}
        </label>
        <input
          id="login-password"
          className={styles.input}
          type="password"
          name="password"
          autoComplete="current-password"
          placeholder="••••••••"
        />
      </div>

      <div className={styles.rowAfterPassword}>
        <button type="button" className={styles.forgotLink}>
        {t("auth.forgotPassword")}
        </button>
        <label className={styles.remember}>
          <input
            className={styles.checkbox}
            type="checkbox"
            name="remember"
            defaultChecked
          />
          {t("auth.rememberMe")}
        </label>
      </div>

      <button type="button" className={styles.submit}>
        {t("auth.continue")}
      </button>
    </form>
  );
}
