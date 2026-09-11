'use client';

import React, { useState } from 'react';
import { useApp } from '@/lib/context/app-context';
import {
  Bell,
  UserCheck,
  UserX,
  Sparkles,
  Menu,
  ChevronDown,
  User,
  LogOut,
  Settings,
  HelpCircle,
} from 'lucide-react';
import { NotificationsDrawer } from './NotificationsDrawer';
import { RoleSwitcherModal } from './RoleSwitcherModal';
import { cn } from '@/lib/utils';

export function Header({ onToggleMobileMenu }: { onToggleMobileMenu?: () => void }) {
  const {
    currentUser,
    currentEmployee,
    setIsCheckInModalOpen,
    notifications,
    isRoleSwitcherOpen,
    setIsRoleSwitcherOpen,
    setActiveTab,
    signOut,
  } = useApp();

  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);

  const unreadCount = notifications.filter((n) => !n.read).length;
  const isCheckedIn = currentEmployee.currentAttendanceStatus === 'checked_in';

  return (
    <>
      <header className="sticky top-0 z-20 h-16 bg-white/95 backdrop-blur-md border-b border-[#E4E1E5] px-4 lg:px-6 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1">
          <button
            onClick={onToggleMobileMenu}
            className="md:hidden p-2 rounded-[10px] text-[#74717A] hover:bg-[#F4F3F5] transition-colors"
            aria-label="Open mobile menu"
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>

        {/* Right Actions: Attendance, Quick Check In/Out, Notifications, Role Switcher, Profile */}
        <div className="flex items-center gap-2.5">
          {/* Attendance Status Badge */}
          <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#FBFAFB] border border-[#E4E1E5] text-xs">
            <span
              className={cn(
                'w-2 h-2 rounded-full',
                isCheckedIn ? 'bg-[#438A6B] animate-pulse' : 'bg-[#74717A]'
              )}
            />
            <span className="text-[#74717A]">
              Status:{' '}
              <strong className={isCheckedIn ? 'text-[#438A6B]' : 'text-[#74717A]'}>
                {isCheckedIn ? 'Checked In' : 'Checked Out'}
              </strong>
            </span>
            {isCheckedIn && currentEmployee.todayCheckInTime && (
              <span className="text-[11px] font-mono text-[#A4879F]">
                ({currentEmployee.todayCheckInTime})
              </span>
            )}
          </div>

          {/* Quick Check In / Check Out Action Button */}
          <button
            onClick={() => setIsCheckInModalOpen(true)}
            className={cn(
              'flex items-center gap-1.5 px-3.5 py-2 rounded-[12px] text-xs font-semibold shadow-xs transition-all duration-150 active:scale-98',
              isCheckedIn
                ? 'bg-white text-[#C85A54] border border-[#F6CBC8] hover:bg-[#FDF1F0]'
                : 'bg-[#714B67] text-white hover:bg-[#5C3C53] border border-transparent'
            )}
          >
            {isCheckedIn ? (
              <>
                <UserX className="w-3.5 h-3.5 text-[#C85A54]" />
                <span className="hidden sm:inline">Check Out</span>
              </>
            ) : (
              <>
                <UserCheck className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Quick Check In</span>
              </>
            )}
          </button>

          {/* Role Switcher Button */}
          <button
            onClick={() => setIsRoleSwitcherOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-[12px] bg-[#FFF6D2] hover:bg-[#FDECA8] border border-[#F8E29E] text-xs font-bold text-[#9A6B0A] transition-colors"
            title="Switch demo role"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#D49525]" />
            <span className="hidden md:inline">{currentUser.roleTitle}</span>
            <ChevronDown className="w-3 h-3 text-[#9A6B0A]" />
          </button>

          {/* Notifications Bell */}
          <button
            onClick={() => setIsNotificationsOpen(true)}
            className="relative p-2 rounded-[12px] text-[#74717A] hover:text-[#28262D] hover:bg-[#F4F3F5] transition-colors"
            title="Notifications"
            aria-label="View notifications"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#C85A54] ring-2 ring-white" />
            )}
          </button>

          {/* Profile Menu Trigger */}
          <div className="relative">
            <button
              onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
              className="flex items-center gap-2 p-1 rounded-full hover:ring-2 hover:ring-[#714B67]/20 transition-all"
            >
              <img
                src={currentUser.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
                alt={currentUser.name}
                className="w-8 h-8 rounded-full object-cover border border-[#E4E1E5]"
              />
            </button>

            {/* Profile Dropdown */}
            {isProfileMenuOpen && (
              <div
                onClick={() => setIsProfileMenuOpen(false)}
                className="absolute right-0 mt-2 w-64 bg-white rounded-[16px] border border-[#E4E1E5] shadow-xl p-2 z-50 divide-y divide-[#F4F3F5]"
              >
                <div className="p-3">
                  <p className="text-xs font-bold text-[#28262D]">{currentUser.name}</p>
                  <p className="text-[11px] text-[#74717A] truncate">{currentUser.email}</p>
                  <div className="mt-2 flex items-center justify-between text-[10px]">
                    <span className="px-2 py-0.5 rounded-full bg-[#F4F3F5] text-[#714B67] font-semibold">
                      {currentUser.roleTitle}
                    </span>
                    <span className="font-mono text-[#A4879F]">{currentUser.employeeId}</span>
                  </div>
                </div>

                <div className="py-1">
                  <button
                    onClick={() => {
                      setActiveTab('profile');
                      setIsProfileMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs text-[#28262D] hover:bg-[#F4F3F5] rounded-[10px] transition-colors"
                  >
                    <User className="w-3.5 h-3.5 text-[#714B67]" />
                    <span>My Profile</span>
                  </button>
                  <button
                    onClick={() => {
                      setIsRoleSwitcherOpen(true);
                      setIsProfileMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs text-[#28262D] hover:bg-[#F4F3F5] rounded-[10px] transition-colors"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-[#D49525]" />
                    <span>Switch Role / Demo Persona</span>
                  </button>
                  <button
                    onClick={() => {
                      setIsProfileMenuOpen(false);
                      signOut();
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-[#C85A54] hover:bg-[#FDF1F0] rounded-[10px] transition-colors"
                  >
                    <LogOut className="w-3.5 h-3.5 text-[#C85A54]" />
                    <span>Sign Out</span>
                  </button>
                </div>
                <div className="pt-1">
                  <button
                    onClick={signOut}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-[#C85A54] hover:bg-[#FDF1F0] rounded-[10px] transition-colors"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Drawers and Modals */}
      <NotificationsDrawer
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
      />
      <RoleSwitcherModal
        isOpen={isRoleSwitcherOpen}
        onClose={() => setIsRoleSwitcherOpen(false)}
      />
    </>
  );
}
