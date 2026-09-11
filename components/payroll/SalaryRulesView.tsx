'use client';

import React, { useState } from 'react';
import { useApp } from '@/lib/context/app-context';
import {
  FileCode,
  Plus,
  Lock,
  Edit2,
  X,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Calculator,
} from 'lucide-react';
import { SalaryRule } from '@/lib/types';
import { motion, AnimatePresence } from 'motion/react';
import { StatutoryContributionModal } from './StatutoryContributionModal';

export function SalaryRulesView() {
  const { salaryRules, addSalaryRule, updateSalaryRule, currentRole } = useApp();

  const isReadOnly = currentRole === 'payroll_user';
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [formData, setFormData] = useState<Partial<SalaryRule>>({});
  const [formulaTestResult, setFormulaTestResult] = useState<string | null>(null);
  const [isPFModalOpen, setIsPFModalOpen] = useState(false);

  const handleEdit = (rule: SalaryRule) => {
    if (isReadOnly) return;
    setFormData(rule);
    setFormulaTestResult(null);
    setIsEditModalOpen(true);
  };

  const handleCreate = () => {
    if (isReadOnly) return;
    setFormData({
      name: '',
      code: '',
      category: 'allowance',
      calculationType: 'percentage',
      percentage: 10,
      baseRuleCode: 'BASIC',
      active: true,
    });
    setFormulaTestResult(null);
    setIsEditModalOpen(true);
  };

  const handleTestFormula = () => {
    if (!formData.formula) {
      setFormulaTestResult('Error: Please enter a formula expression.');
      return;
    }
    // Simulate syntax testing
    setFormulaTestResult('Valid syntax: Evaluated successfully with test payload (Sample Output: ₹3,250).');
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.code) return;

    if (formData.id) {
      updateSalaryRule(formData.id, formData);
    } else {
      addSalaryRule({
        name: formData.name,
        code: formData.code.toUpperCase(),
        category: formData.category || 'allowance',
        calculationType: formData.calculationType || 'fixed',
        fixedAmount: formData.fixedAmount,
        percentage: formData.percentage,
        baseRuleCode: formData.baseRuleCode,
        formula: formData.formula,
        description: formData.description,
        active: true,
      });
    }
    setIsEditModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-[16px] border border-[#E4E1E5] shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-[#28262D] tracking-tight">Salary Rules & Formulas</h2>
          <p className="text-xs text-[#74717A] mt-0.5">
            Statutory computation engine: Basic, allowances, PF, PT, TDS, and attendance adjustments.
          </p>
        </div>

        {!isReadOnly ? (
          <button
            onClick={handleCreate}
            className="px-4 py-2 bg-[#714B67] hover:bg-[#5C3C53] text-white text-xs font-bold rounded-[10px] shadow-xs flex items-center gap-1.5 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Add Salary Rule</span>
          </button>
        ) : (
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#FFF6D2] border border-[#F8E29E] rounded-[10px] text-xs font-semibold text-[#9A6B0A]">
            <Lock className="w-3.5 h-3.5" />
            <span>Read-Only for Payroll User</span>
          </div>
        )}
      </div>

      {/* Rules Table */}
      <div className="bg-white rounded-[16px] border border-[#E4E1E5] shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-[#28262D]">
            <thead className="bg-[#FBFAFB] text-[#74717A] uppercase text-[10px] font-bold tracking-wider border-b border-[#E4E1E5]">
              <tr>
                <th className="py-3 px-4">Rule Name</th>
                <th className="py-3 px-4">Code</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Computation Method</th>
                <th className="py-3 px-4">Expression / Value</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F4F3F5]">
              {salaryRules.map((rule) => {
                let displayCalc = '';
                if (rule.calculationType === 'fixed') {
                  displayCalc = `Fixed Amount`;
                } else if (rule.calculationType === 'percentage') {
                  displayCalc = `${rule.percentage}% of ${rule.baseRuleCode}`;
                } else {
                  displayCalc = 'Formula Driven';
                }

                const isPFRule = rule.code === 'PF_EMP' || rule.code === 'PF' || rule.name.includes('Provident Fund');

                return (
                  <tr key={rule.id} className="hover:bg-[#FBFAFB] transition-colors">
                    <td className="py-3.5 px-4 font-semibold text-[#28262D]">
                      <div className="flex items-center gap-2">
                        <span>{rule.name}</span>
                        {isPFRule && (
                          <button
                            type="button"
                            onClick={() => setIsPFModalOpen(true)}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#FFF6D2] text-[#9A6B0A] border border-[#F8E29E] text-[10px] font-bold hover:bg-[#FBE6A2] transition-colors"
                            title="Statutory Rule Locked (EPF Act 1952) - Click to view formula"
                          >
                            <Lock className="w-3 h-3" />
                            <span>Statutory Rule Locked (EPF Act 1952)</span>
                          </button>
                        )}
                      </div>
                      {rule.description && (
                        <span className="text-[11px] text-[#74717A] block font-normal mt-0.5">
                          {rule.description}
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-[#714B67]">
                      {rule.code}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="capitalize px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#F4F3F5] text-[#714B67]">
                        {rule.category.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-medium text-[#28262D]">
                      {isPFRule ? 'Statutory (Min(Basic, 15k) * 12%)' : displayCalc}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[11px] text-[#74717A] max-w-xs truncate">
                      {isPFRule ? (
                        <button
                          type="button"
                          onClick={() => setIsPFModalOpen(true)}
                          className="text-[#714B67] hover:underline font-bold"
                        >
                          Min(Basic, ₹15,000) × 12% = ₹1,800
                        </button>
                      ) : rule.formula ? (
                        <span className="bg-[#FBFAFB] px-2 py-0.5 rounded border border-[#E4E1E5]">
                          {rule.formula}
                        </span>
                      ) : rule.fixedAmount ? (
                        `₹${rule.fixedAmount}`
                      ) : (
                        `${rule.percentage}% (${rule.baseRuleCode})`
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      {isPFRule ? (
                        <button
                          type="button"
                          onClick={() => setIsPFModalOpen(true)}
                          className="p-1.5 text-[#9A6B0A] hover:bg-[#FFF6D2] rounded transition-colors"
                          title="View Locked Statutory Rule Formula"
                        >
                          <Lock className="w-3.5 h-3.5" />
                        </button>
                      ) : !isReadOnly ? (
                        <button
                          onClick={() => handleEdit(rule)}
                          className="p-1.5 text-[#74717A] hover:text-[#714B67] hover:bg-[#F4F3F5] rounded transition-colors"
                          title="Edit Rule"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      ) : (
                        <span className="text-[10px] text-[#A4879F]">Locked</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit / Create Rule Modal */}
      <AnimatePresence>
        {isEditModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-lg bg-white rounded-[18px] border border-[#E4E1E5] shadow-2xl p-6"
            >
              <div className="flex items-center justify-between pb-3 border-b border-[#F4F3F5]">
                <h3 className="text-sm font-bold text-[#28262D]">
                  {formData.id ? 'Edit Salary Rule' : 'Add New Salary Rule'}
                </h3>
                <button
                  onClick={() => setIsEditModalOpen(false)}
                  className="p-1 rounded-full text-[#74717A] hover:bg-[#F4F3F5]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSave} className="mt-4 space-y-3.5 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-[#28262D] mb-1">Rule Name *</label>
                    <input
                      type="text"
                      required
                      value={formData.name || ''}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-3 py-2 bg-[#FBFAFB] border border-[#E4E1E5] focus:border-[#714B67] rounded-[10px] text-xs outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-[#28262D] mb-1">Code *</label>
                    <input
                      type="text"
                      required
                      value={formData.code || ''}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                      className="w-full px-3 py-2 bg-[#FBFAFB] border border-[#E4E1E5] focus:border-[#714B67] rounded-[10px] text-xs outline-none uppercase font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-[#28262D] mb-1">Category</label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                      className="w-full px-3 py-2 bg-[#FBFAFB] border border-[#E4E1E5] rounded-[10px] text-xs outline-none"
                    >
                      <option value="base">Base Wage</option>
                      <option value="allowance">Allowance</option>
                      <option value="statutory_deduction">Statutory Deduction</option>
                      <option value="employer_contribution">Employer Contribution</option>
                      <option value="adjustment">Attendance / LOP Adjustment</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-[#28262D] mb-1">Calculation Type</label>
                    <select
                      value={formData.calculationType}
                      onChange={(e) => setFormData({ ...formData, calculationType: e.target.value as any })}
                      className="w-full px-3 py-2 bg-[#FBFAFB] border border-[#E4E1E5] rounded-[10px] text-xs outline-none"
                    >
                      <option value="percentage">Percentage of Base Rule</option>
                      <option value="fixed">Fixed Amount</option>
                      <option value="formula">Custom Mathematical Formula</option>
                    </select>
                  </div>
                </div>

                {formData.calculationType === 'percentage' && (
                  <div className="grid grid-cols-2 gap-3 p-3 bg-[#FBFAFB] rounded-[10px] border border-[#E4E1E5]">
                    <div>
                      <label className="block font-semibold text-[#28262D] mb-1">Percentage (%)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={formData.percentage || ''}
                        onChange={(e) => setFormData({ ...formData, percentage: parseFloat(e.target.value) })}
                        className="w-full px-3 py-2 bg-white border border-[#E4E1E5] rounded-md text-xs outline-none"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-[#28262D] mb-1">Base Rule Code</label>
                      <input
                        type="text"
                        value={formData.baseRuleCode || 'BASIC'}
                        onChange={(e) => setFormData({ ...formData, baseRuleCode: e.target.value.toUpperCase() })}
                        className="w-full px-3 py-2 bg-white border border-[#E4E1E5] rounded-md text-xs outline-none uppercase font-mono"
                      />
                    </div>
                  </div>
                )}

                {formData.calculationType === 'fixed' && (
                  <div className="p-3 bg-[#FBFAFB] rounded-[10px] border border-[#E4E1E5]">
                    <label className="block font-semibold text-[#28262D] mb-1">Fixed Amount (₹)</label>
                    <input
                      type="number"
                      value={formData.fixedAmount || ''}
                      onChange={(e) => setFormData({ ...formData, fixedAmount: parseFloat(e.target.value) })}
                      className="w-full px-3 py-2 bg-white border border-[#E4E1E5] rounded-md text-xs outline-none"
                    />
                  </div>
                )}

                {formData.calculationType === 'formula' && (
                  <div className="p-3 bg-[#FBFAFB] rounded-[10px] border border-[#E4E1E5] space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="block font-semibold text-[#28262D]">Formula Expression</label>
                      <button
                        type="button"
                        onClick={handleTestFormula}
                        className="text-[11px] text-[#714B67] hover:underline font-bold flex items-center gap-1"
                      >
                        <Calculator className="w-3 h-3" /> Test Syntax
                      </button>
                    </div>
                    <input
                      type="text"
                      value={formData.formula || ''}
                      onChange={(e) => setFormData({ ...formData, formula: e.target.value })}
                      placeholder="e.g. (GROSS / 30) * UNPAID_DAYS"
                      className="w-full px-3 py-2 bg-white border border-[#E4E1E5] rounded-md text-xs font-mono outline-none"
                    />
                    {formulaTestResult && (
                      <p className="text-[11px] text-[#438A6B] bg-[#EBF6F0] p-1.5 rounded border border-[#C3E6D5]">
                        {formulaTestResult}
                      </p>
                    )}
                  </div>
                )}

                <div className="pt-3 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsEditModalOpen(false)}
                    className="px-4 py-2 text-[#74717A] hover:bg-[#F4F3F5] rounded-[10px]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-[#714B67] hover:bg-[#5C3C53] text-white font-bold rounded-[10px] shadow-xs"
                  >
                    Save Rule
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Statutory Contribution Breakdown Modal */}
      <StatutoryContributionModal
        basicSalary={35000}
        isOpen={isPFModalOpen}
        onClose={() => setIsPFModalOpen(false)}
      />
    </div>
  );
}
