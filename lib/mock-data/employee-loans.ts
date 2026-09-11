import { EmployeeLoan, LoanInstalment } from '@/lib/types';

export const COMPANY_LOAN_POLICY = {
  minAmount: 10000,
  maxAmount: 300000,
  defaultInterestRate: 6.0, // 6% p.a.
  minMonthlyDeduction: 2000,
  maxMonthlyDeduction: 25000,
  minTenureMonths: 6,
  maxTenureMonths: 36,
  earlySettlementFee: 0, // No early closure penalty
};

/**
 * Generates an amortized monthly repayment schedule
 */
export function generateRepaymentSchedule(
  principal: number,
  annualRatePct: number,
  monthlyDeduction: number,
  startMonthYear: string = 'Feb 2026'
): LoanInstalment[] {
  const schedule: LoanInstalment[] = [];
  let balance = principal;
  const monthlyRate = annualRatePct / 12 / 100;
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  // Parse start month
  const [startM, startYStr] = startMonthYear.split(' ');
  let curMIdx = months.indexOf(startM);
  let curYear = parseInt(startYStr || '2026', 10);
  if (curMIdx === -1) curMIdx = 1;

  let instNum = 1;
  while (balance > 0 && instNum <= 48) {
    const opening = balance;
    const interest = Math.round(opening * monthlyRate);
    let deduction = monthlyDeduction;
    let principalPaid = deduction - interest;

    if (opening + interest <= deduction) {
      deduction = opening + interest;
      principalPaid = opening;
      balance = 0;
    } else {
      balance = opening - principalPaid;
    }

    const monthLabel = `${months[curMIdx]} ${curYear}`;
    // Determine status based on date relative to current (Sep 2026)
    let status: LoanInstalment['status'] = 'upcoming';
    if (curYear < 2026 || (curYear === 2026 && curMIdx < 8)) {
      status = 'deducted';
    } else if (curYear === 2026 && curMIdx === 8) {
      status = 'upcoming'; // Sep 2026
    }

    schedule.push({
      id: `inst-${instNum}`,
      instalmentNumber: instNum,
      payrollMonth: monthLabel,
      openingBalance: Math.round(opening),
      principalDeducted: Math.round(principalPaid),
      interestDeducted: Math.round(interest),
      totalMonthlyDeduction: Math.round(deduction),
      closingBalance: Math.max(0, Math.round(balance)),
      status,
      paidDate: status === 'deducted' ? `28 ${monthLabel}` : undefined,
    });

    curMIdx++;
    if (curMIdx > 11) {
      curMIdx = 0;
      curYear++;
    }
    instNum++;
  }

  return schedule;
}

const ROHAN_SCHEDULE = generateRepaymentSchedule(100000, 6, 5000, 'Feb 2026');

