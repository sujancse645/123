import React from 'react';
import { LucideIcon, FolderSearch } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description: string;
  actionText?: string;
  onAction?: () => void;
  className?: string;
}

export function EmptyState({
  icon: Icon = FolderSearch,
  title,
  description,
  actionText,
  onAction,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center p-8 text-center rounded-[16px] border border-dashed border-[#E4E1E5] bg-[#FBFAFB]/80',
        className
      )}
    >
      <div className="w-12 h-12 rounded-[14px] bg-[#F4F3F5] text-[#714B67] flex items-center justify-center mb-3">
        <Icon className="w-6 h-6" />
      </div>
      <h4 className="text-base font-semibold text-[#28262D]">{title}</h4>
      <p className="mt-1 text-sm text-[#74717A] max-w-sm">{description}</p>
      {actionText && onAction && (
        <button
          onClick={onAction}
          className="mt-4 px-4 py-2 text-sm font-medium bg-[#714B67] text-white hover:bg-[#5C3C53] rounded-[10px] transition-colors"
        >
          {actionText}
        </button>
      )}
    </div>
  );
}

export function LoadingSkeleton({ rows = 4, className }: { rows?: number; className?: string }) {
  return (
    <div className={cn('space-y-3 p-4 bg-white rounded-[16px] border border-[#E4E1E5]', className)}>
      <div className="h-5 bg-[#F4F3F5] rounded-md w-1/3 animate-pulse" />
      <div className="space-y-2 pt-2">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="h-10 bg-[#F4F3F5]/80 rounded-[10px] w-full animate-pulse" />
        ))}
      </div>
    </div>
  );
}
