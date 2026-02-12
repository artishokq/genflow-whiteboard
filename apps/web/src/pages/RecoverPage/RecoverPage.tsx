import { useTranslation } from "react-i18next";

import { AuthCard } from "../../shared/ui/AuthCard";
import { Header } from "../../widgets/Header/Header";
import { RecoverForm } from "./components/RecoverForm";

import styles from "./RecoverPage.module.css";

function RecoverPage() {
  const { t } = useTranslation();

  return (
    <div className={styles.page}>
      <Header />
      <main className={styles.main}>
        <AuthCard title={t("recover.title")}>
          <RecoverForm />
        </AuthCard>
      </main>
    </div>
  );
}

export default RecoverPage;
