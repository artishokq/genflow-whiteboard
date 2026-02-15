import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "../../../shared/ui/Button";
import { Input } from "../../../shared/ui/Input";
import styles from "./RegisterForm.module.css";

const RESEND_TIMEOUT_SECONDS = 60;

export function RegisterForm() {
  const { t } = useTranslation();
  const [step, setStep] = useState<"register" | "verify">("register");
  const [resendSeconds, setResendSeconds] = useState(RESEND_TIMEOUT_SECONDS);

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

  const handleRegisterSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStep("verify");
    setResendSeconds(RESEND_TIMEOUT_SECONDS);
  };

  const handleVerifySubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
  };

  const handleResend = () => {
    if (resendSeconds > 0) return;
    setResendSeconds(RESEND_TIMEOUT_SECONDS);
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
          className={styles.form}
          noValidate
          onSubmit={handleRegisterSubmit}
        >
          <Input
            id="register-name"
            label={t("register.name")}
            type="text"
            name="name"
            autoComplete="given-name"
            placeholder={t("register.namePlaceholder")}
          />

          <Input
            id="register-lastname"
            label={t("register.lastname")}
            type="text"
            name="lastname"
            autoComplete="family-name"
            placeholder={t("register.lastnamePlaceholder")}
          />

          <Input
            id="register-email"
            label={t("register.email")}
            type="email"
            name="email"
            autoComplete="email"
            placeholder={t("register.emailPlaceholder")}
          />

          <Input
            id="register-password"
            label={t("register.password")}
            type="password"
            name="password"
            autoComplete="new-password"
            placeholder={t("register.passwordPlaceholder")}
          />

          <Input
            id="register-confirm-password"
            label={t("register.confirmPassword")}
            type="password"
            name="confirmPassword"
            autoComplete="new-password"
            placeholder={t("register.passwordPlaceholder")}
          />

          <Button type="submit" className={styles.submit}>
            {t("register.register")}
          </Button>
        </form>
      ) : (
        <form className={styles.form} noValidate onSubmit={handleVerifySubmit}>
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

          <Button type="submit" className={styles.submit}>
            {t("register.confirmationCodeConfirm")}
          </Button>

          <Button
            type="button"
            variant="ghost"
            className={styles.resendButton}
            disabled={resendSeconds > 0}
            onClick={handleResend}
          >
            {resendLabel}
          </Button>

          <button
            type="button"
            className={styles.linkButton}
            onClick={() => setStep("register")}
          >
            {t("register.changeEmail")}
          </button>
        </form>
      )}
    </>
  );
}
