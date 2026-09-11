// Generated-compatible Supabase type snapshot for the PeoplePay360 schema after
// 20260905130000. Regenerate from a linked project with `npm run db:types`.

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];
type Table<Row extends Record<string, any>, Insert extends Record<string, any> = Partial<Row>> = {
  Row: Row;
  Insert: Insert;
  Update: Partial<Insert>;
  Relationships: [];
};

export type AppRole = 'employee' | 'hr_manager' | 'payroll_user' | 'payroll_manager' | 'admin';
export type RequestStatus = 'draft' | 'submitted' | 'approved' | 'rejected' | 'cancelled';
export type ContractStatus = 'draft' | 'scheduled' | 'running' | 'expired' | 'terminated';
export type LoanPaymentType = 'installment' | 'partial_lump_sum' | 'full_settlement' | 'adjustment';
export type LocationVerificationStatus = 'verified' | 'outside_allowed_location' | 'low_accuracy' | 'permission_denied' | 'unavailable';

type CompanyRow = { id:string; name:string; legal_name:string|null; legal_address:string|null; currency_code:string; timezone:string; logo_path:string|null; organization_email_domain:string|null; employee_email_pattern:string; location_verification_enabled:boolean; outside_location_action:string; sandwich_leave_enabled:boolean; created_at:string; updated_at:string }
type ProfileRow = { id:string; full_name:string; personal_email:string|null; phone:string|null; avatar_path:string|null; date_of_birth:string|null; address:Json; emergency_contact:Json; created_at:string; updated_at:string }
type EmployeeRow = { id:string; company_id:string; user_id:string|null; employee_code:string; full_name:string; company_email:string; phone:string|null; department_id:string|null; position_id:string|null; manager_id:string|null; joining_date:string; exit_date:string|null; status:string; work_location:string|null; profile_photo_path:string|null; employment_category?:string; onboarding_status?:string; onboarding_completed_at?:string|null; onboarding_verified_by?:string|null; onboarding_verified_at?:string|null; pan_encrypted?:string|null; uan_encrypted?:string|null; account_status?:string;must_change_password?:boolean;email_verified_at?:string|null;onboarding_submitted_at?:string|null;onboarding_reviewed_at?:string|null;onboarding_reviewed_by?:string|null;onboarding_rejection_reason?:string|null;onboarding_correction_reason?:string|null;onboarding_correction_fields?:Json;last_invitation_sent_at?:string|null; current_contract_id?:string|null; biometric_enrollment_required?:boolean; biometric_enrolled_at?:string|null; biometric_platform_unavailable_at?:string|null; created_at:string; updated_at:string }
type RoleRow = { id:string; company_id:string; user_id:string; role:AppRole; created_at:string }
type DepartmentRow = {id:string;company_id:string;name:string;code:string;manager_employee_id:string|null;is_active:boolean;created_at:string;updated_at:string};
type JobPositionRow = {id:string;company_id:string;department_id:string|null;title:string;code:string;is_active:boolean;created_at:string;updated_at:string};
type WorkingScheduleRow = {id:string;company_id:string;name:string;timezone:string;grace_minutes:number;is_default:boolean;created_at:string;updated_at:string};
type WorkingScheduleDayRow = {id:string;schedule_id:string;iso_weekday:number;start_time:string|null;end_time:string|null;break_minutes:number;is_working_day:boolean};
type BankAccountRow = { id:string; company_id:string; employee_id:string; account_holder_name:string; bank_name:string; account_number_encrypted:string; account_last4:string; ifsc_code:string; is_primary:boolean; verification_status:RequestStatus; is_verified:boolean; verified_by:string|null; verified_at:string|null; created_at:string; updated_at:string }
type ContractRow = { id:string; company_id:string; employee_id:string; salary_structure_id:string; working_schedule_id:string|null; start_date:string; end_date:string|null; monthly_ctc:number; monthly_gross:number; basic_salary:number; allowance_config:Json; is_active:boolean; status:ContractStatus; approved_at:string|null; approved_by:string|null; terminated_at:string|null; termination_reason:string|null; created_at:string; updated_at:string }
type LeaveTypeRow = { id:string; company_id:string; name:string; code:string; is_paid:boolean; annual_allocation:number; carry_forward_limit:number; proof_required_after_days:number|null; is_active:boolean; created_at:string; updated_at:string }
type LeaveRequestRow = { id:string; company_id:string; employee_id:string; leave_type_id:string; start_date:string; end_date:string; requested_days:number; reason:string; status:RequestStatus; proof_status:string; estimated_unpaid_deduction:number; approver_id:string|null; reviewed_at:string|null; reviewer_note:string|null; normal_working_days:number|null; sandwich_days:number; total_chargeable_days:number|null; sandwich_policy_id:string|null; rejected_by:string|null; rejected_at:string|null; rejection_reason:string|null; created_at:string; updated_at:string }
type SalaryStructureRow = { id:string; company_id:string; name:string; code:string; description?:string|null; effective_from:string; effective_to?:string|null; is_active:boolean; created_by?:string|null; created_at:string; updated_at:string };
type SalaryRuleRow = { id:string; company_id:string; salary_structure_id:string; code:string; name:string; category:'earning'|'deduction'|'employer_contribution'|'reimbursement'; calculation_method:'fixed'|'percentage'|'statutory'|'input'; fixed_amount:number|null; percentage:number|null; percentage_base:string|null; statutory_rule_id:string|null; sequence:number; taxable:boolean; appears_on_payslip:boolean; is_active:boolean; created_at:string; updated_at:string };
type AttendanceRecordRow = { id:string; company_id:string; employee_id:string; date?:string; work_date?:string; check_in?:string|null; check_in_at?:string|null; check_out?:string|null; check_out_at?:string|null; check_in_method?:string|null; check_out_method?:string|null; check_in_device_id?:string|null; check_out_device_id?:string|null; worked_minutes?:number; late_minutes?:number; overtime_minutes?:number; status:string; total_hours?:number; overtime_hours?:number; location?:string|null; check_in_ip?:string|null; source_event_id?:string|null; notes?:string|null; remarks?:string|null; created_at:string; updated_at:string };
type PayRunRow = { id:string; company_id:string; name?:string; period_start:string; period_end:string; payment_date?:string|null; status:string; readiness_score?:number; employee_count?:number; total_employees?:number; total_gross:number; total_deductions:number; total_net:number; created_by?:string|null; approved_by?:string|null; approved_at?:string|null; created_at:string; updated_at:string };
type PayslipRow = { id:string; company_id:string; pay_run_id:string; employee_id:string; contract_id:string|null; period_start:string; period_end:string; paid_days:number; unpaid_leave_days:number; gross_amount:number; deduction_amount:number; employer_contribution:number; net_amount:number; currency_code:string; status:string; pdf_storage_path:string|null; explanation:Json; generated_at:string|null; overtime_minutes:number; overtime_amount:number; actual_unpaid_leave_deduction:number; pdf_checksum:string|null; finalized_by:string|null; finalized_at:string|null; created_at:string; updated_at:string }
type PayslipLineRow = { id:string; company_id:string; payslip_id:string; salary_rule_id:string|null; code:string; name:string; category:'earning'|'deduction'|'employer_contribution'|'reimbursement'; quantity:number; rate:number; base_amount:number; amount:number; calculation_note:string|null; sequence:number; created_at:string }
type LoanRow = { id:string; company_id:string; employee_id:string; loan_number:string; principal_amount:number; annual_interest_rate:number; interest_method:string; tenure_months:number; preferred_monthly_deduction:number; disbursed_amount:number; disbursed_on:string|null; outstanding_principal:number; accrued_interest:number; outstanding_interest:number; status:string; closed_at:string|null; closure_type:string|null; closure_reference:string|null; approved_by:string|null; approved_at:string|null; created_at:string; updated_at:string }
type LoanPaymentRow = { id:string; company_id:string; loan_id:string; employee_id:string; payment_type:LoanPaymentType; amount:number; principal_component:number; interest_component:number; paid_on:string; reference:string|null; notes:string|null; recorded_by:string|null; idempotency_key:string|null; request_fingerprint:string|null; balance_before:number|null; balance_after:number|null; metadata:Json; created_at:string }
type InvitationRow = { id:string; company_id:string; employee_id:string; invited_email:string; application_role:AppRole; token_hash:string; expires_at:string; delivery_status:string; provider_message_id:string|null; failure_reason:string|null; invited_by:string; sent_at:string|null; activated_at:string|null; created_at:string }
type ScheduleSegmentRow = { id:string; schedule_day_id:string; sequence:number; segment_type:string; start_time:string; end_time:string; is_paid:boolean; is_required:boolean; grace_minutes:number; overtime_eligible:boolean; created_at:string }
type ScheduleAssignmentRow = { id:string; company_id:string; employee_id:string|null; department_id:string|null; schedule_id:string; priority:number; effective_from:string; effective_to:string|null; created_by:string|null; created_at:string }
type OvertimePolicyRow = { id:string; company_id:string; version:number; enabled:boolean; pay_enabled:boolean; minimum_eligible_minutes:number; max_hours_per_day:number; max_hours_per_month:number; rounding_interval_minutes:number; multiplier:number; calculation_base:string; fixed_hourly_rate:number|null; requires_manager_approval:boolean; eligible_department_ids:string[]; eligible_roles:AppRole[]; eligible_employment_categories:string[]; effective_from:string; effective_to:string|null; created_by:string|null; created_at:string }
type OvertimeEntryRow = { id:string; company_id:string; employee_id:string; attendance_id:string; policy_id:string; overtime_minutes:number; approved_minutes:number; status:RequestStatus; approved_by:string|null; approved_at:string|null; payslip_id:string|null; amount:number; calculation:Json; created_at:string; updated_at:string }
type GeofenceRow = { id:string; company_id:string; name:string; latitude:number; longitude:number; allowed_radius_meters:number; maximum_accuracy_meters:number; is_active:boolean; created_at:string }
type LocationEventRow = { id:string; company_id:string; employee_id:string; attendance_id:string|null; event_type:'check_in'|'check_out'; latitude:number|null; longitude:number|null; accuracy_meters:number|null; geofence_id:string|null; distance_meters:number|null; verification_status:LocationVerificationStatus; captured_at:string; review_required:boolean; reviewed_by:string|null; reviewed_at:string|null; review_note:string|null }
type SandwichPolicyRow = { id:string; company_id:string; version:number; enabled:boolean; applicable_leave_type_ids:string[]; include_weekly_offs:boolean; include_public_holidays:boolean; minimum_leave_span:number; excluded_employment_categories:string[]; charge_as:'paid'|'unpaid'; effective_from:string; effective_to:string|null; created_by:string|null; created_at:string }
type TemplateRow = { id:string; name:string; code:string; description:string|null; created_by:string|null; created_at:string; updated_at:string }
type TemplateVersionRow = { id:string; template_id:string; version:number; effective_from:string; effective_to:string|null; status:string; created_by:string|null; created_at:string }
type TemplateRuleRow = { id:string; template_version_id:string; code:string; name:string; category:string; calculation_method:string; parameters:Json; dependency_codes:string[]; is_primary_basic:boolean; statutory_rule_id:string|null; sequence:number; is_active:boolean }
type TemplateAssignmentRow = { id:string; company_id:string; template_version_id:string; effective_from:string; effective_to:string|null; overrides:Json; employee_group_filter:Json; created_by:string|null; created_at:string; updated_at:string }
type CompanyBankRow = { id:string; company_id:string; display_name:string; bank_name:string; account_number_encrypted:string; account_last4:string; ifsc_code:string; is_active:boolean; created_at:string }
type BankTemplateRow = { id:string; company_id:string; name:string; file_format:'csv'|'xlsx'; column_config:Json; delimiter:string; is_default:boolean; created_at:string; updated_at:string }
type BankExportRow = { id:string; company_id:string; pay_run_id:string; company_bank_account_id:string; template_id:string; batch_reference:string; payment_date:string; included_employee_count:number; excluded_employee_count:number; total_amount:number; checksum:string|null; storage_path:string|null; generated_by:string; generated_at:string }
type BankExportItemRow = { id:string; export_id:string; payroll_payment_id:string|null; employee_id:string; included:boolean; exclusion_reason:string|null; amount:number; payment_reference:string|null }
type PayrollPaymentRow = { id:string; company_id:string; pay_run_id:string; payslip_id:string; employee_id:string; bank_account_id:string|null; amount:number; payment_method:string; status:string; scheduled_on:string|null; paid_at:string|null; bank_reference:string|null; failure_reason:string|null; created_by:string|null; created_at:string; updated_at:string };
type AuditRow = { id:number; company_id:string|null; actor_user_id:string|null; action:string; entity_table:string; entity_id:string; summary:Json; ip_address:string|null; created_at:string };
type DeductionDeferralRow = {id:string;company_id:string;employee_id:string;payslip_id:string;payslip_line_id:string;original_amount:number;deferred_amount:number;carry_forward_period:string;reason:string;status:string;created_by:string;created_at:string};
type ProfileUpdateRequestRow = { id:string; company_id:string; employee_id:string; requested_changes:Json; field_category:string; status:RequestStatus; reviewer_id:string|null; rejection_reason:string|null; created_at:string; updated_at:string };
type AttendanceCorrectionRequestRow = { id:string; company_id:string; employee_id:string; attendance_date:string; requested_check_in:string|null; requested_check_out:string|null; reason:string; status:RequestStatus; reviewer_id:string|null; rejection_reason:string|null; created_at:string; updated_at:string };
type NotificationRow = { id:string; company_id:string; user_id:string; title:string; message:string; type:string; action_url:string|null; metadata:Json; read_at:string|null; created_at:string };
type PayrollSimulationRow = { id:string; company_id:string; created_by:string|null; title:string; simulation_params:Json; status:string; total_cost_diff:number; created_at:string };
type PayrollSimulationImpactRow = { id:string; simulation_id:string; employee_id:string|null; current_gross:number; simulated_gross:number; diff:number; created_at:string };
type WebAuthnCredentialRow = {id:string;company_id:string;employee_id:string;user_id:string;credential_id:string;public_key:string;counter:number;transports:string[];device_label:string;backed_up:boolean;revoked_at:string|null;last_used_at:string|null;created_at:string};
type WebAuthnChallengeRow = {id:string;user_id:string;purpose:'registration'|'authentication';challenge:string;expires_at:string;consumed_at:string|null;created_at:string};
type FaceEnrollmentRow = {id:string;company_id:string;employee_id:string;encrypted_template:string;template_checksum:string;model_name:string;model_version:string;sample_count:number;consent_version:string;consented_at:string;revoked_at:string|null;enrolled_by:string;created_at:string};
type BiometricVerificationEventRow = {id:string;company_id:string;employee_id:string;method:'face'|'webauthn';outcome:'verified'|'rejected'|'unavailable'|'cancelled';confidence:number|null;liveness_passed:boolean|null;model_version:string|null;credential_id:string|null;occurred_at:string;metadata:Json};
type DemoEmailOutboxRow={id:string;company_id:string;recipient_email:string;cc_emails:string[];subject:string;safe_html_body:string;email_type:string;delivery_status:string;action_url:string|null;created_by:string|null;created_at:string;opened_at:string|null};
type AccountInvitationRow={id:string;company_id:string;employee_id:string;auth_user_id:string|null;personal_email:string;organization_email:string;requested_role:AppRole;status:string;verification_method:string;token_hash:string;expires_at:string;sent_at:string|null;verified_at:string|null;activated_at:string|null;created_by:string;created_at:string;updated_at:string};

