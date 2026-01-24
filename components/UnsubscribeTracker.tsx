'use client';

import { useEffect, useRef } from 'react';
import { trackUnsubscribe } from './AmplitudeProvider';

export function UnsubscribeTracker() {
  const tracked = useRef(false);

  useEffect(() => {
    if (!tracked.current) {
      tracked.current = true;
      trackUnsubscribe(true);
    }
  }, []);

  return null;
}
