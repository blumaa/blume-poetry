import { PoemEditor } from '@/components/admin/PoemEditor';

export default function NewPoemPage() {
  return (
    <div>
      <h1 className="text-2xl mb-6 text-primary">New Poem</h1>
      <PoemEditor isNew />
    </div>
  );
}
