import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, Json, LoanPaymentType, RequestStatus } from './database.types';

export type PeoplePayClient = SupabaseClient<Database>;

function unwrap<T>({ data, error }: { data:T; error:unknown }): T {
  if (error) throw error;
  return data;
}

export const peoplePayQueries = {
  leaveSummary: async (client:PeoplePayClient, employeeId:string, year:number) =>
    unwrap(await client.from('v_employee_leave_summary').select('*').eq('employee_id', employeeId).eq('leave_year', year).maybeSingle()),
  maskedBankAccounts: async (client:PeoplePayClient, employeeId:string) =>
    unwrap(await client.from('v_employee_bank_accounts_masked').select('*').eq('employee_id', employeeId)),
  reviewLeave: async (client:PeoplePayClient, id:string, decision:Extract<RequestStatus,'approved'|'rejected'>, reason?:string) =>
    unwrap(await client.rpc('review_leave_request', { p_leave_request_id:id, p_decision:decision, p_rejection_reason:reason })),
  recordLoanPayment: async (client:PeoplePayClient, input:{ loanId:string; amount:number; type:LoanPaymentType; reference:string; idempotencyKey:string; adjustment?:'reduce_tenure'|'reduce_monthly_deduction'; notes?:string }) =>
    unwrap(await client.rpc('record_loan_payment', { p_loan_id:input.loanId, p_amount:input.amount, p_payment_type:input.type, p_reference:input.reference, p_idempotency_key:input.idempotencyKey, p_repayment_adjustment:input.adjustment, p_notes:input.notes })),
  loanLedger: async (client:PeoplePayClient, loanId:string) =>
    unwrap(await client.from('loan_payments').select('*').eq('loan_id', loanId).order('created_at', { ascending:false })),
  activeOvertimePolicy: async (client:PeoplePayClient, companyId:string, onDate:string) =>
    unwrap(await client.from('overtime_policies').select('*').eq('company_id',companyId).lte('effective_from',onDate).or(`effective_to.is.null,effective_to.gte.${onDate}`).order('version',{ascending:false}).limit(1).maybeSingle()),
  nextOvertimePolicyVersion: async (client:PeoplePayClient, companyId:string) => {
    const { data, error } = await client.from('overtime_policies').select('version').eq('company_id', companyId).order('version', { ascending: false }).limit(1).maybeSingle();
    if (error) throw error;
    return (data?.version ?? 0) + 1;
  },
  saveOvertimePolicy: async (client:PeoplePayClient, values:Database['public']['Tables']['overtime_policies']['Insert']) =>
    unwrap(await client.from('overtime_policies').insert(values).select().single()),
  overtimeEntries: async (client:PeoplePayClient, employeeId:string) =>
    unwrap(await client.from('overtime_entries').select('*').eq('employee_id',employeeId).order('created_at',{ascending:false})),
  geofences: async (client:PeoplePayClient, companyId:string) =>
    unwrap(await client.from('office_geofences').select('*').eq('company_id',companyId).eq('is_active',true)),
  locationEvents: async (client:PeoplePayClient, employeeId:string) =>
    unwrap(await client.from('attendance_location_events').select('*').eq('employee_id',employeeId).order('captured_at',{ascending:false})),
  sandwichPolicy: async (client:PeoplePayClient, companyId:string, onDate:string) =>
    unwrap(await client.from('sandwich_leave_policies').select('*').eq('company_id',companyId).lte('effective_from',onDate).or(`effective_to.is.null,effective_to.gte.${onDate}`).order('version',{ascending:false}).limit(1).maybeSingle()),
  scheduleSegments: async (client:PeoplePayClient, scheduleDayId:string) =>
    unwrap(await client.from('working_schedule_segments').select('*').eq('schedule_day_id',scheduleDayId).order('sequence')),
  scheduleAssignments: async (client:PeoplePayClient, companyId:string) =>
    unwrap(await client.from('employee_schedule_assignments').select('*').eq('company_id',companyId).order('priority')),
  salaryTemplates: async (client:PeoplePayClient) => unwrap(await client.from('salary_structure_templates').select('*').order('name')),
  salaryTemplateVersions: async (client:PeoplePayClient, templateId:string) => unwrap(await client.from('salary_structure_template_versions').select('*').eq('template_id',templateId).order('version',{ascending:false})),
  salaryTemplateRules: async (client:PeoplePayClient, versionId:string) => unwrap(await client.from('salary_structure_template_rules').select('*').eq('template_version_id',versionId).order('sequence')),
  salaryAssignments: async (client:PeoplePayClient, companyId:string) => unwrap(await client.from('company_salary_structure_assignments').select('*').eq('company_id',companyId)),
  validateSalaryTemplate: async (client:PeoplePayClient, versionId:string) => unwrap(await client.rpc('validate_salary_template_version',{p_version_id:versionId})),
  companyBankAccounts: async (client:PeoplePayClient, companyId:string) => unwrap(await client.from('company_bank_accounts').select('id,company_id,display_name,bank_name,account_last4,ifsc_code,is_active,created_at').eq('company_id',companyId).eq('is_active',true)),
  bankExportTemplates: async (client:PeoplePayClient, companyId:string) => unwrap(await client.from('bank_export_templates').select('*').eq('company_id',companyId)),
  bankExports: async (client:PeoplePayClient, payRunId:string) => unwrap(await client.from('payroll_bank_exports').select('*').eq('pay_run_id',payRunId).order('generated_at',{ascending:false})),
  bankExportItems: async (client:PeoplePayClient, exportId:string) => unwrap(await client.from('payroll_bank_export_items').select('*').eq('export_id',exportId)),
  invitations: async (client:PeoplePayClient, companyId:string) => unwrap(await client.from('employee_invitations').select('id,company_id,employee_id,invited_email,application_role,expires_at,delivery_status,provider_message_id,failure_reason,invited_by,sent_at,activated_at,created_at').eq('company_id',companyId).order('created_at',{ascending:false})),
  contractHistory: async (client:PeoplePayClient, employeeId:string) => unwrap(await client.from('contracts').select('*').eq('employee_id',employeeId).order('start_date',{ascending:false})),
  payrollContractEligibility: async(client:PeoplePayClient,companyId:string,periodStart:string,periodEnd:string)=>unwrap(await client.rpc('payroll_contract_eligibility',{p_company_id:companyId,p_period_start:periodStart,p_period_end:periodEnd})),
  updateCompanyAssignmentOverrides: async (client:PeoplePayClient, assignmentId:string, overrides:Json) => unwrap(await client.from('company_salary_structure_assignments').update({overrides}).eq('id',assignmentId).select().single()),
  recordAttendanceWithLocation: async (client:PeoplePayClient,input:{companyId:string;eventType:'check_in'|'check_out';method:'face'|'fingerprint'|'manual';latitude?:number;longitude?:number;accuracyMeters?:number;permissionDenied?:boolean;deviceId?:string})=>{
    const enhanced=await client.rpc('record_attendance_with_location',{p_company_id:input.companyId,p_event_type:input.eventType,p_method:input.method,p_latitude:input.latitude,p_longitude:input.longitude,p_accuracy_meters:input.accuracyMeters,p_permission_denied:input.permissionDenied,p_device_id:input.deviceId});
    if(!enhanced.error)return enhanced.data;
    if(enhanced.error.code!=='PGRST202'&&!enhanced.error.message.includes('Could not find the function'))throw enhanced.error;
    if(input.method==='manual')throw new Error('Manual attendance is not supported');
    const legacy=input.eventType==='check_in'
      ? await client.rpc('check_in',{p_company_id:input.companyId,p_method:input.method,p_device_id:input.deviceId??null})
      : await client.rpc('check_out',{p_company_id:input.companyId,p_method:input.method,p_device_id:input.deviceId??null});
    return unwrap(legacy);
  },
  previewLeaveImpact: async(client:PeoplePayClient,input:{companyId:string;leaveTypeId:string;startDate:string;endDate:string})=>unwrap(await client.rpc('preview_leave_impact_v2',{p_company_id:input.companyId,p_leave_type_id:input.leaveTypeId,p_start_date:input.startDate,p_end_date:input.endDate})),
  calculateOvertimeEntry: async(client:PeoplePayClient,attendanceId:string)=>unwrap(await client.rpc('calculate_overtime_entry',{p_attendance_id:attendanceId})),
  prepareBankExport: async(client:PeoplePayClient,input:{payRunId:string;companyBankAccountId:string;templateId:string;batchReference:string;paymentDate:string})=>unwrap(await client.rpc('prepare_payroll_bank_export',{p_pay_run_id:input.payRunId,p_company_bank_account_id:input.companyBankAccountId,p_template_id:input.templateId,p_batch_reference:input.batchReference,p_payment_date:input.paymentDate})),
  deferPayslipDeduction: async(client:PeoplePayClient,input:{payslipLineId:string;amount:number;carryForwardPeriod:string;reason:string})=>unwrap(await client.rpc('defer_payslip_deduction',{p_payslip_line_id:input.payslipLineId,p_deferred_amount:input.amount,p_carry_forward_period:input.carryForwardPeriod,p_reason:input.reason})),
  deductionDeferrals: async(client:PeoplePayClient,payslipId:string)=>unwrap(await client.from('payroll_deduction_deferrals').select('*').eq('payslip_id',payslipId).order('created_at',{ascending:false})),
  createWorkSchedule: async(client:PeoplePayClient,input:{companyId:string;name:string;timezone:string;effectiveFrom:string;effectiveTo?:string;assignmentType:'company'|'department'|'employee';assignmentId?:string;isCompanyDefault:boolean;days:Json})=>unwrap(await client.rpc('create_work_schedule',{p_company_id:input.companyId,p_name:input.name,p_timezone:input.timezone,p_effective_from:input.effectiveFrom,p_effective_to:input.effectiveTo??null,p_assignment_type:input.assignmentType,p_assignment_id:input.assignmentId??null,p_is_company_default:input.isCompanyDefault,p_days:input.days})),
};
