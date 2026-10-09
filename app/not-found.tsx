import { PageShell } from '@/components/PageShell';
import { ButtonLink } from '@/components/mds';
import styles from './not-found.module.css';

export default function NotFound() {
  return (
    <PageShell>
      <div className={styles.content}>
        <div className={styles.inner}>
          <h1 className={styles.title}>
            Page not found
          </h1>
          <p className={styles.message}>
            The poem you are looking for may have moved or does not exist.
          </p>
          <ButtonLink href="/">
            Return to latest poem
          </ButtonLink>
        </div>
      </div>
    </PageShell>
  );
}
