'use client';

import React, { useState } from 'react';
import { useApp } from '@/lib/context/app-context';
import {
  CreditCard,
  Plus,
  Play,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
  Clock,
  ArrowRight,
  Eye,
  Calendar,
  Layers,
} from 'lucide-react';
import { Payrun, PayrunStatus } from '@/lib/types';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { PayrunWizardModal } from './PayrunWizardModal';
import { formatINR, formatDate, cn } from '@/lib/utils';

export function PayrunsView() {
  const {
    payruns,
    selectedPayrun,
    setSelectedPayrun,
    updatePayrunStatus,
    setIsPayrunWizardOpen,
    currentRole,
    payslips,
    setSelectedPayslip,
    setSelectedAttendanceDate,
    setIsSalaryDrawerOpen,
    employees,
    createPayslip,
  } = useApp();

  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    payrunId: string;
    targetStatus: PayrunStatus;
    title: string;
    description: string;
    variant: 'primary' | 'warning' | 'success' | 'danger';
  }>({
    isOpen: false,
    payrunId: '',
    targetStatus: 'computed',
    title: '',
    description: '',
    variant: 'primary',
  });
  const [payslipEmployeeId, setPayslipEmployeeId] = useState('');
  const [payslipStart, setPayslipStart] = useState(new Date().toISOString().slice(0, 8) + '01');
  const [payslipEnd, setPayslipEnd] = useState(new Date().toISOString().slice(0, 8) + '30');
  const [payslipGross, setPayslipGross] = useState(0);
  const [payslipDeductions, setPayslipDeductions] = useState(0);
  const [payslipMode, setPayslipMode] = useState<'monthly'|'days'>('monthly');
  const [payslipDays, setPayslipDays] = useState(3);

  const activePayrun = selectedPayrun || payruns[0];

  const handleStatusAction = (p: Payrun, targetStatus: PayrunStatus) => {
    if (targetStatus === 'validated') {
      setConfirmDialog({
        isOpen: true,
        payrunId: p.id,
        targetStatus: 'validated',
        title: 'Validate Payrun Batch?',
        description: `Are you sure you want to validate ${p.name}? This locks all calculated payslips, prevents further attendance changes, and enables finance disbursal approval.`,
        variant: 'primary',
      });
    } else if (targetStatus === 'paid') {
      setConfirmDialog({
        isOpen: true,
        payrunId: p.id,
        targetStatus: 'paid',
        title: 'Mark Payrun as Disbursed (Paid)?',
        description: `This will mark all ${p.employeeCount} payslips in ${p.name} as officially PAID. Net disbursal amount of ${formatINR(p.netTotal)} will be finalized in enterprise accounts.`,
        variant: 'success',
      });
    } else {
      updatePayrunStatus(p.id, targetStatus);
    }
  };

  const isPayrollManagerOrAdmin = currentRole === 'payroll_manager' || currentRole === 'admin';
  const canCreatePayslip = isPayrollManagerOrAdmin || currentRole === 'hr_manager';

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-[16px] border border-[#E4E1E5] shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-[#28262D] tracking-tight">Payrun Operations</h2>
          <p className="text-xs text-[#74717A] mt-0.5">
            Process monthly salary runs: Draft computation, audit validation, and statutory disbursal.
          </p>
        </div>

        <button
          onClick={() => setIsPayrunWizardOpen(true)}
          className="px-4 py-2 bg-[#714B67] hover:bg-[#5C3C53] text-white text-xs font-bold rounded-[10px] shadow-xs flex items-center gap-1.5 transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Initiate New Payrun</span>
        </button>
      </div>

      {canCreatePayslip && (
        <form className="bg-white rounded-[16px] border border-[#E4E1E5] shadow-xs p-5 space-y-4" onSubmit={(event) => {
          event.preventDefault();
          if (!payslipEmployeeId || !payslipStart || !payslipEnd) return;
          const employee = employees.find(item => item.id === payslipEmployeeId);
          if (!employee) return;
          const monthlyGross = employee.monthlySalaryGross || employee.baseSalary || 50000;
          const selectedGross = payslipGross || monthlyGross;
          const gross = payslipMode === 'days' ? Math.round(selectedGross / 30 * payslipDays) : selectedGross;
          createPayslip({
            employeeId: employee.id,
            payrollPeriod: `${payslipStart} to ${payslipEnd}`,
            period: `${payslipStart} to ${payslipEnd}`,
            grossSalary: gross,
            totalDeductions: payslipDeductions,
            netSalary: gross - payslipDeductions,
            workedDays: payslipMode === 'days' ? payslipDays : 22,
            status: 'validated',
          });
        }}>
          <div>
            <h3 className="text-sm font-bold text-[#28262D]">Create Employee Payslip</h3>
            <p className="text-xs text-[#74717A] mt-1">Create a stored payslip for a selected employee and payroll date range.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 text-xs">
            <select required value={payslipEmployeeId} onChange={event => setPayslipEmployeeId(event.target.value)} className="px-3 py-2 rounded-[9px] border border-[#E4E1E5] bg-[#FBFAFB]"><option value="">Select employee</option>{employees.map(employee => <option key={employee.id} value={employee.id}>{employee.name}</option>)}</select>
            <select value={payslipMode} onChange={event => setPayslipMode(event.target.value as 'monthly'|'days')} className="px-3 py-2 rounded-[9px] border border-[#E4E1E5] bg-[#FBFAFB]"><option value="monthly">Monthly payslip</option><option value="days">Specific days</option></select>
            <input required type="date" value={payslipStart} onChange={event => setPayslipStart(event.target.value)} className="px-3 py-2 rounded-[9px] border border-[#E4E1E5] bg-[#FBFAFB]" aria-label="Payslip period start" />
            <input required type="date" min={payslipStart} value={payslipEnd} onChange={event => setPayslipEnd(event.target.value)} className="px-3 py-2 rounded-[9px] border border-[#E4E1E5] bg-[#FBFAFB]" aria-label="Payslip period end" />
            <input type="number" min="0" value={payslipGross} onChange={event => setPayslipGross(Number(event.target.value))} className="px-3 py-2 rounded-[9px] border border-[#E4E1E5] bg-[#FBFAFB]" placeholder="Gross salary" aria-label="Gross salary" />
            <input type="number" min="0" value={payslipDeductions} onChange={event => setPayslipDeductions(Number(event.target.value))} className="px-3 py-2 rounded-[9px] border border-[#E4E1E5] bg-[#FBFAFB]" placeholder="Deductions" aria-label="Total deductions" />
            {payslipMode === 'days' && <input type="number" min="1" value={payslipDays} onChange={event => setPayslipDays(Number(event.target.value))} className="px-3 py-2 rounded-[9px] border border-[#E4E1E5] bg-[#FBFAFB]" placeholder="Paid days" aria-label="Paid days" />}
          </div>
          <div className="flex justify-end"><button className="px-4 py-2 rounded-[9px] bg-[#714B67] text-white text-xs font-bold">Create and store payslip</button></div>
        </form>
      )}

      {/* Payrun Batches List */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column: Payrun batches list */}
        <div className="lg:col-span-1 space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#A4879F] px-1">
            Recent Batches ({payruns.length})
          </h3>

          <div className="space-y-2.5">
            {payruns.map((p) => {
              const isSelected = activePayrun.id === p.id;
              return (
                <div
                  key={p.id}
                  onClick={() => setSelectedPayrun(p)}
                  className={cn(
                    'p-4 rounded-[16px] border transition-all cursor-pointer bg-white',
                    isSelected
                      ? 'border-[#714B67] ring-2 ring-[#714B67]/20 shadow-xs'
                      : 'border-[#E4E1E5] hover:border-[#D5D1D6]'
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="text-xs font-bold text-[#28262D]">{p.name}</h4>
                      <p className="text-[11px] font-mono text-[#714B67] mt-0.5">{p.reference}</p>
                    </div>
                    <StatusBadge status={p.status} size="sm" />
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs pt-2 border-t border-[#F4F3F5]">
                    <div>
                      <span className="text-[10px] text-[#74717A] block">Net Disbursal</span>
                      <strong className="text-sm font-bold text-[#28262D] tabular-nums">
                        {formatINR(p.netTotal)}
                      </strong>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] text-[#74717A] block">Headcount</span>
                      <strong className="text-sm font-medium text-[#28262D] tabular-nums">
                        {p.employeeCount} Staff
                      </strong>
                    </div>
                  </div>

                  {/* Readiness & Warning pill */}
                  <div className="mt-2.5 flex items-center justify-between text-[10px]">
                    <span className="flex items-center gap-1 font-semibold text-[#438A6B]">
                      <ShieldCheck className="w-3.5 h-3.5" /> {p.readinessScore}% Ready
                    </span>
                    {p.warningCount > 0 && (
                      <span className="flex items-center gap-1 font-semibold text-[#9A6B0A] bg-[#FFF6D2] px-2 py-0.5 rounded-full border border-[#F8E29E]">
                        <AlertTriangle className="w-3 h-3" /> {p.warningCount} Warnings
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right column: Active Payrun Inspector */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-[16px] border border-[#E4E1E5] p-6 shadow-xs space-y-5">
            {/* Payrun Title & Actions */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#F4F3F5]">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-base font-bold text-[#28262D]">{activePayrun.name}</h3>
                  <StatusBadge status={activePayrun.status} />
                </div>
                <p className="text-xs text-[#74717A] mt-0.5">
                  Period: {formatDate(activePayrun.startDate)} – {formatDate(activePayrun.endDate)} • Ref: {activePayrun.reference}
                </p>
              </div>

              {/* Status transition action buttons */}
              <div className="flex items-center gap-2 flex-wrap">
                {activePayrun.status === 'draft' && (
                  <button
                    onClick={() => handleStatusAction(activePayrun, 'computed')}
                    className="px-4 py-2 bg-[#714B67] hover:bg-[#5C3C53] text-white text-xs font-bold rounded-[10px] shadow-xs flex items-center gap-1.5 transition-colors"
                  >
                    <Play className="w-3.5 h-3.5 fill-white" />
                    <span>Compute Salary Batch</span>
                  </button>
                )}

                {activePayrun.status === 'computed' && isPayrollManagerOrAdmin && (
                  <button
                    onClick={() => handleStatusAction(activePayrun, 'validated')}
                    className="px-4 py-2 bg-[#714B67] hover:bg-[#5C3C53] text-white text-xs font-bold rounded-[10px] shadow-xs flex items-center gap-1.5 transition-colors"
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Validate & Lock Payrun</span>
                  </button>
                )}

                {activePayrun.status === 'validated' && isPayrollManagerOrAdmin && (
                  <button
                    onClick={() => handleStatusAction(activePayrun, 'paid')}
                    className="px-4 py-2 bg-[#438A6B] hover:bg-[#38765A] text-white text-xs font-bold rounded-[10px] shadow-xs flex items-center gap-1.5 transition-colors"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Mark as Disbursed (Paid)</span>
                  </button>
                )}

                {activePayrun.status === 'paid' && (
                  <span className="text-xs font-bold text-[#438A6B] bg-[#EBF6F0] px-3 py-1.5 rounded-[10px] border border-[#C3E6D5] flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4" /> Disbursed on {activePayrun.paidAt || '31 Aug 2026'}
                  </span>
                )}
              </div>
            </div>

            {/* Metrics Breakdown */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 bg-[#FBFAFB] rounded-[14px] border border-[#E4E1E5]">
                <span className="text-[10px] text-[#74717A] uppercase font-bold tracking-wider block">
                  Total Gross Earnings
                </span>
                <div className="text-xl font-bold text-[#28262D] tabular-nums mt-1">
                  {formatINR(activePayrun.grossTotal)}
                </div>
                <span className="text-[11px] text-[#74717A] mt-0.5 block">
                  Across {activePayrun.employeeCount} staff
                </span>
              </div>

              <div className="p-4 bg-[#FBFAFB] rounded-[14px] border border-[#E4E1E5]">
                <span className="text-[10px] text-[#74717A] uppercase font-bold tracking-wider block">
                  Total Deductions (PF, PT, TDS)
                </span>
                <div className="text-xl font-bold text-[#C85A54] tabular-nums mt-1">
                  -{formatINR(activePayrun.totalDeductions)}
                </div>
                <span className="text-[11px] text-[#74717A] mt-0.5 block">
                  Statutory remittances
                </span>
              </div>

              <div className="p-4 bg-gradient-to-br from-[#FBFAFB] to-[#F3EEF2] rounded-[14px] border border-[#714B67]/30">
                <span className="text-[10px] text-[#714B67] uppercase font-bold tracking-wider block">
                  Net Disbursable Amount
                </span>
                <div className="text-xl font-extrabold text-[#714B67] tabular-nums mt-1">
                  {formatINR(activePayrun.netTotal)}
                </div>
                <span className="text-[11px] text-[#438A6B] font-semibold mt-0.5 block">
                  100% Reconciled
                </span>
              </div>
            </div>

            {/* Payslips Generated under this Payrun */}
            <div className="pt-2">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs font-bold text-[#28262D] uppercase tracking-wider">
                  Generated Payslips for this Batch ({payslips.length})
                </h4>
                <span className="text-[11px] text-[#74717A]">Click row to inspect salary structure</span>
              </div>

              <div className="border border-[#E4E1E5] rounded-[12px] overflow-hidden">
                <table className="w-full text-left text-xs text-[#28262D]">
                  <thead className="bg-[#FBFAFB] text-[#74717A] border-b border-[#E4E1E5] text-[10px] uppercase font-bold">
                    <tr>
                      <th className="py-2.5 px-3">Employee</th>
                      <th className="py-2.5 px-3">Gross</th>
                      <th className="py-2.5 px-3">Deductions</th>
                      <th className="py-2.5 px-3">Net Pay</th>
                      <th className="py-2.5 px-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F4F3F5]">
                    {payslips.map((ps) => (
                      <tr key={ps.id} className="hover:bg-[#FBFAFB] transition-colors">
                        <td className="py-2.5 px-3">
                          <span className="font-semibold text-[#28262D]">{ps.employeeName}</span>
                          <span className="text-[11px] text-[#A4879F] block">{ps.employeeCode}</span>
                        </td>
                        <td className="py-2.5 px-3 tabular-nums">{formatINR(ps.grossSalary)}</td>
                        <td className="py-2.5 px-3 tabular-nums text-[#C85A54]">
                          -{formatINR(ps.totalDeductions)}
                        </td>
                        <td className="py-2.5 px-3 tabular-nums font-bold text-[#28262D]">
                          {formatINR(ps.netSalary)}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <button
                            onClick={() => {
                              setSelectedPayslip(ps);
                              setSelectedAttendanceDate(null);
                              setIsSalaryDrawerOpen(true);
                            }}
                            className="p-1 text-[#714B67] hover:bg-[#F4F3F5] rounded transition-colors"
                            title="Inspect Payslip"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Confirm Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog((prev) => ({ ...prev, isOpen: false }))}
        onConfirm={() => updatePayrunStatus(confirmDialog.payrunId, confirmDialog.targetStatus)}
        title={confirmDialog.title}
        description={confirmDialog.description}
        confirmText="Confirm Status Update"
        variant={confirmDialog.variant}
      />

      {/* Wizard */}
      <PayrunWizardModal />
    </div>
  );
}
