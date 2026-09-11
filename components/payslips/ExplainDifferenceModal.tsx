'use client';

import React from 'react';
import { useApp } from '@/lib/context/app-context';
import { motion, AnimatePresence } from 'motion/react';
import { X, TrendingUp, TrendingDown, HelpCircle, ArrowRight, CheckCircle2 } from 'lucide-react';
import { formatINR } from '@/lib/utils';

export function ExplainDifferenceModal() {
  const { isExplainSalaryDiffOpen, setIsExplainSalaryDiffOpen, selectedPayslip } = useApp();

  if (!isExplainSalaryDiffOpen) return null;

  const ps = selectedPayslip;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative w-full max-w-lg bg-white rounded-[18px] border border-[#E4E1E5] shadow-2xl p-6"
        >
          <div className="flex items-center justify-between pb-3 border-b border-[#F4F3F5]">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-[10px] bg-[#FFF6D2] text-[#9A6B0A] flex items-center justify-center">
                <HelpCircle className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#28262D]">Salary Difference Analysis</h3>
                <p className="text-[11px] text-[#74717A]">
                  Comparing August 2026 vs July 2026 Take-Home Pay
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsExplainSalaryDiffOpen(false)}
              className="p-1 rounded-full text-[#74717A] hover:bg-[#F4F3F5]"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="mt-4 space-y-4 text-xs">
            {/* Net Comparison Summary */}
            <div className="p-3.5 bg-[#FBFAFB] rounded-[14px] border border-[#E4E1E5] flex items-center justify-between">
              <div>
                <span className="text-[10px] text-[#74717A] uppercase font-bold tracking-wider block">
                  Previous Month (July 2026)
                </span>
                <span className="text-sm font-semibold text-[#74717A] tabular-nums">₹38,416</span>
              </div>

              <div className="flex items-center gap-1.5 text-[#438A6B] font-bold text-xs bg-[#EBF6F0] px-2.5 py-1 rounded-full border border-[#C3E6D5]">
                <TrendingUp className="w-3.5 h-3.5" />
                <span>+₹2,334 Net Increase</span>
              </div>

              <div className="text-right">
                <span className="text-[10px] text-[#74717A] uppercase font-bold tracking-wider block">
                  Current Month (August 2026)
                </span>
                <span className="text-sm font-bold text-[#714B67] tabular-nums">₹40,750</span>
              </div>
            </div>

            {/* Itemized Explanations */}
            <div className="space-y-2">
              <h4 className="font-bold text-[#28262D]">Factors Contributing to Difference</h4>

              {/* Factor 1: LOP Attendance */}
              <div className="p-3 rounded-[12px] border border-[#C3E6D5] bg-[#EBF6F0]/60 flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-[#438A6B] text-white flex items-center justify-center shrink-0 mt-0.5 text-xs font-bold">
                  +
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-[#28262D]">Zero Loss of Pay (LOP) Days</span>
                    <span className="font-bold text-[#438A6B] tabular-nums">+₹2,334</span>
                  </div>
                  <p className="text-[11px] text-[#74717A] mt-0.5">
                    In July 2026, you had 2 days of unpaid leave (deduction: ₹2,334). In August 2026, you completed
                    all 22 working days without unpaid absences.
                  </p>
                </div>
              </div>

              {/* Factor 2: Statutory Deductions */}
              <div className="p-3 rounded-[12px] border border-[#E4E1E5] bg-[#FBFAFB] flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-[#74717A] text-white flex items-center justify-center shrink-0 mt-0.5 text-xs font-bold">
                  =
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-[#28262D]">Consistent Statutory PF & PT</span>
                    <span className="font-medium text-[#74717A] tabular-nums">₹0 Change</span>
                  </div>
                  <p className="text-[11px] text-[#74717A] mt-0.5">
                    Statutory Employee Provident Fund remained steady at ₹1,800 and Karnataka Professional Tax at ₹200.
                  </p>
                </div>
              </div>

              {/* Factor 3: Income Tax Slab */}
              <div className="p-3 rounded-[12px] border border-[#E4E1E5] bg-[#FBFAFB] flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-[#74717A] text-white flex items-center justify-center shrink-0 mt-0.5 text-xs font-bold">
                  =
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-[#28262D]">TDS Monthly Slab Estimate</span>
                    <span className="font-medium text-[#74717A] tabular-nums">₹0 Change</span>
                  </div>
                  <p className="text-[11px] text-[#74717A] mt-0.5">
                    Tax deduction at source is calculated on annual projected salary under the New Tax Regime (Section 115BAC).
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setIsExplainSalaryDiffOpen(false)}
                className="px-4 py-2 bg-[#714B67] hover:bg-[#5C3C53] text-white text-xs font-bold rounded-[10px]"
              >
                Got It
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
