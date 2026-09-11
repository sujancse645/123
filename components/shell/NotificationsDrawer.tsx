'use client';

import React from 'react';
import { useApp } from '@/lib/context/app-context';
import { motion, AnimatePresence } from 'motion/react';
import {
  Bell,
  X,
  CheckCheck,
  CalendarHeart,
  CreditCard,
  UserCheck,
  User,
  Radio,
  Clock,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface NotificationsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function NotificationsDrawer({ isOpen, onClose }: NotificationsDrawerProps) {
  const { notifications, markNotificationRead, clearAllNotifications, setActiveTab } = useApp();

  if (!isOpen) return null;

  const unreadCount = notifications.filter((n) => !n.read).length;

  const getIcon = (type: string) => {
    switch (type) {
      case 'leave':
        return <CalendarHeart className="w-4 h-4 text-[#714B67]" />;
      case 'payroll':
        return <CreditCard className="w-4 h-4 text-[#438A6B]" />;
      case 'attendance':
        return <UserCheck className="w-4 h-4 text-[#D49525]" />;
      case 'profile':
        return <User className="w-4 h-4 text-[#714B67]" />;
      case 'biometric':
        return <Radio className="w-4 h-4 text-[#C85A54]" />;
      default:
        return <Bell className="w-4 h-4 text-[#74717A]" />;
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 overflow-hidden">
        {/* Backdrop */}
        <div
          onClick={onClose}
          className="absolute inset-0 bg-black/35 backdrop-blur-[2px] transition-opacity"
        />

        <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="w-screen max-w-md bg-white border-l border-[#E4E1E5] shadow-2xl flex flex-col"
          >
            {/* Header */}
            <div className="p-5 border-b border-[#F4F3F5] flex items-center justify-between bg-[#FBFAFB]">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-[10px] bg-[#F3EEF2] text-[#714B67] flex items-center justify-center">
                  <Bell className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#28262D]">Notifications</h3>
                  <p className="text-xs text-[#74717A]">
                    {unreadCount > 0 ? `${unreadCount} unread alerts` : 'All caught up'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1">
                {unreadCount > 0 && (
                  <button
                    onClick={clearAllNotifications}
                    title="Mark all as read"
                    className="p-1.5 text-xs text-[#714B67] hover:bg-[#F4F3F5] rounded-[8px] transition-colors flex items-center gap-1 font-medium"
                  >
                    <CheckCheck className="w-4 h-4" />
                    <span>Mark all</span>
                  </button>
                )}
                <button
                  onClick={onClose}
                  className="p-1.5 rounded-full text-[#74717A] hover:bg-[#F4F3F5] transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto divide-y divide-[#F4F3F5]">
              {notifications.length === 0 ? (
                <div className="p-8 text-center text-[#74717A]">
                  <p className="text-sm">No notifications yet.</p>
                </div>
              ) : (
                notifications.map((n) => (
                  <div
                    key={n.id}
                    onClick={() => {
                      markNotificationRead(n.id);
                      if (n.type === 'leave') setActiveTab('leave');
                      else if (n.type === 'payroll') setActiveTab('payslips');
                      else if (n.type === 'attendance') setActiveTab('attendance');
                      else if (n.type === 'profile') setActiveTab('profile');
                      onClose();
                    }}
                    className={cn(
                      'p-4 transition-colors cursor-pointer hover:bg-[#FBFAFB] flex items-start gap-3.5',
                      !n.read && 'bg-[#FAF8FA]'
                    )}
                  >
                    <div className="w-8 h-8 rounded-[10px] bg-[#F4F3F5] flex items-center justify-center shrink-0 mt-0.5">
                      {getIcon(n.type)}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h4 className={cn('text-xs font-semibold text-[#28262D]', !n.read && 'font-bold text-[#714B67]')}>
                          {n.title}
                        </h4>
                        {!n.read && (
                          <span className="w-2 h-2 rounded-full bg-[#714B67] shrink-0" />
                        )}
                      </div>
                      <p className="text-xs text-[#74717A] mt-1 leading-relaxed">{n.message}</p>
                      <div className="mt-1.5 flex items-center gap-1 text-[11px] text-[#A4879F]">
                        <Clock className="w-3 h-3" />
                        <span>{n.timestamp}</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-[#F4F3F5] bg-[#FBFAFB] text-center text-xs text-[#74717A]">
              Real-time enterprise notifications enabled
            </div>
          </motion.div>
        </div>
      </div>
    </AnimatePresence>
  );
}
