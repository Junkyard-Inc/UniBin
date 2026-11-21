import React from "react";
import { Dialog as ArkDialog } from "@ark-ui/react/dialog";
import { Portal } from "@ark-ui/react/portal";
import { X } from "lucide-react";
import Button from "../Button/Button";
import "./Dialog.css";

export interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: React.ReactNode;
  description?: React.ReactNode;
  footer?: React.ReactNode;
  showCloseButton?: boolean;
  children?: React.ReactNode;
  className?: string;
}

export function Dialog({
  open,
  onOpenChange,
  title,
  description,
  footer,
  showCloseButton = true,
  children,
  className = "",
}: DialogProps) {
  return (
    <ArkDialog.Root
      open={open}
      onOpenChange={(details) => onOpenChange(details.open)}
    >
      <Portal>
        <ArkDialog.Backdrop className="unibin-dialog-backdrop" />
        <ArkDialog.Positioner className="unibin-dialog-positioner">
          <ArkDialog.Content className={`unibin-dialog-content ${className}`}>
            <div className="unibin-dialog-top">
              {title && (
                <ArkDialog.Title className="unibin-dialog-title">
                  {title}
                </ArkDialog.Title>
              )}

              {showCloseButton && (
                <ArkDialog.CloseTrigger asChild>
                  <Button
                    variant="icon"
                    size="sm"
                    className="unibin-dialog-close"
                    aria-label="Chiudi finestra"
                  >
                    <X size={16} />
                  </Button>
                </ArkDialog.CloseTrigger>
              )}
            </div>

            {description && (
              <ArkDialog.Description className="unibin-dialog-description">
                {description}
              </ArkDialog.Description>
            )}

            {children && <div className="unibin-dialog-body">{children}</div>}

            {footer && <div className="unibin-dialog-footer">{footer}</div>}
          </ArkDialog.Content>
        </ArkDialog.Positioner>
      </Portal>
    </ArkDialog.Root>
  );
}

export default Dialog;
