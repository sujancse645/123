-- PeoplePay360: Supabase/PostgreSQL backend setup
-- Target: a fresh Supabase project. Run in the SQL Editor as the postgres owner.
-- Money uses numeric, timestamps use timestamptz, and all exposed tables use RLS.

create extension if not exists pgcrypto;

-- -----------------------------------------------------------------------------
-- 1. ENUMS
-- -----------------------------------------------------------------------------

create type public.app_role as enum (
  'employee', 'hr_manager', 'payroll_user', 'payroll_manager', 'admin'
);
create type public.employment_status as enum ('onboarding', 'active', 'notice', 'inactive', 'terminated');
create type public.verification_method as enum ('face', 'fingerprint', 'manual', 'import');
create type public.attendance_status as enum ('present', 'late', 'half_day', 'absent', 'on_leave');
create type public.request_status as enum ('draft', 'submitted', 'approved', 'rejected', 'cancelled');
create type public.proof_status as enum ('not_required', 'pending', 'uploaded', 'verified', 'rejected');
create type public.pay_run_status as enum ('draft', 'calculating', 'review', 'approved', 'paid', 'cancelled');
create type public.payslip_status as enum ('draft', 'validated', 'paid', 'cancelled');
create type public.payment_status as enum ('draft', 'scheduled', 'processing', 'completed', 'failed', 'cancelled');
create type public.warning_severity as enum ('info', 'warning', 'blocking');
create type public.loan_status as enum ('draft', 'approved', 'active', 'closed', 'rejected', 'cancelled');
create type public.loan_interest_method as enum ('none', 'flat', 'reducing_balance');
create type public.loan_payment_type as enum ('installment', 'partial_lump_sum', 'full_settlement', 'adjustment');
create type public.email_job_status as enum ('queued', 'processing', 'completed', 'partial_failure', 'failed');
create type public.email_recipient_status as enum ('queued', 'sent', 'failed', 'skipped');

-- -----------------------------------------------------------------------------
-- 2. CORE ORGANIZATION AND IDENTITY
-- -----------------------------------------------------------------------------

create table public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  legal_name text,
  tax_id text,
  currency_code char(3) not null default 'INR' check (currency_code = 'INR'),
  timezone text not null default 'Asia/Kolkata',
  country_code char(2) not null default 'IN',
  logo_path text,
  medical_proof_threshold_days integer not null default 10 check (medical_proof_threshold_days >= 0),
  unpaid_leave_deduction_basis text not null default 'gross'
    check (unpaid_leave_deduction_basis in ('basic', 'gross')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  personal_email text,
  phone text,
  avatar_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.departments (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null,
  code text not null,
  manager_employee_id uuid,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, code),
  unique (company_id, name)
);

create table public.job_positions (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  department_id uuid references public.departments(id) on delete set null,
  title text not null,
  code text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, code)
);

create table public.employees (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  employee_code text not null,
  full_name text not null,
  company_email text not null,
  phone text,
  department_id uuid references public.departments(id) on delete set null,
  position_id uuid references public.job_positions(id) on delete set null,
  manager_id uuid references public.employees(id) on delete set null,
  joining_date date not null,
  exit_date date,
  status public.employment_status not null default 'onboarding',
  work_location text,
  profile_photo_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, employee_code),
  unique (company_id, company_email),
  unique (company_id, user_id),
  check (exit_date is null or exit_date >= joining_date)
);

alter table public.departments
  add constraint departments_manager_fk
  foreign key (manager_employee_id) references public.employees(id) on delete set null;

create table public.user_company_roles (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique (company_id, user_id, role)
);

create table public.employee_bank_accounts (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete cascade,
  account_holder_name text not null,
  bank_name text not null,
  account_number_encrypted text not null,
  account_last4 char(4) not null,
  ifsc_code text not null,
  is_primary boolean not null default true,
  verification_status request_status not null default 'submitted',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- 3. WORK SCHEDULES, CONTRACTS, SALARY CONFIGURATION, AND STATUTORY RULES
-- -----------------------------------------------------------------------------

create table public.working_schedules (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null,
  timezone text not null default 'Asia/Kolkata',
  grace_minutes integer not null default 10 check (grace_minutes >= 0),
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, name)
);

create table public.working_schedule_days (
  id uuid primary key default gen_random_uuid(),
  schedule_id uuid not null references public.working_schedules(id) on delete cascade,
  iso_weekday smallint not null check (iso_weekday between 1 and 7),
  start_time time,
  end_time time,
  break_minutes integer not null default 0 check (break_minutes >= 0),
  is_working_day boolean not null default true,
  unique (schedule_id, iso_weekday),
  check (not is_working_day or (start_time is not null and end_time is not null and end_time > start_time))
);

create table public.salary_structures (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null,
  code text not null,
  description text,
  effective_from date not null,
  effective_to date,
  is_active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, code, effective_from),
  check (effective_to is null or effective_to >= effective_from)
);

create table public.statutory_contribution_rules (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id) on delete cascade,
  country_code char(2) not null default 'IN',
  scheme_code text not null,
  name text not null,
  employee_rate numeric(7,4) not null default 0 check (employee_rate between 0 and 1),
  employer_rate numeric(7,4) not null default 0 check (employer_rate between 0 and 1),
  wage_basis text not null default 'basic',
  wage_ceiling numeric(14,2),
  min_contribution numeric(14,2),
  max_contribution numeric(14,2),
  parameters jsonb not null default '{}'::jsonb,
  source_url text,
  effective_from date not null,
  effective_to date,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique nulls not distinct (company_id, scheme_code, effective_from),
  check (effective_to is null or effective_to >= effective_from)
);

create table public.salary_rules (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  salary_structure_id uuid not null references public.salary_structures(id) on delete cascade,
  code text not null,
  name text not null,
  category text not null check (category in ('earning', 'deduction', 'employer_contribution', 'reimbursement')),
  calculation_method text not null check (calculation_method in ('fixed', 'percentage', 'statutory', 'input')),
  fixed_amount numeric(14,2),
  percentage numeric(7,4) check (percentage is null or percentage between 0 and 1),
  percentage_base text,
  statutory_rule_id uuid references public.statutory_contribution_rules(id) on delete restrict,
  sequence integer not null default 100,
  taxable boolean not null default false,
  appears_on_payslip boolean not null default true,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (salary_structure_id, code),
  check (
    (calculation_method <> 'fixed' or fixed_amount is not null) and
    (calculation_method <> 'percentage' or percentage is not null) and
    (calculation_method <> 'statutory' or statutory_rule_id is not null)
  )
);

create table public.contracts (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete cascade,
  salary_structure_id uuid not null references public.salary_structures(id) on delete restrict,
  working_schedule_id uuid references public.working_schedules(id) on delete restrict,
  start_date date not null,
  end_date date,
  monthly_ctc numeric(14,2) not null check (monthly_ctc >= 0),
  monthly_gross numeric(14,2) not null check (monthly_gross >= 0),
  basic_salary numeric(14,2) not null check (basic_salary >= 0),
  allowance_config jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_date is null or end_date >= start_date)
);

create unique index contracts_one_active_per_employee
  on public.contracts (employee_id) where is_active and end_date is null;

create table public.holidays (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  holiday_date date not null,
  name text not null,
  location text,
  unique (company_id, holiday_date, name)
);

-- -----------------------------------------------------------------------------
-- 4. ATTENDANCE AND BIOMETRIC INTEGRATION
-- -----------------------------------------------------------------------------

create table public.biometric_devices (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  device_code text not null,
  name text not null,
  device_type public.verification_method not null check (device_type = 'fingerprint'),
  location text,
  last_sync_at timestamptz,
  is_online boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, device_code)
);

