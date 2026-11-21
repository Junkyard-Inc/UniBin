import React from "react";
import "./RankBadge.css";

export type UserRankTier = "king" | "pro" | "jr" | "troll" | "trash";

export interface RankBadgeProps {
  tier: UserRankTier;
  label: string;
  className?: string;
}

export function RankBadge({ tier, label, className = "" }: RankBadgeProps) {
  return (
    <>
      {/* Filtro SVG nascosto per il bordo organico/frastagliato del livello "trash" */}
      {tier === "trash" && (
        <svg
          width="0"
          height="0"
          style={{ position: "absolute" }}
          aria-hidden="true"
        >
          <defs>
            <filter id="unibin-trash-edge">
              <feTurbulence
                type="fractalNoise"
                baseFrequency="0.18"
                numOctaves="3"
                result="noise"
              />
              <feDisplacementMap in="SourceGraphic" in2="noise" scale="3.5" />
            </filter>
          </defs>
        </svg>
      )}

      <span
        className={`unibin-rank-badge unibin-rank-badge--${tier} ${className}`}
      >
        <span className="unibin-rank-badge-label">{label}</span>
      </span>
    </>
  );
}

export default RankBadge;
