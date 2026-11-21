import React from "react";
import { ToggleGroup } from "@ark-ui/react/toggle-group";
import "./ChipGroup.css";

export type ChipTint =
  | "default"
  | "paper"
  | "plastic"
  | "batteries"
  | "clothes"
  | "ewaste";

export interface ChipItem {
  value: string;
  label: string;
  icon?: React.ReactNode;
  tint?: ChipTint;
}

export interface ChipGroupProps {
  items: ChipItem[];
  value: string[];
  onValueChange: (value: string[]) => void;
  mode?: "single" | "multiple";
  layout?: "scroll" | "grid";
  ariaLabel?: string;
  className?: string;
}

export function ChipGroup({
  items,
  value,
  onValueChange,
  mode = "single",
  layout = "scroll",
  ariaLabel = "Filtro categorie",
  className = "",
}: ChipGroupProps) {
  return (
    <ToggleGroup.Root
      value={value}
      onValueChange={(details) => onValueChange(details.value)}
      multiple={mode === "multiple"}
      aria-label={ariaLabel}
      className={`unibin-chip-group unibin-chip-group--${layout} ${className}`}
    >
      {items.map((item) => {
        const tintClass =
          item.tint && item.tint !== "default"
            ? `unibin-chip--${item.tint}`
            : "";
        return (
          <ToggleGroup.Item
            key={item.value}
            value={item.value}
            className={`unibin-chip ${tintClass}`}
          >
            {item.icon && <span className="unibin-chip-icon">{item.icon}</span>}
            <span className="unibin-chip-label">{item.label}</span>
          </ToggleGroup.Item>
        );
      })}
    </ToggleGroup.Root>
  );
}

export default ChipGroup;
