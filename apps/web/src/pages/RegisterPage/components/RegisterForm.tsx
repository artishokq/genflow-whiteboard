import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

import {
  confirmRegistrationRequest,
  registerRequest,
  resendRegistrationCodeRequest,
} from "../../../shared/api/authApi";
import { getApiErrorMessage } from "../../../shared/api/getApiErrorMessage";
import { useAuthStore } from "../../../shared/store/authStore";
import { Button } from "../../../shared/ui/Button";
import { Input } from "../../../shared/ui/Input";
import styles from "./RegisterForm.module.css";

const RESEND_TIMEOUT_SECONDS = 60;

function validatePasswordClient(password: string, t: (k: string) => string) {
  if (password.length < 8) return t("register.passwordMinLength");
  if (password.length > 31) return t("register.passwordMaxLength");
  if (!/\d/.test(password)) return t("register.passwordNeedDigit");
  if (!/\p{L}/u.test(password)) return t("register.passwordNeedLetter");
  return null;
}

export function RegisterForm() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const setAccessToken = useAuthStore((s) => s.setAccessToken);
  const setUser = useAuthStore((s) => s.setUser);

  const [step, setStep] = useState<"register" | "verify">("register");
  const [resendSeconds, setResendSeconds] = useState(RESEND_TIMEOUT_SECONDS);
  const [pendingEmail, setPendingEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loadingRegister, setLoadingRegister] = useState(false);
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
    if (step !== "verify" || resendSeconds <= 0) return;

    const intervalId = setInterval(() => {
      setResendSeconds((current) => {
        if (current <= 1) {
          clearInterval(intervalId);
          return 0;
        }

        return current - 1;
      });
    }, 1000);

    return () => clearInterval(intervalId);
  }, [step, resendSeconds]);

  const handleRegisterSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    const form = event.currentTarget;
    const fd = new FormData(form);
    const firstName = String(fd.get("name") ?? "").trim();
    const lastName = String(fd.get("lastname") ?? "").trim();
    const email = String(fd.get("email") ?? "").trim();
    const password = String(fd.get("password") ?? "");
    const confirmPassword = String(fd.get("confirmPassword") ?? "");

    if (password !== confirmPassword) {
      setError(t("register.passwordsDoNotMatch"));
      return;
    }

    const pwdErr = validatePasswordClient(password, t);
    if (pwdErr) {
      setError(pwdErr);
      return;
    }

    setLoadingRegister(true);
    try {
      await registerRequest({
        email,
        password,
        firstName,
        lastName,
      });
      setPendingEmail(email);
      setStep("verify");
      setResendSeconds(RESEND_TIMEOUT_SECONDS);
    } catch (err) {
      setError(getApiErrorMessage(err, t("errors.generic"), t));
    } finally {
      setLoadingRegister(false);
    }
  };

  const handleVerifySubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    const fd = new FormData(event.currentTarget);
    const code = String(fd.get("confirmationCode") ?? "").trim();
    if (!code) {
      setError(t("register.codeRequired"));
      return;
    }

    setLoadingConfirm(true);
    try {
      const data = await confirmRegistrationRequest({
        email: pendingEmail,
        code,
      });
      setAccessToken(data.accessToken);
      setUser(data.user);
      navigate(data.redirectTo ?? "/dashboard", { replace: true });
    } catch (err) {
      setError(getApiErrorMessage(err, t("errors.generic"), t));
    } finally {
      setLoadingConfirm(false);
    }
  };

  const handleResend = async () => {
    if (resendSeconds > 0 || !pendingEmail) return;
    setError(null);
    setLoadingResend(true);
    try {
      await resendRegistrationCodeRequest({ email: pendingEmail });
      setResendSeconds(RESEND_TIMEOUT_SECONDS);
    } catch (err) {
      setError(getApiErrorMessage(err, t("errors.generic"), t));
    } finally {
      setLoadingResend(false);
    }
  };

  const resendLabel =
    resendSeconds > 0
      ? t("register.resendIn", {
          time: `00:${String(resendSeconds).padStart(2, "0")}`,
        })
      : t("register.confirmationCodeResend");

  return (
    <>
      {step === "register" ? (
        <form
          key="register-form"
          className={styles.form}
          noValidate
          onSubmit={handleRegisterSubmit}
        >
          {error ? (
            <p className={styles.error} role="alert">
              {error}
            </p>
          ) : null}

          <Input
            id="register-name"
            label={t("register.name")}
            type="text"
            name="name"
            autoComplete="given-name"
            placeholder={t("register.namePlaceholder")}
            required
          />

          <Input
            id="register-lastname"
            label={t("register.lastname")}
            type="text"
            name="lastname"
            autoComplete="family-name"
            placeholder={t("register.lastnamePlaceholder")}
            required
          />

          <Input
            id="register-email"
            label={t("register.email")}
            type="email"
            name="email"
            autoComplete="email"
            placeholder={t("register.emailPlaceholder")}
            required
          />

          <Input
            id="register-password"
            label={t("register.password")}
            type={showPassword ? "text" : "password"}
            name="password"
            autoComplete="new-password"
            placeholder={t("register.passwordPlaceholder")}
            required minLength={8}
            maxLength={31}
            rightElement={
              <button
                type="button"
                className={styles.passwordToggle}
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={
                  showPassword ? t("auth.hidePassword") : t("auth.showPassword")
                }
                title={
                  showPassword ? t("auth.hidePassword") : t("auth.showPassword")
                }
              >
                <img
                  src={passwordIconSrc}
                  alt=""
                  aria-hidden
                  className={styles.passwordIcon}
                />
              </button>
            }
          />

          <Input
            id="register-confirm-password"
            label={t("register.confirmPassword")}
            type={showConfirmPassword ? "text" : "password"}
            name="confirmPassword"
            autoComplete="new-password"
            placeholder={t("register.passwordPlaceholder")}
            required
            minLength={8}
            maxLength={31}
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

          <Button
            type="submit"
            className={styles.submit}
            disabled={loadingRegister}
          >
            {loadingRegister ? t("register.sending") : t("register.register")}
          </Button>
        </form>
      ) : (
        <form
          key="verify-form"
          className={styles.form}
          noValidate
          onSubmit={handleVerifySubmit}
        >
          {error ? (
            <p className={styles.error} role="alert">
              {error}
            </p>
          ) : null}

          <p className={styles.description}>
            {t("register.confirmationCodeDescription")}
          </p>

          <Input
            id="register-confirmation-code"
            label={t("register.confirmationCode")}
            type="text"
            name="confirmationCode"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            placeholder={t("register.confirmationCodeInput")}
          />

          <Button
            type="submit"
            className={styles.submit}
            disabled={loadingConfirm}
          >
            {loadingConfirm
              ? t("register.verifying")
              : t("register.confirmationCodeConfirm")}
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

          <button
            type="button"
            className={styles.linkButton}
            onClick={() => {
              setError(null);
              setStep("register");
            }}
          >
            {t("register.changeEmail")}
          </button>
        </form>
      )}
    </>
  );
}
