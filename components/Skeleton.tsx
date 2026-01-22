interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className = '' }: SkeletonProps) {
  return (
    <div
      className={`animate-pulse bg-hover rounded ${className}`}
      aria-hidden="true"
    />
  );
}

export function SkeletonText({ lines = 3, className = '' }: { lines?: number; className?: string }) {
  return (
    <div className={`space-y-3 ${className}`} aria-hidden="true">
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={`h-4 ${i === lines - 1 ? 'w-2/3' : 'w-full'}`}
        />
      ))}
    </div>
  );
}

export function SkeletonPoem() {
  return (
    <div className="space-y-6" aria-label="Loading poem...">
      {/* Title */}
      <Skeleton className="h-10 w-1/2" />
      {/* Subtitle */}
      <Skeleton className="h-5 w-1/3" />
      {/* Date */}
      <Skeleton className="h-4 w-24" />
      {/* Content */}
      <div className="space-y-4 mt-8">
        <SkeletonText lines={4} />
        <SkeletonText lines={3} />
        <SkeletonText lines={5} />
        <SkeletonText lines={2} />
      </div>
    </div>
  );
}

export function SkeletonCard() {
  return (
    <div className="p-6 bg-surface rounded-lg border border-border space-y-3" aria-hidden="true">
      <Skeleton className="h-6 w-1/3" />
      <Skeleton className="h-8 w-1/4" />
    </div>
  );
}

export function SkeletonButton() {
  return <Skeleton className="h-11 w-24 rounded-lg" />;
}

export function SkeletonComment() {
  return (
    <div className="py-4 space-y-2" aria-hidden="true">
      <div className="flex items-center gap-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-3 w-16" />
      </div>
      <SkeletonText lines={2} />
    </div>
  );
}

export function SkeletonList({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-2" aria-hidden="true">
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className="h-11 w-full rounded" />
      ))}
    </div>
  );
}
