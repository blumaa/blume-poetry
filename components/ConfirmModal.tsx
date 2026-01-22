'use client';

import { Modal } from './Modal';

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
  const variantStyles = {
    danger: 'bg-red-600 hover:bg-red-700 text-white',
    warning: 'bg-amber-600 hover:bg-amber-700 text-white',
    default: 'bg-accent hover:bg-accent-hover text-white',
  };

  return (
    <Modal isOpen={isOpen} onClose={isLoading ? () => {} : onClose} title={title} showCloseButton={false}>
      <p className="text-secondary mb-6">{message}</p>

      <div className="flex gap-3 justify-end">
        <button
          onClick={onClose}
          disabled={isLoading}
          className="px-4 py-2 border border-border rounded hover:border-tertiary transition-colors text-primary disabled:opacity-50 min-h-[44px]"
        >
          {cancelText}
        </button>
        <button
          onClick={onConfirm}
          disabled={isLoading}
          className={`px-4 py-2 rounded transition-colors disabled:opacity-50 min-h-[44px] ${variantStyles[variant]}`}
        >
          {isLoading ? 'Please wait...' : confirmText}
        </button>
      </div>
    </Modal>
  );
}
