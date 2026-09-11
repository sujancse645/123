'use client';

import React, { useState } from 'react';
import { useApp } from '@/lib/context/app-context';
import {
  ShieldAlert,
  Search,
  Filter,
  Download,
  CheckCircle2,
  AlertTriangle,
  Clock,
  User,
  Shield,
} from 'lucide-react';
import { AUDIT_LOGS } from '@/lib/mock-data/devices-and-audit';
import { formatDateTime } from '@/lib/utils';
import { downloadCsv } from '@/lib/exports/file-downloads';

export function AuditTrailView() {
  const { addToast } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  const filteredLogs = AUDIT_LOGS.filter((log) => {
    const matchesSearch =
      log.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.resource.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || log.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const handleExport = () => {
    downloadCsv('PeoplePay360_Audit_Log.csv', ['Timestamp','User','Role','Action','Resource','Category','IP Address','Status'], filteredLogs.map((log) => [log.timestamp,log.userName,log.userRole,log.action,log.resource,log.category,log.ipAddress,log.status]));
    addToast({
      title: 'Audit Trail Exported',
      description: `${filteredLogs.length} visible audit records downloaded as CSV.`,
      type: 'success',
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-[16px] border border-[#E4E1E5] shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-[#28262D] tracking-tight">System Audit Trail</h2>
          <p className="text-xs text-[#74717A] mt-0.5">
            Immutable log of all user activities, payroll validations, attendance punches, and authorization changes.
          </p>
        </div>

        <button
          onClick={handleExport}
          className="px-4 py-2 bg-[#714B67] hover:bg-[#5C3C53] text-white text-xs font-bold rounded-[10px] shadow-xs flex items-center gap-1.5 transition-colors"
        >
          <Download className="w-4 h-4" />
          <span>Export Audit Log</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-[16px] border border-[#E4E1E5] shadow-xs flex flex-col md:flex-row items-center justify-between gap-3 text-xs">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-[#74717A] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by user, action, or resource..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-[#FBFAFB] border border-[#E4E1E5] rounded-[10px] text-xs outline-none focus:border-[#714B67]"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto">
          <span className="text-[#74717A] font-medium shrink-0">Category:</span>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 bg-[#FBFAFB] border border-[#E4E1E5] rounded-[10px] text-xs outline-none text-[#28262D]"
          >
            <option value="all">All Categories</option>
            <option value="auth">Authentication</option>
            <option value="payroll">Payroll Operations</option>
            <option value="attendance">Biometric & Attendance</option>
            <option value="leave">Leave Approvals</option>
            <option value="profile">Profile Updates</option>
            <option value="system">System & Security</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-[16px] border border-[#E4E1E5] shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-[#28262D]">
            <thead className="bg-[#FBFAFB] text-[#74717A] uppercase text-[10px] font-bold tracking-wider border-b border-[#E4E1E5]">
              <tr>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">User & Role</th>
                <th className="py-3 px-4">Action Event</th>
                <th className="py-3 px-4">Resource</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">IP Address</th>
                <th className="py-3 px-4 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F4F3F5]">
              {filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-[#FBFAFB] transition-colors">
                  <td className="py-3.5 px-4 font-mono text-[11px] text-[#74717A] whitespace-nowrap">
                    {formatDateTime(log.timestamp)}
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="font-semibold text-[#28262D]">{log.userName}</span>
                    <span className="text-[10px] text-[#A4879F] block capitalize">
                      {log.userRole.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 font-medium text-[#28262D]">{log.action}</td>
                  <td className="py-3.5 px-4 font-mono text-[11px] text-[#714B67]">{log.resource}</td>
                  <td className="py-3.5 px-4">
                    <span className="capitalize px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#F4F3F5] text-[#714B67]">
                      {log.category}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 font-mono text-[11px] text-[#74717A]">{log.ipAddress}</td>
                  <td className="py-3.5 px-4 text-right">
                    <span
                      className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        log.status === 'success'
                          ? 'bg-[#EBF6F0] text-[#438A6B]'
                          : 'bg-[#FFF6D2] text-[#9A6B0A]'
                      }`}
                    >
                      {log.status === 'success' ? (
                        <CheckCircle2 className="w-3 h-3" />
                      ) : (
                        <AlertTriangle className="w-3 h-3" />
                      )}
                      <span className="capitalize">{log.status}</span>
                    </span>
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
