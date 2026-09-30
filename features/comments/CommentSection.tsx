'use client';

import { CommentList } from './CommentList';
import { CommentModal } from './CommentModal';

interface CommentSectionProps {
  slug: string;
  isModalOpen?: boolean;
  onModalClose?: () => void;
}

export function CommentSection({ slug, isModalOpen = false, onModalClose }: CommentSectionProps) {
  return (
    <div>
      <CommentList slug={slug} />

      {/* Mounted only while open so state (saved name, spam timer) seeds
          fresh on each open via initializers instead of effects. */}
      {isModalOpen && <CommentModal onClose={() => onModalClose?.()} slug={slug} />}
    </div>
  );
}
