import React, { forwardRef } from "react";
import "./Button.css";

export type ButtonVariant = "primary" | "accent" | "neutral" | "icon" | "nav";
export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isActive?: boolean;
  children: React.ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      size = "md",
      isActive = false,
      className = "",
      type = "button",
      children,
      ...props
    },
    ref,
  ) => {
    const classes = [
      "unibin-btn",
      `unibin-btn--${variant}`,
      `unibin-btn--${size}`,
      isActive ? "unibin-btn--active" : "",
      className,
    ]
      .filter(Boolean)
      .join(" ");

    return (
      <button ref={ref} type={type} className={classes} {...props}>
        {children}
      </button>
    );
  },
);

Button.displayName = "Button";
export default Button;
