import type { FormEvent } from "react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router-dom";

import { loginRequest } from "../../../../shared/api/authApi";
import { getApiErrorMessage } from "../../../../shared/api/getApiErrorMessage";
import { useAuthStore } from "../../../../shared/store/authStore";
import { Button } from "../../../../shared/ui/Button";
import { Input } from "../../../../shared/ui/Input";
import styles from "./LoginForm.module.css";

export function LoginForm() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const setAccessToken = useAuthStore((s) => s.setAccessToken);
  const setUser = useAuthStore((s) => s.setUser);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const passwordIconSrc = showPassword
    ? "/assets/auth/eye_password_hidden.svg"
    : "/assets/auth/eye_password.svg";

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    const fd = new FormData(event.currentTarget);
    const email = String(fd.get("email") ?? "").trim();
    const password = String(fd.get("password") ?? "");

    if (!email || !password) {
      setError(t("errors.generic"));
      return;
    }

    setLoading(true);
    try {
      const data = await loginRequest({ email, password });
      setAccessToken(data.accessToken);
      setUser(data.user);
      navigate(data.redirectTo ?? "/dashboard", { replace: true });
    } catch (err) {
      setError(getApiErrorMessage(err, t("errors.generic"), t));
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className={styles.form} noValidate onSubmit={handleSubmit}>
      {error ? (
        <p className={styles.error} role="alert">
          {error}
        </p>
      ) : null}

      <Input
        id="login-email"
        label={t("auth.email")}
        type="email"
        name="email"
        autoComplete="email"
        placeholder={t("auth.emailPlaceholder")}
        required
      />

      <Input
        id="login-password"
        label={t("auth.password")}
        type={showPassword ? "text" : "password"}
        name="password"
        autoComplete="current-password"
        placeholder={t("auth.passwordPlaceholder")}
        required
        rightElement={
          <button
            type="button"
            className={styles.passwordToggle}
            onClick={() => setShowPassword((prev) => !prev)}
            aria-label={
              showPassword ? t("auth.hidePassword") : t("auth.showPassword")
            }
            title={showPassword ? t("auth.hidePassword") : t("auth.showPassword")}
          >
            <img src={passwordIconSrc} alt="" aria-hidden className={styles.passwordIcon} />
          </button>
        }
      />

      <div className={styles.rowAfterPassword}>
        <Link to="/recover" className={styles.forgotLink}>
          {t("auth.forgotPassword")}
        </Link>
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

      <Button type="submit" className={styles.submit} disabled={loading}>
        {loading ? t("auth.signingIn") : t("auth.continue")}
      </Button>
    </form>
  );
}
