import React from "react";
import "./Badge.css";

export type BadgeVariant = "available" | "full" | "damaged" | "tag";

export interface BadgeProps {
  variant?: BadgeVariant;
  showDot?: boolean;
  children: React.ReactNode;
  className?: string;
}

export function Badge({
  variant = "tag",
  showDot = variant !== "tag",
  children,
  className = "",
}: BadgeProps) {
  return (
    <span className={`unibin-badge unibin-badge--${variant} ${className}`}>
      {showDot && <span className="unibin-badge-dot" aria-hidden="true" />}
      <span className="unibin-badge-text">{children}</span>
    </span>
  );
}

export default Badge;
