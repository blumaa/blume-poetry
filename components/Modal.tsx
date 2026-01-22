'use client';

import { useEffect, useRef } from 'react';
import FocusTrap from 'focus-trap-react';
import { Portal } from './Portal';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  showCloseButton?: boolean;
}

export function Modal({ isOpen, onClose, title, children, showCloseButton = true }: ModalProps) {
  const previousActiveElement = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      previousActiveElement.current = document.activeElement as HTMLElement;
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
      if (previousActiveElement.current) {
        previousActiveElement.current.focus();
        previousActiveElement.current = null;
      }
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      window.addEventListener('keydown', handleEscape);
    }

    return () => {
      window.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <Portal>
      <FocusTrap
        active={isOpen}
        focusTrapOptions={{
          initialFocus: false,
          allowOutsideClick: true,
          escapeDeactivates: false,
          returnFocusOnDeactivate: false,
        }}
      >
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={handleBackdropClick}
          role="dialog"
          aria-modal="true"
          aria-labelledby={title ? 'modal-title' : undefined}
        >
          <div className="relative w-full max-w-md bg-surface rounded-lg shadow-xl border border-border">
            {showCloseButton && (
              <button
                onClick={onClose}
                className="absolute top-4 right-4 text-tertiary hover:text-primary transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
                aria-label="Close modal"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            )}

            <div className="p-6 md:p-8">
              {title && (
                <h2 id="modal-title" className="text-lg font-medium text-primary mb-4">
                  {title}
                </h2>
              )}
              {children}
            </div>
          </div>
        </div>
      </FocusTrap>
    </Portal>
  );
}
