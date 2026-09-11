'use client';

import React, { useState } from 'react';
import { useApp } from '@/lib/context/app-context';
import {
  FileText,
  Download,
  Printer,
  Building2,
  CheckCircle2,
  CreditCard,
  Layers,
  FileSpreadsheet,
} from 'lucide-react';
import { formatINR } from '@/lib/utils';
import { downloadCsv, downloadReportPdf } from '@/lib/exports/file-downloads';

export function PayrollReportsView() {
  const { payruns, employees, addToast } = useApp();
  const [selectedReport, setSelectedReport] = useState<'disbursal' | 'pf' | 'pt' | 'bank'>('disbursal');

  const totalGross = employees.reduce((sum, e) => sum + (e.baseSalary || 65000), 0);
  const totalEmployeePF = employees.length * 1800;
  const totalEmployerPF = employees.length * 1800;
  const totalPT = employees.length * 200;
  const totalTDS = Math.round(totalGross * 0.04);
  const totalNet = totalGross - totalEmployeePF - totalPT - totalTDS;

  const payrollRows = employees.map((employee) => {
    const gross = employee.baseSalary || 65000;
    return [employee.employeeId,employee.name,employee.departmentName || employee.department,gross,2000,gross-2000,employee.bankAccountMasked || 'MISSING'];
  });
  const handleDownload = (reportName: 'master'|'disbursal'|'pf'|'pt'|'bank') => {
    if (reportName === 'master' || reportName === 'disbursal') {
      downloadCsv(reportName === 'master' ? 'PeoplePay360_Master_Payroll_Aug_2026.csv' : 'Disbursal_Register_Aug_2026.csv', ['Employee ID','Employee Name','Department','Gross Salary','Total Deductions','Net Payable','Bank Details'], payrollRows);
    } else if (reportName === 'bank') {
      downloadCsv('Salary_NEFT_Batch_Aug_2026.csv', ['Employee ID','Employee Name','Account','IFSC','Net Pay','Payment Reference','Narration'], employees.filter((employee) => employee.bankAccountMasked).map((employee,index) => [employee.employeeId,employee.name,employee.bankAccountMasked,employee.ifscCode,(employee.baseSalary||65000)-2000,`PP360-AUG-${String(index+1).padStart(3,'0')}`,'Salary August 2026']));
    } else {
      downloadReportPdf({filename:reportName === 'pf' ? 'EPFO_Form_12A_Aug2026.pdf' : 'PT_Form_5_Aug2026.pdf',title:reportName === 'pf' ? 'EPFO Form 12A - Monthly Return' : 'Professional Tax Form 5',subtitle:'PeoplePay360 · August 2026',headers:['Employee ID','Employee','Department','Contribution'],rows:employees.map((employee) => [employee.employeeId,employee.name,employee.departmentName||employee.department,reportName === 'pf' ? 1800 : 200]),summary:reportName === 'pf' ? [`Employee PF total: INR ${totalEmployeePF}`,`Employer PF total: INR ${totalEmployerPF}`] : [`Professional Tax total: INR ${totalPT}`]});
    }
    addToast({
      title: 'Report Downloaded',
      description: 'The requested file was generated and downloaded successfully.',
      type: 'success',
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-[16px] border border-[#E4E1E5] shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-[#28262D] tracking-tight">Payroll Compliance Reports</h2>
          <p className="text-xs text-[#74717A] mt-0.5">
            Download statutory government schedules (EPF Form 12A, PT Form 5) and bank NEFT payment files.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => handleDownload('master')}
            className="px-4 py-2 bg-[#714B67] hover:bg-[#5C3C53] text-white text-xs font-bold rounded-[10px] shadow-xs flex items-center gap-1.5 transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>Export Master Register</span>
          </button>
        </div>
      </div>

      {/* Report Selector Tabs */}
      <div className="flex items-center gap-2 border-b border-[#E4E1E5] pb-2 text-xs font-semibold overflow-x-auto">
        {[
          { id: 'disbursal', label: 'Monthly Disbursal Register' },
          { id: 'pf', label: 'EPFO Form 12A Schedule' },
          { id: 'pt', label: 'Professional Tax Form 5' },
          { id: 'bank', label: 'Bank Transfer Advice (NEFT/RTGS)' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setSelectedReport(tab.id as any)}
            className={`px-4 py-2 rounded-[10px] whitespace-nowrap transition-all ${
              selectedReport === tab.id
                ? 'bg-[#714B67] text-white shadow-xs'
                : 'text-[#74717A] hover:bg-[#F4F3F5] hover:text-[#28262D]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Report Content */}
      <div className="bg-white rounded-[16px] border border-[#E4E1E5] p-6 shadow-xs space-y-6">
        {/* Disbursal Report */}
        {selectedReport === 'disbursal' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-[#28262D]">Monthly Salary Disbursal Register</h3>
                <p className="text-xs text-[#74717A]">For Pay Period: August 2026</p>
              </div>
              <button
                onClick={() => handleDownload('disbursal')}
                className="px-3 py-1.5 rounded-[8px] border border-[#E4E1E5] hover:bg-[#F4F3F5] text-xs font-medium text-[#28262D] flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5 text-[#714B67]" />
                <span>CSV / Excel</span>
              </button>
            </div>

            <div className="border border-[#E4E1E5] rounded-[12px] overflow-x-auto text-xs">
              <table className="w-full text-left">
                <thead className="bg-[#FBFAFB] text-[#74717A] border-b border-[#E4E1E5] text-[10px] uppercase font-bold">
                  <tr>
                    <th className="py-2.5 px-3">Emp ID</th>
                    <th className="py-2.5 px-3">Employee Name</th>
                    <th className="py-2.5 px-3">Department</th>
                    <th className="py-2.5 px-3">Gross Salary</th>
                    <th className="py-2.5 px-3">Total Deductions</th>
                    <th className="py-2.5 px-3">Net Payable</th>
                    <th className="py-2.5 px-3">Bank Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F4F3F5]">
                  {employees.map((e) => {
                    const gross = e.baseSalary || 65000;
                    return (
                      <tr key={e.id} className="hover:bg-[#FBFAFB]">
                        <td className="py-2.5 px-3 font-mono text-[#714B67]">{e.employeeId}</td>
                        <td className="py-2.5 px-3 font-semibold text-[#28262D]">{e.name}</td>
                        <td className="py-2.5 px-3 text-[#74717A]">{e.departmentName || e.department}</td>
                        <td className="py-2.5 px-3 tabular-nums font-medium">{formatINR(gross)}</td>
                        <td className="py-2.5 px-3 tabular-nums text-[#C85A54]">-₹2,000</td>
                        <td className="py-2.5 px-3 tabular-nums font-bold text-[#28262D]">
                          {formatINR(gross - 2000)}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-[11px] text-[#74717A]">{e.bankAccountMasked}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* EPF Form 12A */}
        {selectedReport === 'pf' && (
          <div className="space-y-4 text-xs">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-[#28262D]">EPFO Form 12A - Revised Monthly Return</h3>
                <p className="text-xs text-[#74717A]">Under Employees&apos; Provident Funds & Misc Provisions Act, 1952</p>
              </div>
              <button
                onClick={() => handleDownload('pf')}
                className="px-3 py-1.5 rounded-[8px] bg-[#714B67] text-white text-xs font-semibold flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download EPFO Form 12A</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 rounded-[14px] bg-[#FBFAFB] border border-[#E4E1E5]">
              <div>
                <span className="text-[10px] uppercase font-bold text-[#74717A] block">
                  Employee PF Share (12%)
                </span>
                <strong className="text-base font-bold text-[#28262D] tabular-nums">
                  {formatINR(totalEmployeePF)}
                </strong>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-[#74717A] block">
                  Employer PF Share (12%)
                </span>
                <strong className="text-base font-bold text-[#28262D] tabular-nums">
                  {formatINR(totalEmployerPF)}
                </strong>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-[#74717A] block">
                  Total EPFO Remittance
                </span>
                <strong className="text-base font-extrabold text-[#714B67] tabular-nums">
                  {formatINR(totalEmployeePF + totalEmployerPF)}
                </strong>
              </div>
            </div>
          </div>
        )}

        {/* PT Form 5 */}
        {selectedReport === 'pt' && (
          <div className="space-y-4 text-xs">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-[#28262D]">Professional Tax (PT) Form 5 Monthly Statement</h3>
                <p className="text-xs text-[#74717A]">Karnataka Professional Tax Assessment (Act of 1976)</p>
              </div>
              <button
                onClick={() => handleDownload('pt')}
                className="px-3 py-1.5 rounded-[8px] bg-[#714B67] text-white text-xs font-semibold flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export PT Form 5</span>
              </button>
            </div>

            <div className="p-4 rounded-[14px] bg-[#FBFAFB] border border-[#E4E1E5] flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold text-[#74717A] block">
                  Total Assessed Staff
                </span>
                <strong className="text-base font-bold text-[#28262D]">12 Employees @ ₹200/mo</strong>
              </div>
              <div className="text-right">
                <span className="text-[10px] uppercase font-bold text-[#74717A] block">
                  Total Tax Remitted to Commercial Taxes Dept
                </span>
                <strong className="text-base font-extrabold text-[#714B67] tabular-nums">
                  {formatINR(totalPT)}
                </strong>
              </div>
            </div>
          </div>
        )}

        {/* Bank Transfer Advice */}
        {selectedReport === 'bank' && (
          <div className="space-y-4 text-xs">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-[#28262D]">Corporate Bank Salary Transfer Advice</h3>
                <p className="text-xs text-[#74717A]">RBI NEFT / RTGS Batch Upload File (Standard HDFC / ICICI Format)</p>
              </div>
              <button
                onClick={() => handleDownload('bank')}
                className="px-3 py-1.5 rounded-[8px] bg-[#438A6B] text-white text-xs font-bold flex items-center gap-1.5 shadow-xs"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download Bank CSV</span>
              </button>
            </div>

            <div className="p-4 rounded-[14px] bg-[#FBFAFB] border border-[#E4E1E5] space-y-2 font-mono text-[11px] text-[#28262D]">
              <div className="text-[#74717A]">
                # Corporate Batch Identifier: PP360-SAL-20260831 | Total Records: 12
              </div>
              {employees.slice(0, 4).map((e, idx) => (
                <div key={e.id} className="p-1.5 bg-white rounded border border-[#E4E1E5] truncate">
                  {idx + 1}|HDFC0000240|{e.bankAccountMasked.replace(/•/g, '9')}|{(e.baseSalary || 65000) - 2000}|INR|{e.name}|SALARY-AUG-2026
                </div>
              ))}
              <div className="text-[#A4879F] italic">+ 8 additional employee records</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
