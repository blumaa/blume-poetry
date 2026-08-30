import { PoemEditor } from '@/components/admin/PoemEditor';
import styles from './page.module.css';

export default function NewPoemPage() {
  return (
    <div>
      <h1 className={styles.title}>New Poem</h1>
      <PoemEditor isNew />
    </div>
  );
}
