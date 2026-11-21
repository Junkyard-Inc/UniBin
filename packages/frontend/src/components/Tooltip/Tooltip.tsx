import React from "react";
import { Tooltip as ArkTooltip } from "@ark-ui/react/tooltip";
import { Portal } from "@ark-ui/react/portal";
import "./Tooltip.css";

interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactElement;
  placement?: "top" | "bottom" | "left" | "right";
  openDelay?: number;
}

export function Tooltip({
  content,
  children,
  placement = "left",
  openDelay = 200,
}: TooltipProps) {
  return (
    <ArkTooltip.Root
      openDelay={openDelay}
      closeDelay={100}
      positioning={{ placement, gutter: 10 }}
    >
      <ArkTooltip.Trigger asChild>{children}</ArkTooltip.Trigger>

      <Portal>
        <ArkTooltip.Positioner>
          <ArkTooltip.Content className="unibin-tooltip">
            <ArkTooltip.Arrow className="unibin-tooltip-arrow">
              <ArkTooltip.ArrowTip />
            </ArkTooltip.Arrow>
            {content}
          </ArkTooltip.Content>
        </ArkTooltip.Positioner>
      </Portal>
    </ArkTooltip.Root>
  );
}

export default Tooltip;
