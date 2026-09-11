import React from 'react';
import { cn } from '@/lib/utils';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { SemanticIconTile, SemanticIconVariant } from './SemanticIconTile';

interface KPICardProps {
  id?: string;
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  iconVariant?: SemanticIconVariant;
  iconContainerClassName?: string;
  trend?: {
    value: string;
    isPositive?: boolean;
    label?: string;
  };
  highlight?: boolean;
  warning?: boolean;
  onClick?: () => void;
  className?: string;
  actionText?: string;
}

export function KPICard({
  id,
  title,
  value,
  subtitle,
  icon,
  iconVariant,
  iconContainerClassName,
  trend,
  highlight,
  warning,
  onClick,
  className,
  actionText,
}: KPICardProps) {
  const isClickable = !!onClick;

  // Determine default semantic variant from highlight/warning if not specified
  const effectiveVariant: SemanticIconVariant =
    iconVariant || (warning ? 'warning' : highlight ? 'payroll' : 'attendance');

  return (
    <div
      id={id}
      onClick={onClick}
      className={cn(
        'relative h-full p-5 rounded-[16px] border transition-all duration-200 bg-white flex flex-col',
        isClickable && 'cursor-pointer hover:shadow-md hover:-translate-y-0.5 active:translate-y-0',
        highlight && 'border-[#714B67]/30 bg-gradient-to-br from-white via-[#FBFAFB] to-[#F3EEF2]/50 shadow-sm',
        warning && 'border-[#F4C430]/60 bg-[#FFFDF5]',
        !highlight && !warning && 'border-[#E4E1E5] shadow-xs',
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-[#74717A] mb-1">
            {title}
          </p>
          <div className="text-2xl font-bold tracking-tight text-[#28262D] tabular-nums">
            {value}
          </div>
        </div>
        <SemanticIconTile
          icon={icon}
          variant={effectiveVariant}
          size="dashboard"
          className={iconContainerClassName}
        />
      </div>

      {(subtitle || trend || actionText) && (
        <div className="mt-auto pt-3 border-t border-[#F4F3F5] flex flex-col gap-2 text-xs text-[#74717A]">
          {subtitle && <span className="block leading-relaxed">{subtitle}</span>}
          {trend && (
            <span
              className={cn(
                'inline-flex items-center gap-0.5 font-semibold ml-auto',
                trend.isPositive ? 'text-[#438A6B]' : 'text-[#C85A54]'
              )}
            >
              {trend.isPositive ? (
                <ArrowUpRight className="w-3.5 h-3.5" />
              ) : (
                <ArrowDownRight className="w-3.5 h-3.5" />
              )}
              {trend.value} <span className="font-normal text-[#74717A]">{trend.label}</span>
            </span>
          )}
          {actionText && (
            <span className="self-end whitespace-nowrap font-medium text-[#714B67] hover:underline flex items-center gap-1">
              {actionText} →
            </span>
          )}
        </div>
      )}
    </div>
  );
}
