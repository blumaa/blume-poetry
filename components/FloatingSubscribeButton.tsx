'use client';

import { useState } from 'react';
import { SubscribeModal } from './SubscribeModal';

export function FloatingSubscribeButton() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      {/* Desktop: Bottom-right floating button */}
      <button
        onClick={() => setIsModalOpen(true)}
        className="hidden md:flex fixed bottom-6 right-6 z-40 items-center gap-2 px-4 py-3 bg-[var(--accent)] text-white rounded-full shadow-lg hover:bg-[var(--accent-hover)] hover:shadow-xl transition-all duration-200 min-h-[44px]"
        aria-label="Subscribe to new poems"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-5 w-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
          />
        </svg>
        <span className="font-medium">Subscribe</span>
      </button>

      {/* Mobile: Smaller FAB */}
      <button
        onClick={() => setIsModalOpen(true)}
        className="md:hidden fixed bottom-4 right-4 z-40 flex items-center justify-center w-14 h-14 bg-[var(--accent)] text-white rounded-full shadow-lg hover:bg-[var(--accent-hover)] hover:shadow-xl transition-all duration-200"
        aria-label="Subscribe to new poems"
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
            d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
          />
        </svg>
      </button>

      <SubscribeModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  );
}
