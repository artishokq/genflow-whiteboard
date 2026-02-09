import type { InputHTMLAttributes } from "react";

import styles from "./Input.module.css";

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  id: string;
  containerClassName?: string;
};

export function Input({ label, id, containerClassName = "", ...props }: InputProps) {
  const containerClasses = `${styles.field} ${containerClassName}`.trim();

  return (
    <div className={containerClasses}>
      <label className={styles.label} htmlFor={id}>
        {label}
      </label>
      <input id={id} className={styles.input} {...props} />
    </div>
  );
}
