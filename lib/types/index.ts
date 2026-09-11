export type AppRole =
  | 'employee'
  | 'hr_manager'
  | 'payroll_user'
  | 'payroll_manager'
  | 'admin';

/** @deprecated Use 'payroll_user' instead */
export type LegacyPayrollUser = 'payroll_user';
/** @deprecated Use 'payroll_manager' instead */
export type LegacyPayrollManager = 'payroll_manager';

export interface User {
  id: string;
  name: string;
  email: string;
  role: AppRole;
  roleTitle: string;
  avatar: string;
  employeeId: string;
  department: string;
  jobPosition: string;
}

export interface Employee {
  id: string;
  employeeId: string;
  name: string;
  avatar: string;
  email: string;
  phone: string;
  personalEmail: string;
  address: string;
  jobPosition: string;
  departmentId: string;
  departmentName: string;
  department?: string;
  reportingManagerId: string;
  reportingManagerName: string;
  joiningDate: string;
  employmentStatus: 'active' | 'probation' | 'notice' | 'archived';
  employeeType: 'full_time' | 'contractor' | 'intern';
  currentAttendanceStatus: 'checked_in' | 'checked_out' | 'on_leave';
  todayCheckInTime?: string | null;
  todayCheckOutTime?: string | null;
  bankAccountMasked: string;
  ifscCode: string;
  panNumber: string;
  emergencyContact: {
    name: string;
    relation: string;
    phone: string;
  };
  activeContractId: string;
  workingScheduleId: string;
  workingScheduleName: string;
  paidLeaveBalance: number;
  unpaidLeaveTaken: number;
  pendingRequestsCount: number;
  attendanceException: boolean;
  baseSalary: number;
  monthlySalaryGross?: number;
  annualCTC?: number;
  workLocation?: string;
  salaryStructureName?: string;
  contractReference?: string;
  contractStatus?: 'active' | 'draft' | 'scheduled' | 'expired' | 'terminated' | 'running';
  dateOfJoining?: string;
  uanNumber?: string;
}

export interface Department {
  id: string;
  name: string;
  code: string;
  managerId: string;
  managerName: string;
  totalHeadcount: number;
  monthlyPayrollBudget: number;
}

export interface Contract {
  id: string;
  employeeId: string;
  employeeName: string;
  contractReference: string;
  reference?: string;
  wage: number;
  wageMonthly?: number;
  wageAnnual?: number;
  startDate: string;
  endDate?: string;
  department: string;
  jobPosition: string;
  jobTitle?: string;
  salaryStructureId: string;
  salaryStructureName: string;
  workingScheduleId?: string;
  workingScheduleName?: string;
  status: 'active' | 'draft' | 'scheduled' | 'expired' | 'terminated' | 'running';
  isActive: boolean;
  approvedAt?: string;
  terminatedAt?: string;
  terminationReason?: string;
  warnings?: string[];
  warningType?: 'expiring_soon' | 'wage_mismatch' | 'none';
  warningDetails?: string;
  renewalMode?: 'manual' | 'automatic';
  renewalTermMonths?: number;
  renewalOfContractId?: string;
  renewalDueDate?: string;
}

export interface WorkingScheduleDay {
  day: string;
  dayShort: string;
  startTime: string;
  endTime: string;
  breakDurationMins: number;
  isWorking: boolean;
  lunchStart?: string;
  lunchEnd?: string;
  graceMinutes?: number;
  overtimeEligible?: boolean;
}

export interface WorkingSchedule {
  id: string;
  name: string;
  type: 'standard' | 'shift' | 'flexible';
  weeklyHours: number;
  days: WorkingScheduleDay[];
  description?: string;
  hoursPerDay?: number;
  daysPerWeek?: number;
  lunchBreakMinutes?: number;
  effectiveFrom?: string;
  effectiveTo?: string;
  assignmentLabel?: string;
}

export interface AttendanceRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  date: string;
  checkIn: string | null;
  checkOut: string | null;
  workedHours: number;
  overtimeHours: number;
  status: 'present' | 'absent' | 'leave' | 'late' | 'half_day';
  verificationMethod: 'face' | 'biometric' | 'manual';
  exceptionStatus?: 'normal' | 'late_arrival' | 'missing_checkout' | 'unauthorized_absence' | 'pending_correction';
  notes?: string;
  locationVerification?: 'verified' | 'outside_allowed_location' | 'low_accuracy' | 'permission_denied' | 'unavailable';
  latitude?: number;
  longitude?: number;
  accuracyMeters?: number;
  distanceFromOfficeMeters?: number | null;
  overtimePaymentStatus?: 'paid' | 'recorded_unpaid' | 'not_applicable';
}

