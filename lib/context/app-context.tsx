'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import {
  User,
  AppRole,
  Employee,
  AttendanceRecord,
  LeaveRequest,
  Payrun,
  Payslip,
  SalaryStructure,
  SalaryRule,
  AppNotification,
  ProfileUpdateRequest,
  AttendanceCorrectionRequest,
  PayrunStatus,
  BiometricDevice,
  AttendanceLocationCapture,
  LeaveType,
} from '@/lib/types';
import { DEMO_USERS } from '@/lib/mock-data/users';
import { EMPLOYEES } from '@/lib/mock-data/employees';
import { INITIAL_ATTENDANCE } from '@/lib/mock-data/attendance';
import { getActiveLocalInvitation,isLocalOnboardingComplete,logLocalFallback,readLocalData,writeLocalData } from '@/lib/demo/local-fallback';
import { INITIAL_LEAVE_REQUESTS } from '@/lib/mock-data/leaves';
import { LEAVE_TYPES } from '@/lib/mock-data/leaves';
import {
  INITIAL_PAYRUNS,
  INITIAL_PAYSLIPS,
  ALL_INITIAL_PAYSLIPS,
  SALARY_STRUCTURES,
  SALARY_RULES,
} from '@/lib/mock-data/payroll';
import {
  INITIAL_NOTIFICATIONS,
  INITIAL_PROFILE_REQUESTS,
  INITIAL_CORRECTION_REQUESTS,
  BIOMETRIC_DEVICES,
} from '@/lib/mock-data/devices-and-audit';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { assertPayrollCanFinalize } from '@/lib/domain/peoplepay-calculations';
import type { AuthenticatedSession } from '@/components/auth/AuthenticatedPeoplePayApp';
import { peoplePayQueries } from '@/lib/supabase/peoplepay360_supabase_queries';

export interface ToastMessage {
  id: string;
  type: 'success' | 'warning' | 'error' | 'info';
  title: string;
  message: string;
}

const attendanceMinutes=(checkIn:string|null|undefined,checkOut:string|null|undefined,fallback=0)=>{if(!checkIn||!checkOut)return fallback;const start=new Date(checkIn).getTime(),end=new Date(checkOut).getTime();return Number.isFinite(start)&&Number.isFinite(end)&&end>=start?Math.round((end-start)/60000):fallback;};

const readPayslipsWithSamples = () => {
  const stored = readLocalData<Payslip[]>('payslips', []);
  const storedIds = new Set(stored.map(payslip => payslip.id));
  return [...stored, ...ALL_INITIAL_PAYSLIPS.filter(payslip => !storedIds.has(payslip.id))];
};

interface AppContextType {
  currentUser: User;
  currentRole: AppRole;
  setCurrentUser: (user: User) => void;
  switchRole: (role: AppRole) => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  selectedEmployeeId: string | null;
  setSelectedEmployeeId: (id: string | null) => void;
  employees: Employee[];
  createLocalEmployee: (input: { name: string; email: string; joiningDate: string; employeeType: Employee['employeeType']; departmentId: string; departmentName: string; jobPosition: string; baseSalary: number; monthlySalaryGross: number; salaryStructureName: string; workingScheduleId: string; workingScheduleName: string }) => Employee;
  attendanceRecords: AttendanceRecord[];
  leaveRequests: LeaveRequest[];
  leaveTypes: LeaveType[];
  profileRequests: ProfileUpdateRequest[];
  correctionRequests: AttendanceCorrectionRequest[];
  payruns: Payrun[];
  payslips: Payslip[];
  salaryStructures: SalaryStructure[];
  salaryRules: SalaryRule[];
  notifications: AppNotification[];
  biometricDevices: BiometricDevice[];
  toasts: ToastMessage[];
  addToast: (
    typeOrObj: 'success' | 'warning' | 'error' | 'info' | { type?: 'success' | 'warning' | 'error' | 'info'; title: string; message?: string; description?: string },
    title?: string,
    message?: string
  ) => void;
  showToast: (type: 'success' | 'warning' | 'error' | 'info', titleOrMessage: string, message?: string) => void;
  removeToast: (id: string) => void;

  // Modal controls
  isCheckInModalOpen: boolean;
  setIsCheckInModalOpen: (open: boolean) => void;
  isSalaryDrawerOpen: boolean;
  setIsSalaryDrawerOpen: (open: boolean) => void;
  isDeductionModalOpen: boolean;
  setIsDeductionModalOpen: (open: boolean) => void;
  isRoleSwitcherOpen: boolean;
  setIsRoleSwitcherOpen: (open: boolean) => void;
  isLeaveModalOpen: boolean;
  setIsLeaveModalOpen: (open: boolean) => void;
  isCorrectionModalOpen: boolean;
  setIsCorrectionModalOpen: (open: boolean) => void;
  isPayrunWizardOpen: boolean;
  setIsPayrunWizardOpen: (open: boolean) => void;
  isExplainSalaryDiffOpen: boolean;
  setIsExplainSalaryDiffOpen: (open: boolean) => void;
  selectedPayslip: Payslip | null;
  setSelectedPayslip: (payslip: Payslip | null) => void;
  selectedAttendanceDate: string | null;
  setSelectedAttendanceDate: (date: string | null) => void;
  selectedPayrun: Payrun | null;
  setSelectedPayrun: (payrun: Payrun | null) => void;

  // Real-time actions
  currentEmployee: Employee;
  updateCurrentEmployeePhoto: (photoUrl:string) => void;
  handleCheckInOut: (method: 'face' | 'biometric' | 'manual', location?: AttendanceLocationCapture) => void;
  markAttendancePresentRange: (startDate: string, endDate: string) => void;
  submitLeaveRequest: (request: Partial<LeaveRequest>) => void;
  createEmployeeLeaveRequest: (employeeId: string, request: Partial<LeaveRequest>) => void;
  createLeaveType: (leaveType: Omit<LeaveType, 'id'>) => void;
  allocateLeave: (employeeId: string, leaveTypeId: string, days: number) => void;
  approveLeaveRequest: (id: string) => void;
  refuseLeaveRequest: (id: string, reason?: string) => void;
  approveProfileRequest: (id: string) => void;
  refuseProfileRequest: (id: string) => void;
  submitProfileUpdateRequest: (field: ProfileUpdateRequest['field'], label: string, currentVal: string, newVal: string) => void;
  approveCorrectionRequest: (id: string) => void;
  refuseCorrectionRequest: (id: string) => void;
  submitCorrectionRequest: (date: string, inTime: string, outTime: string, reason: string) => void;
  updatePayrunStatus: (payrunId: string, status: PayrunStatus) => void;
  createPayrun: (payrun: Partial<Payrun>) => void;
  createPayslip: (payslip: Partial<Payslip>) => void;
  addSalaryRule: (rule: Omit<SalaryRule, 'id'>) => void;
  updateSalaryRule: (id: string, rule: Partial<SalaryRule>) => void;
  deleteSalaryRule: (id: string) => void;
  addSalaryStructure: (structure: Omit<SalaryStructure, 'id'>) => void;
  updateSalaryStructure: (id: string, structure: Partial<SalaryStructure>) => void;
  markNotificationRead: (id: string) => void;
  clearAllNotifications: () => void;

