'use client';

import { Sheet, SheetBody, SheetHeader } from '@/components/mds';
import { ReactionPicker } from './ReactionPicker';
import { useEmojiCatalogue } from './useReactions';

export interface ReactionPickerSheetProps {
  open: boolean;
  onClose: () => void;
  onSelect: (emoji: string) => void;
  selected: readonly string[];
  pending: boolean;
}

const NOOP = () => {};

export function ReactionPickerSheet({ open, onClose, onSelect, selected, pending }: ReactionPickerSheetProps) {
  const catalogue = useEmojiCatalogue(open);

  // Nothing leaves while the pick is being written: it is what the reader waits on.
  const close = pending ? NOOP : onClose;

  return (
    <Sheet open={open} onClose={close} label="Pick a reaction" closeOnScrimClick={!pending}>
      <SheetHeader onClose={close} closeLabel="Close">
        Pick a reaction
      </SheetHeader>
      <SheetBody>
        <ReactionPicker
          emoji={catalogue.data ?? []}
          selected={selected}
          onSelect={onSelect}
          loading={catalogue.isPending}
          pending={pending}
        />
      </SheetBody>
    </Sheet>
  );
}
