import { describe, expect, it } from 'vitest';
import { assertPayrollCanFinalize, calculateLeaveImpact, calculateOvertime, canManageOvertime, compensationLabel, contractsOverlap, deriveContractStatus, detectSandwichDays, reconcileBankExport, verifyLocation } from './peoplepay-calculations';
import { INITIAL_LEAVE_REQUESTS } from '@/lib/mock-data/leaves';

describe('leave impact',()=>{
  it('treats unpaid leave as unlimited and never returns a balance',()=>expect(calculateLeaveImpact({requestedWorkingDays:3,isPaidLeave:false,availablePaidDays:10,monthlySalaryBasis:49000,payableWorkingDays:20})).toEqual({requestedDays:3,availablePaidDays:null,paidDays:0,unpaidDays:3,estimatedLossOfPay:7350}));
  it('uses paid balance before loss of pay',()=>expect(calculateLeaveImpact({requestedWorkingDays:5,isPaidLeave:true,availablePaidDays:3,monthlySalaryBasis:30000,payableWorkingDays:20}).unpaidDays).toBe(2));
});

describe('overtime',()=>{
  const base={enabled:true,payEnabled:true,sessionClosed:true,elapsedMinutes:660,unpaidBreakMinutes:60,scheduledPayableMinutes:480,approvedMinutes:120,minimumEligibleMinutes:30,maxHoursPerDay:4,maxHoursPerMonth:40,alreadyCountedMinutesThisMonth:0,roundingIntervalMinutes:15,hourlyRate:250,multiplier:1.5};
  it('pays approved closed-session overtime excluding breaks',()=>expect(calculateOvertime(base)).toEqual({trackedMinutes:120,payableMinutes:120,amount:750}));
  it('tracks but does not pay when pay is disabled',()=>expect(calculateOvertime({...base,payEnabled:false})).toEqual({trackedMinutes:120,payableMinutes:0,amount:0}));
  it('ignores open sessions and disabled policies',()=>{expect(calculateOvertime({...base,sessionClosed:false}).amount).toBe(0);expect(calculateOvertime({...base,enabled:false}).trackedMinutes).toBe(0)});
});

describe('payroll safeguards',()=>{
  it('blocks negative salaries and names the largest deduction',()=>expect(()=>assertPayrollCanFinalize([{name:'Salary',amount:1000,category:'earning'},{name:'Loan',amount:1200,category:'deduction'}])).toThrow(/Loan/));
  it('reconciles bank export totals exactly',()=>{expect(reconcileBankExport([{amount:100.1},{amount:200.2}],300.3)).toBe(300.3);expect(()=>reconcileBankExport([{amount:10}],11)).toThrow()});
});

describe('calendar and location policies',()=>{
  it('detects sandwich days only when enabled',()=>{const days=[{date:'2026-09-05',isRequested:true,isWorkingDay:true,isHoliday:false},{date:'2026-09-06',isRequested:false,isWorkingDay:false,isHoliday:false},{date:'2026-09-07',isRequested:true,isWorkingDay:true,isHoliday:false}];expect(detectSandwichDays(days,{enabled:true,includeWeeklyOffs:true,includePublicHolidays:false,minimumLeaveSpan:2})).toEqual(['2026-09-06']);expect(detectSandwichDays(days,{enabled:false,includeWeeklyOffs:true,includePublicHolidays:true,minimumLeaveSpan:2})).toEqual([])});
  it('classifies inside, outside and low-accuracy captures',()=>{const office={latitude:12.9716,longitude:77.5946,allowedRadiusMeters:150,maximumAccuracyMeters:100};expect(verifyLocation({latitude:12.9716,longitude:77.5946,accuracyMeters:10,office}).status).toBe('verified');expect(verifyLocation({latitude:13,longitude:77.6,accuracyMeters:10,office}).status).toBe('outside_allowed_location');expect(verifyLocation({latitude:12.9716,longitude:77.5946,accuracyMeters:150,office}).status).toBe('low_accuracy')});
});

describe('contract lifecycle',()=>{
  it('derives lifecycle states and detects overlaps',()=>{expect(deriveContractStatus({approved:true,startDate:'2026-10-01'},'2026-09-05')).toBe('scheduled');expect(deriveContractStatus({approved:true,startDate:'2026-01-01',endDate:'2026-08-31'},'2026-09-05')).toBe('expired');expect(contractsOverlap({startDate:'2026-01-01',endDate:'2026-09-30'},{startDate:'2026-09-01'})).toBe(true)});
});

describe('roles, intern compensation and rejected history',()=>{
  it('keeps intern as an employee category with stipend wording',()=>expect(compensationLabel('intern')).toBe('Monthly Stipend'));
  it('allows only payroll manager/admin to edit overtime',()=>{expect(canManageOvertime('payroll_user')).toBe(false);expect(canManageOvertime('payroll_manager')).toBe(true);expect(canManageOvertime('admin')).toBe(true)});
  it('has a deterministic rejected leave with complete history',()=>{const rejected=INITIAL_LEAVE_REQUESTS.find(r=>r.status==='rejected');expect(rejected?.rejectionReason).toBeTruthy();expect(rejected?.rejectedBy).toBeTruthy();expect(rejected?.rejectedAt).toBeTruthy()});
});
