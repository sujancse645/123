'use client';

import React from 'react';
import { cn } from '@/lib/utils';

export type SemanticIconVariant =
  | 'checkin'
  | 'verified'
  | 'checkedin'
  | 'checkout'
  | 'attendance'
  | 'leave'
  | 'payroll'
  | 'salary'
  | 'payslip'
  | 'documents'
  | 'employee'
  | 'profile'
  | 'loan'
  | 'email'
  | 'success'
  | 'warning'
  | 'failure'
  | 'disabled';

export type SemanticIconSize = 'dashboard' | 'table' | 'sm' | 'lg';

interface SemanticIconTileProps {
  icon: React.ReactNode;
  variant?: SemanticIconVariant;
  size?: SemanticIconSize;
  className?: string;
  shape?: 'rounded' | 'circle';
}

/**
 * Purposeful semantic icon tile system for PeoplePay360.
 * Replaces repeated solid purple tiles with a deliberate, accessible operational color palette.
 */
export function SemanticIconTile({
  icon,
  variant = 'payroll',
  size = 'dashboard',
  className,
  shape,
}: SemanticIconTileProps) {
  // Dimension and inner styling
  const sizeClasses = {
    sm: 'w-7 h-7 text-xs [&>svg]:w-3.5 [&>svg]:h-3.5',
    table: 'w-8 h-8 md:w-9 md:h-9 text-xs [&>svg]:w-4 [&>svg]:h-4',
    dashboard: 'w-10 h-10 md:w-11 md:h-11 text-sm [&>svg]:w-5 [&>svg]:h-5',
    lg: 'w-12 h-12 text-base [&>svg]:w-6 [&>svg]:h-6',
  }[size];

  // Specific semantic color mappings requested by design system
  const variantStyles: Record<SemanticIconVariant, { bg: string; shapeOverride?: string }> = {
    // Check In: charcoal icon on a warm-yellow circular background
    checkin: {
      bg: 'bg-[#F4C430] text-[#28262D] border border-[#E5B520]',
      shapeOverride: 'rounded-full',
    },
    // Checked In or Verified: white icon on a muted-green background
    verified: {
      bg: 'bg-[#438A6B] text-white shadow-xs',
      shapeOverride: 'rounded-[12px]',
    },
    checkedin: {
      bg: 'bg-[#438A6B] text-white shadow-xs',
      shapeOverride: 'rounded-[12px]',
    },
    // Check Out: charcoal icon on a soft-grey background with an amber border
    checkout: {
      bg: 'bg-[#F4F3F5] text-[#28262D] border border-[#F4C430]',
      shapeOverride: 'rounded-[12px]',
    },
    // Attendance: warm-yellow or charcoal
    attendance: {
      bg: 'bg-[#FFF8E1] text-[#28262D] border border-[#FBE6A2]',
      shapeOverride: 'rounded-[12px]',
    },
    // Leave: amber
    leave: {
      bg: 'bg-[#FEF3C7] text-[#B45309] border border-[#FDE68A]',
      shapeOverride: 'rounded-[12px]',
    },
    // Salary and Payroll: plum
    salary: {
      bg: 'bg-[#F5EDF3] text-[#714B67] border border-[#E8D9E5]',
      shapeOverride: 'rounded-[12px]',
    },
    payroll: {
      bg: 'bg-[#F5EDF3] text-[#714B67] border border-[#E8D9E5]',
      shapeOverride: 'rounded-[12px]',
    },
    // Payslip and Documents: slate grey
    payslip: {
      bg: 'bg-[#F1F3F5] text-[#5C6470] border border-[#E2E6EA]',
      shapeOverride: 'rounded-[12px]',
    },
    documents: {
      bg: 'bg-[#F1F3F5] text-[#5C6470] border border-[#E2E6EA]',
      shapeOverride: 'rounded-[12px]',
    },
    // Employee and Profile: muted lavender
    employee: {
      bg: 'bg-[#F8F2F8] text-[#7C5A7E] border border-[#EEDDEE]',
      shapeOverride: 'rounded-[12px]',
    },
    profile: {
      bg: 'bg-[#F8F2F8] text-[#7C5A7E] border border-[#EEDDEE]',
      shapeOverride: 'rounded-[12px]',
    },
    // Loan: warm brown or amber
    loan: {
      bg: 'bg-[#FEF3C7] text-[#92400E] border border-[#FCD34D]',
      shapeOverride: 'rounded-[12px]',
    },
    // Email: charcoal with a pale-yellow background
    email: {
      bg: 'bg-[#FEF9E7] text-[#28262D] border border-[#FBE9B6]',
      shapeOverride: 'rounded-[12px]',
    },
    // Success: muted green
    success: {
      bg: 'bg-[#DCFCE7] text-[#166534] border border-[#BBF7D0]',
      shapeOverride: 'rounded-[12px]',
    },
    // Warning: amber
    warning: {
      bg: 'bg-[#FFF6D2] text-[#9A6B0A] border border-[#F8E29E]',
      shapeOverride: 'rounded-[12px]',
    },
    // Failure: muted red
    failure: {
      bg: 'bg-[#FEE2E2] text-[#991B1B] border border-[#FECACA]',
      shapeOverride: 'rounded-[12px]',
    },
    // Disabled: neutral grey
    disabled: {
      bg: 'bg-[#F3F4F6] text-[#6B7280] border border-[#E5E7EB]',
      shapeOverride: 'rounded-[12px]',
    },
  };

  const current = variantStyles[variant] || variantStyles.payroll;
  const determinedShape = shape
    ? shape === 'circle'
      ? 'rounded-full'
      : 'rounded-[12px]'
    : current.shapeOverride || 'rounded-[12px]';

  return (
    <div
      className={cn(
        'inline-flex items-center justify-center shrink-0 transition-colors',
        determinedShape,
        sizeClasses,
        current.bg,
        className
      )}
    >
      {icon}
    </div>
  );
}
