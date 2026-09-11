'use client';

import React from 'react';
import { useApp } from '@/lib/context/app-context';
import {
  LayoutDashboard,
  CalendarCheck,
  CalendarHeart,
  FileText,
  User,
  X,
  Sparkles,
  CreditCard,
  FileCheck,
  LogOut,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { PeoplePayLogo, PeoplePayWordmark } from '@/components/brand/PeoplePayLogo';

interface MobileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MobileDrawer({ isOpen, onClose }: MobileDrawerProps) {
  const { activeTab, setActiveTab, currentUser, currentRole, setIsRoleSwitcherOpen, signOut } = useApp();

  if (!isOpen) return null;

  const navItems = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'attendance', label: 'Attendance', icon: CalendarCheck },
    { id: 'leave', label: 'Leave', icon: CalendarHeart },
    { id: 'my_loans', label: 'My Loans', icon: CreditCard },
    { id: 'payslips', label: 'My Payslips', icon: FileText },
    { id: 'profile', label: 'Profile', icon: User },
    ...(currentRole === 'hr_manager' || currentRole === 'admin'
      ? [
          { id: 'medical_proofs', label: 'Medical Proofs', icon: FileCheck },
          { id: 'company_loans', label: 'Employee Loans', icon: CreditCard },
          { id: 'employees', label: 'Employees', icon: User },
          { id: 'approvals', label: 'Approvals', icon: CalendarCheck },
        ]
      : []),
    ...(currentRole === 'payroll_user' || currentRole === 'payroll_manager' || currentRole === 'admin'
      ? [
          { id: 'payruns', label: 'Payruns', icon: FileText },
          { id: 'company_loans', label: 'Loan Deductions', icon: CreditCard },
          { id: 'reports', label: 'Reports', icon: LayoutDashboard },
        ]
      : []),
  ];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 md:hidden">
        <div onClick={onClose} className="fixed inset-0 bg-black/40 backdrop-blur-xs" />

        <motion.div
          initial={{ x: '-100%' }}
          animate={{ x: 0 }}
          exit={{ x: '-100%' }}
          transition={{ duration: 0.2 }}
          className="relative w-4/5 max-w-xs h-full bg-white shadow-xl flex flex-col p-4"
        >
          <div className="flex items-center justify-between pb-4 border-b border-[#F4F3F5]">
            <div className="flex items-center gap-2.5">
              <PeoplePayLogo size={32} />
              <div>
                <PeoplePayWordmark size="sm" />
                <p className="text-[10px] text-[#714B67] font-semibold">{currentUser.roleTitle}</p>
              </div>
            </div>
            <button onClick={onClose} className="p-1 rounded-md text-[#74717A]">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto py-4 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id);
                    onClose();
                  }}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2.5 rounded-[12px] text-xs font-semibold transition-colors',
                    isActive ? 'bg-[#714B67] text-white' : 'text-[#28262D] hover:bg-[#F4F3F5]'
                  )}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>

          <div className="pt-3 border-t border-[#F4F3F5] space-y-2">
            <button
              onClick={() => {
                setIsRoleSwitcherOpen(true);
                onClose();
              }}
              className="w-full flex items-center justify-center gap-2 py-2 text-xs font-semibold text-[#9A6B0A] bg-[#FFF6D2] rounded-[10px] border border-[#F8E29E]"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Switch Role / Demo Persona
            </button>
            <button
              onClick={() => {
                onClose();
                signOut();
              }}
              className="w-full flex items-center justify-center gap-2 py-2 text-xs font-semibold text-[#C85A54] bg-[#FDF1F0] rounded-[10px] border border-[#F6CBC8]"
            >
              <LogOut className="w-3.5 h-3.5" />
              Sign Out
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

export function MobileBottomNav() {
  const { activeTab, setActiveTab } = useApp();

  const primaryMobileTabs = [
    { id: 'overview', label: 'Home', icon: LayoutDashboard },
    { id: 'attendance', label: 'Attendance', icon: CalendarCheck },
    { id: 'leave', label: 'Leave', icon: CalendarHeart },
    { id: 'payslips', label: 'Payslips', icon: FileText },
    { id: 'profile', label: 'Profile', icon: User },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-md border-t border-[#E4E1E5] px-2 py-1.5 flex items-center justify-around">
      {primaryMobileTabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'flex flex-col items-center gap-0.5 py-1 px-3 rounded-[10px] text-[10px] font-medium transition-colors',
              isActive ? 'text-[#714B67] font-bold' : 'text-[#74717A] hover:text-[#28262D]'
            )}
          >
            <Icon className={cn('w-4 h-4', isActive ? 'text-[#714B67]' : 'text-[#74717A]')} />
            <span>{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

export const MobileNav = MobileBottomNav;
