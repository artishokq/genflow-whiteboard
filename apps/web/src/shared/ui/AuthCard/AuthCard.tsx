import type { ReactNode } from "react";

import styles from "./AuthCard.module.css";

type AuthCardProps = {
  title: string;
  children: ReactNode;
};

export function AuthCard({ title, children }: AuthCardProps) {
  return (
    <div className={styles.card}>
      <h1 className={styles.title}>{title}</h1>
      <div className={styles.body}>{children}</div>
    </div>
  );
}
