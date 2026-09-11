'use client';

import React, { useState } from 'react';
import { useApp } from '@/lib/context/app-context';
import {
  CalendarCheck,
  Clock,
  UserCheck,
  UserX,
  AlertTriangle,
  FileCheck,
  Filter,
  Search,
  Calendar,
  Sparkles,
  Download,
} from 'lucide-react';
import { KPICard } from '@/components/shared/KPICard';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { cn, formatDate } from '@/lib/utils';
import { downloadCsv } from '@/lib/exports/file-downloads';

export function AttendanceView() {
  const {
    currentEmployee,
    currentUser,
    attendanceRecords,
    payslips,
    setIsCheckInModalOpen,
    setIsCorrectionModalOpen,
    setSelectedPayslip,
    setSelectedAttendanceDate,
    setIsSalaryDrawerOpen,
    addToast,
    markAttendancePresentRange,
  } = useApp();

  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedMonth, setSelectedMonth] = useState('2026-09');
  const [presentRangeStart,setPresentRangeStart]=useState('2026-09-01');
  const [presentRangeEnd,setPresentRangeEnd]=useState('2026-09-30');

  const isCheckedIn = currentEmployee.currentAttendanceStatus === 'checked_in';
  const canViewTeamAttendance=currentUser.role==='hr_manager'||currentUser.role==='admin';

  const findPayslipForDate = (employeeId: string, date: string) => {
    const selectedDate = new Date(`${date}T00:00:00`);
    const month = selectedDate.toLocaleString('en-US', { month: 'long' });
    const shortMonth = selectedDate.toLocaleString('en-US', { month: 'short' });
    const year = selectedDate.getFullYear().toString();
    return payslips.find((payslip) => {
      const period = (payslip.payrollPeriod || payslip.period || '').toLowerCase();
      return payslip.employeeId === employeeId && period.includes(year) &&
        (period.includes(month.toLowerCase()) || period.includes(shortMonth.toLowerCase()));
    });
  };

  const handleViewDayPayslip = (employeeId: string, date: string) => {
    const payslip = findPayslipForDate(employeeId, date);
    if (!payslip) {
      addToast('info', 'Payslip unavailable', 'There is no generated payslip covering this work day.');
      return;
    }
    setSelectedPayslip(payslip);
    setSelectedAttendanceDate(date);
    setIsSalaryDrawerOpen(true);
  };

  // Filter records for current employee or current context
  const filteredRecords = attendanceRecords.filter((r) => {
    const matchesEmp = canViewTeamAttendance||r.employeeId === currentEmployee.id;
    const matchesStatus = statusFilter === 'all' || r.status === statusFilter;
    const matchesSearch =
      r.date.includes(searchTerm) || r.employeeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (r.notes && r.notes.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesEmp && matchesStatus && matchesSearch;
  });

  // Calculate stats for employee
  const currentMonthRecords = attendanceRecords.filter(
    (r) => r.employeeId === currentEmployee.id && r.date.startsWith('2026-09')
  );
  const presentDays = currentMonthRecords.filter((r) => r.status === 'present' || r.status === 'late').length;
  const lateDays = currentMonthRecords.filter((r) => r.status === 'late').length;
  const totalWorkedHrs = currentMonthRecords.reduce((acc, r) => acc + (r.workedHours || 0), 0);
  const totalOtHrs = currentMonthRecords.reduce((acc, r) => acc + (r.overtimeHours || 0), 0);

  return (
    <div className="space-y-6">
      {/* Top Banner / Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-[16px] border border-[#E4E1E5] shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-[#28262D] tracking-tight">Attendance & Biometrics</h2>
          <p className="text-xs text-[#74717A] mt-0.5">
            Real-time biometric punch logs, shifts, worked hours, and corrections.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => downloadCsv('attendance-records.csv', ['Employee','Date', 'Status', 'Check in', 'Check out', 'Worked hours', 'Overtime hours', 'Notes'], filteredRecords.map((record) => [record.employeeName,record.date,record.status,record.checkIn,record.checkOut,record.workedHours,record.overtimeHours,record.notes]))}
            className="px-3.5 py-2 text-xs font-semibold text-[#714B67] bg-white rounded-[10px] border border-[#D8C7D4] flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" /> Export CSV
          </button>
          <button
            onClick={() => setIsCorrectionModalOpen(true)}
            className="px-3.5 py-2 text-xs font-semibold text-[#714B67] bg-[#F3EEF2] hover:bg-[#EBDDE9] rounded-[10px] border border-[#D8C7D4] transition-colors flex items-center gap-1.5"
          >
            <FileCheck className="w-3.5 h-3.5" />
            <span>Request Correction</span>
          </button>

          <button
            onClick={() => setIsCheckInModalOpen(true)}
            className={cn(
              'px-4 py-2 text-xs font-bold rounded-[10px] shadow-xs flex items-center gap-1.5 transition-colors',
              isCheckedIn
                ? 'bg-white text-[#C85A54] border border-[#F6CBC8] hover:bg-[#FDF1F0]'
                : 'bg-[#714B67] text-white hover:bg-[#5C3C53]'
            )}
          >
            {isCheckedIn ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
            <span>{isCheckedIn ? 'Record Check Out' : 'Record Check In'}</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Today's Attendance"
          value={isCheckedIn ? 'Checked In' : 'Checked Out'}
          subtitle={
            isCheckedIn
              ? `Since ${currentEmployee.todayCheckInTime || '09:28 AM'}`
              : 'Sign in to log hours'
          }
          icon={isCheckedIn ? <UserCheck className="w-5 h-5 text-[#438A6B]" /> : <UserX className="w-5 h-5 text-[#74717A]" />}
          highlight={isCheckedIn}
          trend={{ value: isCheckedIn ? 'On Time' : 'Pending', isPositive: isCheckedIn }}
        />

        <KPICard
          title="Today's Worked Hours"
          value={isCheckedIn ? '6h 48m' : '0h 00m'}
          subtitle="Standard shift: 8h 00m"
          icon={<Clock className="w-5 h-5" />}
          trend={{ value: '+0.4h Overtime', isPositive: true }}
        />

        <KPICard
          title="Month Present Days"
          value={`${presentDays} Days`}
          subtitle="September 2026 (4 Working Days)"
          icon={<CalendarCheck className="w-5 h-5" />}
        />

        <KPICard
          title="Attendance Exceptions"
          value={`${lateDays} Late`}
          subtitle="All flagged for manager review"
          icon={<AlertTriangle className="w-5 h-5" />}
          warning={lateDays > 0}
        />
      </div>

      {/* Working Schedule Banner */}
      <div className="p-4 bg-[#FBFAFB] rounded-[14px] border border-[#E4E1E5] grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-[10px] bg-[#F4F3F5] text-[#714B67] flex items-center justify-center font-bold">
            <Calendar className="w-4 h-4" />
          </div>
          <div>
            <p className="font-bold text-[#28262D]">{currentEmployee.workingScheduleName}</p>
            <p className="text-[#74717A] text-[11px]">
              Core hours: 09:30 AM - 06:30 PM (Mon-Fri) • 60 mins lunch break
            </p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 md:border-l md:border-[#E4E1E5] md:pl-4">
          <div><span className="block text-[10px] uppercase text-[#74717A]">Check-in</span><strong className="font-mono">{currentEmployee.todayCheckInTime||'--:--'}</strong><span className="block text-[10px] mt-1">Face • Location verified</span></div>
          <div className="text-right"><span className="block text-[10px] uppercase text-[#74717A]">Check-out</span><strong className="font-mono">{currentEmployee.todayCheckOutTime||'Pending'}</strong><span className="block text-[10px] mt-1">Worked: {isCheckedIn?'6h 48m':'8h 30m'}</span></div>
        </div>
      </div>

      {/* Attendance Calendar & Monthly Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Visual Monthly Calendar Grid (September 2026) */}
        <div className="lg:col-span-1 bg-white p-5 rounded-[16px] border border-[#E4E1E5] shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-[#28262D]">September 2026 Calendar</h3>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-[#F4F3F5] text-[#714B67]">
              Current Cycle
            </span>
          </div>
          <div className="mb-4 p-3 rounded-[10px] bg-[#FBFAFB] border border-[#E4E1E5] text-[11px] space-y-2">
            <strong className="block text-[#28262D]">Mark present for a date range</strong>
            <div className="grid grid-cols-2 gap-2"><input type="date" value={presentRangeStart} onChange={event=>setPresentRangeStart(event.target.value)} className="px-2 py-1.5 rounded border border-[#E4E1E5]"/><input type="date" min={presentRangeStart} value={presentRangeEnd} onChange={event=>setPresentRangeEnd(event.target.value)} className="px-2 py-1.5 rounded border border-[#E4E1E5]"/></div>
            <button type="button" onClick={()=>markAttendancePresentRange(presentRangeStart,presentRangeEnd)} className="w-full py-1.5 rounded bg-[#438A6B] text-white font-bold">Mark working days present</button>
          </div>

          {/* Calendar weekdays */}
          <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-semibold text-[#74717A] mb-2">
            <div>M</div><div>T</div><div>W</div><div>T</div><div>F</div><div>S</div><div>S</div>
          </div>

          {/* Days */}
          <div className="grid grid-cols-7 gap-1 text-center text-xs">
            {/* Blank offset for Sep 2026 (Starts on Tuesday) */}
            <div className="py-2 text-gray-300">31</div>
            {/* Days 1 to 30 */}
            {[
              { day: 1, status: 'present', hours: '8.0' },
              { day: 2, status: 'present', hours: '8.8' },
              { day: 3, status: 'present', hours: '8.2' },
              { day: 4, status: 'present', hours: '6.8', isToday: true },
              { day: 5, status: 'weekend' },
              { day: 6, status: 'weekend' },
              { day: 7, status: 'future' },
              { day: 8, status: 'future' },
              { day: 9, status: 'future' },
              { day: 10, status: 'future' },
              { day: 11, status: 'future' },
              { day: 12, status: 'weekend' },
              { day: 13, status: 'weekend' },
              { day: 14, status: 'future' },
              { day: 15, status: 'future' },
              { day: 16, status: 'future' },
              { day: 17, status: 'future' },
              { day: 18, status: 'planned_leave' },
              { day: 19, status: 'weekend' },
              { day: 20, status: 'weekend' },
              { day: 21, status: 'future' },
              { day: 22, status: 'future' },
              { day: 23, status: 'future' },
              { day: 24, status: 'future' },
              { day: 25, status: 'future' },
              { day: 26, status: 'weekend' },
              { day: 27, status: 'weekend' },
              { day: 28, status: 'future' },
              { day: 29, status: 'future' },
              { day: 30, status: 'future' },
            ].map((item) => (
              <div
                key={item.day}
                className={cn(
                  'h-8 rounded-[8px] flex items-center justify-center font-medium transition-all text-xs relative',
                  item.isToday && 'ring-2 ring-[#714B67] font-bold text-[#714B67]',
                  item.status === 'present' && 'bg-[#EBF6F0] text-[#438A6B]',
                  item.status === 'late' && 'bg-[#FFF6D2] text-[#9A6B0A]',
                  item.status === 'planned_leave' && 'bg-[#F1ECF5] text-[#714B67]',
                  item.status === 'weekend' && 'bg-[#F4F3F5]/60 text-[#74717A]/50',
                  item.status === 'future' && 'text-[#74717A]'
                )}
                title={`Day ${item.day}: ${item.status}`}
              >
                {item.day}
                {item.isToday && (
                  <span className="absolute -top-1 -right-1 w-1.5 h-1.5 rounded-full bg-[#438A6B]" />
                )}
              </div>
            ))}
          </div>

          {/* Legend */}
          <div className="mt-4 pt-3 border-t border-[#F4F3F5] grid grid-cols-2 gap-2 text-[11px] text-[#74717A]">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-[4px] bg-[#EBF6F0] border border-[#C3E6D5]" />
              <span>Present</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-[4px] bg-[#FFF6D2] border border-[#F8E29E]" />
              <span>Late Arrival</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-[4px] bg-[#F1ECF5] border border-[#DBCFE1]" />
              <span>Leave / Off</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-[4px] ring-2 ring-[#714B67]" />
              <span>Today</span>
            </div>
          </div>
        </div>

        {/* Attendance History Table with Filters */}
        <div className="lg:col-span-2 bg-white rounded-[16px] border border-[#E4E1E5] shadow-xs flex flex-col overflow-hidden">
          {/* Filters Bar */}
          <div className="p-4 border-b border-[#F4F3F5] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h3 className="text-sm font-bold text-[#28262D]">Attendance History</h3>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Status Filter Tabs */}
              <div className="flex items-center gap-1 bg-[#F4F3F5] p-1 rounded-[10px] text-xs">
                {['all', 'present', 'late', 'leave'].map((status) => (
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
                    {status}
                  </button>
                ))}
              </div>

              {/* Search input */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-[#74717A] absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Filter logs..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 pr-3 py-1 bg-[#FBFAFB] border border-[#E4E1E5] rounded-[10px] text-xs outline-none focus:border-[#714B67]"
                />
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="flex-1 overflow-x-auto">
            <table className="w-full text-left text-xs text-[#28262D]">
              <thead className="bg-[#FBFAFB] text-[#74717A] uppercase text-[10px] font-bold tracking-wider border-b border-[#E4E1E5]">
                <tr>
                  {canViewTeamAttendance&&<th className="py-3 px-4">Employee</th>}
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Check-In</th>
                  <th className="py-3 px-4">Check-Out</th>
                  <th className="py-3 px-4">Worked</th>
                  <th className="py-3 px-4">Overtime</th>
                  <th className="py-3 px-4">Verification</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Payslip</th>
                  <th className="py-3 px-4 text-right">Exception</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F4F3F5]">
                {filteredRecords.length === 0 ? (
                  <tr>
                    <td colSpan={canViewTeamAttendance?10:9} className="py-8 text-center text-[#74717A]">
                      No attendance logs match the current filters.
                    </td>
                  </tr>
                ) : (
                  filteredRecords.map((rec) => (
                    <tr key={rec.id} className="hover:bg-[#FBFAFB] transition-colors">
                      {canViewTeamAttendance&&<td className="py-3 px-4 font-semibold text-[#28262D]">{rec.employeeName}</td>}
                      <td className="py-3 px-4 font-semibold text-[#28262D]">
                        {formatDate(rec.date)}
                      </td>
                      <td className="py-3 px-4 font-mono">{rec.checkIn || '--:--'}</td>
                      <td className="py-3 px-4 font-mono">{rec.checkOut || '--:--'}</td>
                      <td className="py-3 px-4 font-medium tabular-nums">
                        {rec.workedHours > 0 ? `${ rec.workedHours}h` : '-'}
                      </td>
                      <td className="py-3 px-4 font-medium tabular-nums">
                        {rec.overtimeHours > 0 ? (
                          <span className="text-[#438A6B] font-semibold">+{rec.overtimeHours}h</span>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="py-3 px-4 capitalize">
                        <span className="px-2 py-0.5 rounded-[6px] bg-[#F4F3F5] text-[11px] font-medium text-[#714B67]">
                          {rec.verificationMethod}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <StatusBadge status={rec.status} size="sm" />
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => handleViewDayPayslip(rec.employeeId, rec.date)}
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#714B67] hover:text-[#5C3C53] hover:underline"
                          title="Open the payslip covering this work day"
                        >
                          <FileCheck className="w-3 h-3" /> View
                        </button>
                      </td>
                      <td className="py-3 px-4 text-right">
                        {rec.exceptionStatus && rec.exceptionStatus !== 'normal' ? (
                          <span className="text-[11px] text-[#C85A54] font-semibold flex items-center justify-end gap-1">
                            <AlertTriangle className="w-3 h-3" />
                            {rec.exceptionStatus === 'late_arrival' && 'Late'}
                            {rec.exceptionStatus === 'missing_checkout' && 'Missed Exit'}
                            {rec.exceptionStatus === 'unauthorized_absence' && 'Unapproved'}
                          </span>
                        ) : (
                          <span className="text-[#A4879F] text-[11px]">Normal</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

    </div>
  );
}
