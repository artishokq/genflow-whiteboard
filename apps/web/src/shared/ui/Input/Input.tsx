import type { InputHTMLAttributes } from "react";
import type { ReactNode } from "react";

import styles from "./Input.module.css";

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  id: string;
  containerClassName?: string;
  rightElement?: ReactNode;
};

export function Input({
  label,
  id,
  containerClassName = "",
  rightElement,
  ...props
}: InputProps) {
  const containerClasses = `${styles.field} ${containerClassName}`.trim();
  const inputClasses = `${styles.input} ${rightElement ? styles.withRightElement : ""}`.trim();

  return (
    <div className={containerClasses}>
      <label className={styles.label} htmlFor={id}>
        {label}
      </label>
      <div className={styles.inputWrap}>
        <input id={id} className={inputClasses} {...props} />
        {rightElement ? <div className={styles.rightElement}>{rightElement}</div> : null}
      </div>
    </div>
  );
}
