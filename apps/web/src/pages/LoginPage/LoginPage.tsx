import { useTranslation } from "react-i18next";

import { AuthCard } from "../../shared/ui/AuthCard";
import { Header } from "../../widgets/Header/Header";
import { LoginForm } from "./components/LoginForm";

import styles from "./LoginPage.module.css";

function LoginPage() {
  const { t } = useTranslation();

  return (
    <div className={styles.page}>
      <Header />
      <main className={styles.main}>
        <AuthCard title={t("auth.signInTitle")}>
          <LoginForm />
        </AuthCard>
      </main>
    </div>
  );
}

export default LoginPage;
