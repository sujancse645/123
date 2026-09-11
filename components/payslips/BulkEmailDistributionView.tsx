'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '@/lib/context/app-context';
import {
  Mail,
  Send,
  RotateCcw,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  Search,
  Filter,
  Users,
  CheckSquare,
  Square,
  Play,
  Pause,
  StopCircle,
  FileText,
  Building,
  RefreshCw,
} from 'lucide-react';
import { KPICard } from '@/components/shared/KPICard';
import { SemanticIconTile } from '@/components/shared/SemanticIconTile';
import { formatINR, cn } from '@/lib/utils';
import { EmailDistributionJob, EmailRecipientResult } from '@/lib/types';
import { emailDistributionService } from '@/lib/services/email-distribution-service';
import { INITIAL_PAYRUNS } from '@/lib/mock-data/payroll';

export function BulkEmailDistributionView() {
  const { showToast } = useApp();

  // Workflow steps: 'config' | 'review' | 'progress' | 'summary'
  const [currentStep, setCurrentStep] = useState<'config' | 'review' | 'progress' | 'summary'>('summary');
  const [job, setJob] = useState<EmailDistributionJob | null>(null);

  // Filters & selection state for recipient table
  const [selectedRecipientIds, setSelectedRecipientIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'sent' | 'failed' | 'queued'>('all');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');

  // Pre-send configuration state
  const [selectedPayrunId, setSelectedPayrunId] = useState<string>('pr-202608');
  const [emailSubject, setEmailSubject] = useState<string>('Confidential: Your PeoplePay360 Payslip for August 2026');
  const [isSimulatingSend, setIsSimulatingSend] = useState<boolean>(false);
  const [isRetrying, setIsRetrying] = useState<boolean>(false);

  useEffect(() => {
    emailDistributionService.getCurrentJob().then((activeJob) => {
      setJob(activeJob);
      setSelectedRecipientIds(new Set(activeJob.recipients.map((r) => r.id)));
    });
  }, []);

  if (!job) return null;

  // Department counts
  const allDepartments = Array.from(new Set(job.recipients.map((r) => r.department)));

  // Filtered recipients
  const filteredRecipients = job.recipients.filter((r) => {
    const matchesSearch =
      r.employeeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.employeeCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.failureMessage && r.failureMessage.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!matchesSearch) return false;
    if (statusFilter !== 'all' && r.status !== statusFilter) return false;
    if (departmentFilter !== 'all' && r.department !== departmentFilter) return false;
    return true;
  });

  // Bulk Selection Helpers
  const handleSelectAll = () => {
    setSelectedRecipientIds(new Set(job.recipients.map((r) => r.id)));
  };

  const handleDeselectAll = () => {
    setSelectedRecipientIds(new Set());
  };

  const handleSelectFailedOnly = () => {
    const failedIds = job.recipients.filter((r) => r.status === 'failed').map((r) => r.id);
    setSelectedRecipientIds(new Set(failedIds));
  };

  const handleSelectValidOnly = () => {
    const validIds = job.recipients.filter((r) => r.email && r.email.includes('@')).map((r) => r.id);
    setSelectedRecipientIds(new Set(validIds));
  };

  const toggleRecipient = (id: string) => {
    const next = new Set(selectedRecipientIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedRecipientIds(next);
  };

  // Execution: Start distribution
  const handleStartSending = async () => {
    setCurrentStep('progress');
    setIsSimulatingSend(true);

    const selectedRecipientsList = job.recipients.filter((r) => selectedRecipientIds.has(r.id));
    const newJob = await emailDistributionService.startDistribution(
      selectedRecipientsList,
      emailSubject,
      'Regular Payrun — August 2026'
    );

    setJob(newJob);
    setIsSimulatingSend(false);
    setCurrentStep('summary');
    showToast('info', `Dispatched ${newJob.totalSelected} payslip emails via SES Gateway`);
  };

  // Execution: Retry Failed Only
  const handleRetryFailed = async () => {
    setIsRetrying(true);
    try {
      const result = await emailDistributionService.retryFailedOnly();
      setJob(result.job);
      showToast(
        'success',
        `Retried ${result.retriedCount} failed emails: ${result.succeededCount} delivered, ${result.stillFailedCount} remaining`
      );
    } catch {
      showToast('error', 'Retry operation failed');
    } finally {
      setIsRetrying(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E4E1E5] pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <SemanticIconTile icon={<Mail className="w-5 h-5" />} variant="email" size="table" />
            <h1 className="text-2xl font-black tracking-tight text-[#28262D]">Bulk Payslip Email Distribution</h1>
          </div>
          <p className="text-xs text-[#74717A]">
            Dispatch password-protected encrypted payslip PDFs to employees with real-time delivery telemetry and smart retry.
          </p>
        </div>

        {/* Step indicators / Navigation */}
        <div className="flex items-center gap-2">
          {job.failedCount > 0 && currentStep === 'summary' && (
            <button
              onClick={handleRetryFailed}
              disabled={isRetrying}
              className="px-4 py-2 rounded-[10px] bg-[#FFF8E1] hover:bg-[#FBE6A2] text-[#92400E] border border-[#FCD34D] text-xs font-bold transition-all flex items-center gap-2 shadow-xs"
            >
              <RotateCcw className={cn('w-3.5 h-3.5', isRetrying && 'animate-spin')} />
              <span>Retry Failed Only ({job.failedCount})</span>
            </button>
          )}

          <button
            onClick={() => setCurrentStep(currentStep === 'config' ? 'summary' : 'config')}
            className="px-4 py-2 rounded-[10px] bg-[#714B67] hover:bg-[#5E3D55] text-white text-xs font-bold transition-colors flex items-center gap-2 shadow-xs"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{currentStep === 'config' ? 'View Job Summary' : 'New Email Dispatch'}</span>
          </button>
        </div>
      </div>

      {/* KPI Cards for Summary / Progress */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Total Selected"
          value={job.totalSelected}
          subtitle={`Payrun: ${job.payrunName}`}
          icon={<Users className="w-5 h-5" />}
          iconVariant="payroll"
        />
        <KPICard
          title="Successfully Sent"
          value={job.successfullySent}
          subtitle={`${Math.round((job.successfullySent / job.totalSelected) * 100)}% delivery success rate`}
          icon={<CheckCircle2 className="w-5 h-5" />}
          iconVariant="success"
          highlight
        />
        <KPICard
          title="Failed Recipient Deliveries"
          value={job.failedCount}
          subtitle={job.failedCount > 0 ? 'Eligible for smart isolated retry' : 'Zero delivery errors'}
          icon={<XCircle className="w-5 h-5" />}
          iconVariant="failure"
          warning={job.failedCount > 0}
        />
        <KPICard
          title="Job Dispatch Duration"
          value={`${job.elapsedSeconds}s`}
          subtitle="SES Secure TLS Gateway"
          icon={<Clock className="w-5 h-5" />}
          iconVariant="email"
        />
      </div>

      {/* STEP: PRE-SEND CONFIG & SELECTION */}
      {currentStep === 'config' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 p-6 rounded-[18px] bg-white border border-[#E4E1E5] shadow-xs space-y-4">
            <h2 className="text-base font-bold text-[#28262D]">Dispatch Configuration & Filters</h2>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-[#28262D] mb-1">Target Payrun</label>
                <select
                  value={selectedPayrunId}
                  onChange={(e) => setSelectedPayrunId(e.target.value)}
                  className="w-full px-3 py-2 border border-[#E4E1E5] rounded-[10px] font-semibold text-[#28262D] bg-white"
                >
                  {INITIAL_PAYRUNS.map((pr) => (
                    <option key={pr.id} value={pr.id}>
                      {pr.name} ({pr.reference})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-[#28262D] mb-1">Email Subject Line</label>
                <input
                  type="text"
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  className="w-full px-3 py-2 border border-[#E4E1E5] rounded-[10px] font-medium text-[#28262D]"
                />
              </div>

              {/* Advanced Selection Filters */}
              <div>
                <label className="block font-bold text-[#28262D] mb-1.5">Quick Recipient Selection</label>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={handleSelectAll}
                    className="px-3 py-1.5 rounded-[8px] bg-[#F4F3F5] text-[#28262D] font-bold hover:bg-[#E4E1E5]"
                  >
                    Select All ({job.recipients.length})
                  </button>
                  <button
                    type="button"
                    onClick={handleSelectValidOnly}
                    className="px-3 py-1.5 rounded-[8px] bg-[#DCFCE7] text-[#166534] font-bold hover:bg-[#BBF7D0]"
                  >
                    Select Valid Emails Only
                  </button>
                  <button
                    type="button"
                    onClick={handleSelectFailedOnly}
                    className="px-3 py-1.5 rounded-[8px] bg-[#FFF8E1] text-[#92400E] font-bold hover:bg-[#FCD34D]"
                  >
                    Select Failed Deliveries Only ({job.failedCount})
                  </button>
                  <button
                    type="button"
                    onClick={handleDeselectAll}
                    className="px-3 py-1.5 rounded-[8px] border border-[#E4E1E5] text-[#74717A] font-semibold hover:bg-[#F4F3F5]"
                  >
                    Clear All
                  </button>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-[#F4F3F5] flex justify-end gap-2">
              <button
                onClick={() => setCurrentStep('review')}
                disabled={selectedRecipientIds.size === 0}
                className="px-5 py-2.5 rounded-[12px] bg-[#714B67] text-white text-xs font-bold hover:bg-[#5E3D55] disabled:opacity-50"
              >
                Proceed to Pre-Send Review ({selectedRecipientIds.size} Selected) →
              </button>
            </div>
          </div>

          <div className="p-5 rounded-[18px] bg-[#FBFAFB] border border-[#E4E1E5] space-y-3 text-xs">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#28262D]">Email Security Protocol</h3>
            <div className="p-3 bg-white rounded-[10px] border border-[#E4E1E5] space-y-1.5">
              <p className="font-bold text-[#28262D]">PDF Password Protection:</p>
              <p className="text-[#74717A]">
                Each employee’s payslip attachment is encrypted with their uppercase 4-letter name + birth year (e.g. ROHA1992).
              </p>
            </div>
            <div className="p-3 bg-white rounded-[10px] border border-[#E4E1E5] space-y-1.5">
              <p className="font-bold text-[#28262D]">Throttling & Rate Limits:</p>
              <p className="text-[#74717A]">
                Batches are dispatched at 25 emails/sec to prevent spam-filter false positives and avoid corporate relay limits.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* STEP: PRE-SEND REVIEW */}
      {currentStep === 'review' && (
        <div className="p-6 rounded-[18px] bg-white border border-[#E4E1E5] shadow-xs space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-[#F4F3F5]">
            <div>
              <h2 className="text-base font-bold text-[#28262D]">Pre-Send Verification Review</h2>
              <p className="text-xs text-[#74717A]">
                Review batch parameters, excluded recipients, and security verification before firing the relay.
              </p>
            </div>
            <button
              onClick={() => setCurrentStep('config')}
              className="text-xs font-bold text-[#714B67] hover:underline"
            >
              ← Edit Selection
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div className="p-4 rounded-[12px] bg-[#FBFAFB] border border-[#E4E1E5]">
              <span className="text-[#74717A] block font-bold uppercase text-[10px]">Total Recipients</span>
              <span className="text-2xl font-black text-[#28262D]">{selectedRecipientIds.size}</span>
            </div>
            <div className="p-4 rounded-[12px] bg-[#FBFAFB] border border-[#E4E1E5]">
              <span className="text-[#74717A] block font-bold uppercase text-[10px]">Est. Sending Time</span>
              <span className="text-2xl font-black text-[#438A6B]">
                {Math.max(4, Math.round(selectedRecipientIds.size * 0.12))}s
              </span>
            </div>
            <div className="p-4 rounded-[12px] bg-[#FBFAFB] border border-[#E4E1E5]">
              <span className="text-[#74717A] block font-bold uppercase text-[10px]">Attachment Format</span>
              <span className="text-sm font-bold text-[#714B67] mt-1 block">Password-Protected PDF</span>
            </div>
          </div>

          {/* Email Template Preview Box */}
          <div className="p-4 rounded-[12px] border border-[#E4E1E5] bg-[#FBFAFB] space-y-2 text-xs">
            <div className="flex justify-between border-b border-[#E4E1E5] pb-2">
              <span className="font-bold text-[#28262D]">Subject:</span>
              <span className="font-medium text-[#74717A]">{emailSubject}</span>
            </div>
            <div className="flex justify-between border-b border-[#E4E1E5] pb-2">
              <span className="font-bold text-[#28262D]">Sender:</span>
              <span className="font-medium text-[#74717A]">PeoplePay360 Payroll &lt;payroll@peoplepay360.internal&gt;</span>
            </div>
            <div className="pt-2 text-[#74717A] leading-relaxed">
              <p>Dear &#123;&#123;Employee_Name&#125;&#125;,</p>
              <p className="mt-1">
                Your confidential payslip for the period August 2026 is attached. To unlock your document, enter your password formula (First 4 letters of your First Name in CAPITAL + Your 4-digit Year of Birth).
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-[#F4F3F5]">
            <button
              onClick={() => setCurrentStep('config')}
              className="px-4 py-2 rounded-[10px] border border-[#E4E1E5] text-xs font-semibold text-[#74717A] hover:bg-[#F4F3F5]"
            >
              Cancel
            </button>
            <button
              onClick={handleStartSending}
              className="px-6 py-2.5 rounded-[12px] bg-[#714B67] hover:bg-[#5E3D55] text-white text-xs font-bold transition-colors flex items-center gap-2 shadow-xs"
            >
              <Send className="w-4 h-4" />
              <span>Authorize & Start Sending ({selectedRecipientIds.size} Payslips)</span>
            </button>
          </div>
        </div>
      )}

      {/* STEP: LIVE PROGRESS / SENDING */}
      {currentStep === 'progress' && (
        <div className="p-8 rounded-[18px] bg-white border border-[#E4E1E5] shadow-xs text-center space-y-6">
          <RefreshCw className="w-10 h-10 text-[#714B67] animate-spin mx-auto" />
          <div>
            <h2 className="text-lg font-bold text-[#28262D]">Sending Payslip Emails...</h2>
            <p className="text-xs text-[#74717A] mt-1">
              Encrypted PDF rendering and SMTP relay dispatch in progress.
            </p>
          </div>

          <div className="max-w-md mx-auto space-y-2">
            <div className="w-full h-3 rounded-full bg-[#F4F3F5] overflow-hidden">
              <div className="w-4/5 h-full bg-gradient-to-r from-[#714B67] to-[#438A6B] rounded-full animate-pulse" />
            </div>
            <div className="flex justify-between text-xs font-bold text-[#74717A]">
              <span>Dispatched 150 of 200</span>
              <span>75% Complete</span>
            </div>
          </div>
        </div>
      )}

      {/* STEP: SUMMARY & DETAILED RECIPIENT TELEMETRY TABLE */}
      {currentStep === 'summary' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="p-4 rounded-[16px] bg-white border border-[#E4E1E5] shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 text-[#74717A] absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search employee, email, failure reason..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-1.5 text-xs rounded-[10px] border border-[#E4E1E5] focus:outline-none focus:border-[#714B67]"
              />
            </div>

            <div className="flex items-center gap-2 flex-wrap w-full md:w-auto">
              <span className="text-xs font-semibold text-[#74717A] flex items-center gap-1">
                <Filter className="w-3.5 h-3.5" /> Status:
              </span>
              {(['all', 'sent', 'failed', 'queued'] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={cn(
                    'px-2.5 py-1 rounded-[8px] text-xs font-bold transition-all capitalize',
                    statusFilter === s
                      ? 'bg-[#714B67] text-white shadow-xs'
                      : 'bg-[#F4F3F5] text-[#74717A] hover:text-[#28262D]'
                  )}
                >
                  {s} ({job.recipients.filter((r) => s === 'all' || r.status === s).length})
                </button>
              ))}

              <select
                value={departmentFilter}
                onChange={(e) => setDepartmentFilter(e.target.value)}
                className="px-2.5 py-1 text-xs rounded-[8px] border border-[#E4E1E5] font-semibold text-[#28262D] bg-white"
              >
                <option value="all">All Departments</option>
                {allDepartments.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Table of Recipient Results */}
          <div className="rounded-[18px] bg-white border border-[#E4E1E5] shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-[#FBFAFB] text-[#74717A] uppercase text-[10px] tracking-wider border-b border-[#F4F3F5]">
                  <tr>
                    <th className="py-3 px-4">Employee</th>
                    <th className="py-3 px-4">Department</th>
                    <th className="py-3 px-4">Email Address</th>
                    <th className="py-3 px-4 text-center">Attempts</th>
                    <th className="py-3 px-4">Last Attempt</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4">Diagnostic Remarks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F4F3F5]">
                  {filteredRecipients.map((recip) => (
                    <tr key={recip.id} className="hover:bg-[#FBFAFB] transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-bold text-[#28262D]">{recip.employeeName}</div>
                        <div className="text-[10px] text-[#74717A]">{recip.employeeCode}</div>
                      </td>
                      <td className="py-3 px-4 text-[#74717A]">{recip.department}</td>
                      <td className="py-3 px-4 font-mono text-[11px] text-[#28262D]">
                        {recip.email || <span className="text-[#C85A54] italic">Missing address</span>}
                      </td>
                      <td className="py-3 px-4 text-center font-bold text-[#74717A] tabular-nums">
                        #{recip.attemptCount}
                      </td>
                      <td className="py-3 px-4 text-[#74717A] text-[11px]">{recip.lastAttemptTime || '—'}</td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={cn(
                            'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider',
                            recip.status === 'sent' && 'bg-[#DCFCE7] text-[#166534]',
                            recip.status === 'failed' && 'bg-[#FEE2E2] text-[#991B1B]',
                            recip.status === 'queued' && 'bg-[#FFF6D2] text-[#9A6B0A]'
                          )}
                        >
                          {recip.status === 'sent' && <CheckCircle2 className="w-3 h-3" />}
                          {recip.status === 'failed' && <XCircle className="w-3 h-3" />}
                          {recip.status === 'queued' && <Clock className="w-3 h-3" />}
                          {recip.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 max-w-xs text-[11px]">
                        {recip.status === 'sent' ? (
                          <span className="text-[#438A6B] font-medium">Delivered to mailbox (250 OK)</span>
                        ) : (
                          <span className="text-[#991B1B] font-semibold">{recip.failureMessage}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
