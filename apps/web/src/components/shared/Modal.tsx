import type { ReactNode } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  className?: string;
  maxWidth?: string;
  showClose?: boolean;
}

export function Modal({
  open,
  onClose,
  title,
  children,
  className,
  maxWidth = "sm:max-w-md",
  showClose = true,
}: ModalProps) {
  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) onClose();
      }}
    >
      <DialogContent
        showCloseButton={showClose}
        className={cn(
          maxWidth,
          "max-h-[90vh] overflow-hidden flex flex-col border-border bg-popover text-popover-foreground",
          className
        )}
      >
        {title && (
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold tracking-tight text-foreground">{title}</DialogTitle>
          </DialogHeader>
        )}
        <div className="-mr-1 flex-1 overflow-y-auto py-1 pr-1 text-sm leading-relaxed text-muted-foreground">
          {children}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default Modal;
