'use client';

import React from 'react';
import { useApp } from '@/lib/context/app-context';
import {
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Clock,
  UserCheck,
  CreditCard,
  FileSpreadsheet,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { KPICard } from '@/components/shared/KPICard';

export function PayrollReadinessView() {
  const { setActiveTab } = useApp();

  const auditItems = [
    {
      id: 1,
      title: 'Biometric Attendance & Turnstile Sync',
      score: 100,
      status: 'passed',
      description: 'All 12 employee punch logs verified. Shift regularization requests reviewed.',
      actionText: 'Review Logs',
      actionTab: 'attendance',
    },
    {
      id: 2,
      title: 'Leave Approvals & LOP Calculation',
      score: 100,
      status: 'passed',
      description: 'Leave engine calculated zero unpaid absences for August 2026.',
      actionText: 'Inspect Leaves',
      actionTab: 'leave',
    },
    {
      id: 3,
      title: 'Active Employment Contracts',
      score: 91,
      status: 'warning',
      description: 'Deepak Chawla (QA Engineer) contract is expiring within 30 days on Sep 30, 2026.',
      actionText: 'Resolve in Contracts',
      actionTab: 'contracts',
    },
    {
      id: 4,
      title: 'Disbursal Bank Accounts & IFSC Codes',
      score: 100,
      status: 'passed',
      description: '100% employee salary accounts validated against NPCI/RBI IFSC registry.',
      actionText: 'View Employees',
      actionTab: 'employees',
    },
    {
      id: 5,
      title: 'Statutory EPFO UAN & Income Tax PAN',
      score: 100,
      status: 'passed',
      description: 'All PAN cards linked to Aadhaar. EPF UAN mapped for monthly Form 12A filing.',
      actionText: 'View Directory',
      actionTab: 'employees',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white p-5 rounded-[16px] border border-[#E4E1E5] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-[#28262D] tracking-tight">Payroll Readiness Audit</h2>
          <p className="text-xs text-[#74717A] mt-0.5">
            Automated pre-flight compliance check before locking and disbursing salary runs.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <span className="text-[10px] uppercase font-bold text-[#74717A] block">Overall Readiness</span>
            <span className="text-xl font-extrabold text-[#438A6B]">96% Ready</span>
          </div>
          <div className="w-12 h-12 rounded-full border-4 border-[#438A6B] flex items-center justify-center font-bold text-xs text-[#438A6B]">
            96%
          </div>
        </div>
      </div>

      {/* Warning Callout */}
      <div className="p-4 bg-[#FFF6D2] rounded-[14px] border border-[#F8E29E] flex items-start justify-between gap-4 text-xs text-[#9A6B0A]">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">1 Audit Advisory Detected</p>
            <p className="mt-0.5 leading-relaxed">
              Deepak Chawla has a fixed-term contract expiring soon. While payrun computation can safely proceed,
              ensure contract extension is signed before the October cycle.
            </p>
          </div>
        </div>
        <button
          onClick={() => setActiveTab('contracts')}
          className="px-3.5 py-1.5 rounded-[8px] bg-[#9A6B0A] text-white font-bold hover:bg-[#835A08] transition-colors shrink-0 text-xs"
        >
          Review Contract
        </button>
      </div>

      {/* Audit Checklist Items */}
      <div className="space-y-3">
        {auditItems.map((item) => (
          <div
            key={item.id}
            className="p-5 bg-white rounded-[16px] border border-[#E4E1E5] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs"
          >
            <div className="flex items-start gap-3.5">
              <div
                className={`w-9 h-9 rounded-[10px] flex items-center justify-center shrink-0 ${
                  item.status === 'passed'
                    ? 'bg-[#EBF6F0] text-[#438A6B]'
                    : 'bg-[#FFF6D2] text-[#9A6B0A]'
                }`}
              >
                {item.status === 'passed' ? (
                  <CheckCircle2 className="w-5 h-5" />
                ) : (
                  <AlertTriangle className="w-5 h-5" />
                )}
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-[#28262D] text-sm">{item.title}</h3>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      item.status === 'passed'
                        ? 'bg-[#EBF6F0] text-[#438A6B]'
                        : 'bg-[#FFF6D2] text-[#9A6B0A]'
                    }`}
                  >
                    {item.score}% Score
                  </span>
                </div>
                <p className="text-[#74717A] mt-1 leading-relaxed">{item.description}</p>
              </div>
            </div>

            <button
              onClick={() => setActiveTab(item.actionTab as any)}
              className="px-3.5 py-1.5 rounded-[10px] bg-[#F4F3F5] hover:bg-[#EAE8EB] text-[#714B67] font-semibold transition-colors flex items-center gap-1 self-start md:self-auto shrink-0"
            >
              <span>{item.actionText}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
