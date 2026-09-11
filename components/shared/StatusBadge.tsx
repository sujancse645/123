import React from 'react';
import { cn } from '@/lib/utils';
import {
  CheckCircle2,
  Clock,
  XCircle,
  AlertCircle,
  Check,
  Building2,
  ShieldCheck,
  UserCheck,
  UserX,
  CalendarHeart,
} from 'lucide-react';

interface StatusBadgeProps {
  status: string;
  className?: string;
  size?: 'sm' | 'md';
}

export function StatusBadge({ status, className, size = 'md' }: StatusBadgeProps) {
  const norm = (status || '').toLowerCase().replace(/[\s-]/g, '_');

  let text = status;
  let bg = 'bg-[#F4F3F5] text-[#74717A] border-[#E4E1E5]';
  let icon = <Clock className="w-3.5 h-3.5" />;

  switch (norm) {
    case 'paid':
    case 'approved':
    case 'verified':
    case 'connected':
    case 'active':
    case 'checked_in':
    case 'present':
    case 'running':
      bg = 'bg-[#EBF6F0] text-[#438A6B] border-[#C3E6D5]';
      icon = norm === 'checked_in' ? <UserCheck className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />;
      if (norm === 'checked_in') text = 'Checked In';
      break;

    case 'submitted':
    case 'pending':
    case 'computed':
    case 'syncing':
    case 'probation':
    case 'late':
    case 'late_arrival':
    case 'scheduled':
      bg = 'bg-[#FFF6D2] text-[#9A6B0A] border-[#F8E29E]';
      icon = <Clock className="w-3.5 h-3.5" />;
      if (norm === 'late_arrival') text = 'Late Arrival';
      if (norm === 'scheduled') text = 'Scheduled / Upcoming';
      break;

    case 'validated':
      bg = 'bg-[#F3EEF2] text-[#714B67] border-[#D8C7D4]';
      icon = <ShieldCheck className="w-3.5 h-3.5" />;
      break;

    case 'refused':
    case 'rejected':
    case 'failed':
    case 'error':
    case 'disconnected':
    case 'unauthorized_absence':
    case 'absent':
      bg = 'bg-[#FDF1F0] text-[#C85A54] border-[#F6CBC8]';
      icon = norm === 'absent' ? <UserX className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />;
      if (norm === 'unauthorized_absence') text = 'Unauthorized Absence';
      if (norm === 'rejected') text = 'Refused';
      break;

    case 'checked_out':
      bg = 'bg-[#F4F3F5] text-[#74717A] border-[#E4E1E5]';
      icon = <UserX className="w-3.5 h-3.5" />;
      text = 'Checked Out';
      break;

    case 'on_leave':
    case 'leave':
      bg = 'bg-[#F1ECF5] text-[#714B67] border-[#DBCFE1]';
      icon = <CalendarHeart className="w-3.5 h-3.5" />;
      text = 'On Leave';
      break;

    case 'draft':
      bg = 'bg-[#F4F3F5] text-[#74717A] border-[#E4E1E5]';
      icon = <Clock className="w-3.5 h-3.5" />;
      break;

    case 'missing_checkout':
      bg = 'bg-[#FFF6D2] text-[#9A6B0A] border-[#F8E29E]';
      icon = <AlertCircle className="w-3.5 h-3.5" />;
      text = 'Missing Signout';
      break;

    default:
      bg = 'bg-[#F4F3F5] text-[#74717A] border-[#E4E1E5]';
      icon = <Clock className="w-3.5 h-3.5" />;
      break;
  }

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 font-medium border rounded-full whitespace-nowrap transition-colors select-none',
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs',
        bg,
        className
      )}
    >
      {icon}
      <span>{text.charAt(0).toUpperCase() + text.slice(1)}</span>
    </span>
  );
}
