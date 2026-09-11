'use client';

import React from 'react';
import { useApp } from '@/lib/context/app-context';
import {
  FileText,
  Download,
  Eye,
  TrendingUp,
  CreditCard,
  Building2,
  Calendar,
  HelpCircle,
  RotateCcw,
} from 'lucide-react';
import { KPICard } from '@/components/shared/KPICard';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { SalaryBreakdownDrawer } from './SalaryBreakdownDrawer';
import { ExplainDifferenceModal } from './ExplainDifferenceModal';
import { formatINR, formatDate } from '@/lib/utils';

function parsePayslipPeriod(period: string): [string, string] | null {
  const isoDates = period.match(/\d{4}-\d{2}-\d{2}/g);
  if (isoDates && isoDates.length >= 2) return [isoDates[0], isoDates[1]];

  const textDates = period.match(/\d{1,2}\s+[A-Za-z]{3,9}\s+\d{4}/g);
  if (!textDates || textDates.length < 2) return null;

  const toInputDate = (value: string) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  };
  const start = toInputDate(textDates[0]);
  const end = toInputDate(textDates[1]);
  return start && end ? [start, end] : null;
}

export function EmployeePayslipsView() {
  const {
    currentEmployee,
    payslips,
    setSelectedPayslip,
    setSelectedAttendanceDate,
    setIsSalaryDrawerOpen,
    setIsExplainSalaryDiffOpen,
  } = useApp();

  const [fromDate, setFromDate] = React.useState('');
  const [toDate, setToDate] = React.useState('');

  // Filter payslips for this employee
  const myPayslips = payslips.filter(
    (p) => p.employeeId === currentEmployee.id || p.employeeCode === currentEmployee.employeeId
  );

  const hasInvalidRange = Boolean(fromDate && toDate && fromDate > toDate);
  const filteredPayslips = myPayslips.filter((payslip) => {
    if (hasInvalidRange || (!fromDate && !toDate)) return !hasInvalidRange;
    const bounds = parsePayslipPeriod(payslip.payrollPeriod || payslip.period || '');
    if (!bounds) return false;
    const [periodStart, periodEnd] = bounds;
    return (!fromDate || periodEnd >= fromDate) && (!toDate || periodStart <= toDate);
  });

  const latestPayslip = myPayslips[0] || payslips[0];

  const handleOpenBreakdown = (ps: any) => {
    setSelectedPayslip(ps);
    setSelectedAttendanceDate(null);
    setIsSalaryDrawerOpen(true);
  };

  const handleExplain = (ps: any) => {
    setSelectedPayslip(ps);
    setIsExplainSalaryDiffOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-[16px] border border-[#E4E1E5] shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-[#28262D] tracking-tight">My Payslips & Compensation</h2>
          <p className="text-xs text-[#74717A] mt-0.5">
            Transparent salary breakdowns, statutory tax deductions, and EPF records.
          </p>
        </div>

        {latestPayslip && (
          <button
            onClick={() => handleExplain(latestPayslip)}
            className="px-3.5 py-2 text-xs font-semibold text-[#714B67] bg-[#F3EEF2] hover:bg-[#EBDDE9] rounded-[10px] border border-[#D8C7D4] transition-colors flex items-center gap-1.5 self-start sm:self-auto"
          >
            <HelpCircle className="w-3.5 h-3.5 text-[#D49525]" />
            <span>Explain Salary Difference</span>
          </button>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Latest Net Pay"
          value={latestPayslip ? formatINR(latestPayslip.netSalary) : '₹0'}
          subtitle={latestPayslip ? latestPayslip.period : 'August 2026'}
          icon={<CreditCard className="w-5 h-5" />}
          highlight
          trend={{ value: '+5.7%', isPositive: true, label: 'vs prev month' }}
        />

        <KPICard
          title="Monthly Gross"
          value={latestPayslip ? formatINR(latestPayslip.grossSalary) : '₹0'}
          subtitle="Tech Engineering Structure"
          icon={<Building2 className="w-5 h-5" />}
        />

        <KPICard
          title="Total Deductions"
          value={latestPayslip ? formatINR(latestPayslip.totalDeductions) : '₹0'}
          subtitle="PF, PT & Statutory TDS"
          icon={<TrendingUp className="w-5 h-5" />}
        />

        <KPICard
          title="Loss of Pay (LOP)"
          value={latestPayslip ? `${latestPayslip.lopDays ?? latestPayslip.unpaidLeaveDays ?? 0} Days` : '0 Days'}
          subtitle="₹0 deducted this period"
          icon={<Calendar className="w-5 h-5" />}
        />
      </div>

      {/* Payslips Table */}
      <div className="bg-white rounded-[16px] border border-[#E4E1E5] shadow-xs overflow-hidden">
        <div className="p-4 border-b border-[#F4F3F5] flex items-center justify-between">
          <h3 className="text-sm font-bold text-[#28262D]">Historical Payslips</h3>
          <div className="flex items-center gap-2 flex-wrap justify-end">
            <label className="flex items-center gap-1.5 text-[11px] text-[#74717A]">
              From
              <input
                type="date"
                value={fromDate}
                onChange={(event) => setFromDate(event.target.value)}
                className="px-2 py-1 rounded-[8px] border border-[#E4E1E5] bg-[#FBFAFB] text-[11px] text-[#28262D] outline-none focus:border-[#714B67]"
                aria-label="Payslip range start date"
              />
            </label>
            <label className="flex items-center gap-1.5 text-[11px] text-[#74717A]">
              To
              <input
                type="date"
                value={toDate}
                onChange={(event) => setToDate(event.target.value)}
                className="px-2 py-1 rounded-[8px] border border-[#E4E1E5] bg-[#FBFAFB] text-[11px] text-[#28262D] outline-none focus:border-[#714B67]"
                aria-label="Payslip range end date"
              />
            </label>
            {(fromDate || toDate) && (
              <button
                type="button"
                onClick={() => { setFromDate(''); setToDate(''); }}
                className="p-1.5 rounded-[8px] text-[#74717A] hover:bg-[#F4F3F5] hover:text-[#714B67]"
                title="Clear date range"
                aria-label="Clear date range"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {hasInvalidRange && (
          <p className="px-4 py-2 text-[11px] text-[#C85A54] bg-[#FDF1F0] border-b border-[#F6CBC8]">
            The start date must be on or before the end date.
          </p>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-[#28262D]">
            <thead className="bg-[#FBFAFB] text-[#74717A] uppercase text-[10px] font-bold tracking-wider border-b border-[#E4E1E5]">
              <tr>
                <th className="py-3 px-4">Pay Period</th>
                <th className="py-3 px-4">Slip Number</th>
                <th className="py-3 px-4">Gross Earnings</th>
                <th className="py-3 px-4">Deductions</th>
                <th className="py-3 px-4">Net Take-Home</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F4F3F5]">
              {filteredPayslips.map((ps) => (
                <tr key={ps.id} className="hover:bg-[#FBFAFB] transition-colors">
                  <td className="py-3.5 px-4 font-semibold text-[#28262D]">
                    {ps.period || ps.payrollPeriod}
                  </td>
                  <td className="py-3.5 px-4 font-mono text-[11px] text-[#714B67]">
                    {ps.payslipNumber || `PS-2026-${ps.id.slice(-4).toUpperCase()}`}
                  </td>
                  <td className="py-3.5 px-4 font-medium tabular-nums">
                    {formatINR(ps.grossSalary)}
                  </td>
                  <td className="py-3.5 px-4 text-[#C85A54] font-medium tabular-nums">
                    -{formatINR(ps.totalDeductions)}
                  </td>
                  <td className="py-3.5 px-4 font-bold text-[#28262D] tabular-nums text-sm">
                    {formatINR(ps.netSalary)}
                  </td>
                  <td className="py-3.5 px-4">
                    <StatusBadge status={ps.status} size="sm" />
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleExplain(ps)}
                        className="px-2.5 py-1 text-[11px] text-[#74717A] hover:text-[#714B67] hover:bg-[#F4F3F5] rounded-md transition-colors"
                        title="Explain Difference"
                      >
                        Explain
                      </button>
                      <button
                        onClick={() => handleOpenBreakdown(ps)}
                        className="px-3 py-1 bg-[#714B67] hover:bg-[#5C3C53] text-white font-medium rounded-[8px] transition-colors flex items-center gap-1 text-xs"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Breakdown</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredPayslips.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-[#74717A]">
                    No payslips cover the selected date range.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Salary Breakdown Drawer & Explain Difference Modal */}
      <SalaryBreakdownDrawer />
      <ExplainDifferenceModal />
    </div>
  );
}
