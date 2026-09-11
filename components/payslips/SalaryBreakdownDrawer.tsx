'use client';

import React from 'react';
import { useApp } from '@/lib/context/app-context';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Printer,
  Download,
  ShieldCheck,
  Building2,
  FileSpreadsheet,
  Info,
  Calendar,
  IndianRupee,
  CheckCircle2,
  Sparkles,
  HelpCircle,
} from 'lucide-react';
import { formatINR, formatDate } from '@/lib/utils';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { StatutoryContributionModal } from '@/components/payroll/StatutoryContributionModal';
import { Lock } from 'lucide-react';
import { buildPayslipPdf } from '@/lib/payslips/payslip-pdf';

export function SalaryBreakdownDrawer() {
  const {
    isSalaryDrawerOpen,
    setIsSalaryDrawerOpen,
    selectedPayslip,
    currentEmployee,
    setIsExplainSalaryDiffOpen,
    selectedAttendanceDate,
  } = useApp();

  const [isPFModalOpen, setIsPFModalOpen] = React.useState(false);

  if (!isSalaryDrawerOpen || !selectedPayslip) return null;

  const ps = selectedPayslip;

  const handleDownload = async () => {
    const doc=await buildPayslipPdf(ps,currentEmployee);
    doc.save(`${ps.employeeCode}-${ps.payrollPeriod.replaceAll(' ','-')}.pdf`);
  };

  const payslipNumber = ps.payslipNumber || `PS-2026-${ps.id.slice(-4).toUpperCase()}`;
  const period = ps.period || ps.payrollPeriod;
  const designation = ps.jobPosition;
  const bankAccount = currentEmployee.bankAccountMasked || '•••• •••• 4092';
  const ifsc = currentEmployee.ifscCode || 'HDFC0001245';
  const pan = currentEmployee.panNumber || 'ABCDE1234F';
  const uan = currentEmployee.uanNumber || '100924881029';
  const totalDaysInMonth = 30;
  const paidDaysCount = ps.workedDays + (ps.paidLeaveDays || 0);
  const lopDaysCount = ps.lopDays ?? ps.unpaidLeaveDays ?? 0;

  const earningsList = ps.lines && ps.lines.length > 0
    ? ps.lines
        .filter((l) => l.category === 'basic' || l.category === 'allowance' || l.category === 'overtime')
        .map((l) => ({ ruleName: l.name, ruleCode: l.code, amount: l.amount }))
    : [
        { ruleName: 'Basic Salary', ruleCode: 'BASIC', amount: ps.basicSalary },
        { ruleName: 'House Rent Allowance (HRA)', ruleCode: 'HRA', amount: ps.hra },
        { ruleName: 'Travel Allowance', ruleCode: 'TRAV', amount: ps.travelAllowance },
        { ruleName: 'Other Allowances', ruleCode: 'OTHER', amount: ps.otherAllowances },
      ];

  const deductionsList = ps.lines && ps.lines.length > 0
    ? ps.lines
        .filter((l) => l.category === 'deduction' || l.category === 'tax')
        .map((l) => ({ ruleName: l.name, ruleCode: l.code, amount: l.amount }))
    : [
        { ruleName: 'Provident Fund (PF)', ruleCode: 'PF_EMP', amount: 1800 },
        { ruleName: 'Professional Tax (PT)', ruleCode: 'PT', amount: 200 },
        { ruleName: 'Tax Deducted at Source (TDS)', ruleCode: 'TDS', amount: ps.taxDeduction || 750 },
      ];

  const employerContributionsList = [
    { ruleName: 'Employer Provident Fund (12%)', amount: 1800 },
    { ruleName: 'Gratuity Provision (4.81%)', amount: 1680 },
    { ruleName: 'Group Health Insurance Coverage', amount: 1250 },
  ];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 overflow-hidden flex items-center justify-center p-4 sm:p-6">
        {/* Backdrop */}
        <div
          onClick={() => setIsSalaryDrawerOpen(false)}
          className="absolute inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
        />

        <div className="relative w-full flex justify-center max-h-[calc(100vh-48px)]">
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="w-[min(900px,calc(100vw-48px))] max-h-[calc(100vh-48px)] bg-white rounded-[18px] border border-[#E4E1E5] shadow-2xl flex flex-col overflow-hidden"
          >
            {/* Drawer Header */}
            <div className="p-4 border-b border-[#F4F3F5] bg-[#FBFAFB] flex items-center justify-between shrink-0 z-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-[12px] bg-[#714B67] text-white flex items-center justify-center font-bold shadow-xs">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-[#28262D]">
                      Salary Breakdown & Payslip
                    </h3>
                    <StatusBadge status={ps.status} size="sm" />
                  </div>
                  <p className="text-xs text-[#74717A] mt-0.5">
                    {period} • Ref: <span className="font-mono text-[#714B67]">{payslipNumber}</span>
                  </p>
                  {selectedAttendanceDate && (
                    <p className="text-[11px] text-[#438A6B] mt-1 font-semibold">
                      Work day: {formatDate(selectedAttendanceDate)}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  title="Print or Save PDF"
                  className="p-2 rounded-[10px] text-[#74717A] hover:bg-[#F4F3F5] hover:text-[#28262D] transition-colors border border-[#E4E1E5]"
                >
                  <Printer className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setIsSalaryDrawerOpen(false)}
                  className="p-2 rounded-[10px] text-[#74717A] hover:bg-[#F4F3F5] transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Content Container */}
            <div className="p-4 sm:p-5 space-y-4 flex-1 text-xs overflow-y-auto overflow-x-hidden min-h-0">
              {/* Employee & Organization Header */}
              <div className="p-4 rounded-[14px] bg-[#FBFAFB] border border-[#E4E1E5] grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <span className="text-[#74717A] text-[10px] uppercase font-bold tracking-wider block">
                    Employee Name
                  </span>
                  <span className="font-bold text-[#28262D] text-sm">{ps.employeeName}</span>
                  <span className="text-[#74717A] text-[11px] block">{ps.employeeCode}</span>
                </div>

                <div>
                  <span className="text-[#74717A] text-[10px] uppercase font-bold tracking-wider block">
                    Department / Role
                  </span>
                  <span className="font-medium text-[#28262D]">{ps.department}</span>
                  <span className="text-[#74717A] text-[11px] block">{designation}</span>
                </div>

                <div>
                  <span className="text-[#74717A] text-[10px] uppercase font-bold tracking-wider block">
                    Bank & Account
                  </span>
                  <span className="font-mono text-[#28262D]">{bankAccount}</span>
                  <span className="text-[#74717A] text-[11px] block">IFSC: {ifsc}</span>
                </div>

                <div>
                  <span className="text-[#74717A] text-[10px] uppercase font-bold tracking-wider block">
                    PAN & UAN
                  </span>
                  <span className="font-mono text-[#28262D]">PAN: {pan}</span>
                  <span className="text-[#74717A] text-[11px] block font-mono">UAN: {uan}</span>
                </div>
              </div>

              {/* Attendance & Working Days Summary */}
              <div className="p-3.5 rounded-[12px] bg-[#F4F3F5] border border-[#E4E1E5] flex items-center justify-between text-xs flex-wrap gap-2">
                <div className="flex items-center gap-1.5 font-medium text-[#28262D]">
                  <Calendar className="w-4 h-4 text-[#714B67]" />
                  <span>Calendar Days: <strong>{totalDaysInMonth}</strong></span>
                </div>
                <div>Paid Days: <strong className="text-[#438A6B]">{paidDaysCount}</strong></div>
                <div>LOP (Unpaid) Days: <strong className={lopDaysCount > 0 ? 'text-[#C85A54]' : 'text-[#74717A]'}>{lopDaysCount}</strong></div>
                <div>Structure: <strong className="text-[#714B67]">{ps.salaryStructureName}</strong></div>
              </div>

              {/* Earnings & Deductions Tables */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Earnings */}
                <div className="border border-[#E4E1E5] rounded-[14px] overflow-hidden">
                  <div className="p-3 bg-[#FBFAFB] border-b border-[#E4E1E5] flex items-center justify-between">
                    <span className="font-bold text-[#28262D] uppercase tracking-wider text-[11px]">
                      Earnings Components
                    </span>
                    <span className="text-[10px] font-semibold text-[#438A6B]">Monthly (₹)</span>
                  </div>

                  <div className="divide-y divide-[#F4F3F5] p-1">
                    {earningsList.map((e, idx) => (
                      <div key={idx} className="p-2.5 flex items-center justify-between">
                        <div>
                          <p className="font-medium text-[#28262D]">{e.ruleName}</p>
                          <p className="text-[10px] font-mono text-[#A4879F]">{e.ruleCode}</p>
                        </div>
                        <span className="font-semibold text-[#28262D] tabular-nums">
                          {formatINR(e.amount)}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="p-3 bg-[#FBFAFB] border-t border-[#E4E1E5] flex items-center justify-between font-bold text-[#28262D]">
                    <span>Total Gross Earnings</span>
                    <span className="text-sm tabular-nums text-[#714B67]">
                      {formatINR(ps.grossSalary)}
                    </span>
                  </div>
                </div>

                {/* Deductions */}
                <div className="border border-[#E4E1E5] rounded-[14px] overflow-hidden">
                  <div className="p-3 bg-[#FBFAFB] border-b border-[#E4E1E5] flex items-center justify-between">
                    <span className="font-bold text-[#28262D] uppercase tracking-wider text-[11px]">
                      Statutory Deductions
                    </span>
                    <span className="text-[10px] font-semibold text-[#C85A54]">Deductions (₹)</span>
                  </div>

                  <div className="divide-y divide-[#F4F3F5] p-1">
                    {deductionsList.map((d, idx) => {
                      const isPF = d.ruleCode === 'PF_EMP' || d.ruleName.includes('Provident Fund') || d.ruleCode === 'PF';
                      return (
                        <div key={idx} className="p-2.5 flex items-center justify-between">
                          <div>
                            <div className="flex items-center gap-1.5">
                              <p className="font-medium text-[#28262D]">{d.ruleName}</p>
                              {isPF && (
                                <button
                                  type="button"
                                  onClick={() => setIsPFModalOpen(true)}
                                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-[6px] bg-[#FFF6D2] text-[#9A6B0A] border border-[#F8E29E] text-[9px] font-bold hover:bg-[#FBE6A2] transition-colors"
                                  title="Statutory Rule Locked (EPF Act 1952) - Click for calculation details"
                                >
                                  <Lock className="w-2.5 h-2.5" />
                                  <span>Statutory Rule Locked</span>
                                </button>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-[10px] font-mono text-[#A4879F]">{d.ruleCode}</span>
                              {isPF && (
                                <button
                                  type="button"
                                  onClick={() => setIsPFModalOpen(true)}
                                  className="text-[10px] text-[#714B67] hover:underline flex items-center gap-0.5 font-medium"
                                >
                                  <Info className="w-2.5 h-2.5" /> View statutory formula
                                </button>
                              )}
                            </div>
                          </div>
                          <span className="font-semibold text-[#C85A54] tabular-nums">
                            -{formatINR(d.amount)}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  <div className="p-3 bg-[#FBFAFB] border-t border-[#E4E1E5] flex items-center justify-between font-bold text-[#28262D]">
                    <span>Total Deductions</span>
                    <span className="text-sm tabular-nums text-[#C85A54]">
                      -{formatINR(ps.totalDeductions)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Employer Contributions & Cost to Company (CTC) */}
              <div className="border border-[#E4E1E5] rounded-[14px] p-4 bg-[#FBFAFB]">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-[#28262D] text-xs flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-[#714B67]" />
                    Employer Contributions (Not Deducted from Employee)
                  </span>
                  <span className="text-[10px] text-[#74717A]">Statutory Compliance</span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  {employerContributionsList.map((c, idx) => (
                    <div key={idx} className="p-2.5 bg-white rounded-[10px] border border-[#E4E1E5] flex items-center justify-between">
                      <span className="text-[#74717A]">{c.ruleName}</span>
                      <strong className="text-[#28262D] tabular-nums">{formatINR(c.amount)}</strong>
                    </div>
                  ))}
                </div>
              </div>

              {/* NET SALARY CALLOUT */}
              <div className="p-5 rounded-[16px] bg-gradient-to-br from-[#714B67] to-[#4D3348] text-white shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <span className="text-xs uppercase tracking-wider font-semibold text-[#F3EEF2]/80">
                    Net Take-Home Salary
                  </span>
                  <div className="text-3xl font-extrabold tabular-nums tracking-tight mt-0.5 text-white">
                    {formatINR(ps.netSalary)}
                  </div>
                  <p className="text-[11px] text-[#F3EEF2]/90 mt-1 font-mono">
                    Gross ({formatINR(ps.grossSalary)}) − Total Deductions ({formatINR(ps.totalDeductions)})
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setIsSalaryDrawerOpen(false);
                      setIsExplainSalaryDiffOpen(true);
                    }}
                    className="px-3.5 py-2 rounded-[10px] bg-white/15 hover:bg-white/25 text-white text-xs font-semibold backdrop-blur-xs transition-colors flex items-center gap-1.5 border border-white/20"
                  >
                    <HelpCircle className="w-3.5 h-3.5 text-[#F4C430]" />
                    <span>Explain Difference</span>
                  </button>

                  <button
                    onClick={handleDownload}
                    className="px-3.5 py-2 rounded-[10px] bg-[#F4C430] hover:bg-[#E5B520] text-[#4D3348] text-xs font-bold transition-colors flex items-center gap-1.5 shadow-xs"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download PDF</span>
                  </button>
                </div>
              </div>

              {/* Statutory Footnote */}
              <div className="p-3.5 rounded-[12px] bg-[#FBFAFB] border border-[#E4E1E5] text-[11px] text-[#74717A] flex items-start gap-2 leading-relaxed">
                <ShieldCheck className="w-4 h-4 text-[#438A6B] shrink-0 mt-0.5" />
                <div>
                  <strong>Official Enterprise Statutory Notice:</strong> This electronic payslip has been
                  generated by PeoplePay360 compliance engine in accordance with Indian Payment of Wages Act,
                  EPF & MP Act 1952, and Income Tax Act 1961. No physical signature is required.
                </div>
              </div>
            </div>
            <div className="shrink-0 p-3 border-t border-[#E4E1E5] bg-white flex items-center justify-between gap-3">
              <p className="text-[10px] text-[#74717A]">Private document • employee-authorized download</p>
              <button onClick={handleDownload} className="px-4 py-2 rounded-[10px] bg-[#714B67] text-white text-xs font-bold flex items-center gap-1.5"><Download className="w-3.5 h-3.5"/>Download corporate PDF</button>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Statutory Contribution Explanation Modal */}
      <StatutoryContributionModal
        basicSalary={ps.basicSalary || 35000}
        isOpen={isPFModalOpen}
        onClose={() => setIsPFModalOpen(false)}
      />
    </AnimatePresence>
  );
}
