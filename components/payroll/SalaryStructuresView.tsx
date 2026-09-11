'use client';

import React, { useState } from 'react';
import { useApp } from '@/lib/context/app-context';
import {
  Layers,
  Plus,
  Shield,
  CheckCircle2,
  Lock,
  Edit2,
  Sliders,
  X,
  Building2,
  Info,
} from 'lucide-react';
import { SalaryStructure } from '@/lib/types';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';

export function SalaryStructuresView() {
  const {
    salaryStructures,
    salaryRules,
    addSalaryStructure,
    updateSalaryStructure,
    currentRole,
  } = useApp();

  const isReadOnly = currentRole === 'payroll_user';
  const [selectedStructure, setSelectedStructure] = useState<SalaryStructure | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [formData, setFormData] = useState<Partial<SalaryStructure>>({});
  const [validationErrors,setValidationErrors]=useState<string[]>([]);

  const handleEdit = (str: SalaryStructure) => {
    if (isReadOnly) return;
    setFormData(str);
    setIsEditModalOpen(true);
  };

  const handleCreate = () => {
    if (isReadOnly) return;
    setFormData({
      name: '',
      code: 'STR-',
      description: '',
      currency: 'INR',
      ruleIds: ['rule-1', 'rule-2', 'rule-3', 'rule-5', 'rule-6'],
    });
    setIsEditModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const selected=salaryRules.filter(rule=>formData.ruleIds?.includes(rule.id));
    const errors:string[]=[];
    if(!formData.name?.trim())errors.push('Structure name is required.');
    if(selected.length===0)errors.push('Select at least one salary rule.');
    if(selected.filter(rule=>rule.category==='basic').length!==1)errors.push('Select exactly one primary/basic earning rule.');
    if(new Set(selected.map(rule=>rule.code)).size!==selected.length)errors.push('Salary rule codes must be unique.');
    const selectedCodes=new Set(selected.map(rule=>rule.code));
    const hasMissingDependency=selected.some(rule=>rule.baseRuleCode&&!selectedCodes.has(rule.baseRuleCode));
    if(hasMissingDependency)errors.push('Every percentage dependency must be included in this version.');
    if(errors.length){setValidationErrors(errors);return}setValidationErrors([]);

    if (formData.id) {
      updateSalaryStructure(formData.id, formData);
    } else {
      addSalaryStructure({
        name: formData.name!,
        code: formData.code || 'STR-CUSTOM',
        description: formData.description || '',
        currency: 'INR',
        ruleIds: formData.ruleIds || [],
      });
    }
    setIsEditModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-[16px] border border-[#E4E1E5] shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-[#28262D] tracking-tight">Salary Structures</h2>
          <p className="text-xs text-[#74717A] mt-0.5">
            Configure component composition templates for departments and seniority tiers.
          </p>
        </div>

        {!isReadOnly ? (
          <button
            onClick={handleCreate}
            className="px-4 py-2 bg-[#714B67] hover:bg-[#5C3C53] text-white text-xs font-bold rounded-[10px] shadow-xs flex items-center gap-1.5 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Create Salary Structure</span>
          </button>
        ) : (
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#FFF6D2] border border-[#F8E29E] rounded-[10px] text-xs font-semibold text-[#9A6B0A]">
            <Lock className="w-3.5 h-3.5" />
            <span>Read-Only Mode for Payroll User</span>
          </div>
        )}
      </div>

      {/* Read-only notification banner */}
      {isReadOnly && (
        <div className="p-3.5 bg-[#FFF6D2] rounded-[12px] border border-[#F8E29E] text-xs text-[#9A6B0A] flex items-center gap-2">
          <Info className="w-4 h-4 shrink-0" />
          <span>
            You are logged in as <strong>HR Payroll User</strong>. Structure creation and modification
            require <strong>HR Payroll Manager</strong> or <strong>Admin</strong> privileges.
          </span>
        </div>
      )}

      {/* Structures Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {salaryStructures.map((s) => {
          const rules = salaryRules.filter((r) => s.ruleIds.includes(r.id));

          return (
            <div
              key={s.id}
              className="bg-white rounded-[16px] border border-[#E4E1E5] shadow-xs p-5 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-[10px] bg-[#F4F3F5] text-[#714B67] flex items-center justify-center font-bold">
                      <Layers className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-[#28262D]">{s.name}</h3>
                      <span className="text-[10px] font-mono text-[#714B67] font-semibold">{s.code}</span>
                    </div>
                  </div>

                  {!isReadOnly && (
                    <button
                      onClick={() => handleEdit(s)}
                      className="p-1.5 rounded-[8px] text-[#74717A] hover:text-[#714B67] hover:bg-[#F4F3F5] transition-colors"
                      title="Edit Structure"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <p className="text-xs text-[#74717A] mt-2.5 leading-relaxed">{s.description}</p>

                {/* Rules pills */}
                <div className="mt-4 pt-3 border-t border-[#F4F3F5]">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#A4879F] block mb-2">
                    Included Salary Rules ({rules.length})
                  </span>

                  <div className="flex flex-wrap gap-1.5">
                    {rules.map((r) => (
                      <span
                        key={r.id}
                        className="px-2 py-0.5 rounded-[6px] text-[11px] font-medium bg-[#FBFAFB] border border-[#E4E1E5] text-[#28262D]"
                      >
                        {r.code}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-5 pt-3 border-t border-[#F4F3F5] flex items-center justify-between text-xs text-[#74717A]">
                <span>Currency: <strong>INR (₹)</strong></span>
                <span className="text-[#438A6B] font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Compliant
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Edit / Create Modal */}
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
                  {formData.id ? 'Edit Salary Structure' : 'Create Salary Structure'}
                </h3>
                <button
                  onClick={() => setIsEditModalOpen(false)}
                  className="p-1 rounded-full text-[#74717A] hover:bg-[#F4F3F5]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSave} className="mt-4 space-y-3.5 text-xs">
                {validationErrors.length>0&&<div className="p-3 rounded-[10px] bg-[#FDF1F0] border border-[#F6CBC8] text-[#C85A54] space-y-1">{validationErrors.map(error=><p key={error}>• {error}</p>)}</div>}
                <div>
                  <label className="block text-xs font-semibold text-[#28262D] mb-1">
                    Structure Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name || ''}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 bg-[#FBFAFB] border border-[#E4E1E5] focus:border-[#714B67] rounded-[10px] text-xs outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#28262D] mb-1">
                    Code Identifier *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.code || ''}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    className="w-full px-3 py-2 bg-[#FBFAFB] border border-[#E4E1E5] focus:border-[#714B67] rounded-[10px] text-xs outline-none uppercase font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#28262D] mb-1">
                    Description
                  </label>
                  <textarea
                    rows={2}
                    value={formData.description || ''}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-3 py-2 bg-[#FBFAFB] border border-[#E4E1E5] focus:border-[#714B67] rounded-[10px] text-xs outline-none resize-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#28262D] mb-1">
                    Assign Salary Rules
                  </label>
                  <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto p-2 border border-[#E4E1E5] rounded-[10px] bg-[#FBFAFB]">
                    {salaryRules.map((rule) => {
                      const isChecked = formData.ruleIds?.includes(rule.id);
                      return (
                        <label
                          key={rule.id}
                          className="flex items-center gap-2 text-[11px] text-[#28262D] cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              const cur = formData.ruleIds || [];
                              if (e.target.checked) {
                                setFormData({ ...formData, ruleIds: [...cur, rule.id] });
                              } else {
                                setFormData({
                                  ...formData,
                                  ruleIds: cur.filter((id) => id !== rule.id),
                                });
                              }
                            }}
                            className="w-3.5 h-3.5 text-[#714B67] rounded border-[#E4E1E5]"
                          />
                          <span className="truncate">{rule.name}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>

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
                    Save Structure
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
