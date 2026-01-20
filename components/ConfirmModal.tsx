'use client';

import { useEffect, useRef } from 'react';
import FocusTrap from 'focus-trap-react';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'default';
  isLoading?: boolean;
}

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'default',
  isLoading = false,
}: ConfirmModalProps) {
  const confirmButtonRef = useRef<HTMLButtonElement>(null);
  const cancelButtonRef = useRef<HTMLButtonElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);

  // Store previously focused element and restore on close
  useEffect(() => {
    if (isOpen) {
      previousActiveElement.current = document.activeElement as HTMLElement;
    } else if (previousActiveElement.current) {
      previousActiveElement.current.focus();
      previousActiveElement.current = null;
    }
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isLoading) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, isLoading, onClose]);

  if (!isOpen) return null;

  const variantStyles = {
    danger: 'bg-red-600 hover:bg-red-700 text-white',
    warning: 'bg-amber-600 hover:bg-amber-700 text-white',
    default: 'bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white',
  };

  return (
    <FocusTrap
      active={isOpen && !isLoading}
      focusTrapOptions={{
        initialFocus: () => cancelButtonRef.current,
        allowOutsideClick: true,
        escapeDeactivates: false,
        returnFocusOnDeactivate: false,
      }}
    >
      <div
        className="fixed inset-0 z-50 flex items-center justify-center"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-modal-title"
      >
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-black/50"
          onClick={isLoading ? undefined : onClose}
          aria-hidden="true"
        />

        {/* Modal */}
        <div className="relative bg-[var(--bg-primary)] rounded-lg shadow-xl max-w-md w-full mx-4 p-6 border border-[var(--border)]">
          <h2
            id="confirm-modal-title"
            className="text-lg font-medium text-[var(--text-primary)] mb-2"
          >
            {title}
          </h2>
          <p className="text-[var(--text-secondary)] mb-6">{message}</p>

          <div className="flex gap-3 justify-end">
            <button
              ref={cancelButtonRef}
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2 border border-[var(--border)] rounded hover:border-[var(--text-tertiary)] transition-colors text-[var(--text-primary)] disabled:opacity-50 min-h-[44px]"
            >
              {cancelText}
            </button>
            <button
              ref={confirmButtonRef}
              onClick={onConfirm}
              disabled={isLoading}
              className={`px-4 py-2 rounded transition-colors disabled:opacity-50 min-h-[44px] ${variantStyles[variant]}`}
            >
              {isLoading ? 'Please wait...' : confirmText}
            </button>
          </div>
        </div>
      </div>
    </FocusTrap>
  );
}