export const INITIAL_EMPLOYEE_LOANS: EmployeeLoan[] = [
  {
    id: 'loan-001',
    loanNumber: 'LN-2026-0042',
    employeeId: 'emp-1',
    employeeName: 'Rohan Sharma',
    department: 'Engineering',
    principalAmount: 100000,
    annualInterestRate: 6.0,
    interestMethod: 'reducing_balance',
    totalPayableAmount: 105250,
    amountRepaid: 35000,
    outstandingPrincipal: 67250,
    outstandingInterest: 2150,
    outstandingTotal: 69400,
    monthlyPayrollDeduction: 5000,
    totalInstalments: 21,
    remainingInstalments: 14,
    nextDeductionDate: '01 Oct 2026',
    loanStartDate: '01 Feb 2026',
    expectedCompletionDate: '01 Oct 2027',
    status: 'active',
    purpose: 'Home renovation and employee relocation deposit',
    supportingDocName: 'Rental_Agreement_Agreement_Proof.pdf',
    repaymentSchedule: ROHAN_SCHEDULE,
    partialPayments: [{id:'lump-demo-001',loanId:'loan-001',paymentAmount:10000,paymentDate:'2026-06-15',paymentMethod:'bank_transfer',preOutstanding:79400,postOutstanding:69400,repaymentAdjustment:'reduce_tenure',principalComponent:9850,interestComponent:150,reference:'UTR-DEMO-10001',idempotencyKey:'demo-lump-001'}],
    transactionHistory: [{id:'txn-demo-001',loanId:'loan-001',type:'partial_lump_sum',amount:10000,principalComponent:9850,interestComponent:150,balanceBefore:79400,balanceAfter:69400,paidOn:'2026-06-15',reference:'UTR-DEMO-10001',idempotencyKey:'demo-lump-001'}],
    approvedByHRDate: '2026-01-20',
    approvedByPayrollDate: '2026-01-24',
  },
  {
    id: 'loan-002',
    loanNumber: 'LN-2026-0048',
    employeeId: 'emp-2',
    employeeName: 'Priya Patel',
    department: 'Human Resources',
    principalAmount: 50000,
    annualInterestRate: 6.0,
    interestMethod: 'reducing_balance',
    totalPayableAmount: 51800,
    amountRepaid: 0,
    outstandingPrincipal: 50000,
    outstandingInterest: 1800,
    outstandingTotal: 51800,
    monthlyPayrollDeduction: 5000,
    totalInstalments: 10,
    remainingInstalments: 10,
    nextDeductionDate: '01 Oct 2026',
    loanStartDate: '01 Oct 2026',
    expectedCompletionDate: '01 Jul 2027',
    status: 'payroll_review',
    purpose: 'Professional certification & higher education course fee',
    supportingDocName: 'Executive_Program_Admission_Letter.pdf',
    repaymentSchedule: generateRepaymentSchedule(50000, 6, 5000, 'Oct 2026'),
    approvedByHRDate: '2026-08-25',
  },
  {
    id: 'loan-003',
    loanNumber: 'LN-2026-0035',
    employeeId: 'emp-3',
    employeeName: 'Amit Verma',
    department: 'Finance & Accounts',
    principalAmount: 150000,
    annualInterestRate: 6.0,
    interestMethod: 'reducing_balance',
    totalPayableAmount: 158400,
    amountRepaid: 90000,
    outstandingPrincipal: 64200,
    outstandingInterest: 1200,
    outstandingTotal: 65400,
    monthlyPayrollDeduction: 10000,
    totalInstalments: 16,
    remainingInstalments: 7,
    nextDeductionDate: '01 Oct 2026',
    loanStartDate: '01 Jan 2026',
    expectedCompletionDate: '01 Apr 2027',
    status: 'settlement_requested',
    purpose: 'Medical emergency advance for family hospitalisation',
    supportingDocName: 'Hospital_Estimates_Invoice.pdf',
    repaymentSchedule: generateRepaymentSchedule(150000, 6, 10000, 'Jan 2026'),
    settlementRequest: {
      id: 'settle-001',
      loanId: 'loan-003',
      outstandingPrincipal: 64200,
      accruedInterest: 642,
      earlySettlementCharge: 0,
      totalSettlementAmount: 64842,
      proposedPaymentDate: '2026-09-15',
      requestedAt: '2026-09-02',
      status: 'pending_review',
      settlementStatementGenerated: true,
    },
    approvedByHRDate: '2025-12-20',
    approvedByPayrollDate: '2025-12-28',
  },
  {
    id: 'loan-005', loanNumber: 'LN-2025-0020', employeeId: 'emp-5', employeeName: 'Sudeesh K', department: 'Administration', principalAmount: 40000, annualInterestRate: 6, interestMethod: 'reducing_balance', totalPayableAmount: 41800, amountRepaid: 41800, outstandingPrincipal: 0, outstandingInterest: 0, outstandingTotal: 0, monthlyPayrollDeduction: 5000, totalInstalments: 9, remainingInstalments: 0, nextDeductionDate: '', loanStartDate: '01 Oct 2025', expectedCompletionDate: '01 Jun 2026', status: 'closed', purpose: 'Relocation advance', repaymentSchedule: generateRepaymentSchedule(40000,6,5000,'Oct 2025').map(i=>({...i,status:'settled'})), closedAt:'2026-05-12', closureType:'early_full', closureReference:'UTR-DEMO-CLOSE-001', transactionHistory:[{id:'txn-demo-close',loanId:'loan-005',type:'full_settlement',amount:11800,principalComponent:11500,interestComponent:300,balanceBefore:11800,balanceAfter:0,paidOn:'2026-05-12',reference:'UTR-DEMO-CLOSE-001',idempotencyKey:'demo-close-001'}]},
  {
    id: 'loan-004',
    loanNumber: 'LN-2026-0051',
    employeeId: 'emp-4',
    employeeName: 'Sneha Kulkarni',
    department: 'Product Design',
    principalAmount: 75000,
    annualInterestRate: 6.0,
    interestMethod: 'reducing_balance',
    totalPayableAmount: 78500,
    amountRepaid: 0,
    outstandingPrincipal: 75000,
    outstandingInterest: 3500,
    outstandingTotal: 78500,
    monthlyPayrollDeduction: 6500,
    totalInstalments: 12,
    remainingInstalments: 12,
    nextDeductionDate: '01 Oct 2026',
    loanStartDate: '01 Oct 2026',
    expectedCompletionDate: '01 Sep 2027',
    status: 'hr_review',
    purpose: 'Emergency family medical expenses',
    supportingDocName: 'Medical_Bills_Summary.pdf',
    repaymentSchedule: generateRepaymentSchedule(75000, 6, 6500, 'Oct 2026'),
  },
];