create table public.biometric_employee_mappings (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  device_id uuid not null references public.biometric_devices(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete cascade,
  external_biometric_id text not null,
  created_at timestamptz not null default now(),
  unique (device_id, employee_id),
  unique (device_id, external_biometric_id)
);

create table public.attendance_records (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete cascade,
  work_date date not null default current_date,
  check_in_at timestamptz not null,
  check_out_at timestamptz,
  check_in_method public.verification_method not null,
  check_out_method public.verification_method,
  check_in_device_id uuid references public.biometric_devices(id) on delete set null,
  check_out_device_id uuid references public.biometric_devices(id) on delete set null,
  worked_minutes integer not null default 0 check (worked_minutes >= 0),
  late_minutes integer not null default 0 check (late_minutes >= 0),
  overtime_minutes integer not null default 0 check (overtime_minutes >= 0),
  status public.attendance_status not null default 'present',
  source_event_id text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (check_out_at is null or check_out_at >= check_in_at)
);

create unique index attendance_one_open_session
  on public.attendance_records (employee_id) where check_out_at is null;
create unique index attendance_source_event_unique
  on public.attendance_records (company_id, source_event_id) where source_event_id is not null;

create table public.attendance_correction_requests (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete cascade,
  attendance_id uuid references public.attendance_records(id) on delete set null,
  requested_check_in timestamptz,
  requested_check_out timestamptz,
  reason text not null,
  status public.request_status not null default 'submitted',
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  reviewer_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- 5. LEAVE, MEDICAL PROOF, AND PROFILE UPDATE REQUESTS
-- -----------------------------------------------------------------------------

create table public.leave_types (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null,
  code text not null,
  is_paid boolean not null default true,
  annual_allocation numeric(6,2) not null default 0 check (annual_allocation >= 0),
  carry_forward_limit numeric(6,2) not null default 0 check (carry_forward_limit >= 0),
  proof_required_after_days integer check (proof_required_after_days is null or proof_required_after_days >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, code)
);

create table public.leave_balances (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete cascade,
  leave_type_id uuid not null references public.leave_types(id) on delete cascade,
  balance_year integer not null check (balance_year between 2000 and 2200),
  allocated_days numeric(6,2) not null default 0,
  carried_days numeric(6,2) not null default 0,
  used_days numeric(6,2) not null default 0,
  pending_days numeric(6,2) not null default 0,
  adjusted_days numeric(6,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (employee_id, leave_type_id, balance_year)
);

create table public.leave_requests (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete cascade,
  leave_type_id uuid not null references public.leave_types(id) on delete restrict,
  start_date date not null,
  end_date date not null,
  requested_days numeric(6,2) not null check (requested_days > 0),
  reason text not null,
  status public.request_status not null default 'submitted',
  proof_status public.proof_status not null default 'not_required',
  estimated_unpaid_deduction numeric(14,2) not null default 0,
  approver_id uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  reviewer_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_date >= start_date),
  check (extract(year from end_date) = extract(year from start_date))
);

create table public.leave_documents (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  leave_request_id uuid not null references public.leave_requests(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete cascade,
  storage_path text not null,
  document_type text not null default 'medical_proof',
  mime_type text,
  size_bytes bigint check (size_bytes is null or size_bytes >= 0),
  verification_status public.proof_status not null default 'uploaded',
  verified_by uuid references auth.users(id) on delete set null,
  verified_at timestamptz,
  rejection_reason text,
  created_at timestamptz not null default now()
);

create table public.profile_update_requests (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete cascade,
  field_name text not null check (field_name in ('phone', 'personal_email', 'bank_account', 'address')),
  old_value jsonb,
  new_value jsonb not null,
  status public.request_status not null default 'submitted',
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  reviewer_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- 6. PAYROLL, PAYSLIPS, WARNINGS, AND SIMULATION
-- -----------------------------------------------------------------------------

create table public.pay_runs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null,
  period_start date not null,
  period_end date not null,
  payment_date date,
  status public.pay_run_status not null default 'draft',
  readiness_score numeric(5,2) not null default 0 check (readiness_score between 0 and 100),
  employee_count integer not null default 0,
  total_gross numeric(16,2) not null default 0,
  total_deductions numeric(16,2) not null default 0,
  total_net numeric(16,2) not null default 0,
  created_by uuid references auth.users(id) on delete set null,
  approved_by uuid references auth.users(id) on delete set null,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, period_start, period_end),
  check (period_end >= period_start)
);

create table public.payslips (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  pay_run_id uuid not null references public.pay_runs(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete restrict,
  contract_id uuid references public.contracts(id) on delete restrict,
  period_start date not null,
  period_end date not null,
  paid_days numeric(6,2) not null default 0,
  unpaid_leave_days numeric(6,2) not null default 0,
  gross_amount numeric(14,2) not null default 0,
  deduction_amount numeric(14,2) not null default 0,
  employer_contribution numeric(14,2) not null default 0,
  net_amount numeric(14,2) not null default 0,
  currency_code char(3) not null default 'INR',
  status public.payslip_status not null default 'draft',
  pdf_storage_path text,
  explanation jsonb not null default '{}'::jsonb,
  generated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (pay_run_id, employee_id),
  check (period_end >= period_start)
);

create table public.payslip_lines (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  payslip_id uuid not null references public.payslips(id) on delete cascade,
  salary_rule_id uuid references public.salary_rules(id) on delete set null,
  code text not null,
  name text not null,
  category text not null check (category in ('earning', 'deduction', 'employer_contribution', 'reimbursement')),
  quantity numeric(12,4) not null default 1,
  rate numeric(12,4) not null default 1,
  base_amount numeric(14,2) not null default 0,
  amount numeric(14,2) not null,
  calculation_note text,
  sequence integer not null default 100,
  created_at timestamptz not null default now()
);

create table public.payroll_payments (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  pay_run_id uuid not null references public.pay_runs(id) on delete cascade,
  payslip_id uuid not null references public.payslips(id) on delete restrict,
  employee_id uuid not null references public.employees(id) on delete restrict,
  bank_account_id uuid references public.employee_bank_accounts(id) on delete restrict,
  amount numeric(14,2) not null check (amount >= 0),
  payment_method text not null default 'bank_transfer',
  status public.payment_status not null default 'draft',
  scheduled_on date,
  paid_at timestamptz,
  bank_reference text,
  failure_reason text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (payslip_id)
);

create table public.payroll_warnings (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  pay_run_id uuid not null references public.pay_runs(id) on delete cascade,
  employee_id uuid references public.employees(id) on delete cascade,
  severity public.warning_severity not null,
  code text not null,
  message text not null,
  resolution_hint text,
  is_resolved boolean not null default false,
  resolved_by uuid references auth.users(id) on delete set null,
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.payroll_simulations (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null,
  period_start date not null,
  period_end date not null,
  assumptions jsonb not null default '{}'::jsonb,
  result_summary jsonb not null default '{}'::jsonb,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (period_end >= period_start)
);

create table public.payroll_simulation_impacts (
  id uuid primary key default gen_random_uuid(),
  simulation_id uuid not null references public.payroll_simulations(id) on delete cascade,
  employee_id uuid references public.employees(id) on delete cascade,
  department_id uuid references public.departments(id) on delete cascade,
  current_cost numeric(14,2) not null default 0,
  projected_cost numeric(14,2) not null default 0,
  delta numeric(14,2) generated always as (projected_cost - current_cost) stored,
  explanation jsonb not null default '{}'::jsonb
);

-- -----------------------------------------------------------------------------
-- 7. EMPLOYEE LOANS AND REPAYMENTS
-- -----------------------------------------------------------------------------

create table public.employee_loans (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete restrict,
  loan_number text not null,
  principal_amount numeric(14,2) not null check (principal_amount > 0),
  annual_interest_rate numeric(7,4) not null default 0 check (annual_interest_rate >= 0),
  interest_method public.loan_interest_method not null default 'none',
  tenure_months integer not null check (tenure_months > 0),
  preferred_monthly_deduction numeric(14,2) not null check (preferred_monthly_deduction > 0),
  disbursed_amount numeric(14,2) not null default 0,
  disbursed_on date,
  outstanding_principal numeric(14,2) not null default 0 check (outstanding_principal >= 0),
  accrued_interest numeric(14,2) not null default 0 check (accrued_interest >= 0),
  status public.loan_status not null default 'draft',
  approved_by uuid references auth.users(id) on delete set null,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, loan_number)
);

create table public.loan_installments (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  loan_id uuid not null references public.employee_loans(id) on delete cascade,
  installment_number integer not null check (installment_number > 0),
  due_date date not null,
  opening_principal numeric(14,2) not null,
  principal_due numeric(14,2) not null,
  interest_due numeric(14,2) not null default 0,
  total_due numeric(14,2) generated always as (principal_due + interest_due) stored,
  amount_paid numeric(14,2) not null default 0,
  payslip_id uuid references public.payslips(id) on delete set null,
  paid_at timestamptz,
  unique (loan_id, installment_number)
);

create table public.loan_payments (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  loan_id uuid not null references public.employee_loans(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete restrict,
  payment_type public.loan_payment_type not null,
  amount numeric(14,2) not null check (amount > 0),
  principal_component numeric(14,2) not null default 0,
  interest_component numeric(14,2) not null default 0,
  paid_on date not null default current_date,
  reference text,
  notes text,
  recorded_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- 8. BULK PAYSLIP EMAIL, NOTIFICATIONS, AND AUDIT
-- -----------------------------------------------------------------------------

create table public.email_distribution_jobs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  pay_run_id uuid references public.pay_runs(id) on delete set null,
  subject text not null,
  template_key text not null default 'payslip',
  audience_filter jsonb not null default '{}'::jsonb,
  total_recipients integer not null default 0,
  sent_count integer not null default 0,
  failed_count integer not null default 0,
  skipped_count integer not null default 0,
  status public.email_job_status not null default 'queued',
  created_by uuid not null references auth.users(id) on delete restrict,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.email_distribution_recipients (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.email_distribution_jobs(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete cascade,
  payslip_id uuid references public.payslips(id) on delete set null,
  email text not null,
  status public.email_recipient_status not null default 'queued',
  attempt_count integer not null default 0,
  provider_message_id text,
  last_error text,
  sent_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (job_id, employee_id)
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  message text not null,
  type text not null default 'info',
  action_url text,
  metadata jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.audit_logs (
  id bigint generated always as identity primary key,
  company_id uuid references public.companies(id) on delete set null,
  actor_user_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity_table text not null,
  entity_id text not null,
  summary jsonb not null default '{}'::jsonb,
  ip_address inet,
  created_at timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- 9. INDEXES
-- -----------------------------------------------------------------------------

create index employees_company_department_idx on public.employees(company_id, department_id, status);
create index employees_user_idx on public.employees(user_id);
create index roles_user_company_idx on public.user_company_roles(user_id, company_id);
create index attendance_employee_date_idx on public.attendance_records(employee_id, work_date desc);
create index attendance_company_date_idx on public.attendance_records(company_id, work_date desc);
create index leave_requests_company_status_idx on public.leave_requests(company_id, status, start_date);
create index leave_requests_employee_idx on public.leave_requests(employee_id, created_at desc);
create index payslips_employee_period_idx on public.payslips(employee_id, period_end desc);
create index payslips_payrun_idx on public.payslips(pay_run_id, status);
create index payslip_lines_payslip_sequence_idx on public.payslip_lines(payslip_id, sequence);
create index payroll_payments_payrun_status_idx on public.payroll_payments(pay_run_id, status);
create index payroll_warnings_payrun_idx on public.payroll_warnings(pay_run_id, is_resolved, severity);
create index loans_employee_status_idx on public.employee_loans(employee_id, status);
create index loan_installments_due_idx on public.loan_installments(loan_id, due_date);
create index email_recipients_job_status_idx on public.email_distribution_recipients(job_id, status);
create index notifications_user_unread_idx on public.notifications(user_id, created_at desc) where read_at is null;
create index audit_company_created_idx on public.audit_logs(company_id, created_at desc);

-- -----------------------------------------------------------------------------
-- 10. SHARED TRIGGERS AND AUTH PROFILE CREATION
-- -----------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
declare
  t text;
begin
  foreach t in array array[
    'companies','profiles','departments','job_positions','employees','employee_bank_accounts',
    'working_schedules','salary_structures','statutory_contribution_rules','salary_rules','contracts',
    'biometric_devices','attendance_records','attendance_correction_requests','leave_types',
    'leave_balances','leave_requests','profile_update_requests','pay_runs','payslips','payroll_payments',
    'payroll_simulations','employee_loans','email_distribution_jobs','email_distribution_recipients'
  ] loop
    execute format('create trigger set_%I_updated_at before update on public.%I for each row execute function public.set_updated_at()', t, t);
  end loop;
end $$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, personal_email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    new.email
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Leave balances are derived from request state changes. One request must stay
-- inside one balance year (enforced by the leave_requests check constraint).
create or replace function public.sync_leave_balance()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
declare
  v_old_pending numeric := 0;
  v_old_used numeric := 0;
  v_new_pending numeric := 0;
  v_new_used numeric := 0;
begin
  if tg_op in ('UPDATE', 'DELETE') then
    v_old_pending := case when old.status = 'submitted' then old.requested_days else 0 end;
    v_old_used := case when old.status = 'approved' then old.requested_days else 0 end;

    update public.leave_balances
    set pending_days = greatest(0, pending_days - v_old_pending),
        used_days = greatest(0, used_days - v_old_used)
    where employee_id = old.employee_id
      and leave_type_id = old.leave_type_id
      and balance_year = extract(year from old.start_date)::integer;
  end if;

  if tg_op in ('INSERT', 'UPDATE') then
    v_new_pending := case when new.status = 'submitted' then new.requested_days else 0 end;
    v_new_used := case when new.status = 'approved' then new.requested_days else 0 end;

    insert into public.leave_balances (
      company_id, employee_id, leave_type_id, balance_year, pending_days, used_days
    ) values (
      new.company_id, new.employee_id, new.leave_type_id,
      extract(year from new.start_date)::integer, v_new_pending, v_new_used
    )
    on conflict (employee_id, leave_type_id, balance_year) do update
    set pending_days = public.leave_balances.pending_days + excluded.pending_days,
        used_days = public.leave_balances.used_days + excluded.used_days;
  end if;

  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

create trigger sync_leave_balance_after_change
  after insert or update or delete on public.leave_requests
  for each row execute function public.sync_leave_balance();

create or replace function public.recalculate_pay_run_totals()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
declare
  v_pay_run_id uuid := coalesce(new.pay_run_id, old.pay_run_id);
begin
  update public.pay_runs pr
  set employee_count = x.employee_count,
      total_gross = x.total_gross,
      total_deductions = x.total_deductions,
      total_net = x.total_net
  from (
    select count(*)::integer as employee_count,
           coalesce(sum(gross_amount), 0) as total_gross,
           coalesce(sum(deduction_amount), 0) as total_deductions,
           coalesce(sum(net_amount), 0) as total_net
    from public.payslips where pay_run_id = v_pay_run_id
  ) x
  where pr.id = v_pay_run_id;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

create trigger recalculate_pay_run_after_payslip
  after insert or update or delete on public.payslips
  for each row execute function public.recalculate_pay_run_totals();

create or replace function public.recalculate_email_job_totals()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
declare
  v_job_id uuid := coalesce(new.job_id, old.job_id);
begin
  update public.email_distribution_jobs j
  set total_recipients = x.total_recipients,
      sent_count = x.sent_count,
      failed_count = x.failed_count,
      skipped_count = x.skipped_count,
      status = case
        when x.total_recipients = 0 then j.status
        when x.sent_count = x.total_recipients then 'completed'::public.email_job_status
        when x.sent_count > 0 and x.failed_count > 0 then 'partial_failure'::public.email_job_status
        when x.failed_count = x.total_recipients then 'failed'::public.email_job_status
        else j.status
      end,
      completed_at = case
        when x.sent_count + x.failed_count + x.skipped_count = x.total_recipients
          then now() else j.completed_at end
  from (
    select count(*)::integer as total_recipients,
           count(*) filter (where status = 'sent')::integer as sent_count,
           count(*) filter (where status = 'failed')::integer as failed_count,
           count(*) filter (where status = 'skipped')::integer as skipped_count
    from public.email_distribution_recipients where job_id = v_job_id
  ) x
  where j.id = v_job_id;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

create trigger recalculate_email_job_after_recipient
  after insert or update or delete on public.email_distribution_recipients
  for each row execute function public.recalculate_email_job_totals();

-- -----------------------------------------------------------------------------
-- 11. AUTHORIZATION HELPERS (used by RLS; never trust client user_metadata)
-- -----------------------------------------------------------------------------

create or replace function public.is_company_member(p_company_id uuid)
returns boolean
language sql
stable
security definer set search_path = ''
as $$
  select exists (
    select 1 from public.user_company_roles r
    where r.company_id = p_company_id and r.user_id = (select auth.uid())
  );
$$;

create or replace function public.has_company_role(p_company_id uuid, p_roles public.app_role[])
returns boolean
language sql
stable
security definer set search_path = ''
as $$
  select exists (
    select 1 from public.user_company_roles r
    where r.company_id = p_company_id
      and r.user_id = (select auth.uid())
      and r.role = any (p_roles)
  );
$$;

create or replace function public.current_employee_id(p_company_id uuid)
returns uuid
language sql
stable
security definer set search_path = ''
as $$
  select e.id from public.employees e
  where e.company_id = p_company_id and e.user_id = (select auth.uid())
  limit 1;
$$;

revoke all on function public.is_company_member(uuid) from public;
revoke all on function public.has_company_role(uuid, public.app_role[]) from public;
revoke all on function public.current_employee_id(uuid) from public;
grant execute on function public.is_company_member(uuid) to authenticated;
grant execute on function public.has_company_role(uuid, public.app_role[]) to authenticated;
grant execute on function public.current_employee_id(uuid) to authenticated;

-- -----------------------------------------------------------------------------
-- 12. BUSINESS RPC FUNCTIONS
-- -----------------------------------------------------------------------------

create or replace function public.check_in(
  p_company_id uuid,
  p_method public.verification_method,
  p_device_id uuid default null
)
returns public.attendance_records
language plpgsql
security definer set search_path = ''
as $$
declare
  v_employee_id uuid;
  v_row public.attendance_records;
begin
  if p_method not in ('face', 'fingerprint') then
    raise exception 'Employee check-in requires face or fingerprint verification';
  end if;

  v_employee_id := public.current_employee_id(p_company_id);
  if v_employee_id is null then raise exception 'No employee is linked to this user'; end if;

  if exists (select 1 from public.attendance_records a where a.employee_id = v_employee_id and a.check_out_at is null) then
    raise exception 'An open attendance session already exists';
  end if;

  insert into public.attendance_records (
    company_id, employee_id, work_date, check_in_at, check_in_method, check_in_device_id
  ) values (
    p_company_id, v_employee_id, (now() at time zone 'Asia/Kolkata')::date, now(), p_method, p_device_id
  ) returning * into v_row;

  return v_row;
end;
$$;

create or replace function public.check_out(
  p_company_id uuid,
  p_method public.verification_method,
  p_device_id uuid default null
)
returns public.attendance_records
language plpgsql
security definer set search_path = ''
as $$
declare
  v_employee_id uuid;
  v_id uuid;
  v_row public.attendance_records;
begin
  if p_method not in ('face', 'fingerprint') then
    raise exception 'Employee check-out requires face or fingerprint verification';
  end if;

  v_employee_id := public.current_employee_id(p_company_id);
  select a.id into v_id
  from public.attendance_records a
  where a.employee_id = v_employee_id and a.check_out_at is null
  order by a.check_in_at desc limit 1 for update;

  if v_id is null then raise exception 'No open attendance session found'; end if;

  update public.attendance_records
  set check_out_at = now(),
      check_out_method = p_method,
      check_out_device_id = p_device_id,
      worked_minutes = greatest(0, floor(extract(epoch from (now() - check_in_at)) / 60)::integer)
  where id = v_id
  returning * into v_row;

  return v_row;
end;
$$;

create or replace function public.preview_leave_impact(
  p_company_id uuid,
  p_leave_type_id uuid,
  p_start_date date,
  p_end_date date
)
returns table (
  working_days numeric,
  available_paid_days numeric,
  unpaid_days numeric,
  estimated_salary_deduction numeric,
  proof_required boolean
)
language plpgsql
security definer set search_path = ''
as $$
declare
  v_employee_id uuid;
  v_schedule_id uuid;
  v_monthly_salary numeric(14,2);
  v_paid boolean;
  v_threshold integer;
  v_days numeric;
  v_balance numeric;
  v_month_workdays numeric;
begin
  if p_end_date < p_start_date then raise exception 'End date cannot be before start date'; end if;
  v_employee_id := public.current_employee_id(p_company_id);
  if v_employee_id is null then raise exception 'No employee is linked to this user'; end if;

  select c.working_schedule_id,
         case co.unpaid_leave_deduction_basis
           when 'basic' then c.basic_salary else c.monthly_gross end
  into v_schedule_id, v_monthly_salary
  from public.contracts c
  join public.companies co on co.id = c.company_id
  where c.employee_id = v_employee_id and c.is_active
    and c.start_date <= p_end_date and (c.end_date is null or c.end_date >= p_start_date)
  order by c.start_date desc limit 1;

  select lt.is_paid, coalesce(lt.proof_required_after_days, co.medical_proof_threshold_days)
  into v_paid, v_threshold
  from public.leave_types lt join public.companies co on co.id = lt.company_id
  where lt.id = p_leave_type_id and lt.company_id = p_company_id;

  select count(*)::numeric into v_days
  from generate_series(p_start_date, p_end_date, interval '1 day') d
  where exists (
    select 1 from public.working_schedule_days w
    where w.schedule_id = v_schedule_id and w.is_working_day
      and w.iso_weekday = extract(isodow from d)::smallint
  )
  and not exists (
    select 1 from public.holidays h
    where h.company_id = p_company_id and h.holiday_date = d::date
  );

  select greatest(0, lb.allocated_days + lb.carried_days + lb.adjusted_days - lb.used_days - lb.pending_days)
  into v_balance
  from public.leave_balances lb
  where lb.employee_id = v_employee_id and lb.leave_type_id = p_leave_type_id
    and lb.balance_year = extract(year from p_start_date)::integer;
  v_balance := coalesce(v_balance, 0);

  select count(*)::numeric into v_month_workdays
  from generate_series(date_trunc('month', p_start_date)::date,
                       (date_trunc('month', p_start_date) + interval '1 month - 1 day')::date,
                       interval '1 day') d
  where exists (
    select 1 from public.working_schedule_days w
    where w.schedule_id = v_schedule_id and w.is_working_day
      and w.iso_weekday = extract(isodow from d)::smallint
  )
  and not exists (
    select 1 from public.holidays h
    where h.company_id = p_company_id and h.holiday_date = d::date
  );

  working_days := coalesce(v_days, 0);
  available_paid_days := case when v_paid then v_balance else 0 end;
  unpaid_days := case when v_paid then greatest(0, v_days - v_balance) else v_days end;
  estimated_salary_deduction := round(
    coalesce(v_monthly_salary, 0) / greatest(coalesce(v_month_workdays, 0), 1) * unpaid_days, 2
  );
  proof_required := v_threshold is not null and v_days >= v_threshold;
  return next;
end;
$$;

create or replace function public.prepare_and_protect_leave_request()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
declare
  v_preview record;
  v_is_reviewer boolean;
begin
  v_is_reviewer := public.has_company_role(
    new.company_id, array['hr_manager','admin']::public.app_role[]
  );

  if tg_op = 'UPDATE' and not v_is_reviewer then
    if old.employee_id <> public.current_employee_id(old.company_id) then
      raise exception 'Not allowed to update this leave request';
    end if;
    if new.employee_id <> old.employee_id or new.company_id <> old.company_id then
      raise exception 'Employee and company cannot be changed';
    end if;
    if new.status not in ('draft','submitted','cancelled') then
      raise exception 'Employees cannot approve or reject leave';
    end if;
    if new.approver_id is distinct from old.approver_id
       or new.reviewed_at is distinct from old.reviewed_at
       or new.reviewer_note is distinct from old.reviewer_note then
      raise exception 'Review fields can only be changed by HR';
    end if;
    if new.proof_status in ('verified','rejected') and new.proof_status is distinct from old.proof_status then
      raise exception 'Proof verification can only be changed by HR';
    end if;
  end if;

  if not v_is_reviewer and tg_op = 'INSERT' then
    select * into v_preview
    from public.preview_leave_impact(new.company_id, new.leave_type_id, new.start_date, new.end_date);
    new.requested_days := v_preview.working_days;
    new.estimated_unpaid_deduction := v_preview.estimated_salary_deduction;
    new.proof_status := case when v_preview.proof_required then 'pending'::public.proof_status
                             else 'not_required'::public.proof_status end;
  elsif not v_is_reviewer and (
    new.start_date is distinct from old.start_date
    or new.end_date is distinct from old.end_date
    or new.leave_type_id is distinct from old.leave_type_id
  ) then
    select * into v_preview
    from public.preview_leave_impact(new.company_id, new.leave_type_id, new.start_date, new.end_date);
    new.requested_days := v_preview.working_days;
    new.estimated_unpaid_deduction := v_preview.estimated_salary_deduction;
    new.proof_status := case when v_preview.proof_required then 'pending'::public.proof_status
                             else 'not_required'::public.proof_status end;
  end if;

  return new;
end;
$$;

create trigger prepare_and_protect_leave_before_write
  before insert or update on public.leave_requests
  for each row execute function public.prepare_and_protect_leave_request();

revoke all on function public.check_in(uuid, public.verification_method, uuid) from public;
revoke all on function public.check_out(uuid, public.verification_method, uuid) from public;
revoke all on function public.preview_leave_impact(uuid, uuid, date, date) from public;
grant execute on function public.check_in(uuid, public.verification_method, uuid) to authenticated;
grant execute on function public.check_out(uuid, public.verification_method, uuid) to authenticated;
grant execute on function public.preview_leave_impact(uuid, uuid, date, date) to authenticated;

-- -----------------------------------------------------------------------------
-- 13. ROW-LEVEL SECURITY
-- -----------------------------------------------------------------------------

do $$
declare
  t text;
begin
  foreach t in array array[
    'companies','profiles','departments','job_positions','employees','user_company_roles',
    'employee_bank_accounts','working_schedules','working_schedule_days','salary_structures',
    'statutory_contribution_rules','salary_rules','contracts','holidays','biometric_devices',
    'biometric_employee_mappings','attendance_records','attendance_correction_requests',
    'leave_types','leave_balances','leave_requests','leave_documents','profile_update_requests',
    'pay_runs','payslips','payslip_lines','payroll_payments','payroll_warnings','payroll_simulations',
    'payroll_simulation_impacts','employee_loans','loan_installments','loan_payments',
    'email_distribution_jobs','email_distribution_recipients','notifications','audit_logs'
  ] loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end $$;

-- Company and private profile
create policy companies_member_read on public.companies for select to authenticated
  using (public.is_company_member(id));
create policy companies_admin_manage on public.companies for update to authenticated
  using (public.has_company_role(id, array['admin']::public.app_role[]))
  with check (public.has_company_role(id, array['admin']::public.app_role[]));

create policy profiles_self_read on public.profiles for select to authenticated using (id = (select auth.uid()));
create policy profiles_self_update on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));
create policy profiles_staff_read on public.profiles for select to authenticated
  using (exists (
    select 1 from public.employees e
    where e.user_id = profiles.id
      and public.has_company_role(e.company_id, array['hr_manager','payroll_manager','admin']::public.app_role[])
  ));

-- Membership and employees
create policy roles_self_read on public.user_company_roles for select to authenticated
  using (user_id = (select auth.uid()));
create policy roles_admin_read on public.user_company_roles for select to authenticated
  using (public.has_company_role(company_id, array['admin']::public.app_role[]));
create policy roles_admin_manage on public.user_company_roles for all to authenticated
  using (public.has_company_role(company_id, array['admin']::public.app_role[]))
  with check (public.has_company_role(company_id, array['admin']::public.app_role[]));

create policy employees_self_or_staff_read on public.employees for select to authenticated
  using (
    user_id = (select auth.uid()) or
    public.has_company_role(company_id, array['hr_manager','payroll_user','payroll_manager','admin']::public.app_role[])
  );
create policy employees_hr_admin_manage on public.employees for all to authenticated
  using (public.has_company_role(company_id, array['hr_manager','admin']::public.app_role[]))
  with check (public.has_company_role(company_id, array['hr_manager','admin']::public.app_role[]));

-- Common company reference tables
do $$
declare t text;
begin
  foreach t in array array['departments','job_positions','working_schedules','holidays','leave_types'] loop
    execute format('create policy %I on public.%I for select to authenticated using (public.is_company_member(company_id))', t || '_member_read', t);
    execute format('create policy %I on public.%I for all to authenticated using (public.has_company_role(company_id, array[''hr_manager'',''admin'']::public.app_role[])) with check (public.has_company_role(company_id, array[''hr_manager'',''admin'']::public.app_role[]))', t || '_hr_admin_manage', t);
  end loop;
end $$;

create policy schedule_days_member_read on public.working_schedule_days for select to authenticated
  using (exists (select 1 from public.working_schedules s where s.id = schedule_id and public.is_company_member(s.company_id)));
create policy schedule_days_hr_admin_manage on public.working_schedule_days for all to authenticated
  using (exists (select 1 from public.working_schedules s where s.id = schedule_id and public.has_company_role(s.company_id, array['hr_manager','admin']::public.app_role[])))
  with check (exists (select 1 from public.working_schedules s where s.id = schedule_id and public.has_company_role(s.company_id, array['hr_manager','admin']::public.app_role[])));

-- Bank and contracts
create policy bank_self_or_payroll_read on public.employee_bank_accounts for select to authenticated
  using (employee_id = public.current_employee_id(company_id) or public.has_company_role(company_id, array['payroll_user','payroll_manager','admin']::public.app_role[]));
create policy bank_payroll_manager_manage on public.employee_bank_accounts for all to authenticated
  using (public.has_company_role(company_id, array['payroll_manager','admin']::public.app_role[]))
  with check (public.has_company_role(company_id, array['payroll_manager','admin']::public.app_role[]));

create policy contracts_self_or_staff_read on public.contracts for select to authenticated
  using (employee_id = public.current_employee_id(company_id) or public.has_company_role(company_id, array['hr_manager','payroll_user','payroll_manager','admin']::public.app_role[]));
create policy contracts_hr_payroll_manager_manage on public.contracts for all to authenticated
  using (public.has_company_role(company_id, array['hr_manager','payroll_manager','admin']::public.app_role[]))
  with check (public.has_company_role(company_id, array['hr_manager','payroll_manager','admin']::public.app_role[]));

-- Payroll configuration: payroll user reads; payroll manager/admin writes
do $$
declare t text;
begin
  foreach t in array array['salary_structures','salary_rules','statutory_contribution_rules'] loop
    execute format('create policy %I on public.%I for select to authenticated using (company_id is null or public.has_company_role(company_id, array[''payroll_user'',''payroll_manager'',''admin'']::public.app_role[]))', t || '_payroll_read', t);
    execute format('create policy %I on public.%I for all to authenticated using (company_id is not null and public.has_company_role(company_id, array[''payroll_manager'',''admin'']::public.app_role[])) with check (company_id is not null and public.has_company_role(company_id, array[''payroll_manager'',''admin'']::public.app_role[]))', t || '_manager_manage', t);
  end loop;
end $$;

-- Biometric devices/mappings are server-integrated and visible to authorized staff
create policy devices_staff_read on public.biometric_devices for select to authenticated
  using (public.has_company_role(company_id, array['hr_manager','admin']::public.app_role[]));
create policy devices_admin_manage on public.biometric_devices for all to authenticated
  using (public.has_company_role(company_id, array['admin']::public.app_role[]))
  with check (public.has_company_role(company_id, array['admin']::public.app_role[]));
create policy biometric_map_staff_read on public.biometric_employee_mappings for select to authenticated
  using (public.has_company_role(company_id, array['hr_manager','admin']::public.app_role[]));
create policy biometric_map_admin_manage on public.biometric_employee_mappings for all to authenticated
  using (public.has_company_role(company_id, array['admin']::public.app_role[]))
  with check (public.has_company_role(company_id, array['admin']::public.app_role[]));

-- Attendance: employees read their own; employee writes go through check_in/check_out RPC
create policy attendance_self_or_staff_read on public.attendance_records for select to authenticated
  using (employee_id = public.current_employee_id(company_id) or public.has_company_role(company_id, array['hr_manager','payroll_user','payroll_manager','admin']::public.app_role[]));
create policy attendance_hr_admin_manage on public.attendance_records for all to authenticated
  using (public.has_company_role(company_id, array['hr_manager','admin']::public.app_role[]))
  with check (public.has_company_role(company_id, array['hr_manager','admin']::public.app_role[]));

create policy correction_self_or_staff_read on public.attendance_correction_requests for select to authenticated
  using (employee_id = public.current_employee_id(company_id) or public.has_company_role(company_id, array['hr_manager','admin']::public.app_role[]));
create policy correction_self_create on public.attendance_correction_requests for insert to authenticated
  with check (employee_id = public.current_employee_id(company_id));
create policy correction_hr_admin_update on public.attendance_correction_requests for update to authenticated
  using (public.has_company_role(company_id, array['hr_manager','admin']::public.app_role[]))
  with check (public.has_company_role(company_id, array['hr_manager','admin']::public.app_role[]));

-- Leave and profile requests
create policy balances_self_or_staff_read on public.leave_balances for select to authenticated
  using (employee_id = public.current_employee_id(company_id) or public.has_company_role(company_id, array['hr_manager','payroll_user','payroll_manager','admin']::public.app_role[]));
create policy balances_hr_admin_manage on public.leave_balances for all to authenticated
  using (public.has_company_role(company_id, array['hr_manager','admin']::public.app_role[]))
  with check (public.has_company_role(company_id, array['hr_manager','admin']::public.app_role[]));

create policy leave_self_or_staff_read on public.leave_requests for select to authenticated
  using (employee_id = public.current_employee_id(company_id) or public.has_company_role(company_id, array['hr_manager','payroll_user','payroll_manager','admin']::public.app_role[]));
create policy leave_self_create on public.leave_requests for insert to authenticated
  with check (employee_id = public.current_employee_id(company_id));
create policy leave_self_edit_pending on public.leave_requests for update to authenticated
  using (employee_id = public.current_employee_id(company_id) and status in ('draft','submitted'))
  with check (employee_id = public.current_employee_id(company_id) and status in ('draft','submitted','cancelled'));
create policy leave_hr_admin_review on public.leave_requests for update to authenticated
  using (public.has_company_role(company_id, array['hr_manager','admin']::public.app_role[]))
  with check (public.has_company_role(company_id, array['hr_manager','admin']::public.app_role[]));

create policy leave_docs_self_or_hr_read on public.leave_documents for select to authenticated
  using (employee_id = public.current_employee_id(company_id) or public.has_company_role(company_id, array['hr_manager','admin']::public.app_role[]));
create policy leave_docs_self_create on public.leave_documents for insert to authenticated
  with check (employee_id = public.current_employee_id(company_id));
create policy leave_docs_hr_review on public.leave_documents for update to authenticated
  using (public.has_company_role(company_id, array['hr_manager','admin']::public.app_role[]))
  with check (public.has_company_role(company_id, array['hr_manager','admin']::public.app_role[]));

create policy profile_req_self_or_hr_read on public.profile_update_requests for select to authenticated
  using (employee_id = public.current_employee_id(company_id) or public.has_company_role(company_id, array['hr_manager','admin']::public.app_role[]));
create policy profile_req_self_create on public.profile_update_requests for insert to authenticated
  with check (employee_id = public.current_employee_id(company_id));
create policy profile_req_hr_review on public.profile_update_requests for update to authenticated
  using (public.has_company_role(company_id, array['hr_manager','admin']::public.app_role[]))
  with check (public.has_company_role(company_id, array['hr_manager','admin']::public.app_role[]));

-- Payroll transactions
create policy payruns_payroll_read on public.pay_runs for select to authenticated
  using (public.has_company_role(company_id, array['payroll_user','payroll_manager','admin']::public.app_role[]));
create policy payruns_user_create_update on public.pay_runs for insert to authenticated
  with check (public.has_company_role(company_id, array['payroll_user','payroll_manager','admin']::public.app_role[]));
create policy payruns_user_update on public.pay_runs for update to authenticated
  using (public.has_company_role(company_id, array['payroll_user','payroll_manager','admin']::public.app_role[]))
  with check (public.has_company_role(company_id, array['payroll_user','payroll_manager','admin']::public.app_role[]));
create policy payruns_manager_delete on public.pay_runs for delete to authenticated
  using (public.has_company_role(company_id, array['payroll_manager','admin']::public.app_role[]));

create policy payslips_self_or_payroll_read on public.payslips for select to authenticated
  using ((employee_id = public.current_employee_id(company_id) and status in ('validated','paid')) or public.has_company_role(company_id, array['payroll_user','payroll_manager','admin']::public.app_role[]));
create policy payslips_payroll_create_update on public.payslips for insert to authenticated
  with check (public.has_company_role(company_id, array['payroll_user','payroll_manager','admin']::public.app_role[]));
create policy payslips_payroll_update on public.payslips for update to authenticated
  using (public.has_company_role(company_id, array['payroll_user','payroll_manager','admin']::public.app_role[]))
  with check (public.has_company_role(company_id, array['payroll_user','payroll_manager','admin']::public.app_role[]));
create policy payslips_manager_delete on public.payslips for delete to authenticated
  using (public.has_company_role(company_id, array['payroll_manager','admin']::public.app_role[]));

create policy payslip_lines_self_or_payroll_read on public.payslip_lines for select to authenticated
  using (exists (
    select 1 from public.payslips p where p.id = payslip_id and (
      (p.employee_id = public.current_employee_id(p.company_id) and p.status in ('validated','paid')) or
      public.has_company_role(p.company_id, array['payroll_user','payroll_manager','admin']::public.app_role[])
    )
  ));
create policy payslip_lines_payroll_manage on public.payslip_lines for all to authenticated
  using (public.has_company_role(company_id, array['payroll_user','payroll_manager','admin']::public.app_role[]))
  with check (public.has_company_role(company_id, array['payroll_user','payroll_manager','admin']::public.app_role[]));

create policy payments_self_or_payroll_read on public.payroll_payments for select to authenticated
  using (employee_id = public.current_employee_id(company_id) or public.has_company_role(company_id, array['payroll_user','payroll_manager','admin']::public.app_role[]));
create policy payments_payroll_create on public.payroll_payments for insert to authenticated
  with check (public.has_company_role(company_id, array['payroll_user','payroll_manager','admin']::public.app_role[]));
create policy payments_payroll_update on public.payroll_payments for update to authenticated
  using (public.has_company_role(company_id, array['payroll_user','payroll_manager','admin']::public.app_role[]))
  with check (public.has_company_role(company_id, array['payroll_user','payroll_manager','admin']::public.app_role[]));
create policy payments_manager_delete on public.payroll_payments for delete to authenticated
  using (public.has_company_role(company_id, array['payroll_manager','admin']::public.app_role[]));

create policy warnings_payroll_read on public.payroll_warnings for select to authenticated
  using (public.has_company_role(company_id, array['payroll_user','payroll_manager','admin']::public.app_role[]));
create policy warnings_payroll_manage on public.payroll_warnings for all to authenticated
  using (public.has_company_role(company_id, array['payroll_user','payroll_manager','admin']::public.app_role[]))
  with check (public.has_company_role(company_id, array['payroll_user','payroll_manager','admin']::public.app_role[]));

create policy simulations_payroll_read on public.payroll_simulations for select to authenticated
  using (public.has_company_role(company_id, array['payroll_user','payroll_manager','admin']::public.app_role[]));
create policy simulations_manager_manage on public.payroll_simulations for all to authenticated
  using (public.has_company_role(company_id, array['payroll_manager','admin']::public.app_role[]))
  with check (public.has_company_role(company_id, array['payroll_manager','admin']::public.app_role[]));
create policy simulation_impacts_payroll_read on public.payroll_simulation_impacts for select to authenticated
  using (exists (select 1 from public.payroll_simulations s where s.id = simulation_id and public.has_company_role(s.company_id, array['payroll_user','payroll_manager','admin']::public.app_role[])));
create policy simulation_impacts_manager_manage on public.payroll_simulation_impacts for all to authenticated
  using (exists (select 1 from public.payroll_simulations s where s.id = simulation_id and public.has_company_role(s.company_id, array['payroll_manager','admin']::public.app_role[])))
  with check (exists (select 1 from public.payroll_simulations s where s.id = simulation_id and public.has_company_role(s.company_id, array['payroll_manager','admin']::public.app_role[])));

-- Loans
create policy loans_self_or_payroll_read on public.employee_loans for select to authenticated
  using (employee_id = public.current_employee_id(company_id) or public.has_company_role(company_id, array['payroll_user','payroll_manager','admin']::public.app_role[]));
create policy loans_manager_manage on public.employee_loans for all to authenticated
  using (public.has_company_role(company_id, array['payroll_manager','admin']::public.app_role[]))
  with check (public.has_company_role(company_id, array['payroll_manager','admin']::public.app_role[]));
create policy installments_self_or_payroll_read on public.loan_installments for select to authenticated
  using (exists (select 1 from public.employee_loans l where l.id = loan_id and (l.employee_id = public.current_employee_id(l.company_id) or public.has_company_role(l.company_id, array['payroll_user','payroll_manager','admin']::public.app_role[]))));
create policy installments_manager_manage on public.loan_installments for all to authenticated
  using (public.has_company_role(company_id, array['payroll_manager','admin']::public.app_role[]))
  with check (public.has_company_role(company_id, array['payroll_manager','admin']::public.app_role[]));
create policy loan_payments_self_or_payroll_read on public.loan_payments for select to authenticated
  using (employee_id = public.current_employee_id(company_id) or public.has_company_role(company_id, array['payroll_user','payroll_manager','admin']::public.app_role[]));
create policy loan_payments_manager_manage on public.loan_payments for all to authenticated
  using (public.has_company_role(company_id, array['payroll_manager','admin']::public.app_role[]))
  with check (public.has_company_role(company_id, array['payroll_manager','admin']::public.app_role[]));

-- Bulk email, notifications, and audit
create policy email_jobs_payroll_read on public.email_distribution_jobs for select to authenticated
  using (public.has_company_role(company_id, array['payroll_user','payroll_manager','admin']::public.app_role[]));
create policy email_jobs_manager_manage on public.email_distribution_jobs for all to authenticated
  using (public.has_company_role(company_id, array['payroll_manager','admin']::public.app_role[]))
  with check (public.has_company_role(company_id, array['payroll_manager','admin']::public.app_role[]));
create policy email_recipients_payroll_read on public.email_distribution_recipients for select to authenticated
  using (public.has_company_role(company_id, array['payroll_user','payroll_manager','admin']::public.app_role[]));
create policy email_recipients_manager_manage on public.email_distribution_recipients for all to authenticated
  using (public.has_company_role(company_id, array['payroll_manager','admin']::public.app_role[]))
  with check (public.has_company_role(company_id, array['payroll_manager','admin']::public.app_role[]));

create policy notifications_self_read on public.notifications for select to authenticated using (user_id = (select auth.uid()));
create policy notifications_self_update on public.notifications for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy audit_authorized_read on public.audit_logs for select to authenticated
  using (public.has_company_role(company_id, array['payroll_manager','admin']::public.app_role[]));

-- -----------------------------------------------------------------------------
-- 14. DASHBOARD VIEWS (security_invoker means underlying RLS remains active)
-- -----------------------------------------------------------------------------

create view public.v_employee_dashboard with (security_invoker = true) as
select
  e.id as employee_id,
  e.company_id,
  e.user_id,
  e.employee_code,
  e.full_name,
  e.company_email,
  e.joining_date,
  e.status as employment_status,
  d.name as department_name,
  jp.title as position_title,
  today_att.check_in_at,
  today_att.check_out_at,
  case when today_att.check_in_at is null then 'not_checked_in'
       when today_att.check_out_at is null then 'checked_in'
       else 'checked_out' end as attendance_state,
  coalesce(lb.paid_leave_available, 0) as paid_leave_available,
  coalesce(ul.unpaid_leave_days_ytd, 0) as unpaid_leave_days_ytd,
  ps.period_end as latest_salary_period,
  ps.gross_amount as latest_gross_amount,
  ps.deduction_amount as latest_deduction_amount,
  ps.net_amount as latest_net_amount,
  coalesce(loan.outstanding_loan, 0) as outstanding_loan,
  coalesce(req.pending_requests, 0) as pending_requests
from public.employees e
left join public.departments d on d.id = e.department_id
left join public.job_positions jp on jp.id = e.position_id
left join lateral (
  select a.check_in_at, a.check_out_at from public.attendance_records a
  where a.employee_id = e.id and a.work_date = (now() at time zone 'Asia/Kolkata')::date
  order by a.check_in_at desc limit 1
) today_att on true
left join lateral (
  select sum(greatest(0, b.allocated_days + b.carried_days + b.adjusted_days - b.used_days - b.pending_days)) as paid_leave_available
  from public.leave_balances b join public.leave_types t on t.id = b.leave_type_id
  where b.employee_id = e.id and b.balance_year = extract(year from current_date)::integer and t.is_paid
) lb on true
left join lateral (
  select sum(r.requested_days) as unpaid_leave_days_ytd
  from public.leave_requests r join public.leave_types t on t.id = r.leave_type_id
  where r.employee_id = e.id and r.status = 'approved' and not t.is_paid
    and extract(year from r.start_date) = extract(year from current_date)
) ul on true
left join lateral (
  select p.period_end, p.gross_amount, p.deduction_amount, p.net_amount
  from public.payslips p where p.employee_id = e.id and p.status in ('validated','paid')
  order by p.period_end desc limit 1
) ps on true
left join lateral (
  select sum(l.outstanding_principal + l.accrued_interest) as outstanding_loan
  from public.employee_loans l where l.employee_id = e.id and l.status = 'active'
) loan on true
left join lateral (
  select count(*) as pending_requests from (
    select id from public.leave_requests where employee_id = e.id and status = 'submitted'
    union all select id from public.attendance_correction_requests where employee_id = e.id and status = 'submitted'
    union all select id from public.profile_update_requests where employee_id = e.id and status = 'submitted'
  ) x
) req on true;

create view public.v_hr_dashboard with (security_invoker = true) as
select
  c.id as company_id,
  count(distinct e.id) filter (where e.status = 'active') as active_employees,
  count(distinct a.employee_id) filter (where a.check_in_at is not null) as checked_in_today,
  count(distinct e.id) filter (where e.status = 'active') - count(distinct a.employee_id) filter (where a.check_in_at is not null) as not_checked_in_today,
  (select count(*) from public.leave_requests lr where lr.company_id = c.id and lr.status = 'submitted') as pending_leave_requests,
  (select count(*) from public.leave_documents ld where ld.company_id = c.id and ld.verification_status = 'uploaded') as pending_medical_proofs,
  (select count(*) from public.attendance_correction_requests ar where ar.company_id = c.id and ar.status = 'submitted') as pending_attendance_corrections,
  (select count(*) from public.profile_update_requests pr where pr.company_id = c.id and pr.status = 'submitted') as pending_profile_updates
from public.companies c
left join public.employees e on e.company_id = c.id
left join public.attendance_records a on a.employee_id = e.id and a.work_date = (now() at time zone 'Asia/Kolkata')::date
where public.has_company_role(c.id, array['hr_manager','payroll_user','payroll_manager','admin']::public.app_role[])
group by c.id;

create view public.v_pay_run_summary with (security_invoker = true) as
select
  pr.*,
  count(distinct p.id) as generated_payslips,
  count(distinct p.id) filter (where p.status = 'paid') as paid_payslips,
  count(distinct w.id) filter (where not w.is_resolved and w.severity = 'blocking') as blocking_issues,
  count(distinct w.id) filter (where not w.is_resolved and w.severity = 'warning') as warnings
from public.pay_runs pr
left join public.payslips p on p.pay_run_id = pr.id
left join public.payroll_warnings w on w.pay_run_id = pr.id
where public.has_company_role(pr.company_id, array['payroll_user','payroll_manager','admin']::public.app_role[])
group by pr.id;

create view public.v_payroll_readiness with (security_invoker = true) as
select
  pr.id as pay_run_id,
  pr.company_id,
  pr.period_start,
  pr.period_end,
  pr.readiness_score,
  count(w.id) filter (where not w.is_resolved and w.severity = 'blocking') as blocking_count,
  count(w.id) filter (where not w.is_resolved and w.severity = 'warning') as warning_count,
  count(w.id) filter (where not w.is_resolved and w.code = 'MISSING_BANK_ACCOUNT') as missing_bank_accounts,
  count(w.id) filter (where not w.is_resolved and w.code = 'OPEN_ATTENDANCE') as open_attendance_records,
  count(w.id) filter (where not w.is_resolved and w.code = 'UNVERIFIED_MEDICAL_PROOF') as unverified_medical_proofs,
  count(w.id) filter (where not w.is_resolved and w.code = 'MISSING_CONTRACT') as missing_contracts
from public.pay_runs pr
left join public.payroll_warnings w on w.pay_run_id = pr.id
where public.has_company_role(pr.company_id, array['payroll_user','payroll_manager','admin']::public.app_role[])
group by pr.id;

create view public.v_email_distribution_summary with (security_invoker = true) as
select
  j.id as job_id, j.company_id, j.pay_run_id, j.subject, j.status,
  j.total_recipients, j.sent_count, j.failed_count, j.skipped_count,
  case when j.total_recipients = 0 then 0
       else round(j.sent_count::numeric / j.total_recipients * 100, 2) end as success_percentage,
  j.created_at, j.completed_at
from public.email_distribution_jobs j
where public.has_company_role(j.company_id, array['payroll_user','payroll_manager','admin']::public.app_role[]);

create view public.v_department_payroll_cost with (security_invoker = true) as
select
  p.company_id,
  date_trunc('month', p.period_end)::date as payroll_month,
  e.department_id,
  d.name as department_name,
  count(distinct p.employee_id) as employee_count,
  sum(p.gross_amount) as gross_cost,
  sum(p.employer_contribution) as employer_contribution,
  sum(p.net_amount) as net_pay,
  sum(p.gross_amount + p.employer_contribution) as total_company_cost
from public.payslips p
join public.employees e on e.id = p.employee_id
left join public.departments d on d.id = e.department_id
where p.status in ('validated','paid')
  and public.has_company_role(p.company_id, array['payroll_user','payroll_manager','admin']::public.app_role[])
group by p.company_id, date_trunc('month', p.period_end)::date, e.department_id, d.name;

create view public.v_admin_dashboard with (security_invoker = true) as
select
  c.id as company_id,
  (select count(*) from public.employees e where e.company_id = c.id) as total_employees,
  (select count(*) from public.user_company_roles r where r.company_id = c.id) as role_assignments,
  (select count(*) from public.biometric_devices b where b.company_id = c.id and b.is_online) as online_devices,
  (select count(*) from public.biometric_devices b where b.company_id = c.id and b.is_active and not b.is_online) as offline_devices,
  (select count(*) from public.notifications n where n.company_id = c.id and n.read_at is null) as unread_notifications,
  (select count(*) from public.audit_logs a where a.company_id = c.id and a.created_at >= now() - interval '24 hours') as actions_last_24h
from public.companies c
where public.has_company_role(c.id, array['admin']::public.app_role[]);

-- -----------------------------------------------------------------------------
-- 15. SUPABASE STORAGE (private medical proofs and payslips)
-- Path convention: {company_id}/{employee_id}/{uuid-filename.ext}
-- -----------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('medical-proofs', 'medical-proofs', false, 10485760, array['application/pdf','image/jpeg','image/png']),
  ('payslips', 'payslips', false, 10485760, array['application/pdf'])
on conflict (id) do nothing;

create policy medical_proofs_read on storage.objects for select to authenticated
using (
  bucket_id = 'medical-proofs' and
  (
    (storage.foldername(name))[2] = public.current_employee_id(((storage.foldername(name))[1])::uuid)::text or
    public.has_company_role(((storage.foldername(name))[1])::uuid, array['hr_manager','admin']::public.app_role[])
  )
);
create policy medical_proofs_upload on storage.objects for insert to authenticated
with check (
  bucket_id = 'medical-proofs' and
  (storage.foldername(name))[2] = public.current_employee_id(((storage.foldername(name))[1])::uuid)::text
);
create policy medical_proofs_hr_update on storage.objects for update to authenticated
using (bucket_id = 'medical-proofs' and public.has_company_role(((storage.foldername(name))[1])::uuid, array['hr_manager','admin']::public.app_role[]))
with check (bucket_id = 'medical-proofs' and public.has_company_role(((storage.foldername(name))[1])::uuid, array['hr_manager','admin']::public.app_role[]));

create policy payslips_read on storage.objects for select to authenticated
using (
  bucket_id = 'payslips' and
  (
    (storage.foldername(name))[2] = public.current_employee_id(((storage.foldername(name))[1])::uuid)::text or
    public.has_company_role(((storage.foldername(name))[1])::uuid, array['payroll_user','payroll_manager','admin']::public.app_role[])
  )
);
create policy payslips_manager_manage on storage.objects for all to authenticated
using (bucket_id = 'payslips' and public.has_company_role(((storage.foldername(name))[1])::uuid, array['payroll_manager','admin']::public.app_role[]))
with check (bucket_id = 'payslips' and public.has_company_role(((storage.foldername(name))[1])::uuid, array['payroll_manager','admin']::public.app_role[]));

-- -----------------------------------------------------------------------------
-- 16. GRANTS AND OPTIONAL REALTIME
-- -----------------------------------------------------------------------------

revoke all on all tables in schema public from anon;
grant usage on schema public to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;
grant select on public.v_employee_dashboard, public.v_hr_dashboard, public.v_pay_run_summary,
  public.v_payroll_readiness, public.v_email_distribution_summary,
  public.v_department_payroll_cost, public.v_admin_dashboard to authenticated;

-- Use Postgres Changes only for modest hackathon/demo traffic. For scale, prefer Broadcast.
alter publication supabase_realtime add table public.notifications;
alter publication supabase_realtime add table public.attendance_records;
alter publication supabase_realtime add table public.leave_requests;
alter publication supabase_realtime add table public.email_distribution_jobs;

-- -----------------------------------------------------------------------------
-- 17. SAFE STARTER DATA (replace placeholders after creating a company)
-- -----------------------------------------------------------------------------

-- Example PF rule: insert verified, current values yourself. Do not hardcode an
-- internet-found rate without legal/payroll review. The application selects the
-- version whose effective date covers the pay period.
--
-- insert into public.statutory_contribution_rules
--   (company_id, scheme_code, name, employee_rate, employer_rate, wage_basis,
--    wage_ceiling, effective_from, source_url)
-- values
--   ('YOUR_COMPANY_UUID', 'EPF', 'Employees Provident Fund', 0.00, 0.00,
--    'basic_plus_da', null, '2026-04-01', 'OFFICIAL_SOURCE_URL');
