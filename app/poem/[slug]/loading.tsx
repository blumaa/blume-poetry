import { SkeletonPoem } from '@/components/Skeleton';

export default function PoemLoading() {
  return (
    <article className="py-8 md:py-12 px-4 md:px-8 max-w-2xl">
      <SkeletonPoem />
    </article>
  );
}
