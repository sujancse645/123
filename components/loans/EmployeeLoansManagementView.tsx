'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '@/lib/context/app-context';
import {
  CreditCard,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Clock,
  Eye,
  FileText,
  DollarSign,
  Download,
  AlertTriangle,
  RefreshCw,
  Check,
} from 'lucide-react';
import { KPICard } from '@/components/shared/KPICard';
import { SemanticIconTile } from '@/components/shared/SemanticIconTile';
import { formatINR, formatDate, cn } from '@/lib/utils';
import { EmployeeLoan } from '@/lib/types';
import { loanService } from '@/lib/services/loan-service';

export function EmployeeLoansManagementView() {
  const { currentRole, showToast } = useApp();

  const [loans, setLoans] = useState<EmployeeLoan[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedLoan, setSelectedLoan] = useState<EmployeeLoan | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  const reloadLoans = () => {
    loanService.getAllLoans().then(setLoans);
  };

  useEffect(() => {
    reloadLoans();
  }, []);

  const isHR = currentRole === 'hr_manager' || currentRole === 'admin';
  const isPayroll = currentRole === 'payroll_user' || currentRole === 'payroll_manager' || currentRole === 'admin';

  const handleApproveHR = async (loanId: string) => {
    try {
      await loanService.approveByHR(loanId);
      showToast('success', 'Loan approved by HR; forwarded to Payroll for disbursement approval');
      reloadLoans();
    } catch {
      showToast('error', 'Action failed');
    }
  };

  const handleApprovePayroll = async (loanId: string) => {
    try {
      await loanService.approveByPayroll(loanId);
      showToast('success', 'Loan approved by Payroll; active deductions enabled for next payrun');
      reloadLoans();
    } catch {
      showToast('error', 'Action failed');
    }
  };

  const handleReject = async (loanId: string) => {
    try {
      await loanService.rejectLoan(loanId, 'Rejected during eligibility review');
      showToast('info', 'Loan request marked as rejected');
      reloadLoans();
    } catch {
      showToast('error', 'Action failed');
    }
  };

  const handleCloseSettlement = async (loanId: string) => {
    try {
      await loanService.closeLoan(loanId);
      showToast('success', 'Loan full-settlement verified and loan account closed');
      reloadLoans();
      setIsDetailModalOpen(false);
    } catch {
      showToast('error', 'Action failed');
    }
  };

  const filteredLoans = loans.filter((loan) => {
    const matchesSearch =
      loan.employeeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      loan.loanNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      loan.department.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;
    if (filterStatus === 'all') return true;
    if (filterStatus === 'active') return loan.status === 'active' || loan.status === 'partially_repaid';
    if (filterStatus === 'pending') return loan.status === 'submitted' || loan.status === 'hr_review' || loan.status === 'payroll_review';
    if (filterStatus === 'settlement') return loan.status === 'settlement_requested';
    if (filterStatus === 'closed') return loan.status === 'closed';
    return true;
  });

  const totalOutstanding = loans.reduce((sum, l) => (l.status !== 'closed' ? sum + l.outstandingTotal : sum), 0);
  const totalMonthlyDeductions = loans.reduce((sum, l) => (l.status === 'active' ? sum + l.monthlyPayrollDeduction : sum), 0);
  const pendingApprovalsCount = loans.filter((l) => l.status === 'submitted' || l.status === 'hr_review' || l.status === 'payroll_review').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E4E1E5] pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <SemanticIconTile icon={<CreditCard className="w-5 h-5" />} variant="loan" size="table" />
            <h1 className="text-2xl font-black tracking-tight text-[#28262D]">Employee Loans & Deductions</h1>
          </div>
          <p className="text-xs text-[#74717A]">
            Review loan applications, monitor active payroll deductions, approve settlements, and audit amortization schedules.
          </p>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Total Active Loans"
          value={loans.filter((l) => l.status === 'active' || l.status === 'partially_repaid').length}
          subtitle="Under payroll deduction"
          icon={<CreditCard className="w-5 h-5" />}
          iconVariant="loan"
          highlight
        />
        <KPICard
          title="Total Outstanding Balance"
          value={formatINR(totalOutstanding)}
          subtitle="Across all active borrowers"
          icon={<DollarSign className="w-5 h-5" />}
          iconVariant="payroll"
        />
        <KPICard
          title="Monthly Payroll Inflow"
          value={formatINR(totalMonthlyDeductions)}
          subtitle="Deducted in next payrun"
          icon={<CheckCircle2 className="w-5 h-5" />}
          iconVariant="success"
        />
        <KPICard
          title="Pending Approvals"
          value={pendingApprovalsCount}
          subtitle={isHR ? 'Awaiting HR validation' : 'Awaiting Payroll review'}
          icon={<Clock className="w-5 h-5" />}
          iconVariant="warning"
          warning={pendingApprovalsCount > 0}
        />
      </div>

      {/* Filter & Search Bar */}
      <div className="p-4 rounded-[16px] bg-white border border-[#E4E1E5] shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-[#74717A] absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search employee, loan #, department..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 text-xs rounded-[10px] border border-[#E4E1E5] focus:outline-none focus:border-[#714B67]"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap w-full md:w-auto">
          <span className="text-xs font-semibold text-[#74717A] flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" /> Filter:
          </span>
          {(['all', 'pending', 'active', 'settlement', 'closed'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={cn(
                'px-2.5 py-1 rounded-[8px] text-xs font-bold transition-all capitalize',
                filterStatus === s
                  ? 'bg-[#714B67] text-white shadow-xs'
                  : 'bg-[#F4F3F5] text-[#74717A] hover:text-[#28262D]'
              )}
            >
              {s === 'settlement' ? 'Settlements' : s}
            </button>
          ))}
        </div>
      </div>

      {/* Loans Table */}
      <div className="rounded-[18px] bg-white border border-[#E4E1E5] shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-[#FBFAFB] text-[#74717A] uppercase text-[10px] tracking-wider border-b border-[#F4F3F5]">
              <tr>
                <th className="py-3 px-4">Loan #</th>
                <th className="py-3 px-4">Employee</th>
                <th className="py-3 px-4">Department</th>
                <th className="py-3 px-4 text-right">Principal</th>
                <th className="py-3 px-4 text-right">Outstanding</th>
                <th className="py-3 px-4 text-right">Monthly Deduction</th>
                <th className="py-3 px-4 text-center">Remaining</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F4F3F5]">
              {filteredLoans.map((loan) => (
                <tr key={loan.id} className="hover:bg-[#FBFAFB] transition-colors">
                  <td className="py-3 px-4 font-bold text-[#28262D]">{loan.loanNumber}</td>
                  <td className="py-3 px-4">
                    <div className="font-bold text-[#28262D]">{loan.employeeName}</div>
                    <div className="text-[10px] text-[#74717A]">{loan.purpose}</div>
                  </td>
                  <td className="py-3 px-4 text-[#74717A]">{loan.department}</td>
                  <td className="py-3 px-4 text-right tabular-nums font-semibold text-[#28262D]">{formatINR(loan.principalAmount)}</td>
                  <td className="py-3 px-4 text-right tabular-nums font-bold text-[#714B67]">{formatINR(loan.outstandingTotal)}</td>
                  <td className="py-3 px-4 text-right tabular-nums text-[#28262D]">{formatINR(loan.monthlyPayrollDeduction)}</td>
                  <td className="py-3 px-4 text-center tabular-nums">
                    {loan.remainingInstalments} / {loan.totalInstalments}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span
                      className={cn(
                        'px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider',
                        loan.status === 'active' && 'bg-[#DCFCE7] text-[#166534]',
                        loan.status === 'submitted' && 'bg-[#FFF6D2] text-[#9A6B0A] border border-[#F8E29E]',
                        loan.status === 'payroll_review' && 'bg-[#FEF3C7] text-[#92400E] border border-[#FCD34D]',
                        loan.status === 'settlement_requested' && 'bg-[#F5EDF3] text-[#714B67] border border-[#E8D9E5]',
                        loan.status === 'closed' && 'bg-[#F1F3F5] text-[#5C6470]'
                      )}
                    >
                      {loan.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        onClick={() => {
                          setSelectedLoan(loan);
                          setIsDetailModalOpen(true);
                        }}
                        className="p-1.5 text-[#74717A] hover:text-[#714B67] rounded-md hover:bg-[#F4F3F5]"
                        title="View Repayment Schedule"
                      >
                        <Eye className="w-4 h-4" />
                      </button>

                      {/* HR approval trigger */}
                      {isHR && (loan.status === 'submitted' || loan.status === 'hr_review') && (
                        <button
                          onClick={() => handleApproveHR(loan.id)}
                          className="px-2 py-1 bg-[#438A6B] text-white rounded-[6px] text-[10px] font-bold hover:bg-[#346F55]"
                          title="Approve by HR"
                        >
                          Approve (HR)
                        </button>
                      )}

                      {/* Payroll approval trigger */}
                      {isPayroll && loan.status === 'payroll_review' && (
                        <button
                          onClick={() => handleApprovePayroll(loan.id)}
                          className="px-2 py-1 bg-[#714B67] text-white rounded-[6px] text-[10px] font-bold hover:bg-[#5E3D55]"
                          title="Approve by Payroll"
                        >
                          Disburse & Activate
                        </button>
                      )}

                      {/* Settlement resolution trigger */}
                      {isPayroll && loan.status === 'settlement_requested' && (
                        <button
                          onClick={() => {
                            setSelectedLoan(loan);
                            setIsDetailModalOpen(true);
                          }}
                          className="px-2 py-1 bg-[#92400E] text-white rounded-[6px] text-[10px] font-bold hover:bg-[#78350F]"
                          title="Process Settlement"
                        >
                          Settle Loan
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* DETAIL & SCHEDULE MODAL */}
      {isDetailModalOpen && selectedLoan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="w-full max-w-3xl max-h-[90vh] bg-white rounded-[18px] p-6 shadow-xl border border-[#E4E1E5] flex flex-col space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#F4F3F5]">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-[#28262D]">
                    {selectedLoan.loanNumber} — {selectedLoan.employeeName}
                  </h2>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-[#F5EDF3] text-[#714B67] font-bold uppercase">
                    {selectedLoan.status.replace('_', ' ')}
                  </span>
                </div>
                <p className="text-xs text-[#74717A] mt-0.5">
                  {selectedLoan.department} • Purpose: {selectedLoan.purpose}
                </p>
              </div>
              <button onClick={() => setIsDetailModalOpen(false)} className="text-[#74717A] hover:text-[#28262D]">✕</button>
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-4 gap-3 p-3 bg-[#FBFAFB] rounded-[12px] border border-[#E4E1E5] text-xs">
              <div>
                <span className="text-[#74717A] block text-[10px] uppercase font-bold">Principal</span>
                <span className="font-extrabold text-[#28262D]">{formatINR(selectedLoan.principalAmount)}</span>
              </div>
              <div>
                <span className="text-[#74717A] block text-[10px] uppercase font-bold">Total Repaid</span>
                <span className="font-extrabold text-[#438A6B]">{formatINR(selectedLoan.amountRepaid)}</span>
              </div>
              <div>
                <span className="text-[#74717A] block text-[10px] uppercase font-bold">Outstanding</span>
                <span className="font-extrabold text-[#714B67]">{formatINR(selectedLoan.outstandingTotal)}</span>
              </div>
              <div>
                <span className="text-[#74717A] block text-[10px] uppercase font-bold">Monthly Deduction</span>
                <span className="font-extrabold text-[#28262D]">{formatINR(selectedLoan.monthlyPayrollDeduction)}</span>
              </div>
            </div>

            {/* If early settlement is requested */}
            {selectedLoan.settlementRequest && (
              <div className="p-4 rounded-[12px] bg-[#FFF8E1] border border-[#FBE6A2] flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-[#92400E] flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4" />
                    Early Full-Settlement Requested by Employee
                  </h4>
                  <p className="text-[11px] text-[#28262D] mt-0.5">
                    Amount to settle:{' '}
                    <span className="font-bold">{formatINR(selectedLoan.settlementRequest.totalSettlementAmount)}</span> (Principal: {formatINR(selectedLoan.settlementRequest.outstandingPrincipal)} + Accrued Interest: {formatINR(selectedLoan.settlementRequest.accruedInterest)})
                  </p>
                </div>
                {isPayroll && (
                  <button
                    onClick={() => handleCloseSettlement(selectedLoan.id)}
                    className="px-3 py-1.5 bg-[#438A6B] text-white rounded-[8px] text-xs font-bold hover:bg-[#346F55] shadow-xs"
                  >
                    Confirm Settlement & Close Loan
                  </button>
                )}
              </div>
            )}

            {/* Schedule Table */}
            <div className="flex-1 overflow-y-auto border border-[#E4E1E5] rounded-[12px]">
              <table className="w-full text-xs text-left">
                <thead className="bg-[#FBFAFB] text-[#74717A] uppercase text-[10px] tracking-wider sticky top-0 border-b border-[#E4E1E5]">
                  <tr>
                    <th className="py-2.5 px-3">#</th>
                    <th className="py-2.5 px-3">Month</th>
                    <th className="py-2.5 px-3 text-right">Opening</th>
                    <th className="py-2.5 px-3 text-right">Principal</th>
                    <th className="py-2.5 px-3 text-right">Interest</th>
                    <th className="py-2.5 px-3 text-right">Total Deduction</th>
                    <th className="py-2.5 px-3 text-right">Closing</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F4F3F5]">
                  {selectedLoan.repaymentSchedule.map((inst) => (
                    <tr key={inst.id} className="hover:bg-[#FBFAFB]">
                      <td className="py-2 px-3 font-bold">{inst.instalmentNumber}</td>
                      <td className="py-2 px-3">{inst.payrollMonth}</td>
                      <td className="py-2 px-3 text-right tabular-nums text-[#74717A]">{formatINR(inst.openingBalance)}</td>
                      <td className="py-2 px-3 text-right tabular-nums">{formatINR(inst.principalDeducted)}</td>
                      <td className="py-2 px-3 text-right tabular-nums text-[#92400E]">{formatINR(inst.interestDeducted)}</td>
                      <td className="py-2 px-3 text-right tabular-nums font-bold text-[#714B67]">{formatINR(inst.totalMonthlyDeduction)}</td>
                      <td className="py-2 px-3 text-right tabular-nums text-[#74717A]">{formatINR(inst.closingBalance)}</td>
                      <td className="py-2 px-3 text-center">
                        <span className="text-[10px] font-bold uppercase text-[#438A6B]">
                          {inst.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="pt-3 border-t border-[#F4F3F5] flex justify-end">
              <button
                onClick={() => setIsDetailModalOpen(false)}
                className="px-4 py-2 bg-[#F4F3F5] hover:bg-[#E4E1E5] text-[#28262D] rounded-[10px] text-xs font-bold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
