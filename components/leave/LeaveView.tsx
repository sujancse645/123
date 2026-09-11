'use client';

import React, { useState } from 'react';
import { useApp } from '@/lib/context/app-context';
import {
  CalendarHeart,
  Calendar,
  Clock,
  Plus,
  Filter,
  Search,
  CheckCircle2,
  AlertCircle,
  FileText,
  User,
  ChevronDown,
  Download,
} from 'lucide-react';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { LeaveRequestModal } from './LeaveRequestModal';
import { MedicalProofUploadModal } from '@/components/medical-proof/MedicalProofUploadModal';
import { formatINR, formatDate, cn } from '@/lib/utils';
import { medicalProofService } from '@/lib/services/medical-proof-service';
import { MedicalProof } from '@/lib/types';
import { downloadCsv } from '@/lib/exports/file-downloads';

export function LeaveView() {
  const { currentEmployee, currentRole, employees, leaveRequests, leaveTypes, payslips, setIsLeaveModalOpen, createEmployeeLeaveRequest, createLeaveType, allocateLeave } = useApp();
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [expandedRequest, setExpandedRequest] = useState<string | null>(null);

  // Medical proof state
  const [medicalProofs, setMedicalProofs] = useState<MedicalProof[]>([]);
  const [selectedProofToUpload, setSelectedProofToUpload] = useState<MedicalProof | null>(null);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [hrEmployeeId, setHrEmployeeId] = useState('');
  const [hrLeaveTypeId, setHrLeaveTypeId] = useState('');
  const [hrStartDate, setHrStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [hrEndDate, setHrEndDate] = useState(new Date().toISOString().slice(0, 10));
  const [hrReason, setHrReason] = useState('HR-approved time off');
  const [allocationDays, setAllocationDays] = useState(1);
  const [newTypeName, setNewTypeName] = useState('');
  const [newTypeCode, setNewTypeCode] = useState('');
  const [newTypePaid, setNewTypePaid] = useState(true);
  const [newTypeDays, setNewTypeDays] = useState(10);
  const isHr = currentRole === 'hr_manager' || currentRole === 'admin';

  const loadMedicalProofs = React.useCallback(() => {
    medicalProofService.getProofsForEmployee(currentEmployee.id).then(setMedicalProofs);
  }, [currentEmployee.id]);

  React.useEffect(() => {
    loadMedicalProofs();
  }, [loadMedicalProofs]);

  const pendingProof = medicalProofs.find(
    (p) => p.status === 'pending_upload' || p.status === 'resubmission_required' || p.status === 'overdue'
  );

  // Filter requests for current employee
  const myRequests = leaveRequests.filter((r) => {
    const isMine = r.employeeId === currentEmployee.id;
    const matchesStatus = statusFilter === 'all' || r.status === statusFilter;
    const matchesSearch =
      r.leaveTypeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.reason.toLowerCase().includes(searchTerm.toLowerCase());
    return isMine && matchesStatus && matchesSearch;
  });
  const unpaidRequests = leaveRequests.filter(r => r.employeeId === currentEmployee.id && !r.isPaid);
  const approvedUnpaidDays = unpaidRequests.filter(r => r.status === 'approved').reduce((sum,r)=>sum+r.unpaidDays,0);
  const pendingUnpaidDays = unpaidRequests.filter(r => r.status === 'submitted').reduce((sum,r)=>sum+r.unpaidDays,0);
  const actualLossOfPay = payslips.filter((p) => p.employeeId === currentEmployee.id).reduce((sum,p)=>sum+p.unpaidLeaveDeduction,0);

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-[16px] border border-[#E4E1E5] shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-[#28262D] tracking-tight">Time Off & Leaves</h2>
          <p className="text-xs text-[#74717A] mt-0.5">
            Manage annual leave balances, request time off, and review payroll deductions.
          </p>
        </div>

        <div className="flex items-center gap-2">
        <button
          onClick={() => downloadCsv('leave-requests.csv', ['Leave type', 'Start', 'End', 'Days', 'Paid', 'Status', 'Reason'], myRequests.map((request) => [request.leaveTypeName, request.startDate, request.endDate, request.chargeableWorkingDays, request.isPaid, request.status, request.reason]))}
          className="px-3.5 py-2 text-xs font-semibold text-[#714B67] bg-white rounded-[10px] border border-[#D8C7D4] flex items-center gap-1.5"
        ><Download className="w-3.5 h-3.5" /> Export CSV</button>
        <button
          onClick={() => setIsLeaveModalOpen(true)}
          className="px-4 py-2 bg-[#714B67] hover:bg-[#5C3C53] text-white text-xs font-bold rounded-[10px] shadow-xs flex items-center gap-1.5 transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Apply for Leave</span>
        </button>
        </div>
      </div>

      {/* PENDING MEDICAL PROOF NOTIFICATION CARD */}
      {pendingProof && (
        <div className="p-4 rounded-[16px] bg-[#FFF8E1] border border-[#FBE6A2] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-[10px] bg-[#FEF3C7] text-[#92400E] flex items-center justify-center shrink-0">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-xs font-bold text-[#92400E]">
                  Supporting Medical Certificate Required ({pendingProof.totalDays} Days Leave)
                </h4>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#FEF3C7] text-[#B45309] font-bold uppercase">
                  {pendingProof.status.replace(/_/g, ' ')}
                </span>
              </div>
              <p className="text-xs text-[#28262D] mt-0.5">
                Leave dates: {formatDate(pendingProof.leaveStartDate)} – {formatDate(pendingProof.leaveEndDate)}.
                Submission deadline: <span className="font-bold text-[#92400E]">{formatDate(pendingProof.submissionDeadline)}</span>.
              </p>
              {pendingProof.hrRemarks && (
                <p className="text-[11px] text-[#991B1B] font-medium mt-1">
                  HR Note: {pendingProof.hrRemarks}
                </p>
              )}
            </div>
          </div>

          <button
            onClick={() => {
              setSelectedProofToUpload(pendingProof);
              setIsUploadModalOpen(true);
            }}
            className="px-4 py-2 bg-[#714B67] hover:bg-[#5E3D55] text-white text-xs font-bold rounded-[10px] shadow-xs flex items-center gap-1.5 shrink-0"
          >
            <FileText className="w-4 h-4" />
            <span>Upload Certificate</span>
          </button>
        </div>
      )}

      {/* Leave Balances Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {leaveTypes.map((lt) => {
          const employeeAllocation = lt.allocations?.[currentEmployee.id];
          const total = employeeAllocation?.totalDays || lt.totalDays || lt.defaultDaysPerYear || 12;
          const remaining = employeeAllocation?.remainingDays ?? lt.remainingDays ?? lt.defaultDaysPerYear ?? 10;
          const percent = total > 0 ? Math.min(100, Math.round((remaining / total) * 100)) : 0;
          return (
            <div
              key={lt.id}
              className="p-5 bg-white rounded-[16px] border border-[#E4E1E5] shadow-xs flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#A4879F]">
                      {lt.code}
                    </span>
                    <h4 className="text-sm font-bold text-[#28262D] mt-0.5">{lt.name}</h4>
                  </div>
                  <span
                    className={cn(
                      'px-2 py-0.5 rounded-full text-[10px] font-bold border',
                      lt.isPaid
                        ? 'bg-[#EBF6F0] text-[#438A6B] border-[#C3E6D5]'
                        : 'bg-[#FFF6D2] text-[#9A6B0A] border-[#F8E29E]'
                    )}
                  >
                    {lt.isPaid ? 'Paid' : 'Unpaid'}
                  </span>
                </div>

                {lt.isPaid ? <div className="mt-4 flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-[#28262D] tabular-nums">{remaining}</span>
                  <span className="text-xs text-[#74717A]">/ {total} Days Available</span>
                </div> : <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                  <div><span className="block text-[10px] text-[#74717A]">Used this year</span><strong>{approvedUnpaidDays} days</strong></div>
                  <div><span className="block text-[10px] text-[#74717A]">Pending</span><strong>{pendingUnpaidDays} days</strong></div>
                  <div className="col-span-2"><span className="block text-[10px] text-[#74717A]">Actual loss of pay</span><strong className="text-[#C85A54]">{formatINR(actualLossOfPay)}</strong></div>
                </div>}
              </div>

              {lt.isPaid && <div className="mt-4">
                <div className="w-full bg-[#F4F3F5] h-2 rounded-full overflow-hidden">
                  <div
                    className={cn(
                      'h-full rounded-full transition-all duration-500',
                      percent > 40 ? 'bg-[#714B67]' : 'bg-[#D49525]'
                    )}
                    style={{ width: `${percent}%` }}
                  />
                </div>
                <div className="mt-2 flex items-center justify-between text-[11px] text-[#74717A]">
                  <span>Used: {Math.max(0, total - remaining)}d</span>
                  <span>{percent}% Remaining</span>
                </div>
              </div>}
            </div>
          );
        })}
      </div>

      {isHr && (
        <div className="bg-white rounded-[16px] border border-[#E4E1E5] shadow-xs p-5 space-y-4">
          <div>
            <h3 className="text-sm font-bold text-[#28262D]">HR Leave Administration</h3>
            <p className="text-xs text-[#74717A] mt-1">Create employee time off, allocate balances, and add leave types. Changes are stored locally in demo mode.</p>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 text-xs">
            <form className="space-y-2 p-3 rounded-[12px] bg-[#FBFAFB] border border-[#E4E1E5]" onSubmit={(event) => { event.preventDefault(); if (!hrEmployeeId || !hrLeaveTypeId) return; createEmployeeLeaveRequest(hrEmployeeId, { leaveTypeId: hrLeaveTypeId, startDate: hrStartDate, endDate: hrEndDate, reason: hrReason, chargeableWorkingDays: 1, calendarDays: 1, status: 'approved' }); }}>
              <strong className="block text-[#28262D]">Create time off for employee</strong>
              <select required value={hrEmployeeId} onChange={event => setHrEmployeeId(event.target.value)} className="w-full px-2 py-2 rounded-[8px] border border-[#E4E1E5] bg-white"><option value="">Select employee</option>{employees.map(employee => <option key={employee.id} value={employee.id}>{employee.name}</option>)}</select>
              <select required value={hrLeaveTypeId} onChange={event => setHrLeaveTypeId(event.target.value)} className="w-full px-2 py-2 rounded-[8px] border border-[#E4E1E5] bg-white"><option value="">Select leave type</option>{leaveTypes.map(type => <option key={type.id} value={type.id}>{type.code} · {type.name}</option>)}</select>
              <div className="grid grid-cols-2 gap-2"><input required type="date" value={hrStartDate} onChange={event => setHrStartDate(event.target.value)} className="px-2 py-2 rounded-[8px] border border-[#E4E1E5] bg-white" /><input required type="date" min={hrStartDate} value={hrEndDate} onChange={event => setHrEndDate(event.target.value)} className="px-2 py-2 rounded-[8px] border border-[#E4E1E5] bg-white" /></div>
              <input required value={hrReason} onChange={event => setHrReason(event.target.value)} className="w-full px-2 py-2 rounded-[8px] border border-[#E4E1E5] bg-white" placeholder="Reason" />
              <button className="w-full py-2 rounded-[8px] bg-[#714B67] text-white font-bold">Create approved time off</button>
            </form>
            <form className="space-y-2 p-3 rounded-[12px] bg-[#FBFAFB] border border-[#E4E1E5]" onSubmit={(event) => { event.preventDefault(); if (!hrEmployeeId || !hrLeaveTypeId) return; allocateLeave(hrEmployeeId, hrLeaveTypeId, allocationDays); }}>
              <strong className="block text-[#28262D]">Allocate leave balance</strong>
              <select required value={hrEmployeeId} onChange={event => setHrEmployeeId(event.target.value)} className="w-full px-2 py-2 rounded-[8px] border border-[#E4E1E5] bg-white"><option value="">Select employee</option>{employees.map(employee => <option key={employee.id} value={employee.id}>{employee.name}</option>)}</select>
              <select required value={hrLeaveTypeId} onChange={event => setHrLeaveTypeId(event.target.value)} className="w-full px-2 py-2 rounded-[8px] border border-[#E4E1E5] bg-white"><option value="">Select leave type</option>{leaveTypes.map(type => <option key={type.id} value={type.id}>{type.code} · {type.name}</option>)}</select>
              <input required type="number" min="0.5" step="0.5" value={allocationDays} onChange={event => setAllocationDays(Number(event.target.value))} className="w-full px-2 py-2 rounded-[8px] border border-[#E4E1E5] bg-white" />
              <button className="w-full py-2 rounded-[8px] border border-[#D8C7D4] text-[#714B67] font-bold">Allocate days</button>
            </form>
            <form className="space-y-2 p-3 rounded-[12px] bg-[#FBFAFB] border border-[#E4E1E5]" onSubmit={(event) => { event.preventDefault(); if (!newTypeName.trim() || !newTypeCode.trim()) return; createLeaveType({ name: newTypeName, code: newTypeCode.toUpperCase(), isPaid: newTypePaid, defaultDaysPerYear: newTypeDays, totalDays: newTypeDays, remainingDays: newTypeDays, color: newTypePaid ? '#714B67' : '#C85A54', description: 'Locally created HR leave type.' }); setNewTypeName(''); setNewTypeCode(''); }}>
              <strong className="block text-[#28262D]">Create leave type</strong>
              <input required value={newTypeName} onChange={event => setNewTypeName(event.target.value)} className="w-full px-2 py-2 rounded-[8px] border border-[#E4E1E5] bg-white" placeholder="Leave type name" />
              <input required value={newTypeCode} onChange={event => setNewTypeCode(event.target.value)} className="w-full px-2 py-2 rounded-[8px] border border-[#E4E1E5] bg-white uppercase" placeholder="Code" />
              <input required type="number" min="0" value={newTypeDays} onChange={event => setNewTypeDays(Number(event.target.value))} className="w-full px-2 py-2 rounded-[8px] border border-[#E4E1E5] bg-white" placeholder="Annual days" />
              <label className="flex items-center gap-2"><input type="checkbox" checked={newTypePaid} onChange={event => setNewTypePaid(event.target.checked)} /> Paid leave</label>
              <button className="w-full py-2 rounded-[8px] bg-[#438A6B] text-white font-bold">Create leave type</button>
            </form>
          </div>
        </div>
      )}

      {/* Leave Requests Table */}
      <div className="bg-white rounded-[16px] border border-[#E4E1E5] shadow-xs flex flex-col overflow-hidden">
        {/* Table Filter Header */}
        <div className="p-4 border-b border-[#F4F3F5] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h3 className="text-sm font-bold text-[#28262D]">My Leave Applications</h3>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1 bg-[#F4F3F5] p-1 rounded-[10px] text-xs">
              {['all', 'submitted', 'approved', 'rejected'].map((status) => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={cn(
                    'px-2.5 py-1 rounded-[8px] font-medium capitalize transition-colors',
                    statusFilter === status
                      ? 'bg-white text-[#714B67] shadow-xs font-semibold'
                      : 'text-[#74717A] hover:text-[#28262D]'
                  )}
                >
                  {status === 'rejected' ? 'Refused' : status}
                </button>
              ))}
            </div>

            <div className="relative">
              <Search className="w-3.5 h-3.5 text-[#74717A] absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search requests..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 pr-3 py-1 bg-[#FBFAFB] border border-[#E4E1E5] rounded-[10px] text-xs outline-none focus:border-[#714B67]"
              />
            </div>
          </div>
        </div>

        {/* Requests Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-[#28262D]">
            <thead className="bg-[#FBFAFB] text-[#74717A] uppercase text-[10px] font-bold tracking-wider border-b border-[#E4E1E5]">
              <tr>
                <th className="py-3 px-4">Leave Type</th>
                <th className="py-3 px-4">Dates</th>
                <th className="py-3 px-4">Duration</th>
                <th className="py-3 px-4">Reason</th>
                <th className="py-3 px-4">Payroll Impact</th>
                <th className="py-3 px-4">Approver</th>
                <th className="py-3 px-4 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F4F3F5]">
              {myRequests.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-[#74717A]">
                    No leave requests found for this status.
                  </td>
                </tr>
              ) : (
                myRequests.map((req) => (
                  <React.Fragment key={req.id}>
                  <tr className="hover:bg-[#FBFAFB] transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-[#28262D]">{req.leaveTypeName}</div>
                      <div className="text-[11px] text-[#A4879F]">Applied on {formatDate(req.appliedDate)}</div>
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px]">
                      {formatDate(req.startDate)}
                      {req.startDate !== req.endDate && ` to ${formatDate(req.endDate)}`}
                    </td>
                    <td className="py-3 px-4 font-semibold tabular-nums">
                      {req.chargeableWorkingDays} {req.chargeableWorkingDays === 1 ? 'day' : 'days'}
                      {req.isHalfDay && (
                        <span className="ml-1 text-[10px] text-[#714B67] bg-[#F4F3F5] px-1.5 py-0.5 rounded">
                          Half-day
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 max-w-xs truncate text-[#74717A]">
                      {req.reason}
                    </td>
                    <td className="py-3 px-4">
                      {req.estimatedDeduction > 0 ? (
                        <span className="text-[#C85A54] font-semibold">
                          -{formatINR(req.estimatedDeduction)} (LOP)
                        </span>
                      ) : (
                        <span className="text-[#438A6B] font-semibold">₹0 (Paid Full)</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-[#74717A]">
                      <div className="flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-[#A4879F]" />
                        <span>{req.approverName}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="inline-flex items-center gap-1">
                        <StatusBadge status={req.status} size="sm" />
                        {req.status === 'rejected' && <button aria-label="Show rejection reason" onClick={()=>setExpandedRequest(expandedRequest===req.id?null:req.id)} className="p-1 text-[#C85A54]"><ChevronDown className={cn('w-4 h-4 transition-transform',expandedRequest===req.id&&'rotate-180')}/></button>}
                      </div>
                    </td>
                  </tr>
                  {req.status === 'rejected' && expandedRequest === req.id && <tr className="bg-[#FDF1F0]"><td colSpan={7} className="px-4 py-3 text-[#8E3531]"><strong>Rejection reason:</strong> {req.rejectionReason}<span className="block mt-1 text-[10px] text-[#74717A]">Rejected by {req.rejectedBy ?? req.approverName}{req.rejectedAt ? ` on ${formatDate(req.rejectedAt)}` : ''}</span></td></tr>}
                  </React.Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Leave Request Modal */}
      <LeaveRequestModal />

      {/* Medical Proof Upload Modal */}
      {selectedProofToUpload && (
        <MedicalProofUploadModal
          proof={selectedProofToUpload}
          isOpen={isUploadModalOpen}
          onClose={() => setIsUploadModalOpen(false)}
          onSuccess={loadMedicalProofs}
        />
      )}
    </div>
  );
}
