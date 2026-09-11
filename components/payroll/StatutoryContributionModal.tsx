'use client';

import React from 'react';
import { Lock, ShieldCheck, Info, FileText, CheckCircle2, AlertCircle, X } from 'lucide-react';
import { formatINR, cn } from '@/lib/utils';
import { STATUTORY_PF_RULES, calculateStatutoryPF } from '@/lib/mock-data/statutory-rules';

interface StatutoryContributionModalProps {
  basicSalary?: number;
  isOpen: boolean;
  onClose: () => void;
}

export function StatutoryContributionModal({
  basicSalary = 35000,
  isOpen,
  onClose,
}: StatutoryContributionModalProps) {
  if (!isOpen) return null;

  const pfData = calculateStatutoryPF(basicSalary, STATUTORY_PF_RULES[0]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
      <div className="w-full max-w-xl bg-white rounded-[20px] p-6 shadow-2xl border border-[#E4E1E5] space-y-5 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-start justify-between pb-3 border-b border-[#F4F3F5]">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-[10px] bg-[#FFF6D2] border border-[#F8E29E] text-[#9A6B0A] flex items-center justify-center">
                <Lock className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#28262D]">
                  Statutory Provident Fund (EPF) Rules
                </h3>
                <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-[#9A6B0A] bg-[#FFF6D2] px-2 py-0.5 rounded-full border border-[#F8E29E] mt-0.5">
                  <Lock className="w-3 h-3" /> Statutory Locked Deduction
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-[8px] text-[#74717A] hover:bg-[#F4F3F5] hover:text-[#28262D]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Locked explanation alert */}
        <div className="p-3.5 rounded-[12px] bg-[#FBFAFB] border border-[#E4E1E5] text-xs text-[#74717A] space-y-1">
          <p className="font-bold text-[#28262D] flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-[#438A6B]" />
            Regulatory Compliance Notice
          </p>
          <p>
            Provident Fund deductions are computed automatically under the{' '}
            <span className="font-semibold text-[#28262D]">Employees’ Provident Funds and Miscellaneous Provisions Act, 1952</span>.
            To maintain strict legal compliance, manual overrides on statutory PF deductions are disabled across all payruns.
          </p>
        </div>

        {/* Active Policy Config */}
        <div className="p-4 rounded-[14px] bg-white border border-[#E4E1E5] space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#28262D]">{pfData.rule.name}</span>
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#DCFCE7] text-[#166534] font-bold">
              {pfData.rule.version} • Active
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs pt-1">
            <div className="p-2 rounded-[8px] bg-[#FBFAFB] border border-[#F4F3F5]">
              <span className="text-[10px] uppercase font-bold text-[#74717A] block">Statutory Ceiling</span>
              <span className="font-extrabold text-[#28262D]">₹15,000 / mo</span>
            </div>
            <div className="p-2 rounded-[8px] bg-[#FBFAFB] border border-[#F4F3F5]">
              <span className="text-[10px] uppercase font-bold text-[#74717A] block">Employee Rate</span>
              <span className="font-extrabold text-[#714B67]">12.0%</span>
            </div>
            <div className="p-2 rounded-[8px] bg-[#FBFAFB] border border-[#F4F3F5]">
              <span className="text-[10px] uppercase font-bold text-[#74717A] block">Employer Rate</span>
              <span className="font-extrabold text-[#714B67]">12.0%</span>
            </div>
            <div className="p-2 rounded-[8px] bg-[#FBFAFB] border border-[#F4F3F5]">
              <span className="text-[10px] uppercase font-bold text-[#74717A] block">Effective From</span>
              <span className="font-extrabold text-[#28262D]">01 Apr 2026</span>
            </div>
          </div>
        </div>

        {/* Calculation Formula & Split */}
        <div className="space-y-2">
          <span className="text-xs font-bold text-[#28262D] uppercase tracking-wider block">
            Calculation Formula for Basic Salary {formatINR(basicSalary)}
          </span>
          <div className="p-3.5 rounded-[12px] bg-[#F5EDF3] border border-[#E8D9E5] text-xs font-mono text-[#714B67] leading-relaxed">
            {pfData.formulaExplanation}
          </div>
          {pfData.isCappedByCeiling && (
            <p className="text-[11px] text-[#74717A] italic">
              * Note: Since the monthly basic wage exceeds ₹15,000, statutory contribution is computed strictly on the mandated ceiling limit.
            </p>
          )}
        </div>

        {/* Breakdown table */}
        <div className="rounded-[12px] border border-[#E4E1E5] overflow-hidden">
          <table className="w-full text-xs">
            <thead className="bg-[#FBFAFB] text-[#74717A] text-[10px] uppercase font-bold border-b border-[#E4E1E5]">
              <tr>
                <th className="py-2.5 px-3 text-left">Component</th>
                <th className="py-2.5 px-3 text-left">Rate / Fund</th>
                <th className="py-2.5 px-3 text-right">Monthly Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F4F3F5]">
              <tr>
                <td className="py-2.5 px-3 font-bold text-[#28262D]">Employee PF Contribution</td>
                <td className="py-2.5 px-3 text-[#74717A]">12% deducted from employee gross salary</td>
                <td className="py-2.5 px-3 text-right font-extrabold text-[#C85A54] tabular-nums">
                  {formatINR(pfData.employeeContribution)}
                </td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-semibold text-[#28262D]">Employer EPF Share</td>
                <td className="py-2.5 px-3 text-[#74717A]">3.67% credited to Employees’ Provident Fund</td>
                <td className="py-2.5 px-3 text-right font-semibold text-[#438A6B] tabular-nums">
                  {formatINR(pfData.employerEPF)}
                </td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-semibold text-[#28262D]">Employer EPS Share</td>
                <td className="py-2.5 px-3 text-[#74717A]">8.33% credited to Employees’ Pension Scheme</td>
                <td className="py-2.5 px-3 text-right font-semibold text-[#438A6B] tabular-nums">
                  {formatINR(pfData.employerEPS)}
                </td>
              </tr>
              <tr className="bg-[#FBFAFB] font-bold">
                <td className="py-2.5 px-3 text-[#28262D]">Total Monthly PF Accrual</td>
                <td className="py-2.5 px-3 text-[#74717A]">Deposited with EPFO Portal</td>
                <td className="py-2.5 px-3 text-right text-[#714B67] tabular-nums font-extrabold">
                  {formatINR(pfData.employeeContribution + pfData.employerContribution)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="pt-2 border-t border-[#F4F3F5] flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 text-xs font-bold text-white bg-[#714B67] rounded-[10px] hover:bg-[#5E3D55] transition-colors"
          >
            Understood & Close
          </button>
        </div>
      </div>
    </div>
  );
}
