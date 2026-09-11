'use client';

import React from 'react';
import { useApp } from '@/lib/context/app-context';
import {
  TrendingUp,
  Users,
  Calendar,
  AlertTriangle,
  Building2,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import { KPICard } from '@/components/shared/KPICard';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from 'recharts';

export function WorkforceInsightsView() {
  const { employees, attendanceRecords, leaveRequests } = useApp();

  // Headcount by department
  const deptMap: Record<string, number> = {};
  employees.forEach((e) => {
    const dept = e.department || e.departmentName || 'General';
    deptMap[dept] = (deptMap[dept] || 0) + 1;
  });
  const deptData = Object.entries(deptMap).map(([name, value]) => ({ name, value }));

  // Attendance trend for current week (Sep 1 to Sep 4)
  const attendanceTrendData = [
    { day: 'Mon (01 Sep)', present: 11, late: 1, absent: 0 },
    { day: 'Tue (02 Sep)', present: 12, late: 0, absent: 0 },
    { day: 'Wed (03 Sep)', present: 10, late: 1, absent: 1 },
    { day: 'Thu (04 Sep)', present: 12, late: 0, absent: 0 },
    { day: 'Fri (05 Sep)', present: 11, late: 1, absent: 0 },
  ];

  // Capacity projection (next 4 weeks)
  const capacityForecast = [
    { week: 'W36 (Current)', capacity: 96, plannedLeaves: 1 },
    { week: 'W37 (14 Sep)', capacity: 92, plannedLeaves: 2 },
    { week: 'W38 (21 Sep)', capacity: 88, plannedLeaves: 3 },
    { week: 'W39 (28 Sep)', capacity: 98, plannedLeaves: 0 },
  ];

  const COLORS = ['#714B67', '#A4879F', '#438A6B', '#D49525', '#4D3348'];

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white p-5 rounded-[16px] border border-[#E4E1E5] shadow-xs">
        <h2 className="text-xl font-bold text-[#28262D] tracking-tight">Workforce Capacity & Insights</h2>
        <p className="text-xs text-[#74717A] mt-0.5">
          Enterprise headcount distribution, attendance reliability trends, and shift capacity forecast.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Total Headcount"
          value={`${employees.length} Employees`}
          subtitle="Full-time & specialist workforce"
          icon={<Users className="w-5 h-5" />}
          highlight
          trend={{ value: '+2 New Joiners', isPositive: true }}
        />

        <KPICard
          title="Attendance Reliability"
          value="98.2%"
          subtitle="Biometrically verified on time"
          icon={<CheckCircle2 className="w-5 h-5 text-[#438A6B]" />}
          trend={{ value: '+0.8%', isPositive: true }}
        />

        <KPICard
          title="Upcoming Planned Leaves"
          value="4 Approved"
          subtitle="Next 14 calendar days"
          icon={<Calendar className="w-5 h-5 text-[#714B67]" />}
        />

        <KPICard
          title="Forecasted Capacity"
          value="94.5%"
          subtitle="Adequate shift operational coverage"
          icon={<TrendingUp className="w-5 h-5 text-[#438A6B]" />}
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Attendance Trends Bar Chart */}
        <div className="bg-white p-5 rounded-[16px] border border-[#E4E1E5] shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-[#28262D]">Weekly Attendance Reliability</h3>
              <p className="text-xs text-[#74717A]">Present vs Late Arrivals (September 2026)</p>
            </div>
            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-[#EBF6F0] text-[#438A6B]">
              Healthy
            </span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={attendanceTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F4F3F5" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#74717A' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#74717A' }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#FFFFFF',
                    borderRadius: '10px',
                    borderColor: '#E4E1E5',
                    fontSize: '12px',
                  }}
                />
                <Bar dataKey="present" name="Present On Time" fill="#714B67" radius={[4, 4, 0, 0]} />
                <Bar dataKey="late" name="Late Arrivals" fill="#F4C430" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Headcount Distribution by Department */}
        <div className="bg-white p-5 rounded-[16px] border border-[#E4E1E5] shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-[#28262D]">Headcount by Department</h3>
              <p className="text-xs text-[#74717A]">Organizational unit distribution</p>
            </div>
          </div>

          <div className="h-64 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={deptData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {deptData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#FFFFFF',
                    borderRadius: '10px',
                    borderColor: '#E4E1E5',
                    fontSize: '12px',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#F4F3F5] text-xs text-[#74717A]">
            {deptData.map((d, i) => (
              <div key={d.name} className="flex items-center gap-2">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: COLORS[i % COLORS.length] }}
                />
                <span className="truncate">{d.name}: <strong>{d.value}</strong></span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Workforce Capacity Forecast */}
      <div className="bg-white p-5 rounded-[16px] border border-[#E4E1E5] shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-[#28262D]">4-Week Operational Capacity Forecast</h3>
            <p className="text-xs text-[#74717A]">Projected effective working hours taking into account approved leaves</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          {capacityForecast.map((c) => (
            <div key={c.week} className="p-4 rounded-[12px] bg-[#FBFAFB] border border-[#E4E1E5] text-xs">
              <span className="font-bold text-[#28262D]">{c.week}</span>
              <div className="mt-2 flex items-baseline justify-between">
                <span className="text-xl font-bold text-[#714B67] tabular-nums">{c.capacity}%</span>
                <span className="text-[11px] text-[#74717A]">{c.plannedLeaves} on leave</span>
              </div>
              <div className="mt-2 w-full bg-[#F4F3F5] h-1.5 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#714B67] rounded-full"
                  style={{ width: `${c.capacity}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
