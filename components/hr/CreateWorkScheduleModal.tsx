'use client';

import React from 'react';
import { CalendarDays, CheckCircle2, Clock, X } from 'lucide-react';
import { useApp } from '@/lib/context/app-context';
import { DEPARTMENTS } from '@/lib/mock-data/departments-schedules';
import type { WorkingSchedule, WorkingScheduleDay } from '@/lib/types';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { peoplePayQueries } from '@/lib/supabase/peoplepay360_supabase_queries';
import { logLocalFallback } from '@/lib/demo/local-fallback';

const WEEKDAYS = [
  ['Monday', 'Mon'], ['Tuesday', 'Tue'], ['Wednesday', 'Wed'], ['Thursday', 'Thu'],
  ['Friday', 'Fri'], ['Saturday', 'Sat'], ['Sunday', 'Sun'],
] as const;

type AssignmentType = 'company' | 'department' | 'employee';
type Option = { id: string; label: string };

export function CreateWorkScheduleModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (schedule: WorkingSchedule) => void;
}) {
  const { currentRole, employees } = useApp();
  const [name, setName] = React.useState('');
  const [type, setType] = React.useState<WorkingSchedule['type']>('standard');
  const [workingDays, setWorkingDays] = React.useState([1, 2, 3, 4, 5]);
  const [startTime, setStartTime] = React.useState('09:30');
  const [endTime, setEndTime] = React.useState('18:30');
  const [lunchStart, setLunchStart] = React.useState('13:00');
  const [lunchEnd, setLunchEnd] = React.useState('14:00');
  const [graceMinutes, setGraceMinutes] = React.useState(10);
  const [overtimeEligible, setOvertimeEligible] = React.useState(true);
  const [effectiveFrom, setEffectiveFrom] = React.useState('2026-09-05');
  const [effectiveTo, setEffectiveTo] = React.useState('');
  const [assignmentType, setAssignmentType] = React.useState<AssignmentType>('company');
  const [assignmentId, setAssignmentId] = React.useState('');
  const [departmentOptions, setDepartmentOptions] = React.useState<Option[]>(
    DEPARTMENTS.map((department) => ({ id: department.id, label: department.name }))
  );
  const [employeeOptions, setEmployeeOptions] = React.useState<Option[]>(
    employees.map((employee) => ({ id: employee.id, label: `${employee.name} · ${employee.employeeId}` }))
  );
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState('');
  const canCreate = ['hr_manager', 'payroll_user', 'payroll_manager', 'admin'].includes(currentRole);

  React.useEffect(() => {
    if (!open) return;
    const client = getSupabaseBrowserClient();
    const companyId = process.env.NEXT_PUBLIC_DEMO_COMPANY_ID;
    if (!client || !companyId) return;
    Promise.all([
      client.from('departments').select('id,name').eq('company_id', companyId).eq('is_active', true),
      client.from('employees').select('id,full_name,employee_code').eq('company_id', companyId),
    ]).then(([departmentsResult, employeesResult]) => {
      if (departmentsResult.data) setDepartmentOptions(departmentsResult.data.map((row) => ({ id: row.id, label: row.name })));
      if (employeesResult.data) setEmployeeOptions(employeesResult.data.map((row) => ({ id: row.id, label: `${row.full_name} · ${row.employee_code}` })));
    });
  }, [open]);

  if (!open) return null;

  const toggleDay = (day: number) => setWorkingDays((days) =>
    days.includes(day) ? days.filter((value) => value !== day) : [...days, day].sort()
  );

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    if (!canCreate) return setError('Your role cannot create working schedules.');
    if (!name.trim()) return setError('Schedule name is required.');
    if (!workingDays.length) return setError('Select at least one working day.');
    if (endTime <= startTime) return setError('End time must be after start time.');
    if (!(startTime < lunchStart && lunchStart < lunchEnd && lunchEnd < endTime)) {
      return setError('The lunch break must fall inside the working period.');
    }
    if (effectiveTo && effectiveTo < effectiveFrom) return setError('Effective-to date must follow effective-from date.');
    if (assignmentType !== 'company' && !assignmentId) return setError('Choose an assignment target.');

    const breakMinutes = (new Date(`2000-01-01T${lunchEnd}:00`).getTime() - new Date(`2000-01-01T${lunchStart}:00`).getTime()) / 60000;
    const days: WorkingScheduleDay[] = WEEKDAYS.map(([day, dayShort], index) => ({
      day, dayShort, isWorking: workingDays.includes(index + 1), startTime, endTime,
      lunchStart, lunchEnd, breakDurationMins: workingDays.includes(index + 1) ? breakMinutes : 0,
      graceMinutes, overtimeEligible,
    }));
    const workMinutes = (new Date(`2000-01-01T${endTime}:00`).getTime() - new Date(`2000-01-01T${startTime}:00`).getTime()) / 60000 - breakMinutes;
    const options = assignmentType === 'department' ? departmentOptions : employeeOptions;
    const assignmentLabel = assignmentType === 'company' ? 'Company default' : options.find((option) => option.id === assignmentId)?.label ?? assignmentType;

    const buildSchedule=(id:string):WorkingSchedule=>({id,name:name.trim(),type,days,weeklyHours:Math.round(workMinutes*workingDays.length/60*10)/10,hoursPerDay:Math.round(workMinutes/60*10)/10,daysPerWeek:workingDays.length,lunchBreakMinutes:breakMinutes,effectiveFrom,effectiveTo:effectiveTo||undefined,assignmentLabel,description:`${assignmentLabel} · ${startTime}–${endTime} · ${breakMinutes}-minute unpaid lunch`});
    setSaving(true);
    try {
      const client = getSupabaseBrowserClient();
      const companyId = process.env.NEXT_PUBLIC_DEMO_COMPANY_ID;
      let id = crypto.randomUUID();
      if (client && companyId) {
        const createdId = await peoplePayQueries.createWorkSchedule(client, {
          companyId, name: name.trim(), timezone: 'Asia/Kolkata', effectiveFrom,
          effectiveTo: effectiveTo || undefined, assignmentType,
          assignmentId: assignmentType === 'company' ? undefined : assignmentId,
          isCompanyDefault: assignmentType === 'company',
          days: days.map((day, index) => ({
            isoWeekday: index + 1, isWorking: day.isWorking, startTime, endTime,
            lunchStart, lunchEnd, breakMinutes: day.breakDurationMins,
            graceMinutes, overtimeEligible,
          })),
        });
        if (!createdId) throw new Error('The work schedule was not created.');
        id = createdId;
      }
      onCreated(buildSchedule(id));
      onClose();
    } catch (caught) {
      const localSchedule=buildSchedule(`local-schedule-${Date.now()}`);logLocalFallback('application','working_schedule_created_locally',{scheduleId:localSchedule.id,name:localSchedule.name,assignmentLabel},caught);onCreated(localSchedule);onClose();
    } finally { setSaving(false); }
  };

  const input = 'w-full mt-1 px-3 py-2 rounded-[9px] border border-[#E4E1E5] bg-[#FBFAFB] text-xs outline-none focus:border-[#714B67]';
  return (
    <div className="fixed inset-0 z-50 bg-black/45 p-4 grid place-items-center" role="dialog" aria-modal="true" aria-labelledby="schedule-title">
      <form onSubmit={submit} className="w-full max-w-2xl max-h-[calc(100vh-32px)] overflow-y-auto rounded-[18px] bg-white border border-[#E4E1E5] shadow-2xl">
        <header className="sticky top-0 z-10 flex items-start justify-between gap-4 p-5 bg-white border-b border-[#E4E1E5]">
          <div className="flex gap-3"><span className="w-10 h-10 rounded-[10px] bg-[#F3EEF2] text-[#714B67] grid place-items-center"><CalendarDays className="w-5 h-5" /></span><div><h2 id="schedule-title" className="font-bold">Create Work Schedule</h2><p className="text-xs text-[#74717A]">Define payable sessions, breaks, grace and effective assignment.</p></div></div>
          <button type="button" onClick={onClose} aria-label="Close schedule form" className="p-1.5 rounded-[8px] hover:bg-[#F4F3F5]"><X className="w-5 h-5" /></button>
        </header>
        <div className="p-5 space-y-5 text-xs">
          {error && <div role="alert" className="p-3 rounded-[10px] bg-[#FDF1F0] border border-[#F6CBC8] text-[#9D3F3A]">{error}</div>}
          <div className="grid sm:grid-cols-2 gap-3">
            <label>Schedule name *<input className={input} value={name} onChange={(event) => setName(event.target.value)} placeholder="Bengaluru General Shift" /></label>
            <label>Schedule type<select className={input} value={type} onChange={(event) => setType(event.target.value as WorkingSchedule['type'])}><option value="standard">Standard</option><option value="shift">Shift</option><option value="flexible">Flexible</option></select></label>
          </div>
          <fieldset><legend className="font-bold mb-2">Working days *</legend><div className="grid grid-cols-4 sm:grid-cols-7 gap-2">{WEEKDAYS.map(([day, short], index) => <button type="button" key={day} onClick={() => toggleDay(index + 1)} aria-pressed={workingDays.includes(index + 1)} className={`min-h-10 rounded-[9px] border font-semibold ${workingDays.includes(index + 1) ? 'bg-[#714B67] text-white border-[#714B67]' : 'bg-white border-[#E4E1E5] text-[#74717A]'}`}>{short}</button>)}</div></fieldset>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <label>Start *<input required type="time" className={input} value={startTime} onChange={(event) => setStartTime(event.target.value)} /></label>
            <label>Lunch start *<input required type="time" className={input} value={lunchStart} onChange={(event) => setLunchStart(event.target.value)} /></label>
            <label>Lunch end *<input required type="time" className={input} value={lunchEnd} onChange={(event) => setLunchEnd(event.target.value)} /></label>
            <label>End *<input required type="time" className={input} value={endTime} onChange={(event) => setEndTime(event.target.value)} /></label>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <label>Grace period (minutes)<input type="number" min="0" max="120" className={input} value={graceMinutes} onChange={(event) => setGraceMinutes(Number(event.target.value))} /></label>
            <label className="mt-5 flex items-center gap-2 p-2.5 rounded-[9px] bg-[#FBFAFB] border border-[#E4E1E5]"><input type="checkbox" checked={overtimeEligible} onChange={(event) => setOvertimeEligible(event.target.checked)} />Final work session is overtime eligible</label>
          </div>
          <div className="grid sm:grid-cols-2 gap-3"><label>Effective from *<input required type="date" className={input} value={effectiveFrom} onChange={(event) => setEffectiveFrom(event.target.value)} /></label><label>Effective to<input type="date" min={effectiveFrom} className={input} value={effectiveTo} onChange={(event) => setEffectiveTo(event.target.value)} /></label></div>
          <div className="grid sm:grid-cols-2 gap-3"><label>Assign as<select className={input} value={assignmentType} onChange={(event) => { setAssignmentType(event.target.value as AssignmentType); setAssignmentId(''); }}><option value="company">Company default</option><option value="department">Department default</option><option value="employee">Employee override</option></select></label>{assignmentType !== 'company' && <label>{assignmentType === 'department' ? 'Department' : 'Employee'} *<select required className={input} value={assignmentId} onChange={(event) => setAssignmentId(event.target.value)}><option value="">Select…</option>{(assignmentType === 'department' ? departmentOptions : employeeOptions).map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}</select></label>}</div>
          <div className="rounded-[12px] bg-[#F4F3F5] border border-[#E4E1E5] p-3"><p className="font-bold flex items-center gap-1.5"><Clock className="w-4 h-4 text-[#714B67]" />Generated ordered segments</p><p className="mt-1 text-[#74717A]">Check-in window → morning work → unpaid lunch → afternoon work → check-out window. Non-working weekdays are stored explicitly.</p></div>
        </div>
        <footer className="sticky bottom-0 flex justify-end gap-2 p-4 bg-white border-t border-[#E4E1E5]"><button type="button" onClick={onClose} className="px-4 py-2 rounded-[9px] border border-[#E4E1E5] font-semibold">Cancel</button><button disabled={saving || !canCreate} className="px-4 py-2 rounded-[9px] bg-[#714B67] text-white font-bold disabled:opacity-50 flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4" />{saving ? 'Creating…' : 'Create schedule'}</button></footer>
      </form>
    </div>
  );
}
