'use client';

import React from 'react';
import { WORKING_SCHEDULES } from '@/lib/mock-data/departments-schedules';
import { CalendarDays, Clock, Users, Plus, Coffee } from 'lucide-react';
import { useApp } from '@/lib/context/app-context';
import type { WorkingSchedule } from '@/lib/types';
import { CreateWorkScheduleModal } from './CreateWorkScheduleModal';

export function WorkingSchedulesView() {
  const { currentRole, showToast } = useApp();
  const [schedules, setSchedules] = React.useState<WorkingSchedule[]>(WORKING_SCHEDULES);
  const [isCreateOpen, setIsCreateOpen] = React.useState(false);
  const [expandedId, setExpandedId] = React.useState<string | null>(null);
  const canCreate = ['hr_manager', 'payroll_user', 'payroll_manager', 'admin'].includes(currentRole);

  React.useEffect(()=>{queueMicrotask(()=>{try{const stored=localStorage.getItem('peoplepay360-local-work-schedules');if(stored){const local=JSON.parse(stored) as WorkingSchedule[];setSchedules(current=>[...local,...current.filter(item=>!local.some(saved=>saved.id===item.id))])}}catch{/* keep seeded schedules */}})},[]);

  const handleCreated = (schedule: WorkingSchedule) => {
    setSchedules((current) => [schedule, ...current]);
    if(schedule.id.startsWith('local-')){try{const existing=JSON.parse(localStorage.getItem('peoplepay360-local-work-schedules')??'[]') as WorkingSchedule[];localStorage.setItem('peoplepay360-local-work-schedules',JSON.stringify([schedule,...existing.filter(item=>item.id!==schedule.id)].slice(0,50)))}catch{/* in-memory schedule remains available */}}
    setExpandedId(schedule.id);
    showToast('success', 'Work schedule created', `${schedule.name} is ready for attendance calculation.`);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-5 rounded-[16px] border border-[#E4E1E5] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div><h2 className="text-xl font-bold text-[#28262D] tracking-tight">Working Schedules & Shifts</h2>
          <p className="text-xs text-[#74717A] mt-0.5">Effective-dated attendance windows, payable sessions, breaks and workforce assignments.</p></div>
        {canCreate && <button onClick={() => setIsCreateOpen(true)} className="px-4 py-2.5 bg-[#714B67] hover:bg-[#5C3C53] text-white text-xs font-bold rounded-[10px] flex items-center justify-center gap-2"><Plus className="w-4 h-4" />Create Work Schedule</button>}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {schedules.map((sched) => (
          <div
            key={sched.id}
            className="bg-white rounded-[16px] border border-[#E4E1E5] shadow-xs p-5 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-start justify-between gap-2">
                <div className="w-10 h-10 rounded-[12px] bg-[#F4F3F5] text-[#714B67] flex items-center justify-center font-bold">
                  <CalendarDays className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#EBF6F0] text-[#438A6B] border border-[#C3E6D5]">
                  Active Pattern
                </span>
              </div>

              <h3 className="text-sm font-bold text-[#28262D] mt-3">{sched.name}</h3>
              <p className="text-xs text-[#74717A] mt-0.5 leading-relaxed">
                {sched.description || `${sched.weeklyHours} hours/week structured shift pattern with core presence.`}
              </p>

              {(sched.effectiveFrom || sched.assignmentLabel) && <div className="mt-3 flex flex-wrap gap-1.5 text-[10px]"><span className="px-2 py-1 rounded bg-[#F4F3F5] text-[#714B67] font-semibold">{sched.assignmentLabel ?? 'Company schedule'}</span>{sched.effectiveFrom && <span className="px-2 py-1 rounded bg-[#F4F3F5] text-[#74717A]">From {sched.effectiveFrom}</span>}</div>}

              <div className="mt-4 pt-3 border-t border-[#F4F3F5] space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[#74717A] flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-[#A4879F]" /> Daily Standard Hours:
                  </span>
                  <strong className="text-[#28262D] tabular-nums">
                    {sched.hoursPerDay || Math.round(sched.weeklyHours / (sched.days?.filter((d) => d.isWorking).length || 5)) || 8} Hours
                  </strong>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-[#74717A]">Weekly Working Days:</span>
                  <strong className="text-[#28262D] tabular-nums">
                    {sched.daysPerWeek || sched.days?.filter((d) => d.isWorking).length || 5} Days (Mon-Fri)
                  </strong>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-[#74717A]">Lunch Break Allowance:</span>
                  <strong className="text-[#28262D] tabular-nums">
                    {sched.lunchBreakMinutes || sched.days?.[0]?.breakDurationMins || 60} Minutes
                  </strong>
                </div>
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-[#F4F3F5] flex items-center justify-between text-xs text-[#74717A]">
              <span className="flex items-center gap-1">
                <Users className="w-3.5 h-3.5 text-[#714B67]" /> Assigned Workforce
              </span>
              <button onClick={() => setExpandedId(expandedId === sched.id ? null : sched.id)} className="font-bold text-[#714B67] hover:underline">{expandedId === sched.id ? 'Hide schedule' : 'View schedule'}</button>
            </div>
            {expandedId === sched.id && <div className="mt-3 pt-3 border-t border-[#F4F3F5] space-y-1.5" aria-label={`${sched.name} weekday details`}>{sched.days.map((day) => <div key={day.day} className="grid grid-cols-[44px_1fr_auto] items-center gap-2 text-[11px]"><strong>{day.dayShort}</strong>{day.isWorking ? <span className="text-[#74717A] flex items-center gap-1"><Clock className="w-3 h-3" />{day.startTime}–{day.endTime}<Coffee className="w-3 h-3 ml-1" />{day.breakDurationMins}m unpaid</span> : <span className="text-[#A09DA3]">Non-working day</span>}<span className="text-[10px] text-[#714B67]">{day.isWorking && day.overtimeEligible ? 'OT eligible' : ''}</span></div>)}</div>}
          </div>
        ))}
      </div>
      <CreateWorkScheduleModal open={isCreateOpen} onClose={() => setIsCreateOpen(false)} onCreated={handleCreated} />
    </div>
  );
}
