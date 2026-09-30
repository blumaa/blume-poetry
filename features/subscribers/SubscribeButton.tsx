'use client';

import { useState } from 'react';
import { Button } from '@/components/mds';
import { SubscribeModal } from './SubscribeModal';

interface SubscribeButtonProps {
  className?: string;
  showLabel?: boolean;
}

function MailIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </svg>
  );
}

export function SubscribeButton({ className = '', showLabel = false }: SubscribeButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      {showLabel ? (
        <Button
          variant="ghost"
          iconLeft={<MailIcon />}
          onClick={() => setIsModalOpen(true)}
          className={className}
          title="Subscribe"
        >
          Subscribe
        </Button>
      ) : (
        <Button
          iconOnly
          variant="ghost"
          onClick={() => setIsModalOpen(true)}
          className={className}
          aria-label="Subscribe to new poems"
          title="Subscribe"
        >
          <MailIcon />
        </Button>
      )}

      <SubscribeModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  );
}