export interface AttendanceLocationCapture {
  status: NonNullable<AttendanceRecord['locationVerification']>;
  latitude?: number;
  longitude?: number;
  accuracyMeters?: number;
  distanceFromOfficeMeters?: number | null;
  capturedAt: string;
}

export interface LeaveType {
  id: string;
  name: string;
  code: string;
  isPaid: boolean;
  defaultDaysPerYear: number;
  color: string;
  description: string;
  remainingDays?: number;
  totalDays?: number;
  allocations?: Record<string, { totalDays: number; remainingDays: number }>;
}

export interface LeaveBalance {
  employeeId: string;
  paidLeaveAvailable: number;
  paidLeaveUsed: number;
  unpaidLeaveTaken: number;
  totalAllocated: number;
}

export interface LeaveRequest {
  id: string;
  employeeId: string;
  employeeName: string;
  leaveTypeId: string;
  leaveTypeName: string;
  isPaid: boolean;
  startDate: string;
  endDate: string;
  isHalfDay: boolean;
  halfDayPeriod?: 'first_half' | 'second_half';
  reason: string;
  attachmentName?: string;
  calendarDays: number;
  excludedWeekends: number;
  excludedHolidays: number;
  chargeableWorkingDays: number;
  paidDaysUsed: number;
  unpaidDays: number;
  estimatedDeduction: number;
  estimatedNetSalaryAfter: number;
  approverId: string;
  approverName: string;
  status: 'draft' | 'submitted' | 'approved' | 'rejected' | 'cancelled';
  appliedDate: string;
  rejectionReason?: string;
  rejectedBy?: string;
  rejectedAt?: string;
  normalWorkingDays?: number;
  sandwichDays?: number;
  sandwichPolicyVersion?: number;
  sandwichExplanation?: string;
}

export interface SalaryStructure {
  id: string;
  name: string;
  code: string;
  isActive?: boolean;
  assignedEmployeesCount?: number;
  ruleIds: string[];
  description?: string;
  currency?: string;
}

export interface SalaryRule {
  id: string;
  name: string;
  code: string;
  category: 'basic' | 'allowance' | 'gross' | 'deduction' | 'net';
  sequence?: number;
  calculationType: 'fixed' | 'percentage' | 'formula';
  fixedAmount?: number;
  percentage?: number;
  baseRuleCode?: string;
  formula?: string;
  formulaDisplay?: string;
  condition?: string;
  isActive?: boolean;
  active?: boolean;
  description?: string;
}

export type PayrunStatus = 'draft' | 'computed' | 'validated' | 'paid';

export interface Payrun {
  id: string;
  name: string;
  reference: string;
  salaryStructureId: string;
  salaryStructureName: string;
  startDate: string;
  endDate: string;
  departmentId?: string;
  departmentName?: string;
  employeeType?: string;
  status: PayrunStatus;
  employeeCount: number;
  grossTotal: number;
  totalDeductions: number;
  netTotal: number;
  warningCount: number;
  readinessScore: number;
  createdAt: string;
  computedAt?: string;
  validatedAt?: string;
  paidAt?: string;
}

export interface PayslipLine {
  id: string;
  name: string;
  code: string;
  category: 'basic' | 'allowance' | 'deduction' | 'tax' | 'overtime' | 'adjustment';
  amount: number;
  source: 'contract' | 'attendance' | 'leave' | 'overtime' | 'salary_rule';
  rate?: number;
  daysAffected?: number;
  hoursAffected?: number;
  explanation?: string;
}

export interface Payslip {
  id: string;
  payrunId: string;
  payrunName: string;
  employeeId: string;
  employeeName: string;
  employeeCode: string;
  department: string;
  jobPosition: string;
  contractId: string;
  salaryStructureId: string;
  salaryStructureName: string;
  payrollPeriod: string;
  period?: string;
  payslipNumber?: string;
  lopDays?: number;
  workedDays: number;
  paidLeaveDays: number;
  unpaidLeaveDays: number;
  basicSalary: number;
  hra: number;
  travelAllowance: number;
  otherAllowances: number;
  grossSalary: number;
  bonus: number;
  appraisalAdjustment: number;
  overtime: number;
  paidLeaveAdjustment: number;
  unpaidLeaveDeduction: number;
  taxDeduction: number;
  otherDeductions: number;
  totalDeductions: number;
  netSalary: number;
  status: PayrunStatus;
  warnings: string[];
  lines: PayslipLine[];
  previousNetSalary?: number;
  difference?: number;
  percentageChange?: number;
  changeReason?: string;
}

