'use client';

import React, { useState } from 'react';
import { useApp } from '@/lib/context/app-context';
import {
  FileSpreadsheet,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Calendar,
  CreditCard,
  Search,
  Filter,
  Eye,
  AlertCircle,
  X,
  Plus,
} from 'lucide-react';
import { CONTRACTS } from '@/lib/mock-data/contracts';
import { Contract } from '@/lib/types';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { formatINR, formatDate } from '@/lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { WORKING_SCHEDULES } from '@/lib/mock-data/departments-schedules';

export function ContractsView() {
  const { employees } = useApp();
  const [contractsList, setContractsList] = useState<Contract[]>(() => {
    try { const stored=JSON.parse(localStorage.getItem('peoplepay360-local-contracts')??'[]') as Contract[]; return [...stored,...CONTRACTS.filter(item=>!stored.some(saved=>saved.id===item.id))]; } catch { return CONTRACTS; }
  });
  const [isCreateOpen,setIsCreateOpen]=useState(false);
  const [scheduleOptions,setScheduleOptions]=useState(WORKING_SCHEDULES);
  const [newContract,setNewContract]=useState({employeeId:'',workingScheduleId:'',startDate:new Date().toISOString().slice(0,10),endDate:'',wage:50000,status:'draft' as Contract['status']});
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);
  React.useEffect(()=>{queueMicrotask(()=>{try{const stored=JSON.parse(localStorage.getItem('peoplepay360-local-work-schedules')??'[]') as typeof WORKING_SCHEDULES;setScheduleOptions([...stored,...WORKING_SCHEDULES.filter(item=>!stored.some(saved=>saved.id===item.id))]);}catch{/* seeded schedules remain available */}})},[]);

  // Filter
  const filtered = contractsList.filter((c) => {
    const ref = c.reference || c.contractReference || '';
    const job = c.jobTitle || c.jobPosition || '';
    const matchesSearch =
      c.employeeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ref.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const expiringCount = contractsList.filter((c) => c.warningType === 'expiring_soon').length;
  const mismatchCount = contractsList.filter((c) => c.warningType === 'wage_mismatch').length;

  const approveRenewal = (contract: Contract) => {
    const approved = { ...contract, status: 'scheduled' as const, approvedAt: '2026-09-05' };
    setContractsList((current) => current.map((item) => item.id === contract.id ? approved : item));
    setSelectedContract(approved);
  };

  const saveContract = (event: React.FormEvent) => {
    event.preventDefault();
    const employee=employees.find(item=>item.id===newContract.employeeId); const schedule=scheduleOptions.find(item=>item.id===newContract.workingScheduleId);
    if(!employee)return;
    const contract:Contract={id:`local-contract-${Date.now()}`,employeeId:employee.id,employeeName:employee.name,contractReference:`CNT-DEMO-${Date.now().toString().slice(-6)}`,wage:newContract.wage,wageMonthly:newContract.wage,wageAnnual:newContract.wage*12,startDate:newContract.startDate,endDate:newContract.endDate||undefined,department:employee.departmentName,jobPosition:employee.jobPosition,salaryStructureId:'str-1',salaryStructureName:employee.salaryStructureName||'Standard Corporate Salary Structure',workingScheduleId:newContract.workingScheduleId,workingScheduleName:schedule?.name||'Company Default',status:newContract.status,isActive:newContract.status==='running'};
    setContractsList(current=>[contract,...current]);
    try { const stored=JSON.parse(localStorage.getItem('peoplepay360-local-contracts')??'[]') as Contract[];localStorage.setItem('peoplepay360-local-contracts',JSON.stringify([contract,...stored])); } catch {/* in-memory fallback */}
    setNewContract({employeeId:'',workingScheduleId:'',startDate:new Date().toISOString().slice(0,10),endDate:'',wage:50000,status:'draft'});setIsCreateOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-[16px] border border-[#E4E1E5] shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-[#28262D] tracking-tight">Contracts Management</h2>
          <p className="text-xs text-[#74717A] mt-0.5">
            Monitor employment terms, wage agreements, probation periods, and contract expiries.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <button onClick={()=>setIsCreateOpen(true)} className="px-3 py-2 bg-[#714B67] text-white rounded-[10px] font-bold flex items-center gap-1.5"><Plus className="w-4 h-4"/>Create Contract</button>
          <span className="font-semibold text-[#438A6B] bg-[#EBF6F0] px-3 py-1.5 rounded-[10px] border border-[#C3E6D5]">
            {contractsList.filter((c) => c.status === 'running').length} Running Contracts
          </span>
        </div>
      </div>

      {isCreateOpen&&<div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"><form onSubmit={saveContract} className="w-full max-w-lg bg-white rounded-[16px] p-5 space-y-3 text-xs"><div className="flex justify-between"><h3 className="font-bold text-sm">Create Contract</h3><button type="button" onClick={()=>setIsCreateOpen(false)}><X className="w-4 h-4"/></button></div><label className="block">Employee<select required value={newContract.employeeId} onChange={e=>setNewContract({...newContract,employeeId:e.target.value})} className="w-full mt-1 p-2 border rounded"><option value="">Select employee</option>{employees.map(employee=><option key={employee.id} value={employee.id}>{employee.name}</option>)}</select></label><label className="block">Working schedule<select required value={newContract.workingScheduleId} onChange={e=>setNewContract({...newContract,workingScheduleId:e.target.value})} className="w-full mt-1 p-2 border rounded"><option value="">Select schedule</option>{WORKING_SCHEDULES.map(schedule=><option key={schedule.id} value={schedule.id}>{schedule.name} ({schedule.weeklyHours}h)</option>)}</select></label><div className="grid grid-cols-2 gap-2"><label>Start date<input required type="date" value={newContract.startDate} onChange={e=>setNewContract({...newContract,startDate:e.target.value})} className="w-full mt-1 p-2 border rounded"/></label><label>End date<input type="date" min={newContract.startDate} value={newContract.endDate} onChange={e=>setNewContract({...newContract,endDate:e.target.value})} className="w-full mt-1 p-2 border rounded"/></label></div><div className="grid grid-cols-2 gap-2"><label>Monthly wage<input required type="number" min="1" value={newContract.wage} onChange={e=>setNewContract({...newContract,wage:Number(e.target.value)})} className="w-full mt-1 p-2 border rounded"/></label><label>Status<select value={newContract.status} onChange={e=>setNewContract({...newContract,status:e.target.value as Contract['status']})} className="w-full mt-1 p-2 border rounded"><option value="draft">Draft</option><option value="running">Running</option></select></label></div><div className="flex justify-end gap-2"><button type="button" onClick={()=>setIsCreateOpen(false)} className="px-3 py-2 border rounded">Cancel</button><button className="px-3 py-2 bg-[#714B67] text-white rounded font-bold">Create contract</button></div></form></div>}

      {/* Warning Callout Banners if any */}
      {(expiringCount > 0 || mismatchCount > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {expiringCount > 0 && (
            <div className="p-4 bg-[#FFF6D2] rounded-[14px] border border-[#F8E29E] flex items-start gap-3 text-xs text-[#9A6B0A]">
              <Clock className="w-5 h-5 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Contracts Expiring Within 30 Days ({expiringCount})</p>
                <p className="mt-0.5 leading-relaxed">
                  Fixed-term contracts and generated renewal drafts require HR review before the next payrun.
                </p>
              </div>
            </div>
          )}

          {mismatchCount > 0 && (
            <div className="p-4 bg-[#FDF1F0] rounded-[14px] border border-[#F6CBC8] flex items-start gap-3 text-xs text-[#C85A54]">
              <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Salary Structure Wage Mismatch ({mismatchCount})</p>
                <p className="mt-0.5 leading-relaxed">
                  Contract wage for Sneha Nair differs from the linked Operations Specialist structure default.
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Contracts Table */}
      <div className="bg-white rounded-[16px] border border-[#E4E1E5] shadow-xs overflow-hidden">
        {/* Table Filters */}
        <div className="p-4 border-b border-[#F4F3F5] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="relative w-full sm:w-72">
            <Search className="w-3.5 h-3.5 text-[#74717A] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by contract ref or employee..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-[#FBFAFB] border border-[#E4E1E5] rounded-[10px] text-xs outline-none focus:border-[#714B67]"
            />
          </div>

          <div className="flex items-center gap-1 bg-[#F4F3F5] p-1 rounded-[10px]">
            {['all', 'running', 'scheduled', 'draft', 'expired', 'terminated'].map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1 rounded-[8px] font-medium capitalize transition-colors ${
                  statusFilter === s
                    ? 'bg-white text-[#714B67] shadow-xs font-semibold'
                    : 'text-[#74717A] hover:text-[#28262D]'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Table View */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-[#28262D]">
            <thead className="bg-[#FBFAFB] text-[#74717A] uppercase text-[10px] font-bold tracking-wider border-b border-[#E4E1E5]">
              <tr>
                <th className="py-3 px-4">Contract Ref</th>
                <th className="py-3 px-4">Employee</th>
                <th className="py-3 px-4">Start Date</th>
                <th className="py-3 px-4">End Date</th>
                <th className="py-3 px-4">Monthly Wage</th>
                <th className="py-3 px-4">Salary Structure</th>
                <th className="py-3 px-4">Alerts</th>
                <th className="py-3 px-4 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F4F3F5]">
              {filtered.map((c) => (
                <tr
                  key={c.id}
                  onClick={() => setSelectedContract(c)}
                  className="hover:bg-[#FBFAFB] transition-colors cursor-pointer"
                >
                  <td className="py-3.5 px-4 font-mono font-semibold text-[#714B67]">
                    {c.reference || c.contractReference}
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="font-semibold text-[#28262D]">{c.employeeName}</div>
                    <div className="text-[11px] text-[#74717A]">{c.jobTitle || c.jobPosition} • {c.department}</div>
                  </td>
                  <td className="py-3.5 px-4 text-[#74717A]">{formatDate(c.startDate)}</td>
                  <td className="py-3.5 px-4 text-[#74717A]">
                    {c.endDate ? formatDate(c.endDate) : <span className="text-[#A4879F]">Permanent</span>}
                  </td>
                  <td className="py-3.5 px-4 font-bold tabular-nums text-[#28262D]">
                    {formatINR(c.wageMonthly ?? c.wage)}
                  </td>
                  <td className="py-3.5 px-4 text-[#74717A] max-w-xs truncate">
                    {c.salaryStructureName}
                  </td>
                  <td className="py-3.5 px-4">
                    {c.warningType === 'expiring_soon' && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#9A6B0A] bg-[#FFF6D2] px-2 py-0.5 rounded border border-[#F8E29E]">
                        <Clock className="w-3 h-3" /> Expiring Soon
                      </span>
                    )}
                    {c.warningType === 'wage_mismatch' && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#C85A54] bg-[#FDF1F0] px-2 py-0.5 rounded border border-[#F6CBC8]">
                        <AlertTriangle className="w-3 h-3" /> Wage Mismatch
                      </span>
                    )}
                    {c.status === 'draft' && c.renewalOfContractId && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#714B67] bg-[#F4EFF3] px-2 py-0.5 rounded border border-[#D8C7D4]">
                        <Calendar className="w-3 h-3" /> Renewal Draft
                      </span>
                    )}
                    {!c.warningType && !(c.status === 'draft' && c.renewalOfContractId) && (
                      <span className="text-[11px] text-[#438A6B] flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Validated
                      </span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <StatusBadge status={c.status} size="sm" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Contract Detail Modal */}
      <AnimatePresence>
        {selectedContract && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-md bg-white rounded-[18px] border border-[#E4E1E5] shadow-2xl p-6"
            >
              <div className="flex items-center justify-between pb-3 border-b border-[#F4F3F5]">
                <div>
                  <h3 className="text-sm font-bold text-[#28262D]">
                    Contract: {selectedContract.reference || selectedContract.contractReference}
                  </h3>
                  <p className="text-[11px] text-[#74717A]">{selectedContract.employeeName}</p>
                </div>
                <button
                  onClick={() => setSelectedContract(null)}
                  className="p-1 rounded-full text-[#74717A] hover:bg-[#F4F3F5]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="mt-4 space-y-3 text-xs">
                <div className="p-3 bg-[#FBFAFB] rounded-[10px] border border-[#E4E1E5] flex items-center justify-between">
                  <span className="text-[#74717A]">Contract Status</span>
                  <StatusBadge status={selectedContract.status} size="sm" />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-[10px] text-[#74717A] block">Monthly Wage:</span>
                    <strong className="text-sm text-[#714B67] tabular-nums font-bold">
                      {formatINR(selectedContract.wageMonthly ?? selectedContract.wage)}
                    </strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#74717A] block">Annual CTC:</span>
                    <strong className="text-sm text-[#28262D] tabular-nums font-bold">
                      {formatINR(selectedContract.wageAnnual ?? (selectedContract.wageMonthly ?? selectedContract.wage) * 12)}
                    </strong>
                  </div>
                </div>

                <div>
                  <span className="text-[10px] text-[#74717A] block">Salary Structure:</span>
                  <p className="font-medium text-[#28262D] mt-0.5">{selectedContract.salaryStructureName}</p>
                </div>

                <div>
                  <span className="text-[10px] text-[#74717A] block">Working Schedule:</span>
                  <p className="font-medium text-[#28262D] mt-0.5">
                    {selectedContract.workingScheduleName || 'Standard Corporate Shift (9:30 AM - 6:30 PM)'}
                  </p>
                </div>

                {selectedContract.warningDetails && (
                  <div className="p-3 rounded-[10px] bg-[#FFF6D2] border border-[#F8E29E] text-[11px] text-[#9A6B0A]">
                    <strong>Audit Notice:</strong> {selectedContract.warningDetails}
                  </div>
                )}
                {selectedContract.renewalMode && (
                  <div className="grid grid-cols-2 gap-2 rounded-[10px] border border-[#D8C7D4] bg-[#F4EFF3] p-3">
                    <div><span className="block text-[10px] text-[#74717A]">Renewal mode</span><strong className="capitalize">{selectedContract.renewalMode}</strong></div>
                    <div><span className="block text-[10px] text-[#74717A]">Renewal term</span><strong>{selectedContract.renewalTermMonths} months</strong></div>
                    <div><span className="block text-[10px] text-[#74717A]">Renews contract</span><strong className="font-mono">{selectedContract.renewalOfContractId}</strong></div>
                    <div><span className="block text-[10px] text-[#74717A]">Decision due</span><strong>{selectedContract.renewalDueDate ? formatDate(selectedContract.renewalDueDate) : '—'}</strong></div>
                  </div>
                )}
              </div>

              <div className="mt-5 pt-3 border-t border-[#F4F3F5] flex justify-end gap-2">
                {selectedContract.status === 'draft' && selectedContract.renewalOfContractId && <button onClick={() => approveRenewal(selectedContract)} className="px-4 py-2 bg-[#438A6B] text-white text-xs font-bold rounded-[10px]">Approve & schedule renewal</button>}
                <button
                  onClick={() => setSelectedContract(null)}
                  className="px-4 py-2 bg-[#714B67] text-white text-xs font-semibold rounded-[10px]"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
