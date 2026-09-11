'use client';

import React, { useState } from 'react';
import { useApp } from '@/lib/context/app-context';
import {
  CreditCard,
  PlusCircle,
  Clock,
  CheckCircle2,
  AlertCircle,
  Calendar,
  FileText,
  DollarSign,
  ArrowRight,
  TrendingDown,
  Info,
  ShieldCheck,
  ChevronRight,
  UploadCloud,
  Check,
  RefreshCw,
} from 'lucide-react';
import { KPICard } from '@/components/shared/KPICard';
import { SemanticIconTile } from '@/components/shared/SemanticIconTile';
import { formatINR, formatDate, cn } from '@/lib/utils';
import { EmployeeLoan, LoanInstalment, LumpSumPayment } from '@/lib/types';
import { COMPANY_LOAN_POLICY, generateRepaymentSchedule } from '@/lib/mock-data/employee-loans';
import { loanService } from '@/lib/services/loan-service';

export function MyLoansView() {
  const { currentEmployee, showToast } = useApp();

  // Active view tabs: 'active_loan' | 'request_loan' | 'history'
  const [activeTab, setActiveTab] = useState<'active_loan' | 'request_loan' | 'history'>('active_loan');

  // Loans state
  const [loans, setLoans] = useState<EmployeeLoan[]>([]);
  const [selectedLoan, setSelectedLoan] = useState<EmployeeLoan | null>(null);
  const [isLumpSumModalOpen, setIsLumpSumModalOpen] = useState(false);
  const [isSettlementModalOpen, setIsSettlementModalOpen] = useState(false);

  // Load loans on mount / employee change
  React.useEffect(() => {
    loanService.getLoansForEmployee(currentEmployee.id).then((userLoans) => {
      setLoans(userLoans);
      if (userLoans.length > 0) {
        setSelectedLoan(userLoans[0]);
      }
    });
  }, [currentEmployee.id]);

  // Request Loan Form State
  const [requestedAmount, setRequestedAmount] = useState<number>(50000);
  const [purpose, setPurpose] = useState<string>('Higher Education & Skill Enhancement');
  const [monthlyDeduction, setMonthlyDeduction] = useState<number>(5000);
  const [startMonth, setStartMonth] = useState<string>('Nov 2026');
  const [docName, setDocName] = useState<string>('');
  const [agreedConsent, setAgreedConsent] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Live calculation preview
  const liveSchedule = React.useMemo(() => {
    return generateRepaymentSchedule(
      requestedAmount,
      COMPANY_LOAN_POLICY.defaultInterestRate,
      monthlyDeduction,
      startMonth
    );
  }, [requestedAmount, monthlyDeduction, startMonth]);

  const liveTotalPayable = liveSchedule.reduce((sum, item) => sum + item.totalMonthlyDeduction, 0);
  const liveTotalInterest = liveSchedule.reduce((sum, item) => sum + item.interestDeducted, 0);
  const liveTenureMonths = liveSchedule.length;

  const handleApplyLoan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agreedConsent) {
      showToast('error', 'Please agree to payroll deduction consent');
      return;
    }
    if (requestedAmount < COMPANY_LOAN_POLICY.minAmount || requestedAmount > COMPANY_LOAN_POLICY.maxAmount) {
      showToast('error', `Amount must be between ${formatINR(COMPANY_LOAN_POLICY.minAmount)} and ${formatINR(COMPANY_LOAN_POLICY.maxAmount)}`);
      return;
    }

    setIsSubmitting(true);
    try {
      const created = await loanService.applyForLoan(
        currentEmployee.id,
        currentEmployee.name,
        currentEmployee.department || 'Engineering',
        {
          requestedAmount,
          purpose,
          preferredMonthlyDeduction: monthlyDeduction,
          preferredRepaymentPeriodMonths: liveTenureMonths,
          requestedStartMonth: startMonth,
          supportingDocName: docName || 'Employee_Loan_Affidavit.pdf',
          consentAgreed: true,
        }
      );
      setLoans((prev) => [created, ...prev]);
      setSelectedLoan(created);
      setActiveTab('active_loan');
      showToast('success', `Loan application ${created.loanNumber} submitted for HR review`);
    } catch {
      showToast('error', 'Failed to submit loan application');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Lump-sum state
  const [lumpSumAmount, setLumpSumAmount] = useState<number>(10000);
  const [lumpSumAdjustment, setLumpSumAdjustment] = useState<'reduce_tenure' | 'reduce_monthly_deduction'>('reduce_tenure');
  const [paymentMethod, setPaymentMethod] = useState<'bank_transfer' | 'upi' | 'cheque'>('bank_transfer');

  const handleLumpSumPayment = async () => {
    if (!selectedLoan) return;
    if (lumpSumAmount <= 0 || lumpSumAmount > selectedLoan.outstandingTotal) {
      showToast('error', 'Invalid lump sum payment amount');
      return;
    }

    try {
      const updated = await loanService.recordPartialPayment(selectedLoan.id, {
        paymentAmount: lumpSumAmount,
        paymentDate: new Date().toISOString().slice(0, 10),
        paymentMethod,
        repaymentAdjustment: lumpSumAdjustment,
        notes: `Voluntary advance prepayment via ${paymentMethod.toUpperCase()}`,
      });
      setSelectedLoan(updated);
      setLoans((prev) => prev.map((l) => (l.id === updated.id ? updated : l)));
      setIsLumpSumModalOpen(false);
      showToast('success', `Lump-sum payment of ${formatINR(lumpSumAmount)} recorded successfully`);
    } catch {
      showToast('error', 'Failed to process payment');
    }
  };

  const handleEarlySettlement = async () => {
    if (!selectedLoan) return;
    try {
      const updated = await loanService.requestFullSettlement(
        selectedLoan.id,
        new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10)
      );
      setSelectedLoan(updated);
      setLoans((prev) => prev.map((l) => (l.id === updated.id ? updated : l)));
      setIsSettlementModalOpen(false);
      showToast('success', 'Early full-settlement request submitted to Payroll for closure');
    } catch {
      showToast('error', 'Failed to submit settlement request');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with quick navigation tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E4E1E5] pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <SemanticIconTile icon={<CreditCard className="w-5 h-5" />} variant="loan" size="table" />
            <h1 className="text-2xl font-black tracking-tight text-[#28262D]">My Loans & Advances</h1>
          </div>
          <p className="text-xs text-[#74717A]">
            Manage company loans, view statutory interest amortization, make lump-sum prepayments, or apply for advances.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-[#F4F3F5] p-1 rounded-[12px]">
          <button
            onClick={() => setActiveTab('active_loan')}
            className={cn(
              'px-3.5 py-1.5 rounded-[10px] text-xs font-bold transition-all',
              activeTab === 'active_loan'
                ? 'bg-white text-[#714B67] shadow-xs'
                : 'text-[#74717A] hover:text-[#28262D]'
            )}
          >
            Active Loan
          </button>
          <button
            onClick={() => setActiveTab('request_loan')}
            className={cn(
              'px-3.5 py-1.5 rounded-[10px] text-xs font-bold transition-all flex items-center gap-1.5',
              activeTab === 'request_loan'
                ? 'bg-[#714B67] text-white shadow-xs'
                : 'text-[#74717A] hover:text-[#28262D]'
            )}
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Apply for Loan</span>
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={cn(
              'px-3.5 py-1.5 rounded-[10px] text-xs font-bold transition-all',
              activeTab === 'history'
                ? 'bg-white text-[#714B67] shadow-xs'
                : 'text-[#74717A] hover:text-[#28262D]'
            )}
          >
            Loan History ({loans.length})
          </button>
        </div>
      </div>

      {/* VIEW 1: ACTIVE LOAN DETAILS */}
      {activeTab === 'active_loan' && (
        <div className="space-y-6">
          {selectedLoan ? (
            <>
              {/* Summary KPIs */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <KPICard
                  title="Outstanding Total"
                  value={formatINR(selectedLoan.outstandingTotal)}
                  subtitle={`Principal: ${formatINR(selectedLoan.outstandingPrincipal)}`}
                  icon={<CreditCard className="w-5 h-5" />}
                  iconVariant="loan"
                  highlight
                />
                <KPICard
                  title="Monthly Deduction"
                  value={formatINR(selectedLoan.monthlyPayrollDeduction)}
                  subtitle={`Next: ${selectedLoan.nextDeductionDate}`}
                  icon={<Calendar className="w-5 h-5" />}
                  iconVariant="payroll"
                />
                <KPICard
                  title="Total Repaid"
                  value={formatINR(selectedLoan.amountRepaid)}
                  subtitle={`Principal Paid: ${formatINR(selectedLoan.principalAmount - selectedLoan.outstandingPrincipal)}`}
                  icon={<CheckCircle2 className="w-5 h-5" />}
                  iconVariant="success"
                />
                <KPICard
                  title="Remaining Tenure"
                  value={`${selectedLoan.remainingInstalments} of ${selectedLoan.totalInstalments}`}
                  subtitle={`Interest: ${selectedLoan.annualInterestRate}% p.a. (Reducing)`}
                  icon={<Clock className="w-5 h-5" />}
                  iconVariant="attendance"
                />
              </div>

              {/* Loan Card & Quick Actions Bar */}
              <div className="p-5 rounded-[18px] bg-white border border-[#E4E1E5] shadow-xs space-y-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#F4F3F5]">
                  <div>
                    <div className="flex items-center gap-3">
                      <span className="text-lg font-bold text-[#28262D]">{selectedLoan.loanNumber}</span>
                      <span
                        className={cn(
                          'px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider',
                          selectedLoan.status === 'active' && 'bg-[#DCFCE7] text-[#166534] border border-[#BBF7D0]',
                          selectedLoan.status === 'submitted' && 'bg-[#FFF6D2] text-[#9A6B0A] border border-[#F8E29E]',
                          selectedLoan.status === 'payroll_review' && 'bg-[#FEF3C7] text-[#92400E] border border-[#FCD34D]',
                          selectedLoan.status === 'settlement_requested' && 'bg-[#F5EDF3] text-[#714B67] border border-[#E8D9E5]'
                        )}
                      >
                        {selectedLoan.status.replace('_', ' ')}
                      </span>
                    </div>
                    <p className="text-xs text-[#74717A] mt-1">
                      Purpose: <span className="font-semibold text-[#28262D]">{selectedLoan.purpose}</span> • Disbursed: {selectedLoan.loanStartDate}
                    </p>
                  </div>

                  {/* Prepayment & Settlement Actions */}
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <button
                      onClick={() => setIsLumpSumModalOpen(true)}
                      className="px-3.5 py-2 rounded-[10px] bg-[#FFF8E1] hover:bg-[#FBE6A2] text-[#92400E] border border-[#FCD34D] text-xs font-bold transition-colors flex items-center gap-1.5"
                    >
                      <DollarSign className="w-3.5 h-3.5" />
                      <span>Make Lump-Sum Payment</span>
                    </button>
                    <button
                      onClick={() => setIsSettlementModalOpen(true)}
                      className="px-3.5 py-2 rounded-[10px] bg-white hover:bg-[#F4F3F5] text-[#28262D] border border-[#E4E1E5] text-xs font-bold transition-colors flex items-center gap-1.5"
                    >
                      <ShieldCheck className="w-3.5 h-3.5 text-[#714B67]" />
                      <span>Request Early Settlement</span>
                    </button>
                  </div>
                </div>

                {/* Progress bar */}
                <div>
                  <div className="flex justify-between text-xs font-semibold text-[#74717A] mb-1.5">
                    <span>Repayment Progress</span>
                    <span className="text-[#28262D] tabular-nums">
                      {Math.round((selectedLoan.amountRepaid / selectedLoan.totalPayableAmount) * 100)}% Repaid
                    </span>
                  </div>
                  <div className="w-full h-2.5 rounded-full bg-[#F4F3F5] overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-[#714B67] to-[#438A6B] rounded-full transition-all duration-300"
                      style={{
                        width: `${Math.min(100, Math.round((selectedLoan.amountRepaid / selectedLoan.totalPayableAmount) * 100))}%`,
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Repayment Schedule Table */}
              <div className="rounded-[18px] bg-white border border-[#E4E1E5] shadow-xs overflow-hidden">
                <div className="p-4 border-b border-[#F4F3F5]"><h2 className="text-sm font-bold text-[#28262D]">Immutable Transaction History</h2><p className="text-[11px] text-[#74717A]">Every installment, lump sum and settlement remains auditable.</p></div>
                {(selectedLoan.transactionHistory?.length??0)>0 ? <div className="divide-y divide-[#F4F3F5]">{selectedLoan.transactionHistory!.map(tx=><div key={tx.id} className="p-3 grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs"><div><span className="block text-[10px] text-[#74717A]">Date</span>{tx.paidOn}</div><div><span className="block text-[10px] text-[#74717A]">Type</span>{tx.type.replaceAll('_',' ')}</div><div><span className="block text-[10px] text-[#74717A]">Principal / Interest</span>{formatINR(tx.principalComponent)} / {formatINR(tx.interestComponent)}</div><div><span className="block text-[10px] text-[#74717A]">Amount</span><strong>{formatINR(tx.amount)}</strong></div><div><span className="block text-[10px] text-[#74717A]">Reference</span><span className="font-mono">{tx.reference}</span></div></div>)}</div>:<p className="p-4 text-xs text-[#74717A]">No repayment transactions recorded yet.</p>}
              </div>

              {selectedLoan.status==='closed'&&<div className="p-4 rounded-[14px] bg-[#EBF6F0] border border-[#C3E6D5] text-xs text-[#285C46]"><strong>Loan Closed</strong><span className="block mt-1">Settled on {selectedLoan.closedAt} • Reference {selectedLoan.closureReference}</span></div>}

              {/* Repayment Schedule Table */}
              <div className="rounded-[18px] bg-white border border-[#E4E1E5] shadow-xs overflow-hidden">
                <div className="p-4 border-b border-[#F4F3F5] flex items-center justify-between">
                  <div>
                    <h2 className="text-sm font-bold text-[#28262D]">Amortized Repayment Schedule</h2>
                    <p className="text-[11px] text-[#74717A]">
                      Monthly deductions are directly mapped to payroll payruns.
                    </p>
                  </div>
                  <span className="text-xs font-semibold text-[#714B67] bg-[#F5EDF3] px-2.5 py-1 rounded-[8px]">
                    Method: Reducing Balance ({selectedLoan.annualInterestRate}% p.a.)
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-[#FBFAFB] text-[#74717A] uppercase text-[10px] tracking-wider border-b border-[#F4F3F5]">
                      <tr>
                        <th className="py-3 px-4">Instalment #</th>
                        <th className="py-3 px-4">Payroll Month</th>
                        <th className="py-3 px-4 text-right">Opening Balance</th>
                        <th className="py-3 px-4 text-right">Principal</th>
                        <th className="py-3 px-4 text-right">Interest (6%)</th>
                        <th className="py-3 px-4 text-right">Total Deduction</th>
                        <th className="py-3 px-4 text-right">Closing Balance</th>
                        <th className="py-3 px-4 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#F4F3F5]">
                      {selectedLoan.repaymentSchedule.map((inst) => (
                        <tr
                          key={inst.id}
                          className={cn(
                            'hover:bg-[#FBFAFB] transition-colors',
                            inst.status === 'deducted' && 'bg-[#FDFDFE]',
                            inst.status === 'upcoming' && 'bg-[#FFFDF5] font-semibold'
                          )}
                        >
                          <td className="py-3 px-4 font-bold text-[#28262D]">#{inst.instalmentNumber}</td>
                          <td className="py-3 px-4 text-[#28262D]">{inst.payrollMonth}</td>
                          <td className="py-3 px-4 text-right tabular-nums text-[#74717A]">{formatINR(inst.openingBalance)}</td>
                          <td className="py-3 px-4 text-right tabular-nums text-[#28262D]">{formatINR(inst.principalDeducted)}</td>
                          <td className="py-3 px-4 text-right tabular-nums text-[#92400E]">{formatINR(inst.interestDeducted)}</td>
                          <td className="py-3 px-4 text-right tabular-nums font-bold text-[#714B67]">{formatINR(inst.totalMonthlyDeduction)}</td>
                          <td className="py-3 px-4 text-right tabular-nums text-[#74717A]">{formatINR(inst.closingBalance)}</td>
                          <td className="py-3 px-4 text-center">
                            <span
                              className={cn(
                                'inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase',
                                inst.status === 'deducted' && 'bg-[#DCFCE7] text-[#166534]',
                                inst.status === 'upcoming' && 'bg-[#FFF6D2] text-[#9A6B0A] border border-[#F8E29E]',
                                inst.status === 'overdue' && 'bg-[#FEE2E2] text-[#991B1B]'
                              )}
                            >
                              {inst.status === 'deducted' ? 'Deducted via Payslip' : inst.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-16 bg-white rounded-[18px] border border-[#E4E1E5]">
              <SemanticIconTile icon={<CreditCard className="w-8 h-8" />} variant="loan" size="lg" className="mx-auto mb-3" />
              <h3 className="text-base font-bold text-[#28262D]">No Active Company Loans</h3>
              <p className="text-xs text-[#74717A] max-w-sm mx-auto mt-1 mb-4">
                You currently have no active loans or advances running against your monthly payroll.
              </p>
              <button
                onClick={() => setActiveTab('request_loan')}
                className="px-4 py-2 rounded-[10px] bg-[#714B67] text-white text-xs font-bold shadow-xs hover:bg-[#5E3D55] transition-colors"
              >
                Apply for New Loan
              </button>
            </div>
          )}
        </div>
      )}

      {/* VIEW 2: APPLY FOR NEW LOAN */}
      {activeTab === 'request_loan' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Application Form */}
          <div className="lg:col-span-2 p-6 rounded-[18px] bg-white border border-[#E4E1E5] shadow-xs">
            <h2 className="text-base font-bold text-[#28262D] mb-1">Company Loan & Advance Application</h2>
            <p className="text-xs text-[#74717A] mb-6">
              Low-interest internal company loans are available for eligible full-time staff. Interest is calculated on a reducing monthly balance.
            </p>

            <form onSubmit={handleApplyLoan} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#28262D] mb-1">
                  Requested Loan Amount (INR) <span className="text-[#C85A54]">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs font-bold text-[#74717A]">₹</span>
                  <input
                    type="number"
                    min={COMPANY_LOAN_POLICY.minAmount}
                    max={COMPANY_LOAN_POLICY.maxAmount}
                    step={5000}
                    value={requestedAmount}
                    onChange={(e) => setRequestedAmount(Number(e.target.value))}
                    className="w-full pl-7 pr-4 py-2 text-sm rounded-[10px] border border-[#E4E1E5] font-semibold text-[#28262D] focus:outline-none focus:border-[#714B67]"
                    required
                  />
                </div>
                <div className="flex justify-between text-[10px] text-[#74717A] mt-1">
                  <span>Min: {formatINR(COMPANY_LOAN_POLICY.minAmount)}</span>
                  <span>Max: {formatINR(COMPANY_LOAN_POLICY.maxAmount)}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#28262D] mb-1">
                  Preferred Monthly Payroll Deduction <span className="text-[#C85A54]">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs font-bold text-[#74717A]">₹</span>
                  <input
                    type="number"
                    min={COMPANY_LOAN_POLICY.minMonthlyDeduction}
                    max={COMPANY_LOAN_POLICY.maxMonthlyDeduction}
                    step={1000}
                    value={monthlyDeduction}
                    onChange={(e) => setMonthlyDeduction(Number(e.target.value))}
                    className="w-full pl-7 pr-4 py-2 text-sm rounded-[10px] border border-[#E4E1E5] font-semibold text-[#28262D] focus:outline-none focus:border-[#714B67]"
                    required
                  />
                </div>
                <p className="text-[10px] text-[#74717A] mt-1">
                  Deducted directly from monthly net payrun. Recommended 10%–20% of net salary.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#28262D] mb-1">
                    Requested Start Month <span className="text-[#C85A54]">*</span>
                  </label>
                  <select
                    value={startMonth}
                    onChange={(e) => setStartMonth(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-[10px] border border-[#E4E1E5] font-semibold text-[#28262D] bg-white focus:outline-none focus:border-[#714B67]"
                  >
                    <option value="Oct 2026">October 2026</option>
                    <option value="Nov 2026">November 2026</option>
                    <option value="Dec 2026">December 2026</option>
                    <option value="Jan 2027">January 2027</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#28262D] mb-1">
                    Purpose / Loan Category <span className="text-[#C85A54]">*</span>
                  </label>
                  <select
                    value={purpose}
                    onChange={(e) => setPurpose(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-[10px] border border-[#E4E1E5] font-semibold text-[#28262D] bg-white focus:outline-none focus:border-[#714B67]"
                  >
                    <option value="Higher Education & Skill Enhancement">Higher Education & Skill Enhancement</option>
                    <option value="Medical Emergency & Family Hospitalisation">Medical Emergency & Family Hospitalisation</option>
                    <option value="Relocation & Rental Advance">Relocation & Rental Advance</option>
                    <option value="Home Repair & Renovation">Home Repair & Renovation</option>
                    <option value="General Employee Emergency Advance">General Employee Emergency Advance</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#28262D] mb-1">
                  Supporting Document (Rental agreement, admission letter, medical estimate)
                </label>
                <div className="p-4 rounded-[12px] border border-dashed border-[#E4E1E5] bg-[#FBFAFB] text-center">
                  <UploadCloud className="w-6 h-6 text-[#74717A] mx-auto mb-1" />
                  <p className="text-xs font-semibold text-[#28262D]">
                    {docName || 'Click to select proof document (PDF, PNG, JPG up to 10MB)'}
                  </p>
                  <input
                    type="file"
                    className="hidden"
                    id="loan-doc-upload"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setDocName(e.target.files[0].name);
                      }
                    }}
                  />
                  <label
                    htmlFor="loan-doc-upload"
                    className="inline-block mt-2 px-3 py-1 bg-white border border-[#E4E1E5] rounded-[8px] text-xs font-bold text-[#714B67] cursor-pointer hover:bg-[#F4F3F5]"
                  >
                    Browse Files
                  </label>
                </div>
              </div>

              {/* Consent check */}
              <div className="p-3 rounded-[12px] bg-[#FFF8E1] border border-[#FBE6A2] flex items-start gap-2.5">
                <input
                  type="checkbox"
                  id="loan-consent"
                  checked={agreedConsent}
                  onChange={(e) => setAgreedConsent(e.target.checked)}
                  className="mt-0.5 rounded text-[#714B67] focus:ring-[#714B67]"
                />
                <label htmlFor="loan-consent" className="text-xs text-[#28262D] leading-relaxed cursor-pointer">
                  I hereby authorize PeoplePay360 to deduct the scheduled monthly instalment of{' '}
                  <span className="font-bold">{formatINR(monthlyDeduction)}</span> directly from my monthly salary payslip until full principal and interest are settled.
                </label>
              </div>

              <div className="pt-2 flex items-center gap-3">
                <button
                  type="submit"
                  disabled={isSubmitting || !agreedConsent}
                  className="px-5 py-2.5 rounded-[12px] bg-[#714B67] text-white text-xs font-bold shadow-xs hover:bg-[#5E3D55] disabled:opacity-50 transition-colors flex items-center gap-2"
                >
                  {isSubmitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  <span>Submit Loan Application</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('active_loan')}
                  className="px-4 py-2.5 rounded-[12px] border border-[#E4E1E5] text-[#74717A] text-xs font-semibold hover:bg-[#F4F3F5]"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>

          {/* Real-time Calculation Preview Sidebar */}
          <div className="space-y-4">
            <div className="p-5 rounded-[18px] bg-[#FBFAFB] border border-[#E4E1E5]">
              <div className="flex items-center gap-2 mb-3">
                <SemanticIconTile icon={<Info className="w-4 h-4" />} variant="payroll" size="sm" />
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#28262D]">
                  Live Calculation Preview
                </h3>
              </div>

              <div className="space-y-3 text-xs">
                <div className="flex justify-between py-1.5 border-b border-[#E4E1E5]">
                  <span className="text-[#74717A]">Requested Principal</span>
                  <span className="font-bold text-[#28262D]">{formatINR(requestedAmount)}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-[#E4E1E5]">
                  <span className="text-[#74717A]">Annual Interest Rate</span>
                  <span className="font-bold text-[#438A6B]">{COMPANY_LOAN_POLICY.defaultInterestRate}% p.a.</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-[#E4E1E5]">
                  <span className="text-[#74717A]">Estimated Tenure</span>
                  <span className="font-bold text-[#28262D]">{liveTenureMonths} Months</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-[#E4E1E5]">
                  <span className="text-[#74717A]">Total Interest</span>
                  <span className="font-bold text-[#92400E]">{formatINR(liveTotalInterest)}</span>
                </div>
                <div className="flex justify-between py-2 border-t-2 border-[#714B67]/20 bg-[#F5EDF3] -mx-2 px-2 rounded-md">
                  <span className="font-bold text-[#714B67]">Total Repayable</span>
                  <span className="font-extrabold text-[#714B67]">{formatINR(liveTotalPayable)}</span>
                </div>
              </div>

              <div className="mt-4 p-3 rounded-[10px] bg-white border border-[#E4E1E5] text-[11px] text-[#74717A] space-y-1">
                <p className="font-bold text-[#28262D]">Policy Highlights:</p>
                <p>• Zero foreclosure penalty or prepayment fees.</p>
                <p>• Deductions pause automatically during unpaid leaves.</p>
                <p>• Two approvals required: HR Manager followed by Payroll.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 3: LOAN HISTORY */}
      {activeTab === 'history' && (
        <div className="rounded-[18px] bg-white border border-[#E4E1E5] shadow-xs overflow-hidden">
          <div className="p-4 border-b border-[#F4F3F5]">
            <h2 className="text-sm font-bold text-[#28262D]">Company Loan History</h2>
            <p className="text-[11px] text-[#74717A]">Past and present loans requested under your profile.</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-[#FBFAFB] text-[#74717A] uppercase text-[10px] tracking-wider border-b border-[#F4F3F5]">
                <tr>
                  <th className="py-3 px-4">Loan Number</th>
                  <th className="py-3 px-4">Purpose</th>
                  <th className="py-3 px-4 text-right">Principal</th>
                  <th className="py-3 px-4 text-right">Repaid</th>
                  <th className="py-3 px-4 text-right">Outstanding</th>
                  <th className="py-3 px-4">Start Month</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F4F3F5]">
                {loans.map((loan) => (
                  <tr key={loan.id} className="hover:bg-[#FBFAFB] transition-colors">
                    <td className="py-3 px-4 font-bold text-[#28262D]">{loan.loanNumber}</td>
                    <td className="py-3 px-4 text-[#74717A] max-w-xs truncate">{loan.purpose}</td>
                    <td className="py-3 px-4 text-right tabular-nums font-semibold text-[#28262D]">{formatINR(loan.principalAmount)}</td>
                    <td className="py-3 px-4 text-right tabular-nums text-[#438A6B]">{formatINR(loan.amountRepaid)}</td>
                    <td className="py-3 px-4 text-right tabular-nums font-bold text-[#714B67]">{formatINR(loan.outstandingTotal)}</td>
                    <td className="py-3 px-4 text-[#74717A]">{loan.loanStartDate}</td>
                    <td className="py-3 px-4 text-center">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-[#DCFCE7] text-[#166534]">
                        {loan.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => {
                          setSelectedLoan(loan);
                          setActiveTab('active_loan');
                        }}
                        className="text-[#714B67] font-semibold hover:underline"
                      >
                        View Schedule →
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* LUMP SUM PREPAYMENT MODAL */}
      {isLumpSumModalOpen && selectedLoan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-[18px] p-6 shadow-xl border border-[#E4E1E5] space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#F4F3F5]">
              <div className="flex items-center gap-2">
                <SemanticIconTile icon={<DollarSign className="w-4 h-4" />} variant="loan" size="sm" />
                <h3 className="text-sm font-bold text-[#28262D]">Partial Lump-Sum Prepayment</h3>
              </div>
              <button onClick={() => setIsLumpSumModalOpen(false)} className="text-[#74717A] hover:text-[#28262D]">✕</button>
            </div>

            <div className="text-xs space-y-3">
              <p className="text-[#74717A]">
                Prepaying principal directly lowers total interest and closes the loan faster with zero penalty.
              </p>

              <div>
                <label className="block font-bold text-[#28262D] mb-1">Prepayment Amount (INR)</label>
                <input
                  type="number"
                  min={1000}
                  max={selectedLoan.outstandingTotal}
                  step={1000}
                  value={lumpSumAmount}
                  onChange={(e) => setLumpSumAmount(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-[#E4E1E5] rounded-[10px] font-bold text-[#28262D]"
                />
                <span className="text-[10px] text-[#74717A]">Current outstanding: {formatINR(selectedLoan.outstandingTotal)}</span>
              </div>

              <div>
                <label className="block font-bold text-[#28262D] mb-1">Repayment Schedule Adjustment</label>
                <div className="space-y-1.5">
                  <label className="flex items-center gap-2 p-2 rounded-[8px] border border-[#E4E1E5] cursor-pointer hover:bg-[#FBFAFB]">
                    <input
                      type="radio"
                      name="adjustment"
                      checked={lumpSumAdjustment === 'reduce_tenure'}
                      onChange={() => setLumpSumAdjustment('reduce_tenure')}
                    />
                    <div>
                      <p className="font-bold text-[#28262D]">Reduce Loan Tenure</p>
                      <p className="text-[10px] text-[#74717A]">Maintain monthly deduction {formatINR(selectedLoan.monthlyPayrollDeduction)} and finish months earlier.</p>
                    </div>
                  </label>
                  <label className="flex items-center gap-2 p-2 rounded-[8px] border border-[#E4E1E5] cursor-pointer hover:bg-[#FBFAFB]">
                    <input
                      type="radio"
                      name="adjustment"
                      checked={lumpSumAdjustment === 'reduce_monthly_deduction'}
                      onChange={() => setLumpSumAdjustment('reduce_monthly_deduction')}
                    />
                    <div>
                      <p className="font-bold text-[#28262D]">Reduce Monthly Deduction</p>
                      <p className="text-[10px] text-[#74717A]">Keep same end date but lower future monthly payroll deductions.</p>
                    </div>
                  </label>
                </div>
              </div>

              <div>
                <label className="block font-bold text-[#28262D] mb-1">Payment Method</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as any)}
                  className="w-full px-3 py-2 border border-[#E4E1E5] rounded-[10px] font-semibold text-[#28262D]"
                >
                  <option value="bank_transfer">Direct Corporate Bank Transfer (NEFT / RTGS)</option>
                  <option value="upi">Corporate Instant UPI</option>
                  <option value="cheque">Company Accounts Cheque</option>
                </select>
              </div>
            </div>

            <div className="pt-3 border-t border-[#F4F3F5] flex justify-end gap-2">
              <button
                onClick={() => setIsLumpSumModalOpen(false)}
                className="px-3.5 py-2 text-xs font-semibold text-[#74717A] rounded-[10px] hover:bg-[#F4F3F5]"
              >
                Cancel
              </button>
              <button
                onClick={handleLumpSumPayment}
                className="px-4 py-2 text-xs font-bold text-white bg-[#714B67] rounded-[10px] hover:bg-[#5E3D55]"
              >
                Confirm Payment of {formatINR(lumpSumAmount)}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EARLY SETTLEMENT REQUEST MODAL */}
      {isSettlementModalOpen && selectedLoan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-[18px] p-6 shadow-xl border border-[#E4E1E5] space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#F4F3F5]">
              <div className="flex items-center gap-2">
                <SemanticIconTile icon={<ShieldCheck className="w-4 h-4" />} variant="success" size="sm" />
                <h3 className="text-sm font-bold text-[#28262D]">Early Loan Full-Settlement</h3>
              </div>
              <button onClick={() => setIsSettlementModalOpen(false)} className="text-[#74717A] hover:text-[#28262D]">✕</button>
            </div>

            <div className="p-4 rounded-[12px] bg-[#FBFAFB] border border-[#E4E1E5] space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-[#74717A]">Outstanding Principal:</span>
                <span className="font-bold text-[#28262D]">{formatINR(selectedLoan.outstandingPrincipal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#74717A]">Accrued Interest to Date:</span>
                <span className="font-bold text-[#92400E]">{formatINR(Math.round(selectedLoan.outstandingPrincipal * 0.005))}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#74717A]">Foreclosure / Penalty Fee:</span>
                <span className="font-bold text-[#438A6B]">₹0 (Free)</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-[#E4E1E5] font-extrabold text-[#714B67] text-sm">
                <span>Total Settlement Amount:</span>
                <span>{formatINR(selectedLoan.outstandingPrincipal + Math.round(selectedLoan.outstandingPrincipal * 0.005))}</span>
              </div>
            </div>

            <p className="text-xs text-[#74717A]">
              Submitting this request will generate a formal settlement closure voucher and notify the Payroll team to stop further monthly salary deductions.
            </p>

            <div className="pt-3 border-t border-[#F4F3F5] flex justify-end gap-2">
              <button
                onClick={() => setIsSettlementModalOpen(false)}
                className="px-3.5 py-2 text-xs font-semibold text-[#74717A] rounded-[10px] hover:bg-[#F4F3F5]"
              >
                Close
              </button>
              <button
                onClick={handleEarlySettlement}
                className="px-4 py-2 text-xs font-bold text-white bg-[#714B67] rounded-[10px] hover:bg-[#5E3D55]"
              >
                Submit Settlement Request
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
