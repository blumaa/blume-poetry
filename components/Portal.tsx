'use client';

import { createPortal } from 'react-dom';
import { useMounted } from '@/hooks/useMounted';

interface PortalProps {
  children: React.ReactNode;
}

export function Portal({ children }: PortalProps) {
  const mounted = useMounted();

  if (!mounted) return null;

  return createPortal(children, document.body);
}
