import { useEffect, useRef, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router-dom";

import {
  changePasswordRequest,
  confirmEmailChange,
  deleteUserAvatarRequest,
  getMeRequest,
  requestEmailChange,
  updateFirstNameRequest,
  updateLastNameRequest,
  uploadUserAvatarRequest,
} from "../../shared/api/authApi";
import { getApiErrorMessage } from "../../shared/api/getApiErrorMessage";
import { useAuthStore } from "../../shared/store/authStore";
import { Button } from "../../shared/ui/Button";
import { UserAvatar } from "../../shared/ui/UserAvatar/UserAvatar";
import { Input } from "../../shared/ui/Input";
import { Header } from "../../widgets/Header/Header";
import styles from "./ProfilePage.module.css";

function ProfilePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const setAccessToken = useAuthStore((s) => s.setAccessToken);
  const setUser = useAuthStore((s) => s.setUser);
  const authUser = useAuthStore((s) => s.user);
  const accessToken = useAuthStore((s) => s.accessToken);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(true);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [openSection, setOpenSection] = useState<
    null | "firstName" | "lastName" | "email" | "password"
  >(null);
  const [error, setError] = useState<string | null>(null);
  const [pendingEmail, setPendingEmail] = useState("");
  const [showEmailConfirm, setShowEmailConfirm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [showEmailCurrentPassword, setShowEmailCurrentPassword] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        const data = await getMeRequest();
        setUser(data.user);
        setFirstName(data.user.firstName);
        setLastName(data.user.lastName);
        setEmail(data.user.email);
      } catch (err) {
        setError(getApiErrorMessage(err, t("errors.generic"), t));
      } finally {
        setLoading(false);
      }
    })();
  }, [setUser, t]);

  const toggleSection = (section: "firstName" | "lastName" | "email" | "password") => {
    setError(null);
    setShowEmailConfirm(false);
    setOpenSection((current) => (current === section ? null : section));
  };

  const eyeIcon = "/assets/auth/eye_password.svg";
  const eyeOffIcon = "/assets/auth/eye_password_hidden.svg";

  const handleFirstNameSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const fd = new FormData(event.currentTarget);
      const nextFirstName = String(fd.get("firstName") ?? "").trim();
      const data = await updateFirstNameRequest(nextFirstName);
      setUser(data.user);
      setFirstName(data.user.firstName);
      setOpenSection(null);
    } catch (err) {
      setError(getApiErrorMessage(err, t("errors.generic"), t));
    } finally {
      setSaving(false);
    }
  };

  const handleLastNameSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const fd = new FormData(event.currentTarget);
      const nextLastName = String(fd.get("lastName") ?? "").trim();
      const data = await updateLastNameRequest(nextLastName);
      setUser(data.user);
      setLastName(data.user.lastName);
      setOpenSection(null);
    } catch (err) {
      setError(getApiErrorMessage(err, t("errors.generic"), t));
    } finally {
      setSaving(false);
    }
  };

  const handleEmailRequestSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const fd = new FormData(event.currentTarget);
      const nextEmail = String(fd.get("newEmail") ?? "").trim();
      const currentPassword = String(fd.get("currentPassword") ?? "");
      await requestEmailChange({ email: nextEmail, currentPassword });
      setPendingEmail(nextEmail);
      setShowEmailConfirm(true);
    } catch (err) {
      setError(getApiErrorMessage(err, t("errors.generic"), t));
    } finally {
      setSaving(false);
    }
  };

  const handleEmailConfirmSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const fd = new FormData(event.currentTarget);
      const code = String(fd.get("code") ?? "").trim();
      const data = await confirmEmailChange({ email: pendingEmail, code });
      setAccessToken(data.accessToken);
      setUser(data.user);
      setEmail(data.user.email);
      setOpenSection(null);
      setShowEmailConfirm(false);
      setPendingEmail("");
    } catch (err) {
      setError(getApiErrorMessage(err, t("errors.generic"), t));
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) {
      return;
    }
    setError(null);
    setAvatarBusy(true);
    try {
      const data = await uploadUserAvatarRequest(file);
      setUser(data.user);
    } catch (err) {
      setError(getApiErrorMessage(err, t("errors.generic"), t));
    } finally {
      setAvatarBusy(false);
    }
  };

  const handleRemoveAvatar = async () => {
    setError(null);
    setAvatarBusy(true);
    try {
      const data = await deleteUserAvatarRequest();
      setUser(data.user);
    } catch (err) {
      setError(getApiErrorMessage(err, t("errors.generic"), t));
    } finally {
      setAvatarBusy(false);
    }
  };

  const handlePasswordSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    const fd = new FormData(event.currentTarget);
    const currentPassword = String(fd.get("currentPassword") ?? "");
    const newPassword = String(fd.get("newPassword") ?? "");
    const confirmPassword = String(fd.get("confirmPassword") ?? "");
    if (newPassword !== confirmPassword) {
      setError(t("register.passwordsDoNotMatch"));
      return;
    }
    setSaving(true);
    try {
      await changePasswordRequest({ currentPassword, newPassword });
      setOpenSection(null);
    } catch (err) {
      setError(getApiErrorMessage(err, t("errors.generic"), t));
    } finally {
      setSaving(false);
    }
  };

  const handleBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      navigate(-1);
      return;
    }
    void navigate("/dashboard");
  };

  return (
    <div className={styles.page}>
      <Header userOnly />
      <main className={styles.main}>
        <h1 className={styles.title}>{t("profile.title")}</h1>
        {error ? (
          <p className={styles.error} role="alert">
            {error}
          </p>
        ) : null}

        {loading ? <p className={styles.hint}>{t("profile.loading")}</p> : null}

        {!loading && authUser ? (
          <section className={styles.avatarSection} aria-labelledby="profile-avatar-heading">
            <h2 id="profile-avatar-heading" className={styles.sectionTitle}>
              {t("profile.avatarTitle")}
            </h2>
            <p className={styles.avatarHint}>{t("profile.avatarHint")}</p>
            <div className={styles.avatarRow}>
              <UserAvatar
                userId={authUser.id}
                firstName={authUser.firstName}
                lastName={authUser.lastName}
                email={authUser.email}
                avatarObjectKey={authUser.avatarObjectKey ?? null}
                accessToken={accessToken}
                sizePx={88}
              />
              <div className={styles.avatarActions}>
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp"
                  className={styles.visuallyHidden}
                  onChange={(e) => void handleAvatarFile(e)}
                />
                <Button
                  type="button"
                  variant="primary"
                  disabled={avatarBusy}
                  className={styles.compactButton}
                  onClick={() => avatarInputRef.current?.click()}
                >
                  {t("profile.avatarUpload")}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  disabled={avatarBusy || !authUser.avatarObjectKey}
                  className={styles.compactButton}
                  onClick={() => void handleRemoveAvatar()}
                >
                  {t("profile.avatarRemove")}
                </Button>
              </div>
            </div>
          </section>
        ) : null}

        <section className={styles.section}>
          <div className={styles.sectionHead}>
            <h2 className={styles.sectionTitle}>{t("profile.firstNameLabel")}</h2>
            <button
              type="button"
              className={styles.changeBtn}
              onClick={() => toggleSection("firstName")}
            >
              {openSection === "firstName" ? t("profile.hide") : t("profile.change")}
            </button>
          </div>
          <p className={styles.currentValue}>{firstName || "-"}</p>
          {openSection === "firstName" ? (
            <form className={styles.formInline} onSubmit={handleFirstNameSubmit}>
              <Input
                id="profile-first-name"
                label={t("profile.newFirstNameLabel")}
                name="firstName"
                defaultValue={firstName}
                required
              />
              <Button type="submit" disabled={saving} className={styles.compactButton}>
                {t("profile.save")}
              </Button>
            </form>
          ) : null}
        </section>

        <section className={styles.section}>
          <div className={styles.sectionHead}>
            <h2 className={styles.sectionTitle}>{t("profile.lastNameLabel")}</h2>
            <button
              type="button"
              className={styles.changeBtn}
              onClick={() => toggleSection("lastName")}
            >
              {openSection === "lastName" ? t("profile.hide") : t("profile.change")}
            </button>
          </div>
          <p className={styles.currentValue}>{lastName || "-"}</p>
          {openSection === "lastName" ? (
            <form className={styles.formInline} onSubmit={handleLastNameSubmit}>
              <Input
                id="profile-last-name"
                label={t("profile.newLastNameLabel")}
                name="lastName"
                defaultValue={lastName}
                required
              />
              <Button type="submit" disabled={saving} className={styles.compactButton}>
                {t("profile.save")}
              </Button>
            </form>
          ) : null}
        </section>

        <section className={styles.section}>
          <div className={styles.sectionHead}>
            <h2 className={styles.sectionTitle}>{t("profile.emailLabel")}</h2>
            <button
              type="button"
              className={styles.changeBtn}
              onClick={() => toggleSection("email")}
            >
              {openSection === "email" ? t("profile.hide") : t("profile.change")}
            </button>
          </div>
          <p className={styles.currentValue}>{email || "-"}</p>
          {openSection === "email" ? (
            <>
              <form className={styles.formGrid} onSubmit={handleEmailRequestSubmit}>
                <Input
                  id="profile-new-email"
                  label={t("profile.newEmailLabel")}
                  type="email"
                  name="newEmail"
                  required
                />
                <Input
                  id="profile-current-password-email"
                  label={t("profile.currentPasswordLabel")}
                  type={showEmailCurrentPassword ? "text" : "password"}
                  name="currentPassword"
                  required
                  rightElement={
                    <button
                      type="button"
                      className={styles.passwordToggle}
                      onClick={() => setShowEmailCurrentPassword((prev) => !prev)}
                      aria-label={
                        showEmailCurrentPassword
                          ? t("auth.hidePassword")
                          : t("auth.showPassword")
                      }
                      title={
                        showEmailCurrentPassword
                          ? t("auth.hidePassword")
                          : t("auth.showPassword")
                      }
                    >
                      <img
                        src={showEmailCurrentPassword ? eyeOffIcon : eyeIcon}
                        alt=""
                        aria-hidden
                        className={styles.passwordIcon}
                      />
                    </button>
                  }
                />
                <Button type="submit" disabled={saving} className={styles.compactButton}>
                  {t("profile.sendCode")}
                </Button>
              </form>
              {showEmailConfirm ? (
                <form className={styles.formInline} onSubmit={handleEmailConfirmSubmit}>
                  <Input
                    id="profile-email-code"
                    label={t("profile.emailCodeLabel")}
                    name="code"
                    maxLength={6}
                    required
                  />
                  <Button type="submit" disabled={saving} className={styles.compactButton}>
                    {t("profile.confirmEmail")}
                  </Button>
                </form>
              ) : null}
            </>
          ) : null}
        </section>

        <section className={styles.section}>
          <div className={styles.sectionHead}>
            <h2 className={styles.sectionTitle}>{t("profile.passwordLabel")}</h2>
            <button
              type="button"
              className={styles.changeBtn}
              onClick={() => toggleSection("password")}
            >
              {openSection === "password" ? t("profile.hide") : t("profile.change")}
            </button>
          </div>
          {openSection === "password" ? (
            <form className={styles.formPassword} onSubmit={handlePasswordSubmit}>
              <Input
                id="profile-current-password"
                label={t("profile.currentPasswordLabel")}
                type={showCurrentPassword ? "text" : "password"}
                name="currentPassword"
                required
                rightElement={
                  <button
                    type="button"
                    className={styles.passwordToggle}
                    onClick={() => setShowCurrentPassword((prev) => !prev)}
                    aria-label={
                      showCurrentPassword ? t("auth.hidePassword") : t("auth.showPassword")
                    }
                    title={showCurrentPassword ? t("auth.hidePassword") : t("auth.showPassword")}
                  >
                    <img
                      src={showCurrentPassword ? eyeOffIcon : eyeIcon}
                      alt=""
                      aria-hidden
                      className={styles.passwordIcon}
                    />
                  </button>
                }
              />
              <Input
                id="profile-new-password"
                label={t("profile.newPasswordLabel")}
                type={showNewPassword ? "text" : "password"}
                name="newPassword"
                required
                rightElement={
                  <button
                    type="button"
                    className={styles.passwordToggle}
                    onClick={() => setShowNewPassword((prev) => !prev)}
                    aria-label={showNewPassword ? t("auth.hidePassword") : t("auth.showPassword")}
                    title={showNewPassword ? t("auth.hidePassword") : t("auth.showPassword")}
                  >
                    <img
                      src={showNewPassword ? eyeOffIcon : eyeIcon}
                      alt=""
                      aria-hidden
                      className={styles.passwordIcon}
                    />
                  </button>
                }
              />
              <Input
                id="profile-confirm-new-password"
                label={t("profile.confirmNewPasswordLabel")}
                type={showConfirmPassword ? "text" : "password"}
                name="confirmPassword"
                required
                rightElement={
                  <button
                    type="button"
                    className={styles.passwordToggle}
                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                    aria-label={
                      showConfirmPassword ? t("auth.hidePassword") : t("auth.showPassword")
                    }
                    title={showConfirmPassword ? t("auth.hidePassword") : t("auth.showPassword")}
                  >
                    <img
                      src={showConfirmPassword ? eyeOffIcon : eyeIcon}
                      alt=""
                      aria-hidden
                      className={styles.passwordIcon}
                    />
                  </button>
                }
              />
              <Button type="submit" disabled={saving} className={styles.compactButton}>
                {t("profile.savePassword")}
              </Button>
              <Link className={styles.recoverLink} to="/recover">
                {t("profile.forgotPassword")}
              </Link>
            </form>
          ) : null}
        </section>

        <button type="button" className={styles.backLink} onClick={handleBack}>
          {t("profile.backToDashboard")}
        </button>
      </main>
    </div>
  );
}

export default ProfilePage;
