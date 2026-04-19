"use client";

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`skeleton ${className}`} />;
}

export function SkeletonRow({ height = 36 }: { height?: number }) {
  return (
    <div
      className="skeleton w-full"
      style={{ height: `${height}px` }}
    />
  );
}

export function SkeletonList({ rows = 5, height = 36 }: { rows?: number; height?: number }) {
  return (
    <div className="space-y-1.5">
      {Array.from({ length: rows }).map((_, i) => (
        <SkeletonRow key={i} height={height} />
      ))}
    </div>
  );
}

export function SkeletonCard() {
  return (
    <div className="bg-white rounded-lg border border-zinc-200 p-4 space-y-2">
      <Skeleton className="h-3 w-1/3" />
      <Skeleton className="h-2 w-2/3" />
      <Skeleton className="h-2 w-1/2" />
    </div>
  );
}
