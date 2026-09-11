'use client';

import React, { useState } from 'react';
import { useApp } from '@/lib/context/app-context';
import {
  LayoutDashboard,
  CalendarCheck,
  CalendarHeart,
  FileText,
  User,
  Users,
  FileSpreadsheet,
  CalendarDays,
  CheckSquare,
  TrendingUp,
  CreditCard,
  Layers,
  Sliders,
  BarChart3,
  ShieldCheck,
  Shield,
  Radio,
  History,
  Settings,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Building,
  FileCheck,
  Clock,
  LogOut,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { SidebarBrand } from '@/components/brand/PeoplePayLogo';

export function Sidebar() {
  const {
    currentRole,
    activeTab,
    setActiveTab,
    leaveRequests,
    profileRequests,
    correctionRequests,
    setIsRoleSwitcherOpen,
    currentUser,
    signOut,
  } = useApp();

  const [isCollapsed, setIsCollapsed] = useState(false);

  // Calculate pending approvals count
  const pendingApprovalsCount =
    leaveRequests.filter((r) => r.status === 'submitted').length +
    profileRequests.filter((p) => p.status === 'pending').length +
    correctionRequests.filter((c) => c.status === 'pending').length;

  interface NavItem {
    id: string;
    label: string;
    icon: React.ElementType;
    badge?: number | string;
    badgeColor?: string;
  }

  // Common Employee Self-Service links (All roles receive ESS)
  const essNavItems: NavItem[] = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'attendance', label: 'Attendance', icon: CalendarCheck },
    { id: 'leave', label: 'Leave', icon: CalendarHeart },
    { id: 'my_loans', label: 'My Loans', icon: CreditCard },
    { id: 'payslips', label: 'My Payslips', icon: FileText },
    { id: 'profile', label: 'Profile', icon: User },
  ];

  // HR Manager Navigation
  const hrNavItems: NavItem[] = [
    { id: 'employees', label: 'Employees', icon: Users },
    { id: 'contracts', label: 'Contracts', icon: FileSpreadsheet },
    { id: 'working_schedules', label: 'Working Schedules', icon: CalendarDays },
    {
      id: 'medical_proofs',
      label: 'Medical Proofs',
      icon: FileCheck,
    },
    {
      id: 'company_loans',
      label: 'Employee Loans',
      icon: CreditCard,
    },
    {
      id: 'approvals',
      label: 'Approvals',
      icon: CheckSquare,
      badge: pendingApprovalsCount > 0 ? pendingApprovalsCount : undefined,
      badgeColor: 'bg-[#FFF6D2] text-[#9A6B0A] border border-[#F8E29E]',
    },
    { id: 'workforce_insights', label: 'Workforce Insights', icon: TrendingUp },
  ];

  // Payroll Modules
  const payrollNavItems: NavItem[] = [
    { id: 'payroll_dashboard', label: 'Payroll Dashboard', icon: BarChart3 },
    { id: 'payruns', label: 'Payruns', icon: CreditCard },
    { id: 'company_loans', label: 'Loan Deductions', icon: CreditCard },
    { id: 'salary_structures', label: 'Salary Structures', icon: Layers },
    { id: 'salary_rules', label: 'Salary Rules', icon: Sliders },
    { id: 'overtime_policy', label: 'Overtime Policy', icon: Clock },
    ...(currentRole === 'payroll_manager' || currentRole === 'admin'
      ? [{ id: 'readiness', label: 'Readiness Score', icon: ShieldCheck }]
      : []),
    { id: 'reports', label: 'Payroll Reports', icon: BarChart3 },
  ];

  // Admin Specific
  const adminNavItems: NavItem[] = [
    { id: 'admin_overview', label: 'Admin Overview', icon: Shield },
    { id: 'roles_permissions', label: 'Roles & Permissions', icon: ShieldCheck },
    { id: 'biometric_devices', label: 'Biometric Devices', icon: Radio },
    { id: 'audit_history', label: 'Audit History', icon: History },
  ];

  const renderNavGroup = (title: string, items: NavItem[]) => (
    <div className="mb-4">
      {!isCollapsed && (
        <div className="px-3 mb-1.5 text-[11px] font-bold uppercase tracking-wider text-[#A4879F]">
          {title}
        </div>
      )}
      <div className="space-y-0.5">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              title={isCollapsed ? item.label : undefined}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2 rounded-[12px] text-xs font-medium transition-all duration-150 relative group',
                isCollapsed && 'justify-center px-0',
                isActive
                  ? 'bg-[#714B67] text-white shadow-xs font-semibold'
                  : 'text-[#4D3348] hover:bg-[#F3EEF2] hover:text-[#28262D]'
              )}
            >
              <Icon
                className={cn(
                  'w-4 h-4 shrink-0 transition-colors',
                  isActive ? 'text-white' : 'text-[#714B67] group-hover:text-[#4D3348]'
                )}
              />
              {!isCollapsed && <span className="truncate flex-1 text-left">{item.label}</span>}
              {!isCollapsed && item.badge !== undefined && (
                <span
                  className={cn(
                    'px-1.5 py-0.5 text-[10px] font-bold rounded-full',
                    item.badgeColor || 'bg-[#714B67] text-white'
                  )}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );

  const isHR = currentRole === 'hr_manager' || currentRole === 'payroll_user' || currentRole === 'payroll_manager' || currentRole === 'admin';
  const isPayroll = currentRole === 'payroll_user' || currentRole === 'payroll_manager' || currentRole === 'admin';
  const isAdmin = currentRole === 'admin';

  return (
    <aside
      className={cn(
        'hidden md:flex flex-col border-r border-[#E4E1E5] bg-white transition-all duration-200 select-none z-30 shrink-0 sticky top-0 h-screen',
        isCollapsed ? 'w-[116px]' : 'w-64'
      )}
    >
      {/* Brand Header */}
      <div className="p-4 border-b border-[#F4F3F5] flex items-center justify-between">
        <div
          onClick={() => setActiveTab('overview')}
          className="cursor-pointer overflow-hidden flex-1"
        >
          <SidebarBrand isCollapsed={isCollapsed} />
        </div>

        {/* Collapse toggle */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-1.5 rounded-[8px] text-[#74717A] hover:bg-[#F4F3F5] hover:text-[#28262D] transition-colors"
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Navigation Groups */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {renderNavGroup('Employee Self-Service', essNavItems)}
        {isHR && renderNavGroup('HR Operations', hrNavItems)}
        {isPayroll && renderNavGroup('Payroll & Compensation', payrollNavItems)}
        {isAdmin && renderNavGroup('Administration & Security', adminNavItems)}
      </div>

      {/* Switch Persona & Sign Out Trigger in Sidebar */}
      <div className="p-3 border-t border-[#F4F3F5] bg-[#FBFAFB] space-y-2">
        <button
          onClick={() => setIsRoleSwitcherOpen(true)}
          className={cn(
            'w-full flex items-center gap-2.5 p-2 rounded-[12px] border border-[#E4E1E5] bg-white hover:bg-[#F3EEF2] hover:border-[#714B67]/30 transition-all text-left shadow-2xs',
            isCollapsed ? 'justify-center p-2' : 'justify-between'
          )}
          title="Switch Role / View Persona"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <img
              src={currentUser.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
              alt={currentUser.name}
              className="w-7 h-7 rounded-full object-cover border border-[#E4E1E5] shrink-0"
            />
            {!isCollapsed && (
              <div className="min-w-0">
                <p className="text-xs font-bold text-[#28262D] truncate">{currentUser.name}</p>
                <p className="text-[10px] font-semibold text-[#714B67] truncate">{currentUser.roleTitle}</p>
              </div>
            )}
          </div>
          {!isCollapsed && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#FFF6D2] text-[#9A6B0A] border border-[#F8E29E] shrink-0">
              Role
            </span>
          )}
        </button>

        <button
          onClick={signOut}
          className={cn(
            'w-full flex items-center gap-2 px-3 py-2 rounded-[12px] text-xs font-bold text-[#C85A54] bg-[#FDF1F0] hover:bg-[#F8E3E1] border border-[#F6CBC8] transition-all',
            isCollapsed && 'justify-center px-0'
          )}
          title="Sign Out"
        >
          <LogOut className="w-4 h-4 shrink-0 text-[#C85A54]" />
          {!isCollapsed && <span>Sign Out</span>}
        </button>
      </div>
    </aside>
  );
}
