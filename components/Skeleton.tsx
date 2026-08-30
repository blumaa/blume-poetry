import { Skeleton } from '@/components/mds';
import styles from './Skeleton.module.css';

export function SkeletonPoem() {
  return (
    <div className={styles.poemWrap} aria-label="Loading poem...">
      {/* Title */}
      <Skeleton variant="rect" width="50%" height="2.5rem" />
      {/* Subtitle */}
      <Skeleton variant="rect" width="33%" height="1.25rem" />
      {/* Date */}
      <Skeleton variant="rect" width="6rem" height="1rem" />
      {/* Content */}
      <div className={styles.contentLines}>
        <Skeleton lines={4} />
        <Skeleton lines={3} />
        <Skeleton lines={5} />
        <Skeleton lines={2} />
      </div>
    </div>
  );
}

export function SkeletonCard() {
  return (
    <div className={styles.card} aria-hidden="true">
      <Skeleton variant="rect" width="33%" height="1.5rem" />
      <Skeleton variant="rect" width="25%" height="2rem" />
    </div>
  );
}

export function SkeletonComment() {
  return (
    <div className={styles.comment} aria-hidden="true">
      <div className={styles.commentMeta}>
        <Skeleton variant="rect" width="6rem" height="1rem" />
        <Skeleton variant="rect" width="4rem" height="0.75rem" />
      </div>
      <Skeleton lines={2} />
    </div>
  );
}

export function SkeletonList({ count = 5 }: { count?: number }) {
  return (
    <div className={styles.list} aria-hidden="true">
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} variant="rect" width="100%" height="2.75rem" />
      ))}
    </div>
  );
}
