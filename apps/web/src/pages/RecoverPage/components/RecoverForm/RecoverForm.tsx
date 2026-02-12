import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "../../../../shared/ui/Button";
import { Input } from "../../../../shared/ui/Input";
import styles from "./RecoverForm.module.css";

const RESEND_TIMEOUT_SECONDS = 60;

export function RecoverForm() {
  const { t } = useTranslation();
  const [step, setStep] = useState<"request" | "reset">("request");
  const [resendSeconds, setResendSeconds] = useState(RESEND_TIMEOUT_SECONDS);

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

  const handleRequestSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStep("reset");
    setResendSeconds(RESEND_TIMEOUT_SECONDS);
  };

  const handleResetSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
  };

  const handleResend = () => {
    if (resendSeconds > 0) return;
    setResendSeconds(RESEND_TIMEOUT_SECONDS);
  };

  const resendLabel =
    resendSeconds > 0
      ? t("recover.resendIn", { time: `00:${String(resendSeconds).padStart(2, "0")}` })
      : t("recover.resendCode");

  return (
    <>
      {step === "request" ? (
        <form className={styles.form} noValidate onSubmit={handleRequestSubmit}>
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
            {t("recover.sendCode")}
          </Button>
        </form>
      ) : (
        <form className={styles.form} noValidate onSubmit={handleResetSubmit}>
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
            type="password"
            name="password"
            autoComplete="new-password"
            placeholder={t("recover.passwordPlaceholder")}
          />

          <Input
            id="recover-confirm-password"
            label={t("recover.confirmPassword")}
            type="password"
            name="confirmPassword"
            autoComplete="new-password"
            placeholder={t("recover.passwordPlaceholder")}
          />

          <Button type="submit" className={styles.submit}>
            {t("recover.updatePassword")}
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

          <button type="button" className={styles.linkButton} onClick={() => setStep("request")}>
            {t("recover.changeEmail")}
          </button>
        </form>
      )}
    </>
  );
}
