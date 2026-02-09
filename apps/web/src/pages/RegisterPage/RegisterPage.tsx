import { useTranslation } from "react-i18next";

import { AuthCard } from "../../shared/ui/AuthCard";
import { Header } from "../../widgets/Header/Header";
import { RegisterForm } from "./components/RegisterForm";

import styles from "./RegisterPage.module.css";

function RegisterPage() {
  const { t } = useTranslation();

  return (
    <div className={styles.page}>
      <Header />
      <main className={styles.main}>
        <AuthCard title={t("register.title")}>
          <RegisterForm />
        </AuthCard>
      </main>
    </div>
  );
}

export default RegisterPage;