export interface Database {
  public: {
    Tables: {
      companies: Table<CompanyRow>;
      profiles: Table<ProfileRow>;
      employees: Table<EmployeeRow>;
      user_company_roles: Table<RoleRow>;
      departments: Table<DepartmentRow>;
      job_positions: Table<JobPositionRow>;
      working_schedules: Table<WorkingScheduleRow>;
      working_schedule_days: Table<WorkingScheduleDayRow>;
      employee_bank_accounts: Table<BankAccountRow>;
      salary_structures: Table<SalaryStructureRow>;
      salary_rules: Table<SalaryRuleRow>;
      contracts: Table<ContractRow>;
      leave_types: Table<LeaveTypeRow>;
      leave_requests: Table<LeaveRequestRow>;
      attendance_records: Table<AttendanceRecordRow>;
      pay_runs: Table<PayRunRow>;
      payslips: Table<PayslipRow>;
      payslip_lines: Table<PayslipLineRow>;
      employee_loans: Table<LoanRow>;
      loan_payments: Table<LoanPaymentRow>;
      employee_invitations: Table<InvitationRow>;
      working_schedule_segments: Table<ScheduleSegmentRow>;
      employee_schedule_assignments: Table<ScheduleAssignmentRow>;
      overtime_policies: Table<OvertimePolicyRow>;
      overtime_entries: Table<OvertimeEntryRow>;
      office_geofences: Table<GeofenceRow>;
      attendance_location_events: Table<LocationEventRow>;
      sandwich_leave_policies: Table<SandwichPolicyRow>;
      salary_structure_templates: Table<TemplateRow>;
      salary_structure_template_versions: Table<TemplateVersionRow>;
      salary_structure_template_rules: Table<TemplateRuleRow>;
      company_salary_structure_assignments: Table<TemplateAssignmentRow>;
      company_bank_accounts: Table<CompanyBankRow>;
      bank_export_templates: Table<BankTemplateRow>;
      payroll_bank_exports: Table<BankExportRow>;
      payroll_bank_export_items: Table<BankExportItemRow>;
      payroll_payments: Table<PayrollPaymentRow>;
      audit_logs: Table<AuditRow>;
      payroll_deduction_deferrals: Table<DeductionDeferralRow>;
      profile_update_requests: Table<ProfileUpdateRequestRow>;
      attendance_correction_requests: Table<AttendanceCorrectionRequestRow>;
      notifications: Table<NotificationRow>;
      payroll_simulations: Table<PayrollSimulationRow>;
      payroll_simulation_impacts: Table<PayrollSimulationImpactRow>;
      employee_webauthn_credentials: Table<WebAuthnCredentialRow>;
      webauthn_challenges: Table<WebAuthnChallengeRow>;
      employee_face_enrollments: Table<FaceEnrollmentRow>;
      biometric_verification_events: Table<BiometricVerificationEventRow>;
      demo_email_outbox: Table<DemoEmailOutboxRow>;
      account_invitations: Table<AccountInvitationRow>;
    };
    Views: {
      v_employee_leave_summary: { Row: { employee_id:string; company_id:string; leave_year:number; approved_unpaid_days:number; pending_unpaid_days:number; estimated_lop:number; actual_lop:number }; Relationships: [] };
      v_employee_bank_accounts_masked: { Row: Omit<BankAccountRow,'account_number_encrypted'|'verified_by'|'verified_at'|'created_at'>; Relationships: [] };
    };
    Functions: {
      record_loan_payment: { Args: { p_loan_id:string; p_amount:number; p_payment_type:LoanPaymentType; p_reference:string; p_idempotency_key:string; p_repayment_adjustment?:string; p_notes?:string }; Returns:Json };
      review_leave_request: { Args: { p_leave_request_id:string; p_decision:RequestStatus; p_rejection_reason?:string }; Returns:LeaveRequestRow };
      refresh_contract_statuses: { Args:{ p_as_of?:string }; Returns:number };
      validate_salary_template_version: { Args:{ p_version_id:string }; Returns:Json };
      prepare_payroll_bank_export: { Args:{ p_pay_run_id:string; p_company_bank_account_id:string; p_template_id:string; p_batch_reference:string; p_payment_date:string }; Returns:Json };
      defer_payslip_deduction: {Args:{p_payslip_line_id:string;p_deferred_amount:number;p_carry_forward_period:string;p_reason:string};Returns:PayslipRow};
      create_work_schedule: {Args:{p_company_id:string;p_name:string;p_timezone:string;p_effective_from:string;p_effective_to?:string|null;p_assignment_type:'company'|'department'|'employee';p_assignment_id?:string|null;p_is_company_default:boolean;p_days:Json};Returns:string};
      assign_employee_contract: {Args:{p_contract_id:string};Returns:ContractRow};
      payroll_contract_eligibility: {Args:{p_company_id:string;p_period_start:string;p_period_end:string};Returns:{employee_id:string;contract_id:string|null;is_eligible:boolean;eligible_from:string|null;eligible_to:string|null;exclusion_reason:string|null}[]};
      check_in: {Args:{p_company_id:string;p_method:string;p_device_id?:string|null};Returns:AttendanceRecordRow};
      check_out: {Args:{p_company_id:string;p_method:string;p_device_id?:string|null};Returns:AttendanceRecordRow};
      record_attendance_with_location: { Args:{p_company_id:string;p_event_type:string;p_method:string;p_latitude?:number;p_longitude?:number;p_accuracy_meters?:number;p_permission_denied?:boolean;p_device_id?:string}; Returns:Json };
      preview_leave_impact_v2: { Args:{p_company_id:string;p_leave_type_id:string;p_start_date:string;p_end_date:string}; Returns:Json };
      calculate_overtime_entry: { Args:{p_attendance_id:string}; Returns:OvertimeEntryRow };
    };
    Enums: {
      app_role:AppRole; request_status:RequestStatus; contract_status:ContractStatus;
      loan_payment_type:LoanPaymentType; location_verification_status:LocationVerificationStatus;
    };
    CompositeTypes: Record<never, never>;
  };
}

export type Row<K extends keyof Database['public']['Tables']> = Database['public']['Tables'][K]['Row'];
