import { useId } from 'react';
import { Switch } from '@/components/mds';
import type { PoemCollection, PoemStatus } from '@/lib/supabase/types';
import styles from './NotifySwitch.module.css';

interface NotifyInput {
  status: PoemStatus;
  collection: PoemCollection;
  notifiedAt: string | null | undefined;
}

/** Whether this save may email subscribers, and the line that says why. */
export function notifyAvailability({ status, collection, notifiedAt }: NotifyInput) {
  // A kinky poem in an email would reveal its URL.
  if (collection === 'kinky') return { canNotify: false, hint: 'Kinky poems are never emailed.' };
  // The server stamps `notified_at` when it sends; mail goes out once per poem.
  if (notifiedAt) {
    return { canNotify: false, hint: 'Subscribers were already emailed about this poem.' };
  }
  if (status !== 'published') {
    return { canNotify: false, hint: 'Sends when the poem is saved as Published.' };
  }
  return {
    canNotify: true,
    hint: 'Goes to everyone with new-poem emails turned on. Only ever sent once per poem.',
  };
}

interface NotifySwitchProps {
  canNotify: boolean;
  hint: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

export function NotifySwitch({ canNotify, hint, checked, onChange }: NotifySwitchProps) {
  const hintId = useId();
  return (
    <div>
      <Switch
        label="Email subscribers"
        checked={canNotify && checked}
        disabled={!canNotify}
        aria-describedby={hintId}
        onChange={(e) => onChange(e.target.checked)}
      />
      <p id={hintId} className={styles.hint}>
        {hint}
      </p>
    </div>
  );
}
