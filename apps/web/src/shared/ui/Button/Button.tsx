import type { ButtonHTMLAttributes } from "react";

import styles from "./Button.module.css";

type ButtonVariant = "primary" | "ghost";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
};

export function Button({ variant = "primary", className = "", ...props }: ButtonProps) {
  const variantClass = variant === "ghost" ? styles.ghost : styles.primary;
  const classes = `${styles.button} ${variantClass} ${className}`.trim();

  return <button className={classes} {...props} />;
}
