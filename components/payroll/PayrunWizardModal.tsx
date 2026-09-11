'use client';

import React, { useState } from 'react';
import { useApp } from '@/lib/context/app-context';
import { motion, AnimatePresence } from 'motion/react';
import {
  CreditCard,
  X,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Users,
  Calendar,
  Building2,
  Layers,
} from 'lucide-react';
import { SALARY_STRUCTURES } from '@/lib/mock-data/payroll';
import { formatINR } from '@/lib/utils';
import { CONTRACTS } from '@/lib/mock-data/contracts';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { peoplePayQueries } from '@/lib/supabase/peoplepay360_supabase_queries';
import { logLocalFallback } from '@/lib/demo/local-fallback';

export function PayrunWizardModal() {
  const { isPayrunWizardOpen, setIsPayrunWizardOpen, createPayrun, employees,authenticated,companyId } = useApp();
  const [eligibility,setEligibility]=useState<{employee_id:string;is_eligible:boolean;exclusion_reason:string|null}[]>([]);const [checking,setChecking]=useState(false);

  const [step, setStep] = useState<1 | 2>(1);
  const [name, setName] = useState('Regular Payrun - October 2026');
  const [startDate, setStartDate] = useState('2026-10-01');
  const [endDate, setEndDate] = useState('2026-10-31');
  const [department, setDepartment] = useState('All Departments');
  const [employeeType, setEmployeeType] = useState('Full-Time Employees');
  const [structureId, setStructureId] = useState(SALARY_STRUCTURES[0].id);

  const selectedStructure =
    SALARY_STRUCTURES.find((s) => s.id === structureId) || SALARY_STRUCTURES[0];

  React.useEffect(()=>{if(!isPayrunWizardOpen)return;let active=true;const load=async()=>{setChecking(true);try{if(authenticated&&companyId){const client=getSupabaseBrowserClient();if(client){if(process.env.NEXT_PUBLIC_CONTRACT_PAYROLL_GUARDS_ENABLED==='true'){const rows=await peoplePayQueries.payrollContractEligibility(client,companyId,startDate,endDate);if(active)setEligibility(rows??[])}else{const {data:contracts,error}=await client.from('contracts').select('employee_id,start_date,end_date,status,approved_at,terminated_at').eq('company_id',companyId);if(error)throw error;const rows=employees.map(employee=>{const contract=contracts?.find(item=>item.employee_id===employee.id&&Boolean(item.approved_at||item.status==='running')&&item.status!=='draft'&&item.status!=='terminated'&&item.start_date<=endDate&&(!item.end_date||item.end_date>=startDate)&&(!item.terminated_at||item.terminated_at.slice(0,10)>=startDate));return {employee_id:employee.id,is_eligible:Boolean(contract),exclusion_reason:contract?null:'No approved contract covers this payroll period'}});if(active)setEligibility(rows)}}}else{const rows=employees.map(employee=>{const contract=CONTRACTS.find(item=>item.employeeId===employee.id&&Boolean(item.approvedAt||item.status==='running')&&item.status!=='draft'&&item.status!=='terminated'&&item.startDate<=endDate&&(!item.endDate||item.endDate>=startDate));return {employee_id:employee.id,is_eligible:Boolean(contract),exclusion_reason:contract?null:'No approved contract covers this payroll period'}});if(active)setEligibility(rows)}}catch(error){logLocalFallback('payroll','contract_eligibility_loaded_locally',{employeeCount:employees.length,startDate,endDate},error);if(active)setEligibility(employees.map(employee=>({employee_id:employee.id,is_eligible:true,exclusion_reason:null})))}finally{if(active)setChecking(false)}};void load();return()=>{active=false}},[authenticated,companyId,startDate,endDate,isPayrunWizardOpen,employees]);
  const eligibleIds=new Set(eligibility.filter(item=>item.is_eligible).map(item=>item.employee_id));const eligibleEmployees=employees.filter(employee=>eligibleIds.has(employee.id));const excluded=eligibility.filter(item=>!item.is_eligible);
  const estimatedGross = eligibleEmployees.reduce((sum, e) => sum + (e.monthlySalaryGross ?? e.baseSalary ?? 45000), 0);
  const estimatedDeductions = Math.round(estimatedGross * 0.068);
  const estimatedNet = estimatedGross - estimatedDeductions;

  const handleFinish = () => {
    createPayrun({
      name,
      startDate,
      endDate,
      departmentName: department,
      employeeType,
      salaryStructureId: selectedStructure.id,
      salaryStructureName: selectedStructure.name,
      employeeCount: eligibleEmployees.length,
      grossTotal: estimatedGross,
      totalDeductions: estimatedDeductions,
      netTotal: estimatedNet,
      warningCount: 1,
    });
  };

  if (!isPayrunWizardOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/45 backdrop-blur-sm overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative w-full max-w-xl bg-white rounded-[18px] border border-[#E4E1E5] shadow-2xl p-6 my-8"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-[#F4F3F5]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-[12px] bg-[#714B67] text-white flex items-center justify-center font-bold">
                <CreditCard className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#28262D]">
                  Initiate Payrun Wizard {step === 1 ? '(Step 1/2)' : '(Step 2/2)'}
                </h3>
                <p className="text-xs text-[#74717A]">
                  {step === 1 ? 'Configure batch parameters and scope' : 'Verify headcount and computation preview'}
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsPayrunWizardOpen(false)}
              className="p-1 rounded-full text-[#74717A] hover:bg-[#F4F3F5]"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Stepper indicator */}
          <div className="flex items-center gap-2 my-4">
            <div
              className={`flex-1 h-1.5 rounded-full ${
                step >= 1 ? 'bg-[#714B67]' : 'bg-[#E4E1E5]'
              }`}
            />
            <div
              className={`flex-1 h-1.5 rounded-full ${
                step >= 2 ? 'bg-[#714B67]' : 'bg-[#E4E1E5]'
              }`}
            />
          </div>

          {/* Step 1: Batch Details */}
          {step === 1 && (
            <div className="space-y-4 text-xs">
              <div>
                <label className="block text-xs font-semibold text-[#28262D] mb-1">
                  Payrun Batch Name *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 bg-[#FBFAFB] border border-[#E4E1E5] focus:border-[#714B67] rounded-[10px] text-xs outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#28262D] mb-1">
                    Period Start Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 bg-[#FBFAFB] border border-[#E4E1E5] focus:border-[#714B67] rounded-[10px] text-xs outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#28262D] mb-1">
                    Period End Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3 py-2 bg-[#FBFAFB] border border-[#E4E1E5] focus:border-[#714B67] rounded-[10px] text-xs outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#28262D] mb-1">
                    Department Filter
                  </label>
                  <select
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full px-3 py-2 bg-[#FBFAFB] border border-[#E4E1E5] rounded-[10px] text-xs outline-none"
                  >
                    <option value="All Departments">All Departments (12 Employees)</option>
                    <option value="Engineering & Tech">Engineering & Tech</option>
                    <option value="Human Resources">Human Resources</option>
                    <option value="Finance & Accounts">Finance & Accounts</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#28262D] mb-1">
                    Salary Structure Template
                  </label>
                  <select
                    value={structureId}
                    onChange={(e) => setStructureId(e.target.value)}
                    className="w-full px-3 py-2 bg-[#FBFAFB] border border-[#E4E1E5] rounded-[10px] text-xs outline-none"
                  >
                    {SALARY_STRUCTURES.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="pt-4 flex justify-end">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="px-5 py-2.5 bg-[#714B67] hover:bg-[#5C3C53] text-white font-bold rounded-[10px] shadow-xs flex items-center gap-1.5 transition-colors"
                >
                  <span>Continue to Employee Scope</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Employee Selection & Computation Preview */}
          {step === 2 && (
            <div className="space-y-4 text-xs">
              <div className="p-4 bg-[#FBFAFB] rounded-[14px] border border-[#E4E1E5] grid grid-cols-3 gap-3">
                <div>
                  <span className="text-[10px] text-[#74717A] uppercase font-bold block">
                    Eligible Employees
                  </span>
                  <strong className="text-base font-bold text-[#28262D] tabular-nums">
                    {checking?'…':eligibleEmployees.length} Staff
                  </strong>
                </div>

                <div>
                  <span className="text-[10px] text-[#74717A] uppercase font-bold block">
                    Projected Gross
                  </span>
                  <strong className="text-base font-bold text-[#714B67] tabular-nums">
                    {formatINR(estimatedGross)}
                  </strong>
                </div>

                <div>
                  <span className="text-[10px] text-[#74717A] uppercase font-bold block">
                    Projected Net Disbursal
                  </span>
                  <strong className="text-base font-bold text-[#438A6B] tabular-nums">
                    {formatINR(estimatedNet)}
                  </strong>
                </div>
              </div>

              {/* Sample list */}
              <div className="border border-[#E4E1E5] rounded-[12px] overflow-hidden max-h-52 overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#FBFAFB] text-[#74717A] border-b border-[#E4E1E5]">
                    <tr>
                      <th className="py-2 px-3">Employee</th>
                      <th className="py-2 px-3">Gross</th>
                      <th className="py-2 px-3">Structure</th>
                      <th className="py-2 px-3 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F4F3F5]">
                    {eligibleEmployees.slice(0, 5).map((e) => (
                      <tr key={e.id}>
                        <td className="py-2 px-3 font-medium">{e.name}</td>
                        <td className="py-2 px-3 tabular-nums">{formatINR(e.monthlySalaryGross)}</td>
                        <td className="py-2 px-3 text-[#74717A] truncate max-w-xs">{e.salaryStructureName}</td>
                        <td className="py-2 px-3 text-right text-[#438A6B] font-semibold">Ready</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {excluded.length>0&&<div className="rounded-[10px] border border-[#F6CBC8] bg-[#FDF1F0] p-3 text-[#8F3E39]"><strong>{excluded.length} employee{excluded.length===1?'':'s'} excluded</strong><p className="mt-1">Expired, missing, draft, or non-covering contracts cannot produce payslips for this period.</p></div>}

              <div className="pt-4 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="px-4 py-2 text-xs font-semibold text-[#74717A] hover:bg-[#F4F3F5] rounded-[10px] flex items-center gap-1"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back</span>
                </button>

                <button
                  type="button"
                  onClick={handleFinish}
                  disabled={checking||eligibleEmployees.length===0}
                  className="px-5 py-2.5 bg-[#714B67] hover:bg-[#5C3C53] text-white font-bold rounded-[10px] shadow-xs flex items-center gap-1.5 disabled:opacity-50"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Confirm & Generate Draft Payrun</span>
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
