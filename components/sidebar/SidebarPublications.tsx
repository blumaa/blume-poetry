import { ButtonLink } from '@/components/mds';
import styles from './SidebarPublications.module.css';

export const PUBLICATIONS_HREF = '/publications';

interface SidebarPublicationsProps {
  active: boolean;
  /** Called when the link is clicked. */
  onNavigate?: () => void;
}

/* Highlighted link to the publication credits, above the poem tree. */
export function SidebarPublications({ active, onNavigate }: SidebarPublicationsProps) {
  return (
    <div className={styles.wrap}>
      <ButtonLink
        href={PUBLICATIONS_HREF}
        variant="highlight"
        size="sm"
        fullWidth
        aria-current={active ? 'page' : undefined}
        onClick={onNavigate}
      >
        Published writings
      </ButtonLink>
    </div>
  );
}
