import React from "react";
import { Drawer as ArkDrawer } from "@ark-ui/react/drawer";
import { Portal } from "@ark-ui/react/portal";
import "./Drawer.css";

export type DrawerPlacement = "bottom" | "top";

export interface DrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  placement?: DrawerPlacement;
  title?: React.ReactNode;
  description?: React.ReactNode;
  footer?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export function Drawer({
  open,
  onOpenChange,
  placement = "bottom",
  title,
  description,
  footer,
  children,
  className = "",
}: DrawerProps) {
  const swipeDirection = placement === "bottom" ? "down" : "up";

  const grabber = (
    <div className="unibin-drawer-grabber-area">
      <ArkDrawer.Grabber className="unibin-drawer-grabber">
        <ArkDrawer.GrabberIndicator className="unibin-drawer-indicator" />
      </ArkDrawer.Grabber>
    </div>
  );

  return (
    <ArkDrawer.Root
      open={open}
      onOpenChange={(details) => onOpenChange(details.open)}
      swipeDirection={swipeDirection}
    >
      <Portal>
        <ArkDrawer.Backdrop className="unibin-drawer-backdrop" />
        <ArkDrawer.Positioner
          className={`unibin-drawer-positioner unibin-drawer-positioner--${placement}`}
        >
          <ArkDrawer.Content
            className={`unibin-drawer-content unibin-drawer-content--${placement} ${className}`}
          >
            {/* Nel bottom drawer la maniglia sta in cima */}
            {placement === "bottom" && grabber}

            {(title || description) && (
              <header className="unibin-drawer-header">
                {title && (
                  <ArkDrawer.Title className="unibin-drawer-title">
                    {title}
                  </ArkDrawer.Title>
                )}
                {description && (
                  <ArkDrawer.Description className="unibin-drawer-description">
                    {description}
                  </ArkDrawer.Description>
                )}
              </header>
            )}

            <div className="unibin-drawer-body">{children}</div>

            {footer && (
              <footer className="unibin-drawer-footer">{footer}</footer>
            )}

            {/* Nel top drawer la maniglia sta sul bordo inferiore per chiudere verso l'alto */}
            {placement === "top" && grabber}
          </ArkDrawer.Content>
        </ArkDrawer.Positioner>
      </Portal>
    </ArkDrawer.Root>
  );
}

export default Drawer;
