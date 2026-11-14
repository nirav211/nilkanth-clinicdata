import React, { useEffect, useRef } from 'react';
import Button from './Button';

/**
 * ConfirmDialog component
 * Calm, accessible confirmation dialog.
 * 6px panel radius, 1px hairline border, surface background.
 */
export function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  isDestructive = false,
  onConfirm,
  onCancel
}) {
  const confirmBtnRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      confirmBtnRef.current?.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape' && isOpen) {
        onCancel();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="dialog-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/30"
    >
      <div
        className="w-full max-w-md bg-surface border border-hairline rounded-[6px] p-6 focus:outline-none"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="dialog-title" className="text-17 font-semibold text-ink">
          {title}
        </h2>
        <p className="text-15 text-muted mt-2 leading-normal">
          {message}
        </p>
        <div className="mt-6 flex items-center justify-end gap-3">
          <Button variant="secondary" onClick={onCancel}>
            {cancelLabel}
          </Button>
          <Button
            ref={confirmBtnRef}
            variant={isDestructive ? 'primary' : 'primary'}
            onClick={onConfirm}
            className={isDestructive ? '!bg-red !border-red hover:!bg-[#961e14]' : ''}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default ConfirmDialog;

