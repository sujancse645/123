'use client';

import React from 'react';
import { AppProvider, useApp } from '@/lib/context/app-context';
import { Sidebar } from '@/components/shell/Sidebar';
import { Header } from '@/components/shell/Header';
import { MobileNav, MobileDrawer } from '@/components/shell/MobileNav';
import { ToastContainer } from '@/components/shared/ToastContainer';
import { AttendanceVerificationModal } from '@/components/attendance/AttendanceVerificationModal';
import { CorrectionRequestModal } from '@/components/attendance/CorrectionRequestModal';
import { LeaveRequestModal } from '@/components/leave/LeaveRequestModal';

// Feature Views
import { EmployeeOverview } from '@/components/dashboard/EmployeeOverview';
import { AttendanceView } from '@/components/attendance/AttendanceView';
import { LeaveView } from '@/components/leave/LeaveView';
import { EmployeePayslipsView } from '@/components/payslips/EmployeePayslipsView';
import { ProfileView } from '@/components/profile/ProfileView';

// HR Operations
import { EmployeesDirectoryView } from '@/components/hr/EmployeesDirectoryView';
import { ContractsView } from '@/components/hr/ContractsView';
import { WorkingSchedulesView } from '@/components/hr/WorkingSchedulesView';
import { ApprovalsCenterView } from '@/components/hr/ApprovalsCenterView';
import { WorkforceInsightsView } from '@/components/hr/WorkforceInsightsView';

// Payroll
import { PayrollDashboardView } from '@/components/payroll/PayrollDashboardView';
import { PayrunsView } from '@/components/payroll/PayrunsView';
import { SalaryStructuresView } from '@/components/payroll/SalaryStructuresView';
import { SalaryRulesView } from '@/components/payroll/SalaryRulesView';
import { PayrollReadinessView } from '@/components/payroll/PayrollReadinessView';
import { PayrollReportsView } from '@/components/payroll/PayrollReportsView';
import { OvertimePolicyView } from '@/components/payroll/OvertimePolicyView';

// Admin & Security
import { BiometricDevicesView } from '@/components/admin/BiometricDevicesView';
import { AuditTrailView } from '@/components/admin/AuditTrailView';
import { RolePermissionsMatrixView } from '@/components/admin/RolePermissionsMatrixView';

// New Enterprise Modules
import { MyLoansView } from '@/components/loans/MyLoansView';
import { EmployeeLoansManagementView } from '@/components/loans/EmployeeLoansManagementView';
import { MedicalProofsQueueView } from '@/components/medical-proof/MedicalProofsQueueView';
import { PeoplePayLogo } from '@/components/brand/PeoplePayLogo';

function MainContent() {
  const { activeTab,dataLoading,authenticated } = useApp();

  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = React.useState(false);

  if(authenticated&&dataLoading){return <main className="grid min-h-screen place-items-center bg-[#FBFAFB] p-6" aria-busy="true"><div className="flex flex-col items-center gap-3 text-center"><PeoplePayLogo size={44}/><p className="text-sm font-semibold text-[#714B67]">Loading your workspace…</p><div className="h-6 w-6 animate-spin rounded-full border-2 border-[#714B67] border-t-transparent"/></div></main>}

  const renderCurrentView = () => {
    switch (activeTab) {
      // Employee Self-Service
      case 'overview':
        return <EmployeeOverview />;
      case 'attendance':
        return <AttendanceView />;
      case 'leave':
        return <LeaveView />;
      case 'my_loans':
      case 'loans':
        return <MyLoansView />;
      case 'payslips':
        return <EmployeePayslipsView />;
      case 'profile':
        return <ProfileView />;

      // HR Operations
      case 'employees':
        return <EmployeesDirectoryView />;
      case 'contracts':
        return <ContractsView />;
      case 'working_schedules':
      case 'schedules':
        return <WorkingSchedulesView />;
      case 'medical_proofs':
      case 'leave_proofs':
        return <MedicalProofsQueueView />;
      case 'approvals':
        return <ApprovalsCenterView />;
      case 'workforce_insights':
      case 'insights':
        return <WorkforceInsightsView />;

      // Payroll Operations
      case 'payroll_dashboard':
        return <PayrollDashboardView />;
      case 'payruns':
        return <PayrunsView />;
      case 'company_loans':
      case 'employee_loans':
      case 'loan_management':
        return <EmployeeLoansManagementView />;
      case 'salary_structures':
        return <SalaryStructuresView />;
      case 'salary_rules':
        return <SalaryRulesView />;
      case 'overtime_policy':
        return <OvertimePolicyView />;
      case 'readiness':
      case 'payroll_readiness':
        return <PayrollReadinessView />;
      case 'reports':
      case 'payroll_reports':
        return <PayrollReportsView />;

      // Admin & Security
      case 'admin_overview':
      case 'roles_permissions':
      case 'role_permissions':
        return <RolePermissionsMatrixView />;
      case 'biometric_devices':
        return <BiometricDevicesView />;
      case 'audit_history':
      case 'audit_trail':
        return <AuditTrailView />;

      default:
        return <EmployeeOverview />;
    }
  };

  return (
    <div className="min-h-screen bg-[#FBFAFB] text-[#28262D] flex flex-col md:flex-row antialiased">
      {/* Desktop Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 pb-16 md:pb-8">
        <Header onToggleMobileMenu={() => setIsMobileDrawerOpen(true)} />

        <main className="flex-1 p-4 md:p-8 max-w-7xl w-full mx-auto">
          {renderCurrentView()}
        </main>
      </div>

      {/* Mobile Navigation Bar & Drawer */}
      <MobileNav />
      <MobileDrawer
        isOpen={isMobileDrawerOpen}
        onClose={() => setIsMobileDrawerOpen(false)}
      />

      {/* Toast Notification Container */}
      <ToastContainer />

      {/* Global Modals & Drawers */}
      <AttendanceVerificationModal />
      <CorrectionRequestModal />
      <LeaveRequestModal />
    </div>
  );
}

const emptySubscribe = () => () => {};

export default function PeoplePayApp({ authenticatedSession }: { authenticatedSession?: import('@/components/auth/AuthenticatedPeoplePayApp').AuthenticatedSession }) {
  const isMounted = React.useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );

  if (!isMounted) {
    return (
      <div className="min-h-screen bg-[#FBFAFB] text-[#28262D] flex items-center justify-center p-6">
        <div className="flex flex-col items-center gap-4 text-center">
          <PeoplePayLogo size={48} />
          <div>
            <h1 className="text-base font-bold text-[#28262D]">PeoplePay360</h1>
            <p className="text-xs text-[#74717A] mt-1">Initializing enterprise workspace...</p>
          </div>
          <div className="w-6 h-6 rounded-full border-2 border-[#714B67] border-t-transparent animate-spin mt-2" />
        </div>
      </div>
    );
  }

  return (
    <AppProvider authenticatedSession={authenticatedSession}>
      <MainContent />
    </AppProvider>
  );
}
