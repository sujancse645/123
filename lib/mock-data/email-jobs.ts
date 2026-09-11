import { EmailDistributionJob, EmailRecipientResult, EmailFailureReason } from '@/lib/types';
import { EMPLOYEES } from './employees';
import { INITIAL_PAYSLIPS } from './payroll';

/**
 * Generates initial realistic recipients for bulk payslip email distribution
 */
export function generateMockEmailRecipients(): EmailRecipientResult[] {
  const departments = ['Engineering', 'Human Resources', 'Finance & Accounts', 'Product Design', 'Operations & Logistics'];
  const results: EmailRecipientResult[] = [];

  // Generate 200 demo recipients to match prompt's demonstrated scale
  for (let i = 1; i <= 200; i++) {
    const baseEmp = EMPLOYEES[(i - 1) % EMPLOYEES.length];
    const dept = departments[(i - 1) % departments.length];
    const empId = `emp-${i}`;
    const empCode = `PP-EMP-${1000 + i}`;
    const name = i <= EMPLOYEES.length ? baseEmp.name : `${baseEmp.name.split(' ')[0]} ${String.fromCharCode(65 + (i % 26))}.`;

    let status: EmailRecipientResult['status'] = 'sent';
    let failureReason: EmailFailureReason | undefined = undefined;
    let failureMessage: string | undefined = undefined;

    // Simulate 50 failures initially (indices 151 to 200)
    if (i > 150) {
      status = 'failed';
      if (i % 5 === 1) {
        failureReason = 'missing_email';
        failureMessage = 'Corporate email address not configured in employee profile';
      } else if (i % 5 === 2) {
        failureReason = 'invalid_email';
        failureMessage = 'Domain MX record lookup failed or invalid mailbox syntax';
      } else if (i % 5 === 3) {
        failureReason = 'payslip_pdf_unavailable';
        failureMessage = 'PDF artifact generation timed out or damaged digital signature';
      } else if (i % 5 === 4) {
        failureReason = 'service_error';
        failureMessage = 'Relay rate limit reached (550 Exceeded maximum concurrent sends)';
      } else {
        failureReason = 'timeout';
        failureMessage = 'Gateway connection closed unexpectedly after 30,000ms';
      }
    }

    results.push({
      id: `recip-${i}`,
      employeeId: empId,
      employeeName: name,
      employeeCode: empCode,
      department: dept,
      jobPosition: baseEmp.jobPosition,
      email: i % 5 === 1 && status === 'failed' ? '' : `${name.toLowerCase().replace(/[^a-z]/g, '')}@peoplepay360.internal`,
      status,
      failureReason,
      failureMessage,
      attemptCount: 1,
      lastAttemptTime: '01 Sep 2026, 10:14 AM',
      retryStatus: 'not_retried',
      payslipId: `ps-aug-${i}`,
      netSalary: 38000 + ((i * 1250) % 45000),
    });
  }

  return results;
}

const INITIAL_RECIPIENTS = generateMockEmailRecipients();

export const INITIAL_EMAIL_JOB: EmailDistributionJob = {
  id: 'job-aug-2026-01',
  payrunId: 'pr-202608',
  payrunName: 'Regular Payrun — August 2026',
  period: '01 Aug 2026 – 31 Aug 2026',
  subject: 'Confidential: Your PeoplePay360 Payslip for August 2026',
  templateName: 'Standard Corporate Payslip (HTML + Password Protected PDF)',
  totalSelected: 200,
  queuedCount: 0,
  sendingCount: 0,
  successfullySent: 150,
  failedCount: 50,
  pendingCount: 0,
  progressPercentage: 100,
  elapsedSeconds: 24,
  status: 'completed_with_errors',
  recipients: INITIAL_RECIPIENTS,
  startedAt: '2026-09-01 10:12:00',
  completedAt: '2026-09-01 10:14:24',
};
