import React from 'react';
import { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
}

export function EmptyState({ icon: Icon, title, description }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center bg-zinc-900/30 border border-dashed border-zinc-800 rounded-2xl w-full">
      <div className="w-12 h-12 rounded-full bg-zinc-800/80 flex items-center justify-center mb-4 text-zinc-400">
        <Icon className="w-6 h-6" />
      </div>
      <h3 className="text-zinc-200 font-semibold text-sm sm:text-base">{title}</h3>
      <p className="text-zinc-400 text-xs sm:text-sm max-w-sm mt-1">{description}</p>
    </div>
  );
}