export interface PayrollWarning {
  id: string;
  employeeId: string;
  employeeName: string;
  type:
    | 'missing_contract'
    | 'overlapping_contract'
    | 'missing_bank_details'
    | 'duplicate_payslip'
    | 'attendance_exception'
    | 'leave_conflict'
    | 'unusual_salary_change';
  severity: 'blocking' | 'warning';
  message: string;
  payslipId?: string;
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: 'leave' | 'attendance' | 'profile' | 'payroll' | 'biometric';
  timestamp: string;
  read: boolean;
  actionUrl?: string;
  status?: 'submitted' | 'approved' | 'refused' | 'warning' | 'error';
}

export interface BiometricDevice {
  id: string;
  name: string;
  location: string;
  ipAddress: string;
  status: 'connected' | 'disconnected' | 'syncing' | 'error';
  lastSync: string;
  mappedEmployeesCount: number;
  latestEvent: string;
  firmware?: string;
}

export interface AuditEvent {
  id: string;
  user: string;
  role: string;
  action: string;
  target: string;
  timestamp: string;
  ip: string;
  details: string;
}

export interface ProfileUpdateRequest {
  id: string;
  employeeId: string;
  employeeName: string;
  field: 'phone' | 'address' | 'personalEmail' | 'bankAccount';
  fieldLabel: string;
  originalValue: string;
  requestedValue: string;
  status: 'pending' | 'approved' | 'refused';
  submittedDate: string;
}

export interface AttendanceCorrectionRequest {
  id: string;
  employeeId: string;
  employeeName: string;
  date: string;
  originalCheckIn: string;
  originalCheckOut: string;
  requestedCheckIn: string;
  requestedCheckOut: string;
  reason: string;
  status: 'pending' | 'approved' | 'refused';
  submittedDate: string;
}

export interface SimulationInputs {
  salaryRulePercentage: number;
  fixedAllowanceAdjustment: number;
  overtimeHoursRate: number;
  unpaidLeaveDayDeduction: number;
  departmentIncrementPercentage: number;
  selectedDepartment: string;
}

export interface SimulationResult {
  currentPayrollCost: number;
  simulatedPayrollCost: number;
  difference: number;
  affectedEmployeesCount: number;
  newWarningsCount: number;
  departmentImpact: Array<{
    department: string;
    currentCost: number;
    simulatedCost: number;
    change: number;
  }>;
  employeeChanges: Array<{
    id: string;
    name: string;
    department: string;
    currentNet: number;
    simulatedNet: number;
    change: number;
    explanation: string;
  }>;
}

// ==========================================
// 1. MEDICAL-LEAVE PROOF WORKFLOW TYPES
// ==========================================
export type MedicalProofStatus =
  | 'not_required'
  | 'pending_upload'
  | 'submitted'
  | 'under_hr_review'
  | 'verified'
  | 'rejected'
  | 'resubmission_required'
  | 'overdue';

export interface LeaveProofPolicy {
  leaveTypeId: string;
  proofRequired: boolean;
  minimumDurationDays: number;
  acceptedFileTypes: string[];
  maximumFileSizeMb: number;
  submissionDeadlineAfterReturnDays: number;
}

export interface MedicalProof {
  id: string;
  leaveRequestId: string;
  employeeId: string;
  employeeName: string;
  department: string;
  leaveStartDate: string;
  leaveEndDate: string;
  totalDays: number;
  expectedReturnDate: string;
  submissionDeadline: string;
  submissionOption: 'with_application' | 'post_return';
  fileName?: string;
  fileSizeMb?: number;
  fileType?: string;
  uploadedAt?: string;
  status: MedicalProofStatus;
  hrRemarks?: string;
  verifiedAt?: string;
  verifiedBy?: string;
}

// ==========================================
// 2. STATUTORY CONTRIBUTION (PF) TYPES
// ==========================================
export interface StatutoryContributionRule {
  id: string;
  name: string;
  country: 'IN';
  contributionType: 'PF';
  employeeRate: number; // 0.12 (12%)
  employerRate: number; // 0.12 (12%)
  wageBasis: string;
  wageCeiling?: number; // 15000
  effectiveFrom: string;
  effectiveTo?: string;
  version: string;
  status: 'active' | 'scheduled' | 'expired';
  description?: string;
  affectedEmployeesCount?: number;
  eligibilityWageThreshold?: number;
}

// ==========================================
// 3. EMPLOYEE COMPANY-LOAN MODULE TYPES
// ==========================================
export type LoanStatus =
  | 'draft'
  | 'submitted'
  | 'hr_review'
  | 'payroll_review'
  | 'approved'
  | 'active'
  | 'partially_repaid'
  | 'settlement_requested'
  | 'closed'
  | 'rejected';

