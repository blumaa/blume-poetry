import { Skeleton } from '@/components/mds';

export function SkeletonPoem() {
  return (
    <div className="space-y-6" aria-label="Loading poem...">
      {/* Title */}
      <Skeleton variant="rect" width="50%" height="2.5rem" />
      {/* Subtitle */}
      <Skeleton variant="rect" width="33%" height="1.25rem" />
      {/* Date */}
      <Skeleton variant="rect" width="6rem" height="1rem" />
      {/* Content */}
      <div className="space-y-4 mt-8">
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
    <div className="p-6 bg-surface rounded-lg border border-border space-y-3" aria-hidden="true">
      <Skeleton variant="rect" width="33%" height="1.5rem" />
      <Skeleton variant="rect" width="25%" height="2rem" />
    </div>
  );
}

export function SkeletonComment() {
  return (
    <div className="py-4 space-y-2" aria-hidden="true">
      <div className="flex items-center gap-2">
        <Skeleton variant="rect" width="6rem" height="1rem" />
        <Skeleton variant="rect" width="4rem" height="0.75rem" />
      </div>
      <Skeleton lines={2} />
    </div>
  );
}

export function SkeletonList({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-2" aria-hidden="true">
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} variant="rect" width="100%" height="2.75rem" />
      ))}
    </div>
  );
}
