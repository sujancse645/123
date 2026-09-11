'use client';

import React, { useState, useMemo } from 'react';
import { useApp } from '@/lib/context/app-context';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  CalendarHeart,
  Calendar,
  AlertTriangle,
  Upload,
  Info,
  CheckCircle2,
  DollarSign,
  TrendingDown,
  User,
} from 'lucide-react';
import { formatINR } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { calculateLeaveImpact } from '@/lib/domain/peoplepay-calculations';

export function LeaveRequestModal() {
  const { isLeaveModalOpen, setIsLeaveModalOpen, currentEmployee, submitLeaveRequest, leaveTypes } = useApp();

  const [selectedTypeId, setSelectedTypeId] = useState<string>('lt-1');
  const [startDate, setStartDate] = useState<string>('2026-09-18');
  const [endDate, setEndDate] = useState<string>('2026-09-18');
  const [isHalfDay, setIsHalfDay] = useState<boolean>(false);
  const [halfDayPeriod, setHalfDayPeriod] = useState<'first_half' | 'second_half'>('first_half');
  const [reason, setReason] = useState<string>('');
  const [attachmentName, setAttachmentName] = useState<string>('');

  const selectedType = leaveTypes.find((t) => t.id === selectedTypeId) || leaveTypes[0];
  const employeeLeaveType = useMemo(() => selectedType ? {
    ...selectedType,
    totalDays: selectedType.allocations?.[currentEmployee.id]?.totalDays ?? selectedType.totalDays,
    remainingDays: selectedType.allocations?.[currentEmployee.id]?.remainingDays ?? selectedType.remainingDays,
  } : selectedType, [selectedType, currentEmployee.id]);

  // Calculate live impact
  const impact = useMemo(() => {
    const start = new Date(startDate);
    const end = new Date(endDate);

    let calDays = 0;
    let weekends = 0;
    let holidays = 0;
    let workingDays = 0;

    if (!isNaN(start.getTime()) && !isNaN(end.getTime()) && end >= start) {
      let cur = new Date(start);
      while (cur <= end) {
        calDays++;
        const dayOfWeek = cur.getDay(); // 0 is Sun, 6 is Sat
        if (dayOfWeek === 0 || dayOfWeek === 6) {
          weekends++;
        } else {
          workingDays++;
        }
        cur.setDate(cur.getDate() + 1);
      }
    } else {
      calDays = 1;
      workingDays = 1;
    }

    if (isHalfDay) {
      workingDays = 0.5;
      calDays = 0.5;
    }

    const monthlyGross = currentEmployee.monthlySalaryGross || 45000;
    const leaveImpact = calculateLeaveImpact({
      requestedWorkingDays: workingDays,
      isPaidLeave: employeeLeaveType?.isPaid ?? true,
      availablePaidDays: employeeLeaveType?.remainingDays ?? currentEmployee.paidLeaveBalance,
      monthlySalaryBasis: monthlyGross,
      payableWorkingDays: 30,
    });
    const estimatedNetSalary = Math.max(0, monthlyGross - 4250 - leaveImpact.estimatedLossOfPay);

    return {
      calDays,
      weekends,
      holidays,
      workingDays,
      paidDaysUsed: leaveImpact.paidDays,
      unpaidDays: leaveImpact.unpaidDays,
      estimatedDeduction: leaveImpact.estimatedLossOfPay,
      estimatedNetSalary,
      availablePaidDays: leaveImpact.availablePaidDays,
    };
  }, [startDate, endDate, isHalfDay, employeeLeaveType, currentEmployee]);

  if (!isLeaveModalOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) return;

    submitLeaveRequest({
      leaveTypeId: selectedType.id,
      leaveTypeName: selectedType.name,
      isPaid: employeeLeaveType.isPaid,
      startDate,
      endDate,
      isHalfDay,
      halfDayPeriod: isHalfDay ? halfDayPeriod : undefined,
      reason,
      attachmentName: attachmentName || undefined,
      calendarDays: impact.calDays,
      excludedWeekends: impact.weekends,
      excludedHolidays: impact.holidays,
      chargeableWorkingDays: impact.workingDays,
      paidDaysUsed: impact.paidDaysUsed,
      unpaidDays: impact.unpaidDays,
      estimatedDeduction: impact.estimatedDeduction,
      estimatedNetSalaryAfter: impact.estimatedNetSalary,
    });
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative w-full max-w-xl bg-white rounded-[18px] border border-[#E4E1E5] shadow-2xl p-6 my-8"
        >
          {/* Header */}
          <div className="flex items-start justify-between pb-4 border-b border-[#F4F3F5]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-[12px] bg-[#F1ECF5] text-[#714B67] flex items-center justify-center font-bold">
                <CalendarHeart className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#28262D]">Request Leave / Time Off</h3>
                <p className="text-xs text-[#74717A]">
                  With real-time payroll deduction and working day impact preview.
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsLeaveModalOpen(false)}
              className="p-1.5 rounded-full text-[#74717A] hover:bg-[#F4F3F5]"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            {/* Leave Type Select */}
            <div>
              <label className="block text-xs font-semibold text-[#28262D] mb-1.5">
                Leave Type *
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {leaveTypes.map((lt) => {
                  const employeeType = lt.allocations?.[currentEmployee.id] ? { ...lt, ...lt.allocations[currentEmployee.id] } : lt;
                  const isSel = selectedTypeId === lt.id;
                  return (
                    <button
                      key={lt.id}
                      type="button"
                      onClick={() => setSelectedTypeId(lt.id)}
                      className={cn(
                        'p-2.5 rounded-[12px] border text-left transition-all',
                        isSel
                          ? 'border-[#714B67] bg-[#FBFAFB] ring-2 ring-[#714B67]/20 shadow-xs'
                          : 'border-[#E4E1E5] bg-white hover:bg-[#FBFAFB]'
                      )}
                    >
                      <p className="text-xs font-bold text-[#28262D] truncate">{lt.code}</p>
                      <p className="text-[10px] text-[#74717A] truncate mt-0.5">{lt.name}</p>
                      <div className="mt-1 text-[10px] font-semibold text-[#714B67]">
                        {employeeType.isPaid ? `${employeeType.remainingDays ?? employeeType.defaultDaysPerYear} paid days left` : 'Unlimited • Loss of Pay'}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Date Range Picker */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[#28262D] mb-1">
                  Start Date *
                </label>
                <input
                  type="date"
                  required
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    if (e.target.value > endDate) setEndDate(e.target.value);
                  }}
                  className="w-full px-3 py-2 bg-[#FBFAFB] border border-[#E4E1E5] focus:border-[#714B67] rounded-[10px] text-xs text-[#28262D] outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#28262D] mb-1">
                  End Date *
                </label>
                <input
                  type="date"
                  required
                  min={startDate}
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-3 py-2 bg-[#FBFAFB] border border-[#E4E1E5] focus:border-[#714B67] rounded-[10px] text-xs text-[#28262D] outline-none"
                />
              </div>
            </div>

            {/* Half Day Checkbox */}
            <div className="flex items-center justify-between p-3 rounded-[10px] bg-[#FBFAFB] border border-[#E4E1E5]">
              <label className="flex items-center gap-2 text-xs font-medium text-[#28262D] cursor-pointer">
                <input
                  type="checkbox"
                  checked={isHalfDay}
                  onChange={(e) => setIsHalfDay(e.target.checked)}
                  className="w-4 h-4 text-[#714B67] rounded border-[#E4E1E5] focus:ring-[#714B67]"
                />
                <span>Half-day leave</span>
              </label>

              {isHalfDay && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setHalfDayPeriod('first_half')}
                    className={cn(
                      'px-2.5 py-1 text-xs rounded-md font-medium transition-colors',
                      halfDayPeriod === 'first_half'
                        ? 'bg-[#714B67] text-white'
                        : 'bg-white text-[#74717A] border border-[#E4E1E5]'
                    )}
                  >
                    First Half
                  </button>
                  <button
                    type="button"
                    onClick={() => setHalfDayPeriod('second_half')}
                    className={cn(
                      'px-2.5 py-1 text-xs rounded-md font-medium transition-colors',
                      halfDayPeriod === 'second_half'
                        ? 'bg-[#714B67] text-white'
                        : 'bg-white text-[#74717A] border border-[#E4E1E5]'
                    )}
                  >
                    Second Half
                  </button>
                </div>
              )}
            </div>

            {/* Reason */}
            <div>
              <label className="block text-xs font-semibold text-[#28262D] mb-1">
                Reason for Leave *
              </label>
              <textarea
                rows={2}
                required
                placeholder="Specify the context for your absence..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full px-3 py-2 bg-[#FBFAFB] border border-[#E4E1E5] focus:border-[#714B67] rounded-[10px] text-xs text-[#28262D] outline-none resize-none"
              />
            </div>

            {/* MANDATORY MEDICAL PROOF WORKFLOW (LEAVES >= 10 DAYS) */}
            {selectedTypeId === 'lt-3' && impact.workingDays >= 10 ? (
              <div className="p-4 rounded-[14px] bg-[#FFF8E1] border border-[#FBE6A2] space-y-3">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-[#92400E] shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-bold text-[#92400E]">
                      Medical Proof Required (Duration: {impact.workingDays} Days)
                    </h4>
                    <p className="text-[11px] text-[#28262D] mt-0.5">
                      Company policy mandates verified hospital admission or physician certificates for medical leave of 10 or more working days.
                    </p>
                  </div>
                </div>

                <div className="space-y-2 pt-1 border-t border-[#FBE6A2]">
                  <span className="block text-[11px] font-bold text-[#92400E]">Select Submission Option:</span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <label
                      className={cn(
                        'p-2.5 rounded-[10px] border cursor-pointer flex items-start gap-2 transition-colors',
                        !attachmentName
                          ? 'bg-white border-[#FCD34D]'
                          : 'bg-white/80 border-[#E4E1E5]'
                      )}
                    >
                      <input
                        type="radio"
                        name="med_submission_opt"
                        checked={!attachmentName ? false : true}
                        onChange={() => {}}
                        className="mt-0.5 text-[#714B67]"
                      />
                      <div>
                        <span className="text-xs font-bold text-[#28262D] block">Upload Proof Now</span>
                        <span className="text-[10px] text-[#74717A]">Attach PDF/JPG/PNG certificate now.</span>
                      </div>
                    </label>

                    <label
                      className={cn(
                        'p-2.5 rounded-[10px] border cursor-pointer flex items-start gap-2 transition-colors',
                        !attachmentName
                          ? 'bg-white border-[#FCD34D]'
                          : 'bg-white/80 border-[#E4E1E5]'
                      )}
                    >
                      <input
                        type="radio"
                        name="med_submission_opt"
                        defaultChecked={true}
                        className="mt-0.5 text-[#714B67]"
                      />
                      <div>
                        <span className="text-xs font-bold text-[#28262D] block">Submit Post-Return</span>
                        <span className="text-[10px] text-[#74717A]">Allowed within 3 days after return date.</span>
                      </div>
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[#28262D] mb-1">
                    Upload Hospital Certificate / Doctor Note (PDF, PNG, JPG up to 10MB)
                  </label>
                  <div className="border border-dashed border-[#FCD34D] rounded-[10px] p-2.5 text-center bg-white hover:bg-[#FFFDF5] transition-colors cursor-pointer">
                    <input
                      type="file"
                      id="leave-file-med"
                      accept=".pdf,.png,.jpg,.jpeg"
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          const f = e.target.files[0];
                          if (f.size > 10 * 1024 * 1024) {
                            alert('File exceeds 10MB limit.');
                            return;
                          }
                          setAttachmentName(f.name);
                        }
                      }}
                    />
                    <label
                      htmlFor="leave-file-med"
                      className="cursor-pointer flex items-center justify-center gap-2 text-xs text-[#92400E] font-medium"
                    >
                      <Upload className="w-4 h-4" />
                      <span>{attachmentName ? attachmentName : 'Click to select certificate file'}</span>
                    </label>
                  </div>
                </div>
              </div>
            ) : (
              /* Standard Optional Attachment for ordinary leaves */
              <div>
                <label className="block text-xs font-semibold text-[#28262D] mb-1">
                  Supporting Attachment (Optional)
                </label>
                <div className="border border-dashed border-[#E4E1E5] rounded-[10px] p-3 text-center bg-[#FBFAFB] hover:bg-[#F4F3F5] transition-colors cursor-pointer">
                  <input
                    type="file"
                    id="leave-file"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setAttachmentName(e.target.files[0].name);
                      }
                    }}
                  />
                  <label htmlFor="leave-file" className="cursor-pointer flex items-center justify-center gap-2 text-xs text-[#714B67] font-medium">
                    <Upload className="w-4 h-4" />
                    <span>{attachmentName ? attachmentName : 'Upload Document (PDF, PNG, JPG)'}</span>
                  </label>
                </div>
              </div>
            )}

            {/* LIVE IMPACT PREVIEW CARD */}
            <div className="p-4 bg-gradient-to-br from-[#FFFDF5] to-[#FBFAFB] rounded-[14px] border border-[#F8E29E] shadow-2xs">
              <div className="flex items-center justify-between pb-2 border-b border-[#F8E29E]/60">
                <span className="text-xs font-bold text-[#9A6B0A] uppercase tracking-wider flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5" /> Live Payroll & Working Day Impact Preview
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#FFF6D2] text-[#9A6B0A] border border-[#F8E29E]">
                  Auto-Computed
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-3 text-xs">
                <div>
                  <span className="text-[#74717A] text-[11px] block">Total Calendar Days:</span>
                  <strong className="text-[#28262D] tabular-nums text-sm">
                    {impact.calDays} Day(s)
                  </strong>
                </div>

                <div>
                  <span className="text-[#74717A] text-[11px] block">Excluded Weekends:</span>
                  <strong className="text-[#28262D] tabular-nums text-sm">
                    {impact.weekends} Day(s)
                  </strong>
                </div>

                <div>
                  <span className="text-[#74717A] text-[11px] block">Chargeable Working:</span>
                  <strong className="text-[#714B67] tabular-nums text-sm font-bold">
                    {impact.workingDays} Day(s)
                  </strong>
                </div>

                <div>
                  <span className="text-[#74717A] text-[11px] block">Paid Days Covered:</span>
                  <strong className="text-[#438A6B] tabular-nums text-sm font-bold">
                    {impact.paidDaysUsed} Day(s)
                  </strong>
                </div>

                <div>
                  <span className="text-[#74717A] text-[11px] block">Unpaid Days (LOP):</span>
                  <strong
                    className={cn(
                      'tabular-nums text-sm font-bold',
                      impact.unpaidDays > 0 ? 'text-[#C85A54]' : 'text-[#74717A]'
                    )}
                  >
                    {impact.unpaidDays} Day(s)
                  </strong>
                </div>

                <div>
                  <span className="text-[#74717A] text-[11px] block">Estimated LOP Deduction:</span>
                  <strong
                    className={cn(
                      'tabular-nums text-sm font-bold',
                      impact.estimatedDeduction > 0 ? 'text-[#C85A54]' : 'text-[#438A6B]'
                    )}
                  >
                    {formatINR(impact.estimatedDeduction)}
                  </strong>
                </div>
              </div>

              {/* Deduction warning if unpaid days occur */}
              {impact.unpaidDays > 0 && (
                <div className="mt-3 p-2.5 bg-[#FDF1F0] rounded-[10px] border border-[#F6CBC8] text-[11px] text-[#C85A54] flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold">{selectedType.isPaid ? 'Paid Balance Exceeded' : 'Unpaid Leave Estimate'}</p>
                    <p>
                      {selectedType.isPaid && <>You have {impact.availablePaidDays} paid day(s) left in this category. The remaining </>}
                      {impact.unpaidDays} day(s) will be treated as Loss of Pay (LOP), reducing your net monthly pay
                      by {formatINR(impact.estimatedDeduction)}.
                    </p>
                  </div>
                </div>
              )}

              {/* Approver hierarchy display */}
              <div className="mt-3 pt-3 border-t border-[#F8E29E]/60 flex items-center justify-between text-[11px] text-[#74717A]">
                <div className="flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-[#714B67]" />
                  <span>
                    Routing to Approver:{' '}
                    <strong className="text-[#28262D]">
                      {currentEmployee.reportingManagerName || 'Priya Sundaram (Head of People)'}
                    </strong>
                  </span>
                </div>
                <span className="text-[#438A6B] font-semibold">Tier 1 Approval</span>
              </div>
            </div>

            {/* Actions */}
            <div className="pt-2 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setIsLeaveModalOpen(false)}
                className="px-4 py-2 text-xs font-medium text-[#74717A] hover:bg-[#F4F3F5] rounded-[10px]"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 bg-[#714B67] hover:bg-[#5C3C53] text-white text-xs font-bold rounded-[10px] shadow-xs flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                Submit Leave Application
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
