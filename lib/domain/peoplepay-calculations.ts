export interface LeaveImpactInput {
  requestedWorkingDays: number;
  isPaidLeave: boolean;
  availablePaidDays?: number;
  monthlySalaryBasis: number;
  payableWorkingDays: number;
}

export function calculateLeaveImpact(input: LeaveImpactInput) {
  const requested = Math.max(0, input.requestedWorkingDays);
  const available = input.isPaidLeave ? Math.max(0, input.availablePaidDays ?? 0) : null;
  const paidDays = input.isPaidLeave ? Math.min(requested, available ?? 0) : 0;
  const unpaidDays = input.isPaidLeave ? requested - paidDays : requested;
  const dailyRate = input.monthlySalaryBasis / Math.max(1, input.payableWorkingDays);
  return {
    requestedDays: requested,
    availablePaidDays: available,
    paidDays,
    unpaidDays,
    estimatedLossOfPay: Math.round(unpaidDays * dailyRate * 100) / 100,
  };
}

export interface OvertimeInput {
  enabled: boolean;
  payEnabled: boolean;
  sessionClosed: boolean;
  elapsedMinutes: number;
  unpaidBreakMinutes: number;
  scheduledPayableMinutes: number;
  approvedMinutes: number;
  minimumEligibleMinutes: number;
  maxHoursPerDay: number;
  maxHoursPerMonth: number;
  alreadyCountedMinutesThisMonth: number;
  roundingIntervalMinutes: number;
  hourlyRate: number;
  multiplier: number;
}

export function calculateOvertime(input: OvertimeInput) {
  if (!input.enabled || !input.sessionClosed) return { trackedMinutes:0, payableMinutes:0, amount:0 };
  const worked = Math.max(0, input.elapsedMinutes - input.unpaidBreakMinutes);
  const raw = Math.max(0, worked - input.scheduledPayableMinutes);
  if (raw < input.minimumEligibleMinutes) return { trackedMinutes:raw, payableMinutes:0, amount:0 };
  const rounded = Math.floor(raw / input.roundingIntervalMinutes) * input.roundingIntervalMinutes;
  const monthlyRemaining = Math.max(0, input.maxHoursPerMonth * 60 - input.alreadyCountedMinutesThisMonth);
  const trackedMinutes = Math.min(rounded, input.maxHoursPerDay * 60, monthlyRemaining);
  const payableMinutes = input.payEnabled ? Math.min(trackedMinutes, Math.max(0, input.approvedMinutes)) : 0;
  const amount = Math.round((payableMinutes / 60) * input.hourlyRate * input.multiplier * 100) / 100;
  return { trackedMinutes, payableMinutes, amount };
}

export function distanceMeters(a:{latitude:number;longitude:number}, b:{latitude:number;longitude:number}) {
  const rad = (degrees:number) => degrees * Math.PI / 180;
  const earth = 6_371_000;
  const dLat = rad(b.latitude-a.latitude);
  const dLon = rad(b.longitude-a.longitude);
  const h = Math.sin(dLat/2) ** 2 + Math.cos(rad(a.latitude))*Math.cos(rad(b.latitude))*Math.sin(dLon/2) ** 2;
  return earth * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1-h));
}

export function verifyLocation(input:{ latitude?:number; longitude?:number; accuracyMeters?:number; permissionDenied?:boolean; office:{latitude:number;longitude:number;allowedRadiusMeters:number;maximumAccuracyMeters:number} }) {
  if (input.permissionDenied) return { status:'permission_denied' as const, distanceMeters:null };
  if (input.latitude == null || input.longitude == null || input.accuracyMeters == null) return { status:'unavailable' as const, distanceMeters:null };
  const distance = distanceMeters({latitude:input.latitude,longitude:input.longitude}, input.office);
  if (input.accuracyMeters > input.office.maximumAccuracyMeters) return { status:'low_accuracy' as const, distanceMeters:distance };
  return { status:distance <= input.office.allowedRadiusMeters ? 'verified' as const : 'outside_allowed_location' as const, distanceMeters:distance };
}

export interface CalendarDay { date:string; isRequested:boolean; isWorkingDay:boolean; isHoliday:boolean }
export function detectSandwichDays(days:CalendarDay[], policy:{enabled:boolean;includeWeeklyOffs:boolean;includePublicHolidays:boolean;minimumLeaveSpan:number}) {
  if (!policy.enabled) return [];
  const requestedIndexes = days.map((d,i)=>d.isRequested?i:-1).filter(i=>i>=0);
  if (requestedIndexes.length < policy.minimumLeaveSpan || requestedIndexes.length === 0) return [];
  const first=Math.min(...requestedIndexes); const last=Math.max(...requestedIndexes);
  return days.slice(first,last+1).filter(d => !d.isRequested && ((!d.isWorkingDay&&policy.includeWeeklyOffs)||(d.isHoliday&&policy.includePublicHolidays))).map(d=>d.date);
}

export function assertPayrollCanFinalize(lines:Array<{name:string;amount:number;category:'earning'|'deduction'}>) {
  const earnings=lines.filter(l=>l.category==='earning').reduce((s,l)=>s+l.amount,0);
  const deductions=lines.filter(l=>l.category==='deduction').reduce((s,l)=>s+l.amount,0);
  if (deductions > earnings) {
    const cause=[...lines].filter(l=>l.category==='deduction').sort((a,b)=>b.amount-a.amount)[0];
    throw new Error(`Payroll blocked: ${cause?.name ?? 'deductions'} causes net pay to be negative by ₹${(deductions-earnings).toFixed(2)}`);
  }
  return {earnings,deductions,net:earnings-deductions};
}

export function reconcileBankExport(included:Array<{amount:number}>, expectedPaymentTotal:number) {
  const total=Math.round(included.reduce((s,p)=>s+p.amount,0)*100)/100;
  if (total !== Math.round(expectedPaymentTotal*100)/100) throw new Error('Bank export total does not match included payroll-payment total');
  return total;
}

export type DerivedContractStatus='draft'|'scheduled'|'running'|'expired'|'terminated';
export function deriveContractStatus(input:{approved:boolean;startDate:string;endDate?:string;terminatedAt?:string}, asOf:string):DerivedContractStatus {
  if (input.terminatedAt) return 'terminated';
  if (!input.approved) return 'draft';
  if (input.startDate > asOf) return 'scheduled';
  if (input.endDate && input.endDate < asOf) return 'expired';
  return 'running';
}

export function contractsOverlap(a:{startDate:string;endDate?:string},b:{startDate:string;endDate?:string}) {
  return a.startDate <= (b.endDate ?? '9999-12-31') && b.startDate <= (a.endDate ?? '9999-12-31');
}

export function compensationLabel(category:string){return category==='intern'?'Monthly Stipend':'Monthly Salary'}
export function canManageOvertime(role:string){return role==='payroll_manager'||role==='admin'}
