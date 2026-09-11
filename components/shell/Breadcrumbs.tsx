import React from 'react';
import { ChevronRight, Home } from 'lucide-react';
import { useApp } from '@/lib/context/app-context';

export function Breadcrumbs() {
  const { activeTab, setActiveTab, currentRole } = useApp();

  const getTabLabel = (tab: string) => {
    switch (tab) {
      case 'overview':
        return 'Overview';
      case 'attendance':
        return 'Attendance & Biometrics';
      case 'leave':
        return 'Time Off & Leaves';
      case 'payslips':
        return 'My Payslips';
      case 'profile':
        return 'Employee Profile';
      case 'employees':
        return 'Employees Directory';
      case 'contracts':
        return 'Contracts Management';
      case 'working_schedules':
        return 'Working Schedules';
      case 'approvals':
        return 'HR Approvals Center';
      case 'workforce_insights':
        return 'Workforce Insights';
      case 'payruns':
        return 'Payrun Processing';
      case 'salary_structures':
        return 'Salary Structures';
      case 'salary_rules':
        return 'Salary Rules Engine';
      case 'payroll_dashboard':
        return 'Payroll Dashboard';
      case 'readiness':
        return 'Payroll Readiness';
      case 'reports':
        return 'Payroll & Workforce Reports';
      case 'admin_overview':
        return 'Administration Overview';
      case 'roles_permissions':
        return 'Roles & Permission Matrix';
      case 'biometric_devices':
        return 'Connected Biometric Devices';
      case 'audit_history':
        return 'Security & Audit Logs';
      case 'configuration':
        return 'System Configuration';
      default:
        return tab.charAt(0).toUpperCase() + tab.slice(1);
    }
  };

  const getSection = () => {
    if (['overview', 'attendance', 'leave', 'payslips', 'profile'].includes(activeTab)) {
      return 'Employee Self-Service';
    }
    if (['employees', 'contracts', 'working_schedules', 'approvals', 'workforce_insights'].includes(activeTab)) {
      return 'HR Management';
    }
    if (['payruns', 'salary_structures', 'salary_rules', 'payroll_dashboard', 'readiness', 'reports'].includes(activeTab)) {
      return 'Payroll Operations';
    }
    return 'Enterprise Administration';
  };

  return (
    <nav className="flex items-center gap-1.5 text-xs text-[#74717A] mb-2" aria-label="Breadcrumb">
      <button
        onClick={() => setActiveTab('overview')}
        className="hover:text-[#714B67] flex items-center gap-1 transition-colors"
      >
        <Home className="w-3.5 h-3.5" />
        <span>PeoplePay360</span>
      </button>
      <ChevronRight className="w-3.5 h-3.5 text-[#E4E1E5]" />
      <span>{getSection()}</span>
      <ChevronRight className="w-3.5 h-3.5 text-[#E4E1E5]" />
      <span className="font-semibold text-[#28262D]">{getTabLabel(activeTab)}</span>
    </nav>
  );
}
