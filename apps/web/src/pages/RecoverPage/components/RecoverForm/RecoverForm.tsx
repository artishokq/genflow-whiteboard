import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

import {
  confirmPasswordReset,
  requestPasswordReset,
  resendPasswordReset,
} from "../../../../shared/api/authApi";
import { getApiErrorMessage } from "../../../../shared/api/getApiErrorMessage";
import { Button } from "../../../../shared/ui/Button";
import { Input } from "../../../../shared/ui/Input";
import styles from "./RecoverForm.module.css";

const RESEND_TIMEOUT_SECONDS = 60;

export function RecoverForm() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [step, setStep] = useState<"request" | "reset">("request");
  const [resendSeconds, setResendSeconds] = useState(RESEND_TIMEOUT_SECONDS);
  const [pendingEmail, setPendingEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loadingRequest, setLoadingRequest] = useState(false);
  const [loadingConfirm, setLoadingConfirm] = useState(false);
  const [loadingResend, setLoadingResend] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const passwordIconSrc = showPassword
    ? "/assets/auth/eye_password_hidden.svg"
    : "/assets/auth/eye_password.svg";
  const confirmPasswordIconSrc = showConfirmPassword
    ? "/assets/auth/eye_password_hidden.svg"
    : "/assets/auth/eye_password.svg";

  useEffect(() => {
    if (step !== "reset" || resendSeconds <= 0) return;

    const intervalId = window.setInterval(() => {
      setResendSeconds((current) => {
        if (current <= 1) {
          window.clearInterval(intervalId);
          return 0;
        }

        return current - 1;
      });
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [step, resendSeconds]);

  const handleRequestSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    const fd = new FormData(event.currentTarget);
    const email = String(fd.get("email") ?? "").trim();
    setLoadingRequest(true);
    try {
      await requestPasswordReset({ email });
      setPendingEmail(email);
      setStep("reset");
      setResendSeconds(RESEND_TIMEOUT_SECONDS);
    } catch (err) {
      setError(getApiErrorMessage(err, t("errors.generic"), t));
    } finally {
      setLoadingRequest(false);
    }
  };

  const handleResetSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    const fd = new FormData(event.currentTarget);
    const code = String(fd.get("code") ?? "").trim();
    const newPassword = String(fd.get("password") ?? "");
    const confirmPassword = String(fd.get("confirmPassword") ?? "");
    if (newPassword !== confirmPassword) {
      setError(t("register.passwordsDoNotMatch"));
      return;
    }
    setLoadingConfirm(true);
    try {
      await confirmPasswordReset({
        email: pendingEmail,
        code,
        newPassword,
      });
      navigate("/login", { replace: true });
    } catch (err) {
      setError(getApiErrorMessage(err, t("errors.generic"), t));
    } finally {
      setLoadingConfirm(false);
    }
  };

  const handleResend = async () => {
    if (resendSeconds > 0) return;
    setError(null);
    setLoadingResend(true);
    try {
      await resendPasswordReset({ email: pendingEmail });
      setResendSeconds(RESEND_TIMEOUT_SECONDS);
    } catch (err) {
      setError(getApiErrorMessage(err, t("errors.generic"), t));
    } finally {
      setLoadingResend(false);
    }
  };

  const resendLabel =
    resendSeconds > 0
      ? t("recover.resendIn", { time: `00:${String(resendSeconds).padStart(2, "0")}` })
      : t("recover.resendCode");

  return (
    <>
      {step === "request" ? (
        <form
          key="recover-request-form"
          className={styles.form}
          noValidate
          onSubmit={handleRequestSubmit}
        >
          {error ? (
            <p className={styles.error} role="alert">
              {error}
            </p>
          ) : null}
          <p className={styles.description}>{t("recover.requestDescription")}</p>

          <Input
            id="recover-email"
            label={t("recover.email")}
            type="email"
            name="email"
            autoComplete="email"
            placeholder={t("recover.emailPlaceholder")}
          />

          <Button type="submit" className={styles.submit}>
            {loadingRequest ? t("register.sending") : t("recover.sendCode")}
          </Button>
        </form>
      ) : (
        <form
          key="recover-reset-form"
          className={styles.form}
          noValidate
          onSubmit={handleResetSubmit}
        >
          {error ? (
            <p className={styles.error} role="alert">
              {error}
            </p>
          ) : null}
          <p className={styles.description}>{t("recover.resetDescription")}</p>

          <Input
            id="recover-code"
            label={t("recover.code")}
            type="text"
            name="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            placeholder={t("recover.codePlaceholder")}
          />

          <Input
            id="recover-password"
            label={t("recover.newPassword")}
            type={showPassword ? "text" : "password"}
            name="password"
            autoComplete="new-password"
            placeholder={t("recover.passwordPlaceholder")}
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

          <Input
            id="recover-confirm-password"
            label={t("recover.confirmPassword")}
            type={showConfirmPassword ? "text" : "password"}
            name="confirmPassword"
            autoComplete="new-password"
            placeholder={t("recover.passwordPlaceholder")}
            rightElement={
              <button
                type="button"
                className={styles.passwordToggle}
                onClick={() => setShowConfirmPassword((prev) => !prev)}
                aria-label={
                  showConfirmPassword
                    ? t("auth.hidePassword")
                    : t("auth.showPassword")
                }
                title={
                  showConfirmPassword
                    ? t("auth.hidePassword")
                    : t("auth.showPassword")
                }
              >
                <img
                  src={confirmPasswordIconSrc}
                  alt=""
                  aria-hidden
                  className={styles.passwordIcon}
                />
              </button>
            }
          />

          <Button type="submit" className={styles.submit}>
            {loadingConfirm ? t("register.verifying") : t("recover.updatePassword")}
          </Button>

          <Button
            type="button"
            variant="ghost"
            className={styles.resendButton}
            disabled={resendSeconds > 0 || loadingResend}
            onClick={() => void handleResend()}
          >
            {loadingResend ? t("register.sending") : resendLabel}
          </Button>

          <button type="button" className={styles.linkButton} onClick={() => setStep("request")}>
            {t("recover.changeEmail")}
          </button>
        </form>
      )}
    </>
  );
}