  // Auth state
  authenticated: boolean;
  companyId: string | null;
  signOut: () => void;
  dataLoading: boolean;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

/**
 * Build a User object from a Supabase-authenticated session.
 * Falls back to demo users when no session is available.
 */
function buildUserFromSession(session: AuthenticatedSession, roles: AppRole[]): User {
  const highestRole = getHighestRole(roles);
  const roleTitles: Record<AppRole, string> = {
    employee: 'Employee',
    hr_manager: 'HR Manager',
    payroll_user: 'Payroll User',
    payroll_manager: 'Payroll Manager',
    admin: 'Admin',
  };
  return {
    id: session.userId,
    name: session.fullName,
    email: session.email,
    role: highestRole,
    roleTitle: roleTitles[highestRole],
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    employeeId: session.employeeId,
    department: '',
    jobPosition: '',
  };
}

function getHighestRole(roles: AppRole[]): AppRole {
  const priority: AppRole[] = ['admin', 'payroll_manager', 'payroll_user', 'hr_manager', 'employee'];
  for (const role of priority) {
    if (roles.includes(role)) return role;
  }
  return 'employee';
}

export function AppProvider({
  children,
  authenticatedSession,
}: {
  children: React.ReactNode;
  authenticatedSession?: AuthenticatedSession;
}) {
  const isAuthenticated = !!authenticatedSession;
  const client = getSupabaseBrowserClient();

  // Build initial user from session or fall back to demo
  const initialUser = authenticatedSession
    ? buildUserFromSession(authenticatedSession, authenticatedSession.roles)
    : DEMO_USERS[0];

  const [currentUser, setCurrentUserState] = useState<User>(initialUser);
  const [dataLoading, setDataLoading] = useState(isAuthenticated);

  // Determine initial tab from URL
  const [activeTab, setActiveTab] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      return params.get('view') || 'overview';
    }
    return 'overview';
  });
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);

  // State — start with mock data; replace with Supabase data when authenticated
  const [employees, setEmployees] = useState<Employee[]>(()=>isAuthenticated?EMPLOYEES.map(employee=>({...employee,currentAttendanceStatus:'checked_out' as const,todayCheckInTime:null,todayCheckOutTime:null})):readLocalData('employees',EMPLOYEES.map(employee=>({...employee,currentAttendanceStatus:'checked_out' as const,todayCheckInTime:null,todayCheckOutTime:null}))));
  // Never expose demo attendance while an authenticated Supabase session is loading.
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>(()=>isAuthenticated?[]:INITIAL_ATTENDANCE);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>(()=>isAuthenticated?INITIAL_LEAVE_REQUESTS:readLocalData('leave-requests',INITIAL_LEAVE_REQUESTS));
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>(()=>isAuthenticated?LEAVE_TYPES:readLocalData('leave-types',LEAVE_TYPES));
  const [profileRequests, setProfileRequests] = useState<ProfileUpdateRequest[]>(INITIAL_PROFILE_REQUESTS);
  const [correctionRequests, setCorrectionRequests] = useState<AttendanceCorrectionRequest[]>(INITIAL_CORRECTION_REQUESTS);
  const [payruns, setPayruns] = useState<Payrun[]>(INITIAL_PAYRUNS);
  const [payslips, setPayslips] = useState<Payslip[]>(()=>isAuthenticated?ALL_INITIAL_PAYSLIPS:readPayslipsWithSamples());
  const [salaryStructures, setSalaryStructures] = useState<SalaryStructure[]>(SALARY_STRUCTURES);
  const [salaryRules, setSalaryRules] = useState<SalaryRule[]>(SALARY_RULES);
  const [notifications, setNotifications] = useState<AppNotification[]>(INITIAL_NOTIFICATIONS);
  const [biometricDevices, setBiometricDevices] = useState<BiometricDevice[]>(BIOMETRIC_DEVICES);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  useEffect(()=>{if(isAuthenticated)return;writeLocalData('leave-requests',leaveRequests)},[isAuthenticated,leaveRequests]);
  useEffect(()=>{if(isAuthenticated)return;writeLocalData('leave-types',leaveTypes)},[isAuthenticated,leaveTypes]);
  useEffect(()=>{if(isAuthenticated)return;writeLocalData('payslips',payslips)},[isAuthenticated,payslips]);
  useEffect(()=>{if(isAuthenticated)return;writeLocalData('employees',employees)},[isAuthenticated,employees]);

  useEffect(()=>{if(isAuthenticated)return;queueMicrotask(()=>{const invitation=getActiveLocalInvitation();if(!invitation)return;const profile=invitation.profile??{};const employeeCode=`DEMO-${invitation.token.slice(0,6).toUpperCase()}`;const employeeType:Employee['employeeType']=invitation.employmentCategory==='intern'?'intern':invitation.employmentCategory==='contractor'?'contractor':'full_time';const localEmployee:Employee={...EMPLOYEES[0],id:`local-${invitation.token}`,employeeId:employeeCode,name:String(profile.fullName||invitation.fullName),email:invitation.personalEmail,personalEmail:String(profile.personalEmail||invitation.personalEmail),phone:String(profile.phone||''),joiningDate:invitation.joiningDate,employeeType,currentAttendanceStatus:'checked_out',todayCheckInTime:null,todayCheckOutTime:null,bankAccountMasked:profile.bankLast4?`•••• •••• ${profile.bankLast4}`:'',ifscCode:String(profile.ifscCode||'')};setEmployees(previous=>[localEmployee,...previous.filter(employee=>employee.id!==localEmployee.id)]);setCurrentUserState(previous=>({...previous,id:`local-user-${invitation.token}`,name:localEmployee.name,email:localEmployee.email,employeeId:employeeCode,avatar:localEmployee.avatar,role:'employee',roleTitle:'Employee'}))})},[isAuthenticated]);

  // Dialog & drawer states
  const [isCheckInModalOpen, setIsCheckInModalOpen] = useState<boolean>(false);
  const [isSalaryDrawerOpen, setIsSalaryDrawerOpen] = useState<boolean>(false);
  const [isDeductionModalOpen, setIsDeductionModalOpen] = useState<boolean>(false);
  const [isRoleSwitcherOpen, setIsRoleSwitcherOpen] = useState<boolean>(false);
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState<boolean>(false);
  const [isCorrectionModalOpen, setIsCorrectionModalOpen] = useState<boolean>(false);
  const [isPayrunWizardOpen, setIsPayrunWizardOpen] = useState<boolean>(false);
  const [isExplainSalaryDiffOpen, setIsExplainSalaryDiffOpen] = useState<boolean>(false);
  const [selectedPayslip, setSelectedPayslip] = useState<Payslip | null>(ALL_INITIAL_PAYSLIPS[0]);
  const [selectedAttendanceDate, setSelectedAttendanceDate] = useState<string | null>(null);
  const [selectedPayrun, setSelectedPayrun] = useState<Payrun | null>(INITIAL_PAYRUNS[1]);

  // --- Supabase data loading for authenticated sessions ---
  useEffect(() => {
    if (!isAuthenticated || !client || !authenticatedSession) return;
    let cancelled = false;

    async function loadData() {
      try {
        const companyId = authenticatedSession!.companyId;

        // Load employees
        const { data: empData } = await client!.from('employees').select(`
          id, company_id, user_id, employee_code, full_name, company_email, phone,
          department_id, position_id, manager_id, joining_date, exit_date, status,
          work_location, profile_photo_path
        `).eq('company_id', companyId);

        // Load departments
        const { data: deptData } = await client!.from('departments').select('*').eq('company_id', companyId);

        // Load positions
        const { data: posData } = await client!.from('job_positions').select('*').eq('company_id', companyId);

        // Load contracts
        const { data: contractData } = await client!.from('contracts').select('*').eq('company_id', companyId);

        // Load attendance for recent 30 days
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const { data: attendanceData,error:attendanceError } = await client!.from('attendance_records').select('*')
          .eq('company_id', companyId)
          .order('created_at', { ascending: false });
        if(attendanceError){logLocalFallback('attendance','history_loaded_locally',{companyId},attendanceError);setAttendanceRecords(INITIAL_ATTENDANCE);}

        // Load leave requests
        const { data: leaveData } = await client!.from('leave_requests').select('*')
          .eq('company_id', companyId)
          .order('created_at', { ascending: false });

        // Load leave types
        const { data: leaveTypes } = await client!.from('leave_types').select('*').eq('company_id', companyId);

        // Load payruns
        const { data: payrunData } = await client!.from('pay_runs').select('*').eq('company_id', companyId).order('created_at', { ascending: false });

        // Load payslips
        const { data: payslipData } = await client!.from('payslips').select('*').eq('company_id', companyId).order('created_at', { ascending: false });

        // Load salary structures
        const { data: structData } = await client!.from('salary_structures').select('*').eq('company_id', companyId);

        // Load rules separately because each persisted rule belongs to a structure.
        const { data: ruleData } = await client!.from('salary_rules').select('*').eq('company_id', companyId).order('sequence');

        if (ruleData && ruleData.length > 0) {
          setSalaryRules(ruleData.map(rule => ({
            id: rule.id,
            name: rule.name,
            code: rule.code,
            category: rule.code === 'BASIC' ? 'basic' : rule.category === 'earning' ? 'allowance' : rule.category === 'deduction' ? 'deduction' : 'allowance',
            calculationType: rule.calculation_method === 'percentage' ? 'percentage' : rule.calculation_method === 'fixed' ? 'fixed' : 'formula',
            fixedAmount: rule.fixed_amount === null ? undefined : Number(rule.fixed_amount),
            percentage: rule.percentage === null ? undefined : Number(rule.percentage) * 100,
            baseRuleCode: rule.percentage_base || undefined,
            isActive: rule.is_active,
            active: rule.is_active,
          })));
        }

        // Load notifications
        const notifData = authenticatedSession?.userId
          ? (await client!.from('notifications').select('*').eq('user_id', authenticatedSession.userId).order('created_at', { ascending: false })).data
          : null;

        if (cancelled) return;

        // Map employees to frontend format
        if (empData && deptData && posData) {
          const deptMap = new Map(deptData.map(d => [d.id, d]));
          const posMap = new Map(posData.map(p => [p.id, p]));
          const empMap = new Map(empData.map(e => [e.id, e]));
          const activeContractMap = new Map(
            (contractData || []).filter(c => c.is_active || c.status === 'running')
              .map(c => [c.employee_id, c])
          );

          const mappedEmployees: Employee[] = empData.map(emp => {
            const dept = emp.department_id ? deptMap.get(emp.department_id) : null;
            const pos = emp.position_id ? posMap.get(emp.position_id) : null;
            const mgr = emp.manager_id ? empMap.get(emp.manager_id) : null;
            const contract = activeContractMap.get(emp.id);

            // Determine today's attendance
            const todayStr = new Date().toISOString().split('T')[0];
            const todayAtt = (attendanceData || []).find(
              a => a.employee_id === emp.id && (a.work_date === todayStr || a.date === todayStr)
            );

            let attStatus: Employee['currentAttendanceStatus'] = 'checked_out';
            let checkInTime: string | null = null;
            let checkOutTime: string | null = null;
            if (todayAtt) {
              const cIn = todayAtt.check_in_at || todayAtt.check_in;
              const cOut = todayAtt.check_out_at || todayAtt.check_out;
              checkInTime = cIn ? new Date(cIn).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }) : null;
              checkOutTime = cOut ? new Date(cOut).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }) : null;
              attStatus = cOut ? 'checked_out' : 'checked_in';
            }

            // Check leave
            const onLeave = (leaveData || []).some(l =>
              l.employee_id === emp.id &&
              l.status === 'approved' &&
              l.start_date <= todayStr &&
              l.end_date >= todayStr
            );
            if (onLeave) attStatus = 'on_leave';

            return {
              id: emp.id,
              employeeId: emp.employee_code,
              name: emp.full_name,
              avatar: emp.profile_photo_path || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
              email: emp.company_email,
              phone: emp.phone || '',
              personalEmail: '',
              address: '',
              jobPosition: pos?.title || '',
              departmentId: emp.department_id || '',
              departmentName: dept?.name || '',
              reportingManagerId: emp.manager_id || '',
              reportingManagerName: mgr?.full_name || '',
              joiningDate: emp.joining_date,
              employmentStatus: emp.status === 'active' ? 'active' : emp.status === 'onboarding' ? 'probation' : emp.status === 'notice' ? 'notice' : 'archived',
              employeeType: 'full_time',
              currentAttendanceStatus: attStatus,
              todayCheckInTime: checkInTime,
              todayCheckOutTime: checkOutTime,
              bankAccountMasked: '',
              ifscCode: '',
              panNumber: '',
              emergencyContact: { name: '', relation: '', phone: '' },
              activeContractId: contract?.id || '',
              workingScheduleId: contract?.working_schedule_id || '',
              workingScheduleName: '',
              paidLeaveBalance: 0,
              unpaidLeaveTaken: 0,
              pendingRequestsCount: 0,
              attendanceException: false,
              baseSalary: contract ? Number(contract.basic_salary) : 0,
            };
          });
          setEmployees(mappedEmployees);

          // Update current user details from DB employee record if matching
          const currentEmp = mappedEmployees.find(e => e.id === authenticatedSession?.employeeId || e.email === authenticatedSession?.email);
          if (currentEmp) {
            setCurrentUserState(prev => ({
              ...prev,
              name: currentEmp.name,
              employeeId: currentEmp.employeeId,
              department: currentEmp.departmentName,
              jobPosition: currentEmp.jobPosition,
            }));
          }
        }

        // Map attendance to frontend format
        if (attendanceData) {
          const mappedAttendance: AttendanceRecord[] = attendanceData.map(att => {
            const attDate = att.work_date || att.date || '';
            const cIn = att.check_in_at || att.check_in;
            const cOut = att.check_out_at || att.check_out;
            const storedMinutes = att.worked_minutes ?? (att.total_hours ? att.total_hours * 60 : 0);
            const wMins = attendanceMinutes(cIn,cOut,storedMinutes);
            const oMins = cIn&&cOut?Math.max(0,wMins-8*60):(att.overtime_minutes ?? (att.overtime_hours ? att.overtime_hours * 60 : 0));
            const method = att.check_in_method || att.location || 'manual';
            const notes = att.notes || att.remarks || '';

            return {
              id: att.id,
              employeeId: att.employee_id,
              employeeName: empData?.find(e => e.id === att.employee_id)?.full_name || '',
              date: attDate,
              checkIn: cIn ? new Date(cIn).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }) : null,
              checkOut: cOut ? new Date(cOut).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }) : null,
              workedHours: wMins / 60,
              overtimeHours: oMins / 60,
              status: (att.status as any) || 'present',
              verificationMethod: (method as any) || 'manual',
              exceptionStatus: 'normal',
              notes: notes,
            };
          });
          setAttendanceRecords(mappedAttendance);
        }

        // Map leave requests
        if (leaveData && leaveTypes) {
          setLeaveTypes(leaveTypes.map(lt => ({
            id: lt.id,
            name: lt.name,
            code: lt.code,
            isPaid: lt.is_paid,
            defaultDaysPerYear: Number(lt.annual_allocation || 0),
            totalDays: Number(lt.annual_allocation || 0),
            remainingDays: Number(lt.annual_allocation || 0),
            color: lt.is_paid ? '#714B67' : '#C85A54',
            description: '',
          })));
          const ltMap = new Map(leaveTypes.map(lt => [lt.id, lt]));
          const mappedLeaves: LeaveRequest[] = leaveData.map(lr => {
            const lt = ltMap.get(lr.leave_type_id);
            return {
              id: lr.id,
              employeeId: lr.employee_id,
              employeeName: empData?.find(e => e.id === lr.employee_id)?.full_name || '',
              leaveTypeId: lr.leave_type_id,
              leaveTypeName: lt?.name || '',
              isPaid: lt?.is_paid ?? true,
              startDate: lr.start_date,
              endDate: lr.end_date,
              isHalfDay: false,
              reason: lr.reason,
              calendarDays: lr.requested_days,
              excludedWeekends: 0,
              excludedHolidays: 0,
              chargeableWorkingDays: lr.total_chargeable_days || lr.requested_days,
              paidDaysUsed: lt?.is_paid ? lr.requested_days : 0,
              unpaidDays: lt?.is_paid ? 0 : lr.requested_days,
              estimatedDeduction: Number(lr.estimated_unpaid_deduction || 0),
              estimatedNetSalaryAfter: 0,
              approverId: lr.approver_id || '',
              approverName: '',
              status: lr.status as any,
              appliedDate: lr.created_at?.split('T')[0] || '',
              rejectionReason: lr.rejection_reason || undefined,
              rejectedBy: lr.rejected_by || undefined,
              rejectedAt: lr.rejected_at?.split('T')[0] || undefined,
              sandwichDays: lr.sandwich_days || 0,
              normalWorkingDays: lr.normal_working_days || undefined,
            };
          });
          setLeaveRequests(mappedLeaves);
        }

        // Map payruns
        if (payrunData && payrunData.length > 0) {
          const mappedPayruns: Payrun[] = payrunData.map(pr => ({
            id: pr.id,
            name: pr.name || `Payrun ${pr.period_start}`,
            reference: `PR-${pr.period_start.replace(/-/g, '')}`,
            salaryStructureId: '00000000-0000-0000-0000-000000000002',
            salaryStructureName: 'Standard Executive Salary Structure',
            startDate: pr.period_start,
            endDate: pr.period_end,
            status: pr.status === 'finalized' ? 'paid' : (pr.status as any) || 'draft',
            employeeCount: pr.employee_count || pr.total_employees || 0,
            grossTotal: Number(pr.total_gross || 0),
            totalDeductions: Number(pr.total_deductions || 0),
            netTotal: Number(pr.total_net || 0),
            warningCount: 0,
            readinessScore: Number(pr.readiness_score || 100),
            createdAt: pr.created_at,
          }));
          setPayruns(mappedPayruns);
          if (mappedPayruns.length > 0) {
            setSelectedPayrun(mappedPayruns[0]);
          }
        }

        // Map payslips
        if (payslipData && payslipData.length > 0) {
          const mappedPayslips: Payslip[] = payslipData.map(ps => {
            const emp = empData?.find(e => e.id === ps.employee_id);
            const expl = (ps.explanation as any) || {};
            return {
              id: ps.id,
              payrunId: ps.pay_run_id,
              payrunName: 'Monthly Payrun',
              employeeId: ps.employee_id,
              employeeName: emp?.full_name || '',
              employeeCode: emp?.employee_code || '',
              department: '',
              jobPosition: '',
              contractId: ps.contract_id || '',
              salaryStructureId: '00000000-0000-0000-0000-000000000002',
              salaryStructureName: 'Standard Executive Salary Structure',
              payrollPeriod: `${ps.period_start} to ${ps.period_end}`,
              workedDays: ps.paid_days,
              paidLeaveDays: 0,
              unpaidLeaveDays: ps.unpaid_leave_days,
              basicSalary: Number(expl.basic || 50000),
              hra: Number(expl.hra || 25000),
              travelAllowance: 0,
              otherAllowances: Number(expl.special || 25000),
              grossSalary: Number(ps.gross_amount),
              bonus: 0,
              appraisalAdjustment: 0,
              overtime: Number(ps.overtime_amount || 0),
              grossTotal: Number(ps.gross_amount),
              unpaidLeaveDeduction: Number(ps.actual_unpaid_leave_deduction || 0),
              paidLeaveAdjustment: 0,
              pfDeduction: Number(expl.pf || 6000),
              professionalTax: 200,
              incomeTaxTds: Number(expl.tax || 5800),
              taxDeduction: Number(expl.tax || 5800),
              loanEmiDeduction: 0,
              otherDeductions: 0,
              totalDeductions: Number(ps.deduction_amount),
              netSalary: Number(ps.net_amount),
              netTotal: Number(ps.net_amount),
              employerPfContribution: Number(ps.employer_contribution || 6000),
              employerEsiContribution: 0,
              status: ps.status as any,
              generatedAt: ps.generated_at || ps.created_at,
              paidAt: ps.finalized_at || undefined,
              warnings: [],
              lines: [],
            };
          });
          setPayslips(mappedPayslips);
          if (mappedPayslips.length > 0) {
            setSelectedPayslip(mappedPayslips[0]);
          }
        }

        // Map salary structures
        if (structData && structData.length > 0) {
          const mappedStructs: SalaryStructure[] = structData.map(st => ({
            id: st.id,
            name: st.name,
            code: st.code,
            isActive: st.is_active,
            description: st.description || '',
            ruleIds: (ruleData || []).filter(rule => rule.salary_structure_id === st.id).map(rule => rule.id),
          }));
          setSalaryStructures(mappedStructs);
        }

        // Map notifications
        if (notifData && notifData.length > 0) {
          const mappedNotifs: AppNotification[] = notifData.map(n => ({
            id: n.id,
            title: n.title,
            message: n.message,
            type: (n.type as any) || 'system',
            timestamp: n.created_at,
            read: !!n.read_at,
          }));
          setNotifications(mappedNotifs);
        }

        setDataLoading(false);
      } catch (err) {
        console.error('Failed to load Supabase data, falling back to mock:', err);
        setDataLoading(false);
      }
    }

    loadData();
    return () => { cancelled = true; };
  }, [isAuthenticated, client, authenticatedSession]);

  // Onboarding check
  useEffect(() => {
    if (!client) return;
    client.auth.getSession().then(async ({ data }) => {
      if (!data.session) return;
      const employee = await client.from('employees').select('status')
        .eq('user_id', data.session.user.id).maybeSingle();
      if (employee.data && employee.data.status === 'onboarding' && !isLocalOnboardingComplete(data.session.user.id) && window.location.pathname !== '/onboarding') {
        window.location.assign('/onboarding');
      }
    });
  }, [client]);

  // Realtime subscription for notifications
  useEffect(() => {
    if (!client || !authenticatedSession) return;
    const channel = client
      .channel('app-notifications')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'leave_requests',
        filter: `company_id=eq.${authenticatedSession.companyId}`,
      }, (payload) => {
        const newNotif: AppNotification = {
          id: `notif-${Date.now()}`,
          title: 'Leave Request Update',
          message: 'A leave request has been submitted or updated.',
          type: 'leave',
          timestamp: new Date().toISOString(),
          read: false,
        };
        setNotifications(prev => [newNotif, ...prev]);
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'attendance_records',
        filter: `company_id=eq.${authenticatedSession.companyId}`,
      }, () => {
        // Refresh attendance data on changes
      })
      .subscribe();

    return () => {
      client.removeChannel(channel);
    };
  }, [client, authenticatedSession]);

  // Current employee derived from current user's employeeId
  const currentEmployee =
    employees.find((e) => e.employeeId === currentUser.employeeId || e.id === currentUser.employeeId) ||
    employees[0];

  const createLocalEmployee = (input: { name: string; email: string; joiningDate: string; employeeType: Employee['employeeType']; departmentId: string; departmentName: string; jobPosition: string; baseSalary: number; monthlySalaryGross: number; salaryStructureName: string; workingScheduleId: string; workingScheduleName: string }) => {
    const employeeKey=input.email.toLowerCase().replace(/[^a-z0-9]+/g,'-');
    const employee: Employee = { id:`local-employee-${employeeKey}`,employeeId:`DEMO-${employeeKey.slice(-6).toUpperCase()}`,name:input.name,avatar:'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',email:input.email,phone:'',personalEmail:input.email,address:'',jobPosition:input.jobPosition,departmentId:input.departmentId,departmentName:input.departmentName,reportingManagerId:'',reportingManagerName:'',joiningDate:input.joiningDate,employmentStatus:'active',employeeType:input.employeeType,currentAttendanceStatus:'checked_out',todayCheckInTime:null,todayCheckOutTime:null,bankAccountMasked:'',ifscCode:'',panNumber:'',emergencyContact:{name:'',relation:'',phone:''},activeContractId:'',workingScheduleId:input.workingScheduleId,workingScheduleName:input.workingScheduleName,paidLeaveBalance:0,unpaidLeaveTaken:0,pendingRequestsCount:0,attendanceException:false,baseSalary:input.baseSalary,monthlySalaryGross:input.monthlySalaryGross,salaryStructureName:input.salaryStructureName};
    setEmployees(previous=>[employee,...previous]);
    addToast('success','Employee Created',`${employee.name} is now available in the local HR directory.`);
    return employee;
  };

  const markAttendancePresentRange = (startDate:string,endDate:string) => {
    if(!startDate||!endDate||startDate>endDate)return;
    const records:AttendanceRecord[]=[];const cursor=new Date(`${startDate}T00:00:00`);const end=new Date(`${endDate}T00:00:00`);
    while(cursor<=end){const date=cursor.toISOString().slice(0,10);if(cursor.getDay()!==0&&cursor.getDay()!==6){records.push({id:`att-local-${currentEmployee.id}-${date}`,employeeId:currentEmployee.id,employeeName:currentEmployee.name,date,checkIn:'09:30 AM',checkOut:'06:30 PM',workedHours:8,overtimeHours:0,status:'present',verificationMethod:'manual',exceptionStatus:'normal',notes:'Marked present for demo range'});}cursor.setDate(cursor.getDate()+1)}
    setAttendanceRecords(previous=>[...records,...previous.filter(item=>!records.some(record=>record.employeeId===item.employeeId&&record.date===item.date))]);addToast('success','Attendance Range Marked',`${records.length} working day(s) marked present.`);
  };

  const addToast = (
    typeOrObj: 'success' | 'warning' | 'error' | 'info' | { type?: 'success' | 'warning' | 'error' | 'info'; title: string; message?: string; description?: string },
    title?: string,
    message?: string
  ) => {
    const id = 'toast-' + Date.now();
    let finalType: 'success' | 'warning' | 'error' | 'info' = 'info';
    let finalTitle = '';
    let finalMessage = '';

    if (typeof typeOrObj === 'object') {
      finalType = typeOrObj.type || 'info';
      finalTitle = typeOrObj.title;
      finalMessage = typeOrObj.message || typeOrObj.description || '';
    } else {
      finalType = typeOrObj;
      finalTitle = title || '';
      finalMessage = message || '';
    }

    setToasts((prev) => [...prev, { id, type: finalType, title: finalTitle, message: finalMessage }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  };

  const showToast = (type: 'success' | 'warning' | 'error' | 'info', titleOrMessage: string, message?: string) => {
    if (message) {
      addToast(type, titleOrMessage, message);
    } else {
      addToast(type, type === 'error' ? 'Error' : type === 'warning' ? 'Warning' : 'Notification', titleOrMessage);
    }
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const handleSignOut = async () => {
    try {
      sessionStorage.removeItem('peoplepay360-demo-session');
      const supabase = getSupabaseBrowserClient();
      if (supabase) {
        await supabase.auth.signOut();
      }
    } catch (err) {
      console.error('Sign out error:', err);
    } finally {
      window.location.assign('/');
    }
  };

  const setCurrentUser = (user: User) => {
    setCurrentUserState(user);
    setActiveTab('overview');
    setSelectedEmployeeId(null);
    addToast('info', 'Role Switched', `Logged in as ${user.name} (${user.roleTitle})`);
  };

  const switchRole = (role: AppRole) => {
    if (authenticatedSession) {
      // In authenticated mode, just switch the displayed role
      const roleTitles: Record<AppRole, string> = {
        employee: 'Employee', hr_manager: 'HR Manager', payroll_user: 'Payroll User',
        payroll_manager: 'Payroll Manager', admin: 'Admin',
      };
      if (authenticatedSession.roles.includes(role)) {
        setCurrentUserState(prev => ({ ...prev, role, roleTitle: roleTitles[role] }));
        setActiveTab('overview');
        addToast('info', 'View Switched', `Switched to ${roleTitles[role]} view`);
      }
    } else {
      const user = DEMO_USERS.find((u) => u.role === role);
      if (user) setCurrentUser(user);
    }
  };

  // --- Attendance with Supabase ---
  const handleCheckInOut = async (method: 'face' | 'biometric' | 'manual', location?: AttendanceLocationCapture) => {
    if (isAuthenticated && client && authenticatedSession) {
      try {
        await peoplePayQueries.recordAttendanceWithLocation(client, {
          companyId: authenticatedSession.companyId,
          eventType: currentEmployee.currentAttendanceStatus === 'checked_in' ? 'check_out' : 'check_in',
          method: method === 'biometric' ? 'fingerprint' : method,
          latitude: location?.latitude,
          longitude: location?.longitude,
          accuracyMeters: location?.accuracyMeters,
          permissionDenied: location?.status === 'permission_denied',
        });

        const isCheckingOut=currentEmployee.currentAttendanceStatus==='checked_in';
        const {data:latestRows,error:refreshError}=await client.from('attendance_records').select('*').eq('company_id',authenticatedSession.companyId).eq('employee_id',currentEmployee.id).order('created_at',{ascending:false});
        if(refreshError)throw refreshError;
        const refreshed:AttendanceRecord[]=(latestRows??[]).map(att=>{const checkIn=att.check_in_at||att.check_in;const checkOut=att.check_out_at||att.check_out;const storedMinutes=att.worked_minutes??(att.total_hours?att.total_hours*60:0);const workedMinutes=attendanceMinutes(checkIn,checkOut,storedMinutes);const overtimeMinutes=Math.max(0,workedMinutes-8*60);return {id:att.id,employeeId:att.employee_id,employeeName:currentEmployee.name,date:att.work_date||att.date||'',checkIn:checkIn?new Date(checkIn).toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit',hour12:true}):null,checkOut:checkOut?new Date(checkOut).toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit',hour12:true}):null,workedHours:Math.round(workedMinutes/6)/10,overtimeHours:Math.round(overtimeMinutes/6)/10,status:(att.status as AttendanceRecord['status'])||'present',verificationMethod:((att.check_in_method||att.location||method) as AttendanceRecord['verificationMethod']),exceptionStatus:'normal',notes:att.notes||att.remarks||''}});
        setAttendanceRecords(previous=>[...refreshed,...previous.filter(row=>row.employeeId!==currentEmployee.id)]);
        const today=new Date().toISOString().slice(0,10);const todayRow=latestRows?.find(row=>(row.work_date||row.date)===today);const checkIn=todayRow?.check_in_at||todayRow?.check_in;const checkOut=todayRow?.check_out_at||todayRow?.check_out;const open=Boolean(checkIn&&!checkOut);
        setEmployees(previous=>previous.map(employee=>employee.id===currentEmployee.id?{...employee,currentAttendanceStatus:open?'checked_in':'checked_out',todayCheckInTime:checkIn?new Date(checkIn).toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit',hour12:true}):null,todayCheckOutTime:checkOut?new Date(checkOut).toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit',hour12:true}):null}:employee));
        const timeStr=new Date().toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit',hour12:true});

        addToast(
          'success',
          isCheckingOut ? 'Checked Out Successfully' : 'Checked In Successfully',
          isCheckingOut ? `Check-out logged at ${timeStr}.` : `Good day! Check-in recorded at ${timeStr}.`
        );
      } catch (err: any) {
        const isCheckingOut=currentEmployee.currentAttendanceStatus==='checked_in';const now=new Date();const timeStr=now.toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit',hour12:true});const today=now.toISOString().slice(0,10);
        const localStart=isCheckingOut?(currentEmployee.todayCheckInTime||timeStr):timeStr;const localMinutes=isCheckingOut?attendanceMinutes(`${today} ${localStart}`,`${today} ${timeStr}`,0):0;
        const localRecord:AttendanceRecord={id:`local-att-${Date.now()}`,employeeId:currentEmployee.id,employeeName:currentEmployee.name,date:today,checkIn:localStart,checkOut:isCheckingOut?timeStr:null,workedHours:Math.round(localMinutes/6)/10,overtimeHours:Math.round(Math.max(0,localMinutes-480)/6)/10,status:'present',verificationMethod:method,exceptionStatus:'normal',notes:`Locally recorded ${isCheckingOut?'check-out':'check-in'} via ${method}`,locationVerification:location?.status,latitude:location?.latitude,longitude:location?.longitude,accuracyMeters:location?.accuracyMeters,distanceFromOfficeMeters:location?.distanceFromOfficeMeters};
        setAttendanceRecords(previous=>[localRecord,...previous.filter(row=>!(row.employeeId===currentEmployee.id&&row.date===today))]);setEmployees(previous=>previous.map(employee=>employee.id===currentEmployee.id?{...employee,currentAttendanceStatus:isCheckingOut?'checked_out':'checked_in',todayCheckInTime:isCheckingOut?employee.todayCheckInTime:timeStr,todayCheckOutTime:isCheckingOut?timeStr:null}:employee));
        logLocalFallback('attendance',isCheckingOut?'check_out':'check_in',{employeeId:currentEmployee.id,method,time:timeStr},err);
        addToast('success',isCheckingOut?'Checked Out Successfully':'Checked In Successfully',`${isCheckingOut?'Check-out':'Check-in'} recorded at ${timeStr}.`);
      }
      setIsCheckInModalOpen(false);
      return;
    }

    // Fallback: mock behavior for demo mode
    const isCurrentlyIn = currentEmployee.currentAttendanceStatus === 'checked_in';
    const now = new Date();
    const timeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
    const todayStr = new Date().toISOString().split('T')[0];

    if (isCurrentlyIn) {
      setEmployees((prev) =>
        prev.map((e) =>
          e.id === currentEmployee.id
            ? { ...e, currentAttendanceStatus: 'checked_out', todayCheckOutTime: timeStr }
            : e
        )
      );
      setAttendanceRecords((prev) => [
        {
          id: 'att-' + Date.now(),
          employeeId: currentEmployee.id,
          employeeName: currentEmployee.name,
          date: todayStr,
          checkIn: currentEmployee.todayCheckInTime || '09:30 AM',
          checkOut: timeStr,
          workedHours: Math.round(attendanceMinutes(`${todayStr} ${currentEmployee.todayCheckInTime||timeStr}`,`${todayStr} ${timeStr}`,0)/6)/10,
          overtimeHours: 0,
          status: 'present',
          verificationMethod: method,
          exceptionStatus: 'normal',
          notes: `Check-out recorded via ${method.toUpperCase()} verification`,
          locationVerification: location?.status,
          latitude: location?.latitude, longitude: location?.longitude, accuracyMeters: location?.accuracyMeters, distanceFromOfficeMeters: location?.distanceFromOfficeMeters,
        },
        ...prev.filter((a) => !(a.employeeId === currentEmployee.id && a.date === todayStr)),
      ]);
      addToast('success', 'Checked Out Successfully', `Check-out logged at ${timeStr}. Have a great evening!`);
    } else {
      setEmployees((prev) =>
        prev.map((e) =>
          e.id === currentEmployee.id
            ? { ...e, currentAttendanceStatus: 'checked_in', todayCheckInTime: timeStr, todayCheckOutTime: null }
            : e
        )
      );
      setAttendanceRecords((prev) => [
        {
          id: 'att-' + Date.now(),
          employeeId: currentEmployee.id,
          employeeName: currentEmployee.name,
          date: todayStr,
          checkIn: timeStr,
          checkOut: null,
          workedHours: 0,
          overtimeHours: 0,
          status: 'present',
          verificationMethod: method,
          exceptionStatus: 'normal',
          notes: `Check-in recorded via ${method.toUpperCase()} verification`,
          locationVerification: location?.status,
          latitude: location?.latitude, longitude: location?.longitude, accuracyMeters: location?.accuracyMeters, distanceFromOfficeMeters: location?.distanceFromOfficeMeters,
        },
        ...prev.filter((a) => !(a.employeeId === currentEmployee.id && a.date === todayStr)),
      ]);
      addToast('success', 'Checked In Successfully', `Good day, ${currentEmployee.name}! Check-in recorded at ${timeStr}.`);
    }
    setIsCheckInModalOpen(false);
  };

  // --- Leave with Supabase ---
  const submitLeaveRequest = async (request: Partial<LeaveRequest>) => {
    if (isAuthenticated && client && authenticatedSession) {
      try {
        const { data, error } = await client.from('leave_requests').insert({
          company_id: authenticatedSession.companyId,
          employee_id: currentEmployee.id,
          leave_type_id: request.leaveTypeId || '',
          start_date: request.startDate || '',
          end_date: request.endDate || '',
          requested_days: request.chargeableWorkingDays || 1,
          reason: request.reason || '',
          status: 'submitted',
          estimated_unpaid_deduction: request.estimatedDeduction || 0,
          normal_working_days: request.chargeableWorkingDays || 1,
          total_chargeable_days: request.chargeableWorkingDays || 1,
        }).select().single();

        if (error) throw error;

        const newReq: LeaveRequest = {
          id: data.id,
          employeeId: currentEmployee.id,
          employeeName: currentEmployee.name,
          leaveTypeId: request.leaveTypeId || '',
          leaveTypeName: request.leaveTypeName || '',
          isPaid: request.isPaid ?? true,
          startDate: request.startDate || '',
          endDate: request.endDate || '',
          isHalfDay: request.isHalfDay ?? false,
          halfDayPeriod: request.halfDayPeriod,
          reason: request.reason || '',
          attachmentName: request.attachmentName,
          calendarDays: request.calendarDays || 1,
          excludedWeekends: request.excludedWeekends || 0,
          excludedHolidays: request.excludedHolidays || 0,
          chargeableWorkingDays: request.chargeableWorkingDays || 1,
          paidDaysUsed: request.paidDaysUsed || 0,
          unpaidDays: request.unpaidDays || 0,
          estimatedDeduction: request.estimatedDeduction || 0,
          estimatedNetSalaryAfter: request.estimatedNetSalaryAfter || 0,
          approverId: '',
          approverName: '',
          status: 'submitted',
          appliedDate: new Date().toISOString().split('T')[0],
        };
        setLeaveRequests((prev) => [newReq, ...prev]);
        setIsLeaveModalOpen(false);
        addToast('success', 'Leave Request Submitted', `Your request for ${newReq.chargeableWorkingDays} day(s) has been submitted.`);
        return;
      } catch (err: any) {
        addToast('error', 'Leave Request Failed', err?.message || 'Unable to submit leave request');
        return;
      }
    }

    // Demo fallback
    const newReq: LeaveRequest = {
      id: 'lr-' + Date.now(),
      employeeId: currentEmployee.id,
      employeeName: currentEmployee.name,
      leaveTypeId: request.leaveTypeId || 'lt-1',
      leaveTypeName: request.leaveTypeName || 'Casual Leave (CL)',
      isPaid: request.isPaid ?? true,
      startDate: request.startDate || '2026-09-20',
      endDate: request.endDate || '2026-09-20',
      isHalfDay: request.isHalfDay ?? false,
      halfDayPeriod: request.halfDayPeriod,
      reason: request.reason || 'Personal engagement',
      attachmentName: request.attachmentName,
      calendarDays: request.calendarDays || 1,
      excludedWeekends: request.excludedWeekends || 0,
      excludedHolidays: request.excludedHolidays || 0,
      chargeableWorkingDays: request.chargeableWorkingDays || 1,
      paidDaysUsed: request.paidDaysUsed || 1,
      unpaidDays: request.unpaidDays || 0,
      estimatedDeduction: request.estimatedDeduction || 0,
      estimatedNetSalaryAfter: request.estimatedNetSalaryAfter || 40750,
      approverId: currentEmployee.reportingManagerId || 'emp-2',
      approverName: currentEmployee.reportingManagerName || 'Priya Sundaram',
      status: 'submitted',
      appliedDate: new Date().toISOString().split('T')[0],
    };
    setLeaveRequests((prev) => [newReq, ...prev]);
    setIsLeaveModalOpen(false);
    addToast('success', 'Leave Request Submitted', `Your request for ${newReq.chargeableWorkingDays} day(s) was sent to ${newReq.approverName}.`);
  };

  const createEmployeeLeaveRequest = (employeeId: string, request: Partial<LeaveRequest>) => {
    const employee = employees.find(item => item.id === employeeId);
    if (!employee) return;
    const leaveType = leaveTypes.find(item => item.id === request.leaveTypeId);
    const newRequest: LeaveRequest = {
      id: `hr-lr-${Date.now()}`,
      employeeId,
      employeeName: employee.name,
      leaveTypeId: leaveType?.id || request.leaveTypeId || 'lt-1',
      leaveTypeName: leaveType?.name || request.leaveTypeName || 'Leave',
      isPaid: leaveType?.isPaid ?? request.isPaid ?? true,
      startDate: request.startDate || new Date().toISOString().slice(0, 10),
      endDate: request.endDate || request.startDate || new Date().toISOString().slice(0, 10),
      isHalfDay: request.isHalfDay ?? false,
      halfDayPeriod: request.halfDayPeriod,
      reason: request.reason || 'HR-created time off allocation',
      calendarDays: request.calendarDays || request.chargeableWorkingDays || 1,
      excludedWeekends: request.excludedWeekends || 0,
      excludedHolidays: request.excludedHolidays || 0,
      chargeableWorkingDays: request.chargeableWorkingDays || 1,
      paidDaysUsed: leaveType?.isPaid ? request.chargeableWorkingDays || 1 : 0,
      unpaidDays: leaveType?.isPaid ? 0 : request.chargeableWorkingDays || 1,
      estimatedDeduction: request.estimatedDeduction || 0,
      estimatedNetSalaryAfter: request.estimatedNetSalaryAfter || employee.monthlySalaryGross || employee.baseSalary,
      approverId: currentUser.id,
      approverName: currentUser.name,
      status: request.status || 'approved',
      appliedDate: new Date().toISOString().slice(0, 10),
    };
    setLeaveRequests(previous => [newRequest, ...previous]);
    addToast('success', 'Employee Time Off Created', `${employee.name}'s ${newRequest.leaveTypeName} was recorded.`);
  };

  const createLeaveType = (leaveType: Omit<LeaveType, 'id'>) => {
    const newLeaveType: LeaveType = { ...leaveType, id: `lt-local-${Date.now()}` };
    setLeaveTypes(previous => [...previous, newLeaveType]);
    addToast('success', 'Leave Type Created', `${newLeaveType.name} is now available for leave requests.`);
  };

  const allocateLeave = (employeeId: string, leaveTypeId: string, days: number) => {
    const employee = employees.find(item => item.id === employeeId);
    const leaveType = leaveTypes.find(item => item.id === leaveTypeId);
    if (!employee || !leaveType || days <= 0) return;
    setLeaveTypes(previous => previous.map(item => item.id === leaveTypeId ? {
      ...item,
      allocations: {
        ...(item.allocations || {}),
        [employeeId]: {
          totalDays: (item.allocations?.[employeeId]?.totalDays ?? item.totalDays ?? item.defaultDaysPerYear) + days,
          remainingDays: (item.allocations?.[employeeId]?.remainingDays ?? item.remainingDays ?? item.defaultDaysPerYear) + days,
        },
      },
    } : item));
    addToast('success', 'Leave Allocated', `${days} day(s) of ${leaveType.name} allocated to ${employee.name}.`);
  };

  // --- Leave approval with Supabase ---
  const approveLeaveRequest = async (id: string) => {
    if (isAuthenticated && client) {
      try {
        await peoplePayQueries.reviewLeave(client, id, 'approved');
        setLeaveRequests((prev) => prev.map((r) => (r.id === id ? { ...r, status: 'approved' } : r)));
        addToast('success', 'Leave Approved', 'The leave request has been approved.');
        return;
      } catch (err: any) {
        addToast('error', 'Approval Failed', err?.message || 'Unable to approve leave');
        return;
      }
    }
    setLeaveRequests((prev) => prev.map((r) => (r.id === id ? { ...r, status: 'approved' } : r)));
    addToast('success', 'Leave Approved', 'The leave request has been approved and added to attendance.');
  };

  const refuseLeaveRequest = async (id: string, reason?: string) => {
    if (isAuthenticated && client) {
      try {
        await peoplePayQueries.reviewLeave(client, id, 'rejected', reason);
        setLeaveRequests((prev) =>
          prev.map((r) => (r.id === id ? { ...r, status: 'rejected', rejectionReason: reason, rejectedBy: currentUser.name, rejectedAt: new Date().toISOString().split('T')[0] } : r))
        );
        addToast('warning', 'Leave Refused', 'The leave request has been declined.');
        return;
      } catch (err: any) {
        addToast('error', 'Rejection Failed', err?.message || 'Unable to reject leave');
        return;
      }
    }
    setLeaveRequests((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: 'rejected', rejectionReason: reason, rejectedBy: currentUser.name, rejectedAt: new Date().toISOString().split('T')[0] } : r))
    );
    addToast('warning', 'Leave Refused', 'The leave request has been declined.');
  };

  const approveProfileRequest = (id: string) => {
    const req = profileRequests.find((p) => p.id === id);
    if (!req) return;
    setProfileRequests((prev) => prev.map((p) => (p.id === id ? { ...p, status: 'approved' } : p)));
    setEmployees((prev) =>
      prev.map((e) => {
        if (e.id === req.employeeId) {
          if (req.field === 'phone') return { ...e, phone: req.requestedValue };
          if (req.field === 'address') return { ...e, address: req.requestedValue };
          if (req.field === 'personalEmail') return { ...e, personalEmail: req.requestedValue };
          if (req.field === 'bankAccount') return { ...e, bankAccountMasked: req.requestedValue };
        }
        return e;
      })
    );
    addToast('success', 'Profile Update Approved', `Applied ${req.fieldLabel} update for ${req.employeeName}.`);
  };

  const refuseProfileRequest = (id: string) => {
    setProfileRequests((prev) => prev.map((p) => (p.id === id ? { ...p, status: 'refused' } : p)));
    addToast('info', 'Profile Update Declined', 'The employee update request was refused.');
  };

  const submitProfileUpdateRequest = (
    field: ProfileUpdateRequest['field'],
    fieldLabel: string,
    originalValue: string,
    requestedValue: string
  ) => {
    const newReq: ProfileUpdateRequest = {
      id: 'pur-' + Date.now(),
      employeeId: currentEmployee.id,
      employeeName: currentEmployee.name,
      field,
      fieldLabel,
      originalValue,
      requestedValue,
      status: 'pending',
      submittedDate: new Date().toISOString().split('T')[0],
    };
    setProfileRequests((prev) => [newReq, ...prev]);
    addToast('info', 'Update Request Queued', 'Your change request has been submitted for HR verification.');
  };

  const approveCorrectionRequest = (id: string) => {
    const req = correctionRequests.find((c) => c.id === id);
    if (!req) return;
    setCorrectionRequests((prev) => prev.map((c) => (c.id === id ? { ...c, status: 'approved' } : c)));
    setAttendanceRecords((prev) =>
      prev.map((a) => {
        if (a.employeeId === req.employeeId && a.date === req.date) {
          return { ...a, checkIn: req.requestedCheckIn, checkOut: req.requestedCheckOut, status: 'present', exceptionStatus: 'normal', notes: `Regularized: ${req.reason}` };
        }
        return a;
      })
    );
    addToast('success', 'Correction Approved', `Attendance for ${req.employeeName} on ${req.date} was regularized.`);
  };

  const refuseCorrectionRequest = (id: string) => {
    setCorrectionRequests((prev) => prev.map((c) => (c.id === id ? { ...c, status: 'refused' } : c)));
    addToast('warning', 'Correction Refused', 'The attendance correction request was rejected.');
  };

  const submitCorrectionRequest = (date: string, inTime: string, outTime: string, reason: string) => {
    const newReq: AttendanceCorrectionRequest = {
      id: 'acr-' + Date.now(),
      employeeId: currentEmployee.id,
      employeeName: currentEmployee.name,
      date,
      originalCheckIn: '10:15 AM',
      originalCheckOut: '06:30 PM',
      requestedCheckIn: inTime,
      requestedCheckOut: outTime,
      reason,
      status: 'pending',
      submittedDate: new Date().toISOString().split('T')[0],
    };
    setCorrectionRequests((prev) => [newReq, ...prev]);
    setIsCorrectionModalOpen(false);
    addToast('success', 'Correction Request Submitted', 'Sent to reporting manager for authorization.');
  };

  const updatePayrunStatus = (payrunId: string, newStatus: PayrunStatus) => {
    if (newStatus === 'validated' || newStatus === 'paid') {
      try {
        payslips.filter(p => p.payrunId === payrunId).forEach(p =>
          assertPayrollCanFinalize(p.lines.map(line => ({
            name: line.name,
            amount: line.amount,
            category: ['basic', 'allowance', 'overtime', 'adjustment'].includes(line.category) ? 'earning' : 'deduction',
          })))
        );
      } catch (error) {
        addToast('error', 'Payroll finalization blocked', error instanceof Error ? error.message : 'Deductions exceed earnings');
        return;
      }
    }
    setPayruns((prev) =>
      prev.map((p) => {
        if (p.id === payrunId) {
          const now = new Date().toLocaleString('en-IN');
          return {
            ...p,
            status: newStatus,
            computedAt: newStatus === 'computed' ? now : p.computedAt,
            validatedAt: newStatus === 'validated' ? now : p.validatedAt,
            paidAt: newStatus === 'paid' ? now : p.paidAt,
            readinessScore: newStatus === 'validated' || newStatus === 'paid' ? 100 : p.readinessScore,
          };
        }
        return p;
      })
    );
    setPayslips((prev) => prev.map((ps) => (ps.payrunId === payrunId ? { ...ps, status: newStatus } : ps)));
    logLocalFallback('payroll','payrun_status_updated',{payrunId,status:newStatus});
    addToast('success', 'Payrun Updated', `Payrun transitioned to ${newStatus.toUpperCase()} status.`);
  };

  const createPayrun = (payrun: Partial<Payrun>) => {
    const newPr: Payrun = {
      id: 'pr-' + Date.now(),
      name: payrun.name || 'New Regular Payrun',
      reference: 'PAYRUN-' + Date.now().toString().slice(-6),
      salaryStructureId: payrun.salaryStructureId || 'str-1',
      salaryStructureName: payrun.salaryStructureName || 'Standard Corporate Salary Structure',
      startDate: payrun.startDate || '2026-11-01',
      endDate: payrun.endDate || '2026-11-30',
      departmentName: payrun.departmentName || 'All Departments',
      employeeType: payrun.employeeType || 'Full-Time Employees',
      status: 'draft',
      employeeCount: payrun.employeeCount || 12,
      grossTotal: payrun.grossTotal || 748000,
      totalDeductions: payrun.totalDeductions || 51200,
      netTotal: payrun.netTotal || 696800,
      warningCount: payrun.warningCount || 0,
      readinessScore: 85,
      createdAt: new Date().toISOString().split('T')[0],
    };
    setPayruns((prev) => [newPr, ...prev]);
    logLocalFallback('payroll','payrun_created',{payrunId:newPr.id,name:newPr.name,employeeCount:newPr.employeeCount,netTotal:newPr.netTotal});
    setSelectedPayrun(newPr);
    setIsPayrunWizardOpen(false);
    addToast('success', 'Payrun Created', `${newPr.name} has been initiated in Draft status.`);
  };

  const createPayslip = (input: Partial<Payslip>) => {
    const employee = employees.find(item => item.id === input.employeeId) || currentEmployee;
    const grossSalary = input.grossSalary && input.grossSalary > 0 ? input.grossSalary : employee.monthlySalaryGross || employee.baseSalary || 50000;
    const totalDeductions = input.totalDeductions && input.totalDeductions > 0 ? input.totalDeductions : 0;
    const newPayslip: Payslip = {
      id: `ps-local-${Date.now()}`,
      payrunId: input.payrunId || 'pr-local-manual',
      payrunName: input.payrunName || 'HR Manual Payroll Entry',
      employeeId: employee.id,
      employeeName: employee.name,
      employeeCode: employee.employeeId,
      department: employee.departmentName,
      jobPosition: employee.jobPosition,
      contractId: employee.activeContractId,
      salaryStructureId: input.salaryStructureId || '',
      salaryStructureName: input.salaryStructureName || 'Manual HR Payslip',
      payrollPeriod: input.payrollPeriod || `${new Date().toISOString().slice(0, 7)}-01 to ${new Date().toISOString().slice(0, 7)}-30`,
      period: input.period || input.payrollPeriod,
      payslipNumber: input.payslipNumber || `PS-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`,
      workedDays: input.workedDays ?? 0,
      paidLeaveDays: input.paidLeaveDays ?? 0,
      unpaidLeaveDays: input.unpaidLeaveDays ?? 0,
      basicSalary: input.basicSalary && input.basicSalary > 0 ? input.basicSalary : Math.round(grossSalary * 0.6),
      hra: input.hra && input.hra > 0 ? input.hra : Math.round(grossSalary * 0.25),
      travelAllowance: input.travelAllowance ?? 0,
      otherAllowances: input.otherAllowances ?? 0,
      grossSalary,
      bonus: input.bonus ?? 0,
      appraisalAdjustment: input.appraisalAdjustment ?? 0,
      overtime: input.overtime ?? 0,
      paidLeaveAdjustment: input.paidLeaveAdjustment ?? 0,
      unpaidLeaveDeduction: input.unpaidLeaveDeduction ?? 0,
      taxDeduction: input.taxDeduction ?? 0,
      otherDeductions: input.otherDeductions ?? totalDeductions,
      totalDeductions,
      netSalary: input.netSalary ?? grossSalary - totalDeductions,
      status: input.status || 'validated',
      warnings: [],
      lines: input.lines || [],
    };
    setPayslips(previous => [newPayslip, ...previous]);
    addToast('success', 'Payslip Created', `${newPayslip.payslipNumber} was created for ${employee.name}.`);
  };

  const addSalaryRule = (rule: Omit<SalaryRule, 'id'>) => {
    const newRule: SalaryRule = { ...rule, id: 'rule-' + Date.now() };
    setSalaryRules((prev) => [...prev, newRule]);
    addToast('success', 'Salary Rule Added', `Added rule: ${newRule.name}`);
  };

  const updateSalaryRule = (id: string, rule: Partial<SalaryRule>) => {
    setSalaryRules((prev) => prev.map((r) => (r.id === id ? { ...r, ...rule } : r)));
    addToast('success', 'Salary Rule Updated', 'Configuration changes saved.');
  };

  const deleteSalaryRule = (id: string) => {
    setSalaryRules((prev) => prev.filter((r) => r.id !== id));
    addToast('warning', 'Salary Rule Removed', 'Rule removed from payroll calculation engine.');
  };

  const addSalaryStructure = (structure: Omit<SalaryStructure, 'id'>) => {
    const newStr: SalaryStructure = { ...structure, id: 'str-' + Date.now() };
    setSalaryStructures((prev) => [...prev, newStr]);
    addToast('success', 'Structure Created', `New salary structure: ${newStr.name}`);
  };

  const updateSalaryStructure = (id: string, structure: Partial<SalaryStructure>) => {
    setSalaryStructures((prev) => prev.map((s) => (s.id === id ? { ...s, ...structure } : s)));
    addToast('success', 'Structure Updated', 'Salary structure configuration updated.');
  };

  const markNotificationRead = (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  };

  const clearAllNotifications = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    addToast('info', 'Notifications Cleared', 'All notices marked as read.');
  };

  const updateCurrentEmployeePhoto=useCallback((photoUrl:string)=>{setEmployees(previous=>previous.map(employee=>employee.id===currentEmployee.id?{...employee,avatar:photoUrl}:employee));setCurrentUserState(previous=>previous.employeeId===currentEmployee.employeeId?{...previous,avatar:photoUrl}:previous);try{localStorage.setItem(`peoplepay360-profile-photo-${currentEmployee.id}`,photoUrl)}catch{/* signed URL remains in memory */}logLocalFallback('application','profile_photo_updated',{employeeId:currentEmployee.id});},[currentEmployee.id,currentEmployee.employeeId]);

  return (
    <AppContext.Provider
      value={{
        currentUser,
        currentRole: currentUser.role,
        setCurrentUser,
        switchRole,
        activeTab,
        setActiveTab,
        selectedEmployeeId,
        setSelectedEmployeeId,
        employees,
        createLocalEmployee,
        attendanceRecords,
        leaveRequests,
        leaveTypes,
        profileRequests,
        correctionRequests,
        payruns,
        payslips,
        salaryStructures,
        salaryRules,
        notifications,
        biometricDevices,
        toasts,
        addToast,
        showToast,
        removeToast,
        isCheckInModalOpen,
        setIsCheckInModalOpen,
        isSalaryDrawerOpen,
        setIsSalaryDrawerOpen,
        isDeductionModalOpen,
        setIsDeductionModalOpen,
        isRoleSwitcherOpen,
        setIsRoleSwitcherOpen,
        isLeaveModalOpen,
        setIsLeaveModalOpen,
        isCorrectionModalOpen,
        setIsCorrectionModalOpen,
        isPayrunWizardOpen,
        setIsPayrunWizardOpen,
        isExplainSalaryDiffOpen,
        setIsExplainSalaryDiffOpen,
        selectedPayslip,
        setSelectedPayslip,
        selectedAttendanceDate,
        setSelectedAttendanceDate,
        selectedPayrun,
        setSelectedPayrun,
        currentEmployee,
        updateCurrentEmployeePhoto,
        handleCheckInOut,
        markAttendancePresentRange,
        submitLeaveRequest,
        createEmployeeLeaveRequest,
        createLeaveType,
        allocateLeave,
        approveLeaveRequest,
        refuseLeaveRequest,
        approveProfileRequest,
        refuseProfileRequest,
        submitProfileUpdateRequest,
        approveCorrectionRequest,
        refuseCorrectionRequest,
        submitCorrectionRequest,
        updatePayrunStatus,
        createPayrun,
        createPayslip,
        addSalaryRule,
        updateSalaryRule,
        deleteSalaryRule,
        addSalaryStructure,
        updateSalaryStructure,
        markNotificationRead,
        clearAllNotifications,
        authenticated: isAuthenticated,
        companyId: authenticatedSession?.companyId || null,
        signOut: handleSignOut,
        dataLoading,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
