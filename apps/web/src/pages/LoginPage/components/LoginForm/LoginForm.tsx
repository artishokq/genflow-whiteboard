import { useTranslation } from "react-i18next";

import { Button } from "../../../../shared/ui/Button";
import { Input } from "../../../../shared/ui/Input";
import styles from "./LoginForm.module.css";

export function LoginForm() {
  const { t } = useTranslation();
  return (
    <form className={styles.form} noValidate>
      <Input
        id="login-email"
        label={t("auth.email")}
        type="email"
        name="email"
        autoComplete="email"
        placeholder={t("auth.emailPlaceholder")}
      />

      <Input
        id="login-password"
        label={t("auth.password")}
        type="password"
        name="password"
        autoComplete="current-password"
        placeholder={t("auth.passwordPlaceholder")}
      />

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

      <Button type="button" className={styles.submit}>
        {t("auth.continue")}
      </Button>
    </form>
  );
}
