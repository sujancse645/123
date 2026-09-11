'use client';

import React from 'react';
import { useApp } from '@/lib/context/app-context';
import {
  UserCheck,
  UserX,
  CalendarHeart,
  CreditCard,
  Calendar,
  Clock,
  ArrowRight,
  Sparkles,
  FileCheck,
  TrendingUp,
  AlertCircle,
  Eye,
} from 'lucide-react';
import { KPICard } from '@/components/shared/KPICard';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { formatINR, formatDate, cn } from '@/lib/utils';
import { SemanticIconTile } from '@/components/brand/SemanticIconTile';

export function EmployeeOverview() {
  const {
    currentEmployee,
    setIsCheckInModalOpen,
    setIsLeaveModalOpen,
    setIsCorrectionModalOpen,
    setActiveTab,
    payslips,
    setSelectedPayslip,
    setSelectedAttendanceDate,
    setIsSalaryDrawerOpen,
    leaveRequests,
  } = useApp();

  const isCheckedIn = currentEmployee.currentAttendanceStatus === 'checked_in';
  const latestPayslip = payslips[0];
  const pendingLeaves = leaveRequests.filter(
    (r) => r.employeeId === currentEmployee.id && r.status === 'submitted'
  );
  const approvedUnpaid = leaveRequests.filter(r=>r.employeeId===currentEmployee.id&&!r.isPaid&&r.status==='approved').reduce((s,r)=>s+r.unpaidDays,0);
  const pendingUnpaid = leaveRequests.filter(r=>r.employeeId===currentEmployee.id&&!r.isPaid&&r.status==='submitted').reduce((s,r)=>s+r.unpaidDays,0);

  return (
    <div className="space-y-6">
      {/* Welcome Hero Banner */}
      <div className="relative overflow-hidden rounded-[18px] bg-gradient-to-r from-[#714B67] to-[#4D3348] text-white p-6 md:p-8 shadow-sm">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-xs text-xs font-semibold text-[#FFF6D2] mb-3 border border-white/20">
              <Sparkles className="w-3.5 h-3.5 text-[#F4C430]" />
              <span>Employee Self-Service Portal</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
              Good day, {currentEmployee.name}!
            </h1>
            <p className="text-xs md:text-sm text-[#F3EEF2]/80 mt-1 max-w-xl leading-relaxed">
              {currentEmployee.jobPosition} • {currentEmployee.department} • Scheduled Shift: 09:30 AM – 06:30 PM (IST)
            </p>
          </div>

          {/* Quick Action CTAs */}
          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={() => setIsCheckInModalOpen(true)}
              className={cn(
                'px-4 py-2.5 rounded-[12px] text-xs font-bold shadow-md transition-all duration-150 flex items-center gap-2',
                isCheckedIn
                  ? 'bg-white text-[#C85A54] hover:bg-[#FDF1F0]'
                  : 'bg-[#F4C430] text-[#4D3348] hover:bg-[#E5B520]'
              )}
            >
              {isCheckedIn ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
              <span>{isCheckedIn ? 'Record Check Out' : 'Record Check In'}</span>
            </button>

            <button
              onClick={() => setIsLeaveModalOpen(true)}
              className="px-4 py-2.5 rounded-[12px] bg-white/15 hover:bg-white/25 text-white text-xs font-semibold backdrop-blur-xs transition-colors border border-white/20 flex items-center gap-2"
            >
              <CalendarHeart className="w-4 h-4" />
              <span>Request Leave</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Attendance Status"
          value={isCheckedIn ? 'Checked In' : 'Checked Out'}
          subtitle={
            isCheckedIn
              ? `Check-in recorded at ${currentEmployee.todayCheckInTime || '09:28 AM'}`
              : 'Punch in using Face AI or Biometric turnstile'
          }
          icon={isCheckedIn ? <UserCheck className="w-5 h-5 text-white" /> : <UserX className="w-5 h-5 text-[#28262D]" />}
          highlight={isCheckedIn}
          iconVariant={isCheckedIn ? 'verified' : 'checkout'}
          actionText="Attendance Logs"
          onClick={() => setActiveTab('attendance')}
        />

        <KPICard
          title="Casual Leave Balance"
          value="5 / 12 Days"
          subtitle="Remaining for current calendar year"
          icon={<CalendarHeart className="w-5 h-5 text-[#B45309]" />}
          iconVariant="leave"
          actionText="View Leaves"
          onClick={() => setActiveTab('leave')}
        />

        <KPICard
          title="August 2026 Net Salary"
          value={latestPayslip ? formatINR(latestPayslip.netSalary) : '₹40,750'}
          subtitle="Processed on 31 Aug 2026"
          icon={<CreditCard className="w-5 h-5 text-[#714B67]" />}
          iconVariant="salary"
          actionText="Salary Breakdown"
          onClick={() => {
            if (latestPayslip) setSelectedPayslip(latestPayslip);
            setSelectedAttendanceDate(null);
            setIsSalaryDrawerOpen(true);
          }}
        />

        <KPICard
          title="Unpaid Leave This Year"
          value={`${approvedUnpaid} Days Used`}
          subtitle={`${pendingUnpaid} pending • No balance limit`}
          icon={<FileCheck className="w-5 h-5 text-[#9A6B0A]" />}
          iconVariant="warning"
          actionText="Track Status"
          onClick={() => setActiveTab('leave')}
        />
      </div>

      {/* Two Column Section: Quick Access & Recent Payslips */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Self-Service Actions */}
        <div className="bg-white rounded-[16px] border border-[#E4E1E5] p-5 shadow-xs space-y-3">
          <h3 className="text-sm font-bold text-[#28262D]">Quick Actions</h3>

          <div className="space-y-2">
            <button
              onClick={() => setIsCheckInModalOpen(true)}
              className="w-full p-3 rounded-[12px] border border-[#E4E1E5] hover:border-[#F4C430] hover:bg-[#FBFAFB] transition-all flex items-center justify-between text-left group"
            >
              <div className="flex items-center gap-3">
                <SemanticIconTile
                  icon={<UserCheck className="w-4 h-4" />}
                  variant={isCheckedIn ? 'verified' : 'checkin'}
                  size="table"
                />
                <div>
                  <p className="text-xs font-bold text-[#28262D] group-hover:text-[#714B67] transition-colors">Biometric & Face Punch</p>
                  <p className="text-[11px] text-[#74717A]">Log turnstile check-in or out</p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-[#A4879F] group-hover:text-[#714B67] transition-colors" />
            </button>

            <button
              onClick={() => setIsLeaveModalOpen(true)}
              className="w-full p-3 rounded-[12px] border border-[#E4E1E5] hover:border-[#FDE68A] hover:bg-[#FBFAFB] transition-all flex items-center justify-between text-left group"
            >
              <div className="flex items-center gap-3">
                <SemanticIconTile
                  icon={<CalendarHeart className="w-4 h-4" />}
                  variant="leave"
                  size="table"
                />
                <div>
                  <p className="text-xs font-bold text-[#28262D] group-hover:text-[#B45309] transition-colors">Apply for Leave</p>
                  <p className="text-[11px] text-[#74717A]">Simulate salary impact before submitting</p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-[#A4879F] group-hover:text-[#B45309] transition-colors" />
            </button>

            <button
              onClick={() => setIsCorrectionModalOpen(true)}
              className="w-full p-3 rounded-[12px] border border-[#E4E1E5] hover:border-[#E2E6EA] hover:bg-[#FBFAFB] transition-all flex items-center justify-between text-left group"
            >
              <div className="flex items-center gap-3">
                <SemanticIconTile
                  icon={<FileCheck className="w-4 h-4" />}
                  variant="attendance"
                  size="table"
                />
                <div>
                  <p className="text-xs font-bold text-[#28262D] group-hover:text-[#714B67] transition-colors">Regularize Missed Punch</p>
                  <p className="text-[11px] text-[#74717A]">Submit attendance correction request</p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-[#A4879F] group-hover:text-[#714B67] transition-colors" />
            </button>

            <button
              onClick={() => setActiveTab('my_loans')}
              className="w-full p-3 rounded-[12px] border border-[#E4E1E5] hover:border-[#FCD34D] hover:bg-[#FBFAFB] transition-all flex items-center justify-between text-left group"
            >
              <div className="flex items-center gap-3">
                <SemanticIconTile
                  icon={<CreditCard className="w-4 h-4" />}
                  variant="loan"
                  size="table"
                />
                <div>
                  <p className="text-xs font-bold text-[#28262D] group-hover:text-[#92400E] transition-colors">Employee Loan & Advances</p>
                  <p className="text-[11px] text-[#74717A]">Apply for salary advance or track EMIs</p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-[#A4879F] group-hover:text-[#92400E] transition-colors" />
            </button>
          </div>
        </div>

        {/* Recent Payslips Preview */}
        <div className="lg:col-span-2 bg-white rounded-[16px] border border-[#E4E1E5] p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-[#F4F3F5]">
              <h3 className="text-sm font-bold text-[#28262D]">Recent Salary Statements</h3>
              <button
                onClick={() => setActiveTab('payslips')}
                className="text-xs font-semibold text-[#714B67] hover:underline"
              >
                View all payslips →
              </button>
            </div>

            <div className="mt-3 divide-y divide-[#F4F3F5]">
              {payslips.slice(0, 2).map((ps) => (
                <div key={ps.id} className="py-3 flex items-center justify-between gap-3 text-xs">
                  <div>
                    <span className="font-bold text-[#28262D]">{ps.payrollPeriod || ps.period || 'August 2026'}</span>
                    <p className="text-[11px] text-[#74717A] mt-0.5">
                      Gross: {formatINR(ps.grossSalary)} • Deductions: -{formatINR(ps.totalDeductions)}
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <span className="font-extrabold text-[#714B67] text-sm tabular-nums">
                        {formatINR(ps.netSalary)}
                      </span>
                      <div className="mt-0.5">
                        <StatusBadge status={ps.status} size="sm" />
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        setSelectedPayslip(ps);
                        setSelectedAttendanceDate(null);
                        setIsSalaryDrawerOpen(true);
                      }}
                      className="p-1.5 rounded-[8px] bg-[#F4F3F5] hover:bg-[#714B67] hover:text-white text-[#714B67] transition-colors"
                      title="View Salary Breakdown"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-[#F4F3F5] flex items-center justify-between text-[11px] text-[#74717A]">
            <span>Income Tax Regime: New Regime (Section 115BAC)</span>
            <span className="font-mono">Bank: HDFC Bank •••• 8412</span>
          </div>
        </div>
      </div>
    </div>
  );
}
