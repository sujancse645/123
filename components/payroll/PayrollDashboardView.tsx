'use client';

import React from 'react';
import { useApp } from '@/lib/context/app-context';
import {
  CreditCard,
  ShieldCheck,
  Play,
  Plus,
  ArrowRight,
  AlertTriangle,
  Building2,
  Calendar,
  Layers,
  Sparkles,
} from 'lucide-react';
import { KPICard } from '@/components/shared/KPICard';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { formatINR, formatDate } from '@/lib/utils';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

export function PayrollDashboardView() {
  const { payruns, setActiveTab, setIsPayrunWizardOpen, employees, setSelectedPayrun } = useApp();

  const latestPayrun = payruns[0];

  const chartData = [
    { month: 'Jun 2026', gross: 880000, deductions: 58000, net: 822000 },
    { month: 'Jul 2026', gross: 895000, deductions: 60860, net: 834140 },
    { month: 'Aug 2026', gross: 915000, deductions: 62000, net: 853000 },
    { month: 'Sep 2026', gross: 924000, deductions: 62700, net: 861300 },
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="relative overflow-hidden rounded-[18px] bg-gradient-to-r from-[#714B67] to-[#4D3348] text-white p-6 md:p-8 shadow-xs">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-xs text-xs font-semibold text-[#FFF6D2] mb-3 border border-white/20">
              <Sparkles className="w-3.5 h-3.5 text-[#F4C430]" />
              <span>Payroll Executive Management</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
              Payroll Operations & Compliance
            </h1>
            <p className="text-xs md:text-sm text-[#F3EEF2]/80 mt-1 max-w-xl leading-relaxed">
              Automated salary computation, Indian statutory deduction compliance, and EPF/TDS reconciliation.
            </p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={() => setIsPayrunWizardOpen(true)}
              className="px-4 py-2.5 rounded-[12px] bg-[#F4C430] hover:bg-[#E5B520] text-[#4D3348] text-xs font-bold transition-all flex items-center gap-2 shadow-md"
            >
              <Plus className="w-4 h-4" />
              <span>Initiate Payrun</span>
            </button>

          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Monthly Disbursal (Aug)"
          value={latestPayrun ? formatINR(latestPayrun.netTotal) : '₹8,53,000'}
          subtitle="Processed for 12 employees"
          icon={<CreditCard className="w-5 h-5" />}
          highlight
          trend={{ value: '+2.2%', isPositive: true, label: 'vs July' }}
        />

        <KPICard
          title="Statutory Deductions"
          value={latestPayrun ? formatINR(latestPayrun.totalDeductions) : '₹62,000'}
          subtitle="EPF, PT & TDS remittances"
          icon={<Building2 className="w-5 h-5 text-[#714B67]" />}
        />

        <KPICard
          title="Payroll Readiness"
          value="96% Ready"
          subtitle="1 Contract warning to resolve"
          icon={<ShieldCheck className="w-5 h-5 text-[#438A6B]" />}
          actionText="Inspect Checklist"
          onClick={() => setActiveTab('payroll_readiness')}
        />

        <KPICard
          title="Active Salary Structures"
          value="4 Templates"
          subtitle="100% compliant with PF Act"
          icon={<Layers className="w-5 h-5 text-[#714B67]" />}
          actionText="Manage Structures"
          onClick={() => setActiveTab('salary_structures')}
        />
      </div>

      {/* Charts & Payruns Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Gross vs Net Trend Bar Chart */}
        <div className="lg:col-span-2 bg-white rounded-[16px] border border-[#E4E1E5] p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-[#28262D]">Disbursal vs Gross Cost Trend</h3>
              <p className="text-xs text-[#74717A]">4-month historical salary comparison (INR)</p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded bg-[#F4F3F5] text-[#714B67]">
              FY 2026-27
            </span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F4F3F5" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#74717A' }} axisLine={false} tickLine={false} />
                <YAxis
                  tick={{ fontSize: 11, fill: '#74717A' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(val) => `₹${val / 1000}k`}
                />
                <Tooltip
                  formatter={(value: any) => formatINR(Number(value))}
                  contentStyle={{
                    backgroundColor: '#FFFFFF',
                    borderRadius: '10px',
                    borderColor: '#E4E1E5',
                    fontSize: '12px',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                <Bar dataKey="gross" name="Total Gross Salary" fill="#714B67" radius={[4, 4, 0, 0]} />
                <Bar dataKey="net" name="Net Disbursed" fill="#438A6B" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Quick Batches list */}
        <div className="bg-white rounded-[16px] border border-[#E4E1E5] p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-[#F4F3F5]">
              <h3 className="text-sm font-bold text-[#28262D]">Active Payruns</h3>
              <button
                onClick={() => setActiveTab('payruns')}
                className="text-xs font-semibold text-[#714B67] hover:underline"
              >
                View all →
              </button>
            </div>

            <div className="mt-3 space-y-3">
              {payruns.slice(0, 3).map((p) => (
                <div
                  key={p.id}
                  onClick={() => {
                    setSelectedPayrun(p);
                    setActiveTab('payruns');
                  }}
                  className="p-3 rounded-[12px] border border-[#E4E1E5] hover:border-[#714B67] transition-colors cursor-pointer text-xs space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#28262D]">{p.name}</span>
                    <StatusBadge status={p.status} size="sm" />
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-[#74717A]">
                    <span>{p.employeeCount} staff</span>
                    <strong className="text-[#28262D] font-bold tabular-nums">{formatINR(p.netTotal)}</strong>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-4 mt-4 border-t border-[#F4F3F5]">
            <button
              onClick={() => setActiveTab('payroll_readiness')}
              className="w-full py-2 bg-[#F4F3F5] hover:bg-[#EAE8EB] text-[#714B67] rounded-[10px] text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Review Pre-Payrun Checklist</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
