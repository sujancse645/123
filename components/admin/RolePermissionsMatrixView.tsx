'use client';

import React from 'react';
import { useApp } from '@/lib/context/app-context';
import {
  ShieldCheck,
  Check,
  X,
  Lock,
  Users,
  Eye,
  Info,
} from 'lucide-react';
import { AppRole } from '@/lib/types';

interface PermissionRow {
  capability: string;
  category: string;
  employee: boolean;
  hr_manager: boolean;
  payroll_user: boolean;
  payroll_manager: boolean;
  admin: boolean;
}

const MATRIX: PermissionRow[] = [
  {
    capability: 'Record Punch In / Punch Out (Biometric & Face AI)',
    category: 'Attendance',
    employee: true,
    hr_manager: true,
    payroll_user: true,
    payroll_manager: true,
    admin: true,
  },
  {
    capability: 'Submit Attendance Regularization Request',
    category: 'Attendance',
    employee: true,
    hr_manager: true,
    payroll_user: true,
    payroll_manager: true,
    admin: true,
  },
  {
    capability: 'Approve / Refuse Attendance Corrections',
    category: 'Attendance',
    employee: false,
    hr_manager: true,
    payroll_user: false,
    payroll_manager: true,
    admin: true,
  },
  {
    capability: 'Apply for Leave with Live LOP Deduction Preview',
    category: 'Leaves',
    employee: true,
    hr_manager: true,
    payroll_user: true,
    payroll_manager: true,
    admin: true,
  },
  {
    capability: 'Approve / Refuse Leave Requests',
    category: 'Leaves',
    employee: false,
    hr_manager: true,
    payroll_user: false,
    payroll_manager: false,
    admin: true,
  },
  {
    capability: 'Request Self-Service Profile Updates',
    category: 'Profile',
    employee: true,
    hr_manager: true,
    payroll_user: true,
    payroll_manager: true,
    admin: true,
  },
  {
    capability: 'Authorize Employee Profile Modifications',
    category: 'Profile',
    employee: false,
    hr_manager: true,
    payroll_user: false,
    payroll_manager: false,
    admin: true,
  },
  {
    capability: 'Initiate Payrun & Run Compute Engine',
    category: 'Payroll',
    employee: false,
    hr_manager: false,
    payroll_user: true,
    payroll_manager: true,
    admin: true,
  },
  {
    capability: 'Validate & Lock Payrun Batches',
    category: 'Payroll',
    employee: false,
    hr_manager: false,
    payroll_user: false,
    payroll_manager: true,
    admin: true,
  },
  {
    capability: 'Disburse Salary & Mark as Paid',
    category: 'Payroll',
    employee: false,
    hr_manager: false,
    payroll_user: false,
    payroll_manager: true,
    admin: true,
  },
  {
    capability: 'Author & Edit Salary Structures & Formulas',
    category: 'Payroll',
    employee: false,
    hr_manager: false,
    payroll_user: false,
    payroll_manager: true,
    admin: true,
  },
  {
    capability: 'Synchronize Physical Biometric Hardware',
    category: 'Admin',
    employee: false,
    hr_manager: false,
    payroll_user: false,
    payroll_manager: false,
    admin: true,
  },
  {
    capability: 'Inspect Immutable Enterprise Audit Trail',
    category: 'Admin',
    employee: false,
    hr_manager: false,
    payroll_user: false,
    payroll_manager: true,
    admin: true,
  },
];

