import React from 'react';

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  key?: string | number;
  className?: string;
}

export function Skeleton({ className = '' }: SkeletonProps) {
  return (
    <div className={`animate-pulse bg-zinc-800/60 rounded-xl ${className}`} />
  );
}
