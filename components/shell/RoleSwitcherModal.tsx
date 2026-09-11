'use client';

import React from 'react';
import { useApp } from '@/lib/context/app-context';
import { DEMO_USERS } from '@/lib/mock-data/users';
import { motion, AnimatePresence } from 'motion/react';
import {
  Shield,
  Briefcase,
  Calculator,
  UserCheck,
  Crown,
  Check,
  X,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import { AppRole, User } from '@/lib/types';
import { cn } from '@/lib/utils';

interface RoleSwitcherModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function RoleSwitcherModal({ isOpen, onClose }: RoleSwitcherModalProps) {
  const { currentUser, setCurrentUser } = useApp();

  if (!isOpen) return null;

  const roleDescriptions: Record<AppRole, { desc: string; icon: React.ReactNode; access: string }> = {
    employee: {
      desc: 'Self-Service: check-in/out, live impact leave request, view payslips & salary breakdown drawer.',
      icon: <UserCheck className="w-5 h-5 text-[#714B67]" />,
      access: 'Employee Self-Service (ESS)',
    },
    hr_manager: {
      desc: 'Full ESS + Employee directory, contract oversight, leave & attendance approval center, workforce capacity forecast.',
      icon: <Briefcase className="w-5 h-5 text-[#438A6B]" />,
      access: 'HR Operations & Approvals',
    },
    payroll_user: {
      desc: 'Full HR + Payrun 2-step wizard, draft payslip review, read-only structures/rules, reports.',
      icon: <Calculator className="w-5 h-5 text-[#D49525]" />,
      access: 'Payroll Processing (Read-Only Rules)',
    },
    payroll_manager: {
      desc: 'Full Payroll CRUD: manage structures and rules, compute and validate payruns, review readiness, and export reports.',
      icon: <Shield className="w-5 h-5 text-[#714B67]" />,
      access: 'Full Payroll Authority',
    },
    admin: {
      desc: 'Global System Admin: Role-permission matrix, biometric IoT devices, audit logs, organizational configurations.',
      icon: <Crown className="w-5 h-5 text-[#9A6B0A]" />,
      access: 'Enterprise Administration & Audit',
    },
  };

  const handleSelect = (user: User) => {
    setCurrentUser(user);
    onClose();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/45 backdrop-blur-sm overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.96 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-2xl bg-white rounded-[18px] border border-[#E4E1E5] shadow-2xl p-6 my-8"
        >
          {/* Header */}
          <div className="flex items-start justify-between pb-4 border-b border-[#F4F3F5]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-[12px] bg-[#714B67] text-white flex items-center justify-center font-bold text-lg shadow-xs">
                P
              </div>
              <div>
                <h2 className="text-lg font-bold text-[#28262D] flex items-center gap-2">
                  PeoplePay360 Persona Switcher
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[#FFF6D2] text-[#9A6B0A] border border-[#F8E29E]">
                    Live Demo
                  </span>
                </h2>
                <p className="text-xs text-[#74717A]">
                  Select one of the 5 authorized enterprise accounts to preview role-based features.
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-full text-[#74717A] hover:bg-[#F4F3F5] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Account Cards */}
          <div className="mt-4 space-y-2.5 max-h-[60vh] overflow-y-auto pr-1">
            {DEMO_USERS.map((user) => {
              const isSelected = currentUser.id === user.id;
              const meta = roleDescriptions[user.role];

              return (
                <div
                  key={user.id}
                  onClick={() => handleSelect(user)}
                  className={cn(
                    'p-4 rounded-[14px] border transition-all duration-150 cursor-pointer flex items-center gap-4',
                    isSelected
                      ? 'border-[#714B67] bg-[#FBFAFB] ring-2 ring-[#714B67]/20 shadow-xs'
                      : 'border-[#E4E1E5] bg-white hover:bg-[#FBFAFB] hover:border-[#D5D1D6]'
                  )}
                >
                  {/* Avatar with role icon badge */}
                  <div className="relative shrink-0">
                    <img
                      src={user.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
                      alt={user.name}
                      className="w-12 h-12 rounded-full object-cover border border-[#E4E1E5]"
                    />
                    <div className="absolute -bottom-1 -right-1 p-1 rounded-full bg-white border border-[#E4E1E5] shadow-xs">
                      {meta.icon}
                    </div>
                  </div>

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm font-bold text-[#28262D]">{user.name}</h3>
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[#F4F3F5] text-[#714B67] border border-[#E4E1E5]">
                        {user.roleTitle}
                      </span>
                      <span className="text-xs text-[#74717A] font-mono">({user.employeeId})</span>
                    </div>

                    <p className="text-xs text-[#74717A] mt-0.5">
                      {user.jobPosition} • <span className="font-medium text-[#28262D]">{user.department}</span>
                    </p>

                    <p className="text-xs text-[#74717A] mt-1.5 line-clamp-1">
                      {meta.desc}
                    </p>
                  </div>

                  {/* Action button / checkmark */}
                  <div className="shrink-0 pl-2">
                    {isSelected ? (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#438A6B] bg-[#EBF6F0] px-3 py-1.5 rounded-[10px] border border-[#C3E6D5]">
                        <Check className="w-3.5 h-3.5" /> Active
                      </span>
                    ) : (
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 text-xs font-medium text-[#714B67] hover:text-[#4D3348] hover:bg-[#F3EEF2] px-3 py-1.5 rounded-[10px] border border-[#E4E1E5] transition-colors"
                      >
                        Switch <ArrowRight className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-5 pt-3 border-t border-[#F4F3F5] flex items-center justify-between text-xs text-[#74717A]">
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-[#F4C430]" />
              Role switcher is always available in the top bar
            </span>
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-[#28262D] bg-[#F4F3F5] hover:bg-[#E4E1E5] rounded-[10px] transition-colors"
            >
              Done
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
