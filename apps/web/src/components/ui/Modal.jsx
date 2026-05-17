import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './dialog';

const Modal = ({
  open,
  onClose,
  title,
  children,
  className = '',
  maxWidth = 'max-w-md',
  showClose = true,
}) => {
  return (
    <Dialog open={open} onOpenChange={(nextOpen) => { if (!nextOpen) onClose(); }}>
      <DialogContent showCloseButton={showClose} className={`${maxWidth} ${className}`.trim()}>
        {title && (
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
          </DialogHeader>
        )}
        <div className="flex-1 overflow-auto">{children}</div>
      </DialogContent>
    </Dialog>
  );
};

export default Modal;
