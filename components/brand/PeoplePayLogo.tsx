'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface LogoProps {
  size?: number;
  className?: string;
}

/**
 * PeoplePayLogo - Original enterprise brand mark for PeoplePay360
 * Concept:
 * - Rounded square container in rich plum (#714B67)
 * - Three connected node-figures in warm yellow (#F4C430) and clean white,
 *   representing Employees, HR, and Payroll united in a 360-degree ecosystem
 * - Subtle integrated "P" loop contour
 */
export function PeoplePayLogo({ size = 36, className }: LogoProps) {
  return (
    <img
      src="/logo.png"
      alt="PeoplePay360 Logo"
      width={size}
      height={size}
      className={cn('shrink-0 select-none object-contain transition-transform duration-150', className)}
    />
  );
}

interface WordmarkProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showSubtitle?: boolean;
}

export function PeoplePayWordmark({
  className,
  size = 'md',
  showSubtitle = true,
}: WordmarkProps) {
  return (
    <div className={cn('flex flex-col select-none leading-none', className)}>
      <div className="flex items-baseline whitespace-nowrap">
        <span
          className={cn(
            'font-black tracking-tight text-[#28262D]',
            size === 'sm' && 'text-sm',
            size === 'md' && 'text-[17px]',
            size === 'lg' && 'text-xl'
          )}
        >
          PeoplePay
        </span>
        <span
          className={cn(
            'font-black tracking-tight text-[#714B67]',
            size === 'sm' && 'text-sm ml-0.5',
            size === 'md' && 'text-[17px] ml-0.5',
            size === 'lg' && 'text-xl ml-1'
          )}
        >
          360
        </span>
      </div>
      {showSubtitle && (
        <span className="text-[9.5px] uppercase font-bold tracking-wider text-[#A4879F] mt-1 whitespace-nowrap">
          Enterprise HR & Payroll
        </span>
      )}
    </div>
  );
}

interface SidebarBrandProps {
  isCollapsed: boolean;
  onClick?: () => void;
  className?: string;
}

export function SidebarBrand({ isCollapsed, onClick, className }: SidebarBrandProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        'flex items-center gap-3 cursor-pointer select-none transition-all',
        isCollapsed ? 'justify-center w-full' : 'min-w-0 flex-1',
        className
      )}
      title="PeoplePay360"
    >
      <PeoplePayLogo size={36} />
      {!isCollapsed && (
        <div className="min-w-0 flex-1 overflow-hidden">
          <PeoplePayWordmark size="md" showSubtitle />
        </div>
      )}
    </div>
  );
}
