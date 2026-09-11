import { describe, expect, it } from 'vitest';
import { INITIAL_ATTENDANCE } from './attendance';
import { CONTRACTS } from './contracts';
import { EMPLOYEES } from './employees';
import { INITIAL_EMPLOYEE_LOANS } from './employee-loans';
import { INITIAL_LEAVE_REQUESTS } from './leaves';
import { INITIAL_PAYRUNS, INITIAL_PAYSLIPS } from './payroll';
import { WORKING_SCHEDULES } from './departments-schedules';

describe('deterministic demo scenario seed', () => {
  it('covers paid, unpaid, refused and sandwich leave', () => {
    expect(INITIAL_LEAVE_REQUESTS.some((row) => row.isPaid && row.status === 'approved')).toBe(true);
    expect(INITIAL_LEAVE_REQUESTS.some((row) => !row.isPaid && row.status === 'submitted')).toBe(true);
    expect(INITIAL_LEAVE_REQUESTS.some((row) => row.status === 'rejected' && row.rejectionReason)).toBe(true);
    expect(INITIAL_LEAVE_REQUESTS.some((row) => (row.sandwichDays ?? 0) > 0 && row.sandwichPolicyVersion)).toBe(true);
  });

  it('covers location and paid/unpaid overtime outcomes', () => {
    expect(INITIAL_ATTENDANCE.some((row) => row.locationVerification === 'outside_allowed_location')).toBe(true);
    expect(INITIAL_ATTENDANCE.some((row) => row.overtimePaymentStatus === 'paid')).toBe(true);
    expect(INITIAL_ATTENDANCE.some((row) => row.overtimePaymentStatus === 'recorded_unpaid')).toBe(true);
  });

  it('covers loans, contracts, intern stipend and missing bank details', () => {
    expect(INITIAL_EMPLOYEE_LOANS.some((loan) => loan.status === 'active')).toBe(true);
    expect(INITIAL_EMPLOYEE_LOANS.some((loan) => (loan.partialPayments?.length ?? 0) > 0)).toBe(true);
    expect(INITIAL_EMPLOYEE_LOANS.some((loan) => loan.status === 'closed' && loan.closureType === 'early_full')).toBe(true);
    expect(CONTRACTS.some((contract) => contract.status === 'running')).toBe(true);
    expect(CONTRACTS.some((contract) => contract.status === 'expired')).toBe(true);
    expect(CONTRACTS.some((contract) => contract.status === 'scheduled')).toBe(true);
    expect(CONTRACTS.some((contract) => contract.status === 'draft' && contract.renewalMode === 'automatic' && Boolean(contract.renewalOfContractId))).toBe(true);
    expect(EMPLOYEES.some((employee) => employee.employeeType === 'intern')).toBe(true);
    expect(EMPLOYEES.some((employee) => !employee.bankAccountMasked)).toBe(true);
  });

  it('covers payroll states, paid overtime and detailed schedules', () => {
    expect(INITIAL_PAYRUNS.some((run) => run.status === 'draft')).toBe(true);
    expect(INITIAL_PAYRUNS.some((run) => run.status === 'computed')).toBe(true);
    expect(INITIAL_PAYRUNS.some((run) => run.status === 'paid')).toBe(true);
    expect(INITIAL_PAYSLIPS.some((slip) => slip.overtime > 0)).toBe(true);
    expect(WORKING_SCHEDULES.every((schedule) => schedule.days.length === 7)).toBe(true);
  });
});