export type InstalmentStatus =
  | 'upcoming'
  | 'deducted'
  | 'partially_paid'
  | 'skipped'
  | 'overdue'
  | 'settled';

export interface LoanInstalment {
  id: string;
  instalmentNumber: number;
  payrollMonth: string;
  openingBalance: number;
  principalDeducted: number;
  interestDeducted: number;
  totalMonthlyDeduction: number;
  closingBalance: number;
  status: InstalmentStatus;
  payslipId?: string;
  paidDate?: string;
}

export interface LumpSumPayment {
  id: string;
  loanId: string;
  paymentAmount: number;
  paymentDate: string;
  paymentMethod: 'bank_transfer' | 'upi' | 'cheque';
  preOutstanding: number;
  postOutstanding: number;
  repaymentAdjustment: 'reduce_tenure' | 'reduce_monthly_deduction';
  newMonthlyDeduction?: number;
  newRemainingInstalments?: number;
  notes?: string;
  principalComponent?: number;
  interestComponent?: number;
  reference?: string;
  idempotencyKey?: string;
}

export interface LoanTransaction {
  id: string;
  loanId: string;
  type: 'installment' | 'partial_lump_sum' | 'full_settlement' | 'adjustment';
  amount: number;
  principalComponent: number;
  interestComponent: number;
  balanceBefore: number;
  balanceAfter: number;
  paidOn: string;
  reference: string;
  idempotencyKey: string;
}

export interface LoanSettlement {
  id: string;
  loanId: string;
  outstandingPrincipal: number;
  accruedInterest: number;
  earlySettlementCharge: number;
  totalSettlementAmount: number;
  proposedPaymentDate: string;
  requestedAt: string;
  status: 'pending_review' | 'approved' | 'settled' | 'rejected';
  rejectionReason?: string;
  settlementStatementGenerated?: boolean;
}

export interface EmployeeLoan {
  id: string;
  loanNumber: string;
  employeeId: string;
  employeeName: string;
  department: string;
  principalAmount: number;
  annualInterestRate: number;
  interestMethod: 'reducing_balance' | 'flat';
  totalPayableAmount: number;
  amountRepaid: number;
  outstandingPrincipal: number;
  outstandingInterest: number;
  outstandingTotal: number;
  monthlyPayrollDeduction: number;
  totalInstalments: number;
  remainingInstalments: number;
  nextDeductionDate: string;
  loanStartDate: string;
  expectedCompletionDate: string;
  status: LoanStatus;
  purpose: string;
  supportingDocName?: string;
  repaymentSchedule: LoanInstalment[];
  settlementRequest?: LoanSettlement;
  partialPayments?: LumpSumPayment[];
  transactionHistory?: LoanTransaction[];
  closedAt?: string;
  closureType?: 'scheduled' | 'partial_lump_sum' | 'early_full';
  closureReference?: string;
  approvedByHRDate?: string;
  approvedByPayrollDate?: string;
  pausedReason?: string;
}

export interface LoanApplication {
  requestedAmount: number;
  purpose: string;
  preferredMonthlyDeduction: number;
  preferredRepaymentPeriodMonths: number;
  requestedStartMonth: string;
  supportingDocName?: string;
  consentAgreed: boolean;
}

// ==========================================
// 4. BULK PAYSLIP EMAIL DISTRIBUTION TYPES
// ==========================================
export type EmailRecipientStatus = 'sent' | 'failed' | 'queued' | 'pending';
export type EmailFailureReason =
  | 'missing_email'
  | 'invalid_email'
  | 'payslip_pdf_unavailable'
  | 'service_error'
  | 'timeout';

export interface EmailRecipientResult {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeCode: string;
  department: string;
  jobPosition: string;
  email: string;
  status: EmailRecipientStatus;
  failureReason?: EmailFailureReason;
  failureMessage?: string;
  attemptCount: number;
  lastAttemptTime?: string;
  retryStatus?: 'not_retried' | 'retrying' | 'succeeded' | 'still_failed';
  payslipId: string;
  netSalary: number;
}

export interface EmailDistributionJob {
  id: string;
  payrunId: string;
  payrunName: string;
  period: string;
  subject: string;
  templateName: string;
  totalSelected: number;
  queuedCount: number;
  sendingCount: number;
  successfullySent: number;
  failedCount: number;
  pendingCount: number;
  progressPercentage: number;
  elapsedSeconds: number;
  status: 'idle' | 'in_progress' | 'completed' | 'completed_with_errors' | 'failed';
  recipients: EmailRecipientResult[];
  startedAt?: string;
  completedAt?: string;
}
