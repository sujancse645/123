'use client';

import React, { useState } from 'react';
import { useApp } from '@/lib/context/app-context';
import {
  Users,
  Search,
  Filter,
  Eye,
  Mail,
  Phone,
  Building2,
  Calendar,
  X,
  CreditCard,
  CheckCircle2,
  AlertTriangle,
  UserPlus,
  Download,
} from 'lucide-react';
import { Employee } from '@/lib/types';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { formatINR, formatDate, cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { CreateEmployeeAccountModal } from './CreateEmployeeAccountModal';
import { downloadCsv } from '@/lib/exports/file-downloads';

export function EmployeesDirectoryView() {
  const { employees, currentRole } = useApp();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDept, setSelectedDept] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [inspectEmployee, setInspectEmployee] = useState<Employee | null>(null);
  const [isCreateOpen,setIsCreateOpen]=useState(false);

  const departments = [
    'all',
    ...Array.from(new Set(employees.map((e) => e.department || e.departmentName).filter(Boolean) as string[])),
  ];

  const filtered = employees.filter((emp) => {
    const empName = emp.name || '';
    const empId = emp.employeeId || '';
    const empRole = emp.jobPosition || '';
    const empDept = emp.department || emp.departmentName || '';
    const matchesSearch =
      empName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      empId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      empRole.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDept = selectedDept === 'all' || empDept === selectedDept;
    const matchesStatus = selectedStatus === 'all' || emp.currentAttendanceStatus === selectedStatus;
    return matchesSearch && matchesDept && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-[16px] border border-[#E4E1E5] shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-[#28262D] tracking-tight">Employees Directory</h2>
          <p className="text-xs text-[#74717A] mt-0.5">
            Total {employees.length} active enterprise employees across departments and office locations.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <button onClick={() => downloadCsv('employees.csv', ['Employee ID', 'Name', 'Department', 'Job title', 'Email', 'Phone'], filtered.map((employee) => [employee.employeeId, employee.name, employee.department || employee.departmentName, employee.jobPosition, employee.email, employee.phone]))} className="px-3 py-2 bg-white text-[#714B67] rounded-[10px] font-bold flex items-center gap-1.5 border border-[#D8C7D4]"><Download className="w-4 h-4"/>Export CSV</button>
          {(currentRole==='hr_manager'||currentRole==='admin')&&<button onClick={()=>setIsCreateOpen(true)} className="px-3 py-2 bg-[#714B67] text-white rounded-[10px] font-bold flex items-center gap-1.5"><UserPlus className="w-4 h-4"/>Create Employee Account</button>}
          <span className="font-semibold text-[#714B67] bg-[#F4F3F5] px-3 py-1.5 rounded-[10px] border border-[#E4E1E5]">
            {filtered.length} Employees Found
          </span>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-[16px] border border-[#E4E1E5] shadow-xs flex flex-col md:flex-row items-center justify-between gap-3 text-xs">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-[#74717A] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by name, ID, or job title..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-[#FBFAFB] border border-[#E4E1E5] rounded-[10px] text-xs outline-none focus:border-[#714B67]"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          <div className="flex items-center gap-1.5 text-[#74717A] shrink-0 font-medium">
            <Filter className="w-3.5 h-3.5" />
            <span>Dept:</span>
          </div>
          <select
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            className="px-3 py-2 bg-[#FBFAFB] border border-[#E4E1E5] rounded-[10px] text-xs outline-none text-[#28262D]"
          >
            {departments.map((d) => (
              <option key={d} value={d}>
                {d === 'all' ? 'All Departments' : d}
              </option>
            ))}
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3 py-2 bg-[#FBFAFB] border border-[#E4E1E5] rounded-[10px] text-xs outline-none text-[#28262D]"
          >
            <option value="all">All Attendance</option>
            <option value="checked_in">Checked In</option>
            <option value="checked_out">Checked Out</option>
            <option value="on_leave">On Leave</option>
          </select>
        </div>
      </div>

      {/* Employee Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((emp, idx) => (
          <div
            key={emp.id || emp.employeeId || `emp-${idx}`}
            onClick={() => setInspectEmployee(emp)}
            className="p-5 bg-white rounded-[16px] border border-[#E4E1E5] shadow-xs hover:shadow-md hover:border-[#714B67]/30 transition-all duration-150 cursor-pointer flex flex-col justify-between group"
          >
            <div>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <img
                    src={emp.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
                    alt={emp.name}
                    className="w-10 h-10 rounded-full object-cover border border-[#E4E1E5]"
                  />
                  <div>
                    <h3 className="text-sm font-bold text-[#28262D] group-hover:text-[#714B67] transition-colors">
                      {emp.name}
                    </h3>
                    <p className="text-xs text-[#74717A] mt-0.5">{emp.jobPosition}</p>
                    <span className="font-mono text-[11px] text-[#A4879F]">{emp.employeeId}</span>
                  </div>
                </div>

                <StatusBadge status={emp.currentAttendanceStatus} size="sm" />
              </div>

              <div className="mt-4 pt-3 border-t border-[#F4F3F5] space-y-1.5 text-xs text-[#74717A]">
                <div className="flex items-center gap-2">
                  <Building2 className="w-3.5 h-3.5 text-[#A4879F]" />
                  <span>{emp.department || emp.departmentName || 'General'} • {emp.workLocation || 'Bengaluru HQ'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5 text-[#A4879F]" />
                  <span className="truncate">{emp.email}</span>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-[#F4F3F5] flex items-center justify-between text-xs">
              <span className="font-semibold text-[#28262D] tabular-nums">
                {formatINR(emp.monthlySalaryGross ?? emp.baseSalary)} <span className="font-normal text-[#74717A] text-[10px]">{emp.employeeType === 'intern' ? 'Monthly Stipend' : '/ mo'}</span>
              </span>
              <span className="text-[11px] font-semibold text-[#714B67] group-hover:underline flex items-center gap-1">
                View Dossier →
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Employee Inspection Drawer / Modal */}
      <AnimatePresence>
        {inspectEmployee && (
          <div className="fixed inset-0 z-50 overflow-hidden">
            <div
              onClick={() => setInspectEmployee(null)}
              className="absolute inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
            />
            <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
              <motion.div
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ duration: 0.22 }}
                className="w-screen max-w-xl bg-white border-l border-[#E4E1E5] shadow-2xl flex flex-col overflow-y-auto"
              >
                {/* Drawer Header */}
                <div className="p-6 border-b border-[#F4F3F5] bg-[#FBFAFB] flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <img
                      src={inspectEmployee.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
                      alt={inspectEmployee.name}
                      className="w-14 h-14 rounded-full object-cover border-2 border-white shadow-xs"
                    />
                    <div>
                      <h3 className="text-base font-bold text-[#28262D]">{inspectEmployee.name}</h3>
                      <p className="text-xs text-[#74717A]">{inspectEmployee.jobPosition} • {inspectEmployee.department}</p>
                      <span className="text-[11px] font-mono text-[#714B67] font-semibold">
                        {inspectEmployee.employeeId}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => setInspectEmployee(null)}
                    className="p-1.5 rounded-full text-[#74717A] hover:bg-[#F4F3F5]"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Body Details */}
                <div className="p-6 space-y-5 text-xs">
                  {/* Current Status */}
                  <div className="p-3.5 rounded-[12px] bg-[#FBFAFB] border border-[#E4E1E5] flex items-center justify-between">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-[#74717A] tracking-wider block">
                        Current Presence Status
                      </span>
                      <p className="font-semibold text-[#28262D] mt-0.5">
                        {inspectEmployee.todayCheckInTime ? `Punched in at ${inspectEmployee.todayCheckInTime}` : 'Not clocked in today'}
                      </p>
                    </div>
                    <StatusBadge status={inspectEmployee.currentAttendanceStatus} />
                  </div>

                  {/* Compensation & Structure */}
                  <div className="p-4 rounded-[14px] border border-[#E4E1E5] bg-white space-y-3">
                    <h4 className="font-bold text-[#28262D] uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                      <CreditCard className="w-4 h-4 text-[#714B67]" />
                      Compensation & Salary Structure
                    </h4>

                    <div className="grid grid-cols-2 gap-3 pt-1">
                      <div>
                        <span className="text-[10px] text-[#74717A] block">{inspectEmployee.employeeType === 'intern' ? 'Monthly Stipend:' : 'Monthly Gross:'}</span>
                        <strong className="text-sm font-bold text-[#714B67] tabular-nums">
                          {formatINR(inspectEmployee.monthlySalaryGross ?? inspectEmployee.baseSalary)}
                        </strong>
                      </div>
                      <div>
                        <span className="text-[10px] text-[#74717A] block">Annual CTC:</span>
                        <strong className="text-sm font-bold text-[#28262D] tabular-nums">
                          {formatINR(inspectEmployee.annualCTC ?? (inspectEmployee.monthlySalaryGross ?? inspectEmployee.baseSalary) * 12)}
                        </strong>
                      </div>
                      <div className="col-span-2">
                        <span className="text-[10px] text-[#74717A] block">Assigned Structure:</span>
                        <strong className="font-medium text-[#28262D]">
                          {inspectEmployee.salaryStructureName || inspectEmployee.workingScheduleName || 'Standard Corporate Structure'}
                        </strong>
                      </div>
                    </div>
                  </div>

                  {/* Employment Contract */}
                  <div className="p-4 rounded-[14px] border border-[#E4E1E5] bg-white space-y-2">
                    <h4 className="font-bold text-[#28262D] uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                      <Calendar className="w-4 h-4 text-[#714B67]" />
                      Contract & Reporting
                    </h4>
                    <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                      <div>
                        <span className="text-[10px] text-[#74717A] block">Contract Reference:</span>
                        <span className="font-mono text-[#28262D]">{inspectEmployee.contractReference || inspectEmployee.activeContractId || 'CNT-2024-STD'}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-[#74717A] block">Contract Status:</span>
                        <StatusBadge status={inspectEmployee.contractStatus || 'active'} size="sm" />
                      </div>
                      <div>
                        <span className="text-[10px] text-[#74717A] block">Date of Joining:</span>
                        <span className="text-[#28262D]">{formatDate(inspectEmployee.dateOfJoining || inspectEmployee.joiningDate)}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-[#74717A] block">Reporting Manager:</span>
                        <span className="text-[#28262D] font-medium">{inspectEmployee.reportingManagerName || 'N/A'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Statutory & Bank Identifiers */}
                  <div className="p-4 rounded-[14px] border border-[#E4E1E5] bg-[#FBFAFB] space-y-2 text-xs">
                    <h4 className="font-bold text-[#28262D] uppercase tracking-wider text-[11px]">
                      Statutory Identifiers
                    </h4>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <span className="text-[10px] text-[#74717A] block">Bank Account:</span>
                        <span className="font-mono font-medium">{inspectEmployee.bankAccountMasked}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-[#74717A] block">IFSC Code:</span>
                        <span className="font-mono font-medium">{inspectEmployee.ifscCode}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-[#74717A] block">PAN:</span>
                        <span className="font-mono font-medium">{inspectEmployee.panNumber}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-[#74717A] block">EPFO UAN:</span>
                        <span className="font-mono font-medium">{inspectEmployee.uanNumber || '100924881029'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        )}
      </AnimatePresence>
      <CreateEmployeeAccountModal open={isCreateOpen} onClose={()=>setIsCreateOpen(false)}/>
    </div>
  );
}
