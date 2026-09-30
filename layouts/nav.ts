import type { ReactNode } from 'react';

/** One navigation target. A shell renders the same list as desktop links and as mobile tabs. */
export interface NavDestination {
  href: string;
  label: string;
  icon: ReactNode;
  /** Active only on this exact path, not on its children (e.g. a dashboard root). */
  exact?: boolean;
}

export function isActiveDestination(destination: NavDestination, pathname: string): boolean {
  return destination.exact ? pathname === destination.href : pathname.startsWith(destination.href);
}