export function RolePermissionsMatrixView() {
  const { currentRole } = useApp();

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white p-5 rounded-[16px] border border-[#E4E1E5] shadow-xs">
        <h2 className="text-xl font-bold text-[#28262D] tracking-tight">
          Role-Based Access Control (RBAC) Matrix
        </h2>
        <p className="text-xs text-[#74717A] mt-0.5">
          Enterprise permission segregation across standard user personas in PeoplePay360.
        </p>
      </div>

      {/* Info notice */}
      <div className="p-4 bg-[#FBFAFB] rounded-[14px] border border-[#E4E1E5] flex items-center gap-3 text-xs text-[#74717A]">
        <Info className="w-5 h-5 text-[#714B67] shrink-0" />
        <div>
          <strong>Strict Separation of Duties (SoD):</strong> Notice how <em>HR Payroll User</em> can initiate
          and compute draft salaries, but only <em>HR Payroll Manager</em> or <em>Admin</em> has the statutory authority to validate and mark payruns as paid.
        </div>
      </div>

      {/* Matrix Table */}
      <div className="bg-white rounded-[16px] border border-[#E4E1E5] shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-[#28262D]">
            <thead className="bg-[#FBFAFB] text-[#74717A] uppercase text-[10px] font-bold tracking-wider border-b border-[#E4E1E5]">
              <tr>
                <th className="py-3 px-4">Feature / Capability</th>
                <th className="py-3 px-3 text-center">Employee</th>
                <th className="py-3 px-3 text-center">HR Manager</th>
                <th className="py-3 px-3 text-center">HR Payroll User</th>
                <th className="py-3 px-3 text-center">HR Payroll Manager</th>
                <th className="py-3 px-3 text-center">Admin</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F4F3F5]">
              {MATRIX.map((row, idx) => (
                <tr key={idx} className="hover:bg-[#FBFAFB] transition-colors">
                  <td className="py-3.5 px-4 font-medium text-[#28262D]">
                    <span>{row.capability}</span>
                    <span className="text-[10px] text-[#A4879F] block font-normal">{row.category}</span>
                  </td>

                  <td className="py-3.5 px-3 text-center">
                    {row.employee ? (
                      <span className="inline-flex p-1 rounded-full bg-[#EBF6F0] text-[#438A6B]">
                        <Check className="w-3.5 h-3.5" />
                      </span>
                    ) : (
                      <span className="inline-flex p-1 rounded-full bg-[#F4F3F5] text-[#A4879F]">
                        <Lock className="w-3 h-3" />
                      </span>
                    )}
                  </td>

                  <td className="py-3.5 px-3 text-center">
                    {row.hr_manager ? (
                      <span className="inline-flex p-1 rounded-full bg-[#EBF6F0] text-[#438A6B]">
                        <Check className="w-3.5 h-3.5" />
                      </span>
                    ) : (
                      <span className="inline-flex p-1 rounded-full bg-[#F4F3F5] text-[#A4879F]">
                        <Lock className="w-3 h-3" />
                      </span>
                    )}
                  </td>

                  <td className="py-3.5 px-3 text-center">
                    {row.payroll_user ? (
                      <span className="inline-flex p-1 rounded-full bg-[#EBF6F0] text-[#438A6B]">
                        <Check className="w-3.5 h-3.5" />
                      </span>
                    ) : (
                      <span className="inline-flex p-1 rounded-full bg-[#F4F3F5] text-[#A4879F]">
                        <Lock className="w-3 h-3" />
                      </span>
                    )}
                  </td>

                  <td className="py-3.5 px-3 text-center">
                    {row.payroll_manager ? (
                      <span className="inline-flex p-1 rounded-full bg-[#EBF6F0] text-[#438A6B]">
                        <Check className="w-3.5 h-3.5" />
                      </span>
                    ) : (
                      <span className="inline-flex p-1 rounded-full bg-[#F4F3F5] text-[#A4879F]">
                        <Lock className="w-3 h-3" />
                      </span>
                    )}
                  </td>

                  <td className="py-3.5 px-3 text-center">
                    {row.admin ? (
                      <span className="inline-flex p-1 rounded-full bg-[#EBF6F0] text-[#438A6B]">
                        <Check className="w-3.5 h-3.5" />
                      </span>
                    ) : (
                      <span className="inline-flex p-1 rounded-full bg-[#F4F3F5] text-[#A4879F]">
                        <Lock className="w-3 h-3" />
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
