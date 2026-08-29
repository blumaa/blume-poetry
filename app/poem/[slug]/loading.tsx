import { SkeletonPoem } from '@/components/Skeleton';
import styles from './loading.module.css';

export default function PoemLoading() {
  return (
    <article className={styles.article}>
      <SkeletonPoem />
    </article>
  );
}
