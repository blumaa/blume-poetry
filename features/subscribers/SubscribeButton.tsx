'use client';

import { useState } from 'react';
import { Button } from '@/components/mds';
import { Icon } from '@/components/icons';
import { SubscribeModal } from './SubscribeModal';

interface SubscribeButtonProps {
  className?: string;
  showLabel?: boolean;
}

export function SubscribeButton({ className = '', showLabel = false }: SubscribeButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      {showLabel ? (
        <Button
          variant="ghost"
          iconLeft={<Icon name="mail" />}
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
          <Icon name="mail" />
        </Button>
      )}

      <SubscribeModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  );
}
