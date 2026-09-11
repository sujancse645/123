-- PeoplePay360 additive compatibility migration.
-- Apply after the original complete setup. This file intentionally does not
-- recreate or rename any legacy table and may be applied to a populated DB.

create extension if not exists btree_gist;

do $$ begin
  create type public.contract_status as enum ('draft', 'scheduled', 'running', 'expired', 'terminated');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.location_verification_status as enum
    ('verified', 'outside_allowed_location', 'low_accuracy', 'permission_denied', 'unavailable');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.onboarding_status as enum ('invited', 'in_progress', 'pending_verification', 'verified', 'rejected');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.installment_status as enum ('upcoming', 'deducted', 'partially_paid', 'skipped', 'overdue', 'settled');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.settlement_type as enum ('scheduled', 'partial_lump_sum', 'early_full');
exception when duplicate_object then null; end $$;

alter type public.loan_status add value if not exists 'partially_repaid';
alter type public.loan_status add value if not exists 'settlement_requested';

-- Company and employee settings ------------------------------------------------
alter table if exists public.companies
  add column if not exists legal_address text,
  add column if not exists organization_email_domain text,
  add column if not exists employee_email_pattern text not null default '{first}.{last}',
  add column if not exists location_verification_enabled boolean not null default false,
  add column if not exists outside_location_action text not null default 'review',
  add column if not exists sandwich_leave_enabled boolean not null default false;

do $$ begin
  alter table public.companies add constraint companies_outside_location_action_check
    check (outside_location_action in ('allow', 'review', 'block')) not valid;
exception when duplicate_object then null; end $$;

alter table if exists public.profiles
  add column if not exists date_of_birth date,
  add column if not exists address jsonb not null default '{}'::jsonb,
  add column if not exists emergency_contact jsonb not null default '{}'::jsonb;

alter table if exists public.employees
  add column if not exists employment_category text not null default 'full_time',
  add column if not exists onboarding_status public.onboarding_status not null default 'invited',
  add column if not exists onboarding_completed_at timestamptz,
  add column if not exists onboarding_verified_by uuid references auth.users(id) on delete set null,
  add column if not exists onboarding_verified_at timestamptz,
  add column if not exists pan_encrypted text,
  add column if not exists uan_encrypted text;

do $$ begin
  alter table public.employees add constraint employees_employment_category_check
    check (employment_category in ('full_time', 'part_time', 'contractor', 'intern', 'trainee')) not valid;
exception when duplicate_object then null; end $$;

alter table if exists public.employee_bank_accounts
  add column if not exists is_verified boolean not null default false,
  add column if not exists verified_by uuid references auth.users(id) on delete set null,
  add column if not exists verified_at timestamptz;

create table if not exists public.employee_invitations (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete cascade,
  invited_email text not null,
  application_role public.app_role not null default 'employee',
  token_hash text not null,
  expires_at timestamptz not null,
  delivery_status text not null default 'pending' check (delivery_status in ('pending','sent','failed','activated','expired')),
  provider_message_id text,
  failure_reason text,
  invited_by uuid not null references auth.users(id) on delete restrict,
  sent_at timestamptz,
  activated_at timestamptz,
  created_at timestamptz not null default now(),
  unique (company_id, invited_email, token_hash)
);

-- Contract lifecycle -----------------------------------------------------------
alter table if exists public.contracts
  add column if not exists status public.contract_status not null default 'draft',
  add column if not exists approved_at timestamptz,
  add column if not exists approved_by uuid references auth.users(id) on delete set null,
  add column if not exists terminated_at timestamptz,
  add column if not exists termination_reason text;

-- Preserve old meaning while moving to explicit lifecycle states.
update public.contracts
set status = case
  when terminated_at is not null then 'terminated'::public.contract_status
  when is_active then 'running'::public.contract_status
  when start_date > current_date then 'scheduled'::public.contract_status
  when end_date is not null and end_date < current_date then 'expired'::public.contract_status
  else 'draft'::public.contract_status
end,
approved_at = case when is_active and approved_at is null then created_at else approved_at end
where status = 'draft'::public.contract_status;

create index if not exists contracts_employee_status_dates_idx
  on public.contracts(employee_id, status, start_date, end_date);

-- Detailed effective-dated schedules ------------------------------------------
create table if not exists public.working_schedule_segments (
  id uuid primary key default gen_random_uuid(),
  schedule_day_id uuid not null references public.working_schedule_days(id) on delete cascade,
  sequence integer not null check (sequence > 0),
  segment_type text not null check (segment_type in ('work','break','check_in','check_out')),
  start_time time not null,
  end_time time not null,
  is_paid boolean not null default true,
  is_required boolean not null default true,
  grace_minutes integer not null default 0 check (grace_minutes >= 0),
  overtime_eligible boolean not null default false,
  created_at timestamptz not null default now(),
  unique (schedule_day_id, sequence),
  check (end_time > start_time)
);

create table if not exists public.employee_schedule_assignments (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  employee_id uuid references public.employees(id) on delete cascade,
  department_id uuid references public.departments(id) on delete cascade,
  schedule_id uuid not null references public.working_schedules(id) on delete restrict,
  priority smallint not null default 100,
  effective_from date not null,
  effective_to date,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  check (employee_id is not null or department_id is not null),
  check (effective_to is null or effective_to >= effective_from)
);

create index if not exists employee_schedule_effective_idx
  on public.employee_schedule_assignments(employee_id, effective_from, effective_to);

-- Overtime --------------------------------------------------------------------
create table if not exists public.overtime_policies (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  version integer not null,
  enabled boolean not null default false,
  pay_enabled boolean not null default false,
  minimum_eligible_minutes integer not null default 30 check (minimum_eligible_minutes >= 0),
  max_hours_per_day numeric(6,2) not null default 4 check (max_hours_per_day >= 0),
  max_hours_per_month numeric(7,2) not null default 40 check (max_hours_per_month >= 0),
  rounding_interval_minutes integer not null default 15 check (rounding_interval_minutes > 0),
  multiplier numeric(6,3) not null default 1.5 check (multiplier >= 0),
  calculation_base text not null default 'basic' check (calculation_base in ('basic','gross','fixed_hourly')),
  fixed_hourly_rate numeric(14,2),
  requires_manager_approval boolean not null default true,
  eligible_department_ids uuid[] not null default '{}',
  eligible_roles public.app_role[] not null default '{}',
  eligible_employment_categories text[] not null default '{}',
  effective_from date not null,
  effective_to date,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (company_id, version),
  check (effective_to is null or effective_to >= effective_from),
  check (calculation_base <> 'fixed_hourly' or fixed_hourly_rate is not null)
);

create table if not exists public.overtime_entries (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete cascade,
  attendance_id uuid not null references public.attendance_records(id) on delete cascade,
  policy_id uuid not null references public.overtime_policies(id) on delete restrict,
  overtime_minutes integer not null check (overtime_minutes >= 0),
  approved_minutes integer not null default 0 check (approved_minutes >= 0),
  status public.request_status not null default 'submitted',
  approved_by uuid references auth.users(id) on delete set null,
  approved_at timestamptz,
  payslip_id uuid references public.payslips(id) on delete restrict,
  amount numeric(14,2) not null default 0 check (amount >= 0),
  calculation jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (attendance_id)
);

create unique index if not exists overtime_one_payment_idx
  on public.overtime_entries(attendance_id) where payslip_id is not null;

-- Attendance location snapshots (never continuous tracking) -------------------
create table if not exists public.office_geofences (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null,
  latitude numeric(10,7) not null check (latitude between -90 and 90),
  longitude numeric(10,7) not null check (longitude between -180 and 180),
  allowed_radius_meters integer not null default 150 check (allowed_radius_meters > 0),
  maximum_accuracy_meters integer not null default 100 check (maximum_accuracy_meters > 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (company_id, name)
);

create table if not exists public.attendance_location_events (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete cascade,
  attendance_id uuid references public.attendance_records(id) on delete cascade,
  event_type text not null check (event_type in ('check_in','check_out')),
  latitude numeric(10,7),
  longitude numeric(10,7),
  accuracy_meters numeric(10,2),
  geofence_id uuid references public.office_geofences(id) on delete set null,
  distance_meters numeric(12,2),
  verification_status public.location_verification_status not null,
  captured_at timestamptz not null default now(),
  review_required boolean not null default false,
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  review_note text
);

create index if not exists attendance_location_employee_time_idx
  on public.attendance_location_events(employee_id, captured_at desc);

-- Sandwich leave ---------------------------------------------------------------
create table if not exists public.sandwich_leave_policies (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  version integer not null,
  enabled boolean not null default false,
  applicable_leave_type_ids uuid[] not null default '{}',
  include_weekly_offs boolean not null default true,
  include_public_holidays boolean not null default true,
  minimum_leave_span integer not null default 2 check (minimum_leave_span > 0),
  excluded_employment_categories text[] not null default '{}',
  charge_as text not null default 'paid' check (charge_as in ('paid','unpaid')),
  effective_from date not null,
  effective_to date,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (company_id, version),
  check (effective_to is null or effective_to >= effective_from)
);

alter table if exists public.leave_requests
  add column if not exists normal_working_days numeric(6,2),
  add column if not exists sandwich_days numeric(6,2) not null default 0,
  add column if not exists total_chargeable_days numeric(6,2),
  add column if not exists sandwich_policy_id uuid references public.sandwich_leave_policies(id) on delete restrict,
  add column if not exists rejected_by uuid references auth.users(id) on delete set null,
  add column if not exists rejected_at timestamptz,
  add column if not exists rejection_reason text;

update public.leave_requests
set normal_working_days = coalesce(normal_working_days, requested_days),
    total_chargeable_days = coalesce(total_chargeable_days, requested_days),
    rejected_by = case when status = 'rejected' then coalesce(rejected_by, approver_id) else rejected_by end,
    rejected_at = case when status = 'rejected' then coalesce(rejected_at, reviewed_at) else rejected_at end,
    rejection_reason = case when status = 'rejected' then coalesce(rejection_reason, reviewer_note) else rejection_reason end;

-- Versioned reusable salary structures ----------------------------------------
create table if not exists public.salary_structure_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text not null unique,
  description text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.salary_structure_template_versions (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.salary_structure_templates(id) on delete cascade,
  version integer not null,
  effective_from date not null,
  effective_to date,
  status text not null default 'draft' check (status in ('draft','active','retired')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (template_id, version),
  check (effective_to is null or effective_to >= effective_from)
);

create table if not exists public.salary_structure_template_rules (
  id uuid primary key default gen_random_uuid(),
  template_version_id uuid not null references public.salary_structure_template_versions(id) on delete cascade,
  code text not null,
  name text not null,
  category text not null check (category in ('earning','deduction','employer_contribution','reimbursement')),
  calculation_method text not null check (calculation_method in ('fixed','percentage','statutory','input')),
  parameters jsonb not null default '{}'::jsonb,
  dependency_codes text[] not null default '{}',
  is_primary_basic boolean not null default false,
  statutory_rule_id uuid references public.statutory_contribution_rules(id) on delete restrict,
  sequence integer not null default 100,
  is_active boolean not null default true,
  unique (template_version_id, code)
);

create table if not exists public.company_salary_structure_assignments (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  template_version_id uuid not null references public.salary_structure_template_versions(id) on delete restrict,
  effective_from date not null,
  effective_to date,
  overrides jsonb not null default '{}'::jsonb,
  employee_group_filter jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (effective_to is null or effective_to >= effective_from)
);

-- Payroll safety, PDF metadata, and bank export --------------------------------
alter table if exists public.payslips
  add column if not exists overtime_minutes integer not null default 0,
  add column if not exists overtime_amount numeric(14,2) not null default 0,
  add column if not exists actual_unpaid_leave_deduction numeric(14,2) not null default 0,
  add column if not exists pdf_checksum text,
  add column if not exists finalized_by uuid references auth.users(id) on delete set null,
  add column if not exists finalized_at timestamptz;

create table if not exists public.payroll_deduction_deferrals (
  id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete restrict, payslip_id uuid not null references public.payslips(id) on delete restrict,
  payslip_line_id uuid not null references public.payslip_lines(id) on delete restrict, original_amount numeric(14,2) not null check(original_amount>0),
  deferred_amount numeric(14,2) not null check(deferred_amount>0 and deferred_amount<=original_amount), carry_forward_period date not null,
  reason text not null, status text not null default 'pending' check(status in('pending','applied','waived')),
  created_by uuid not null references auth.users(id) on delete restrict, created_at timestamptz not null default now()
);

alter table if exists public.employee_loans
  add column if not exists outstanding_interest numeric(14,2) not null default 0,
  add column if not exists closed_at timestamptz,
  add column if not exists closure_type public.settlement_type,
  add column if not exists closure_reference text;

update public.employee_loans
set outstanding_interest = accrued_interest
where outstanding_interest = 0 and accrued_interest > 0;

alter table if exists public.loan_installments
  add column if not exists status public.installment_status not null default 'upcoming',
  add column if not exists settlement_payment_id uuid;

alter table if exists public.loan_payments
  add column if not exists idempotency_key text,
  add column if not exists request_fingerprint text,
  add column if not exists balance_before numeric(14,2),
  add column if not exists balance_after numeric(14,2),
  add column if not exists metadata jsonb not null default '{}'::jsonb;

create unique index if not exists loan_payments_idempotency_idx
  on public.loan_payments(company_id, idempotency_key) where idempotency_key is not null;

do $$ begin
  alter table public.loan_installments add constraint loan_installments_settlement_payment_fk
    foreign key (settlement_payment_id) references public.loan_payments(id) on delete set null;
exception when duplicate_object then null; end $$;

create table if not exists public.company_bank_accounts (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  display_name text not null,
  bank_name text not null,
  account_number_encrypted text not null,
  account_last4 char(4) not null,
  ifsc_code text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (company_id, display_name)
);

create table if not exists public.bank_export_templates (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null,
  file_format text not null default 'csv' check (file_format in ('csv','xlsx')),
  column_config jsonb not null,
  delimiter char(1) not null default ',',
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, name)
);

create table if not exists public.payroll_bank_exports (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  pay_run_id uuid not null references public.pay_runs(id) on delete restrict,
  company_bank_account_id uuid not null references public.company_bank_accounts(id) on delete restrict,
  template_id uuid not null references public.bank_export_templates(id) on delete restrict,
  batch_reference text not null,
  payment_date date not null,
  included_employee_count integer not null default 0,
  excluded_employee_count integer not null default 0,
  total_amount numeric(16,2) not null default 0,
  checksum text,
  storage_path text,
  generated_by uuid not null references auth.users(id) on delete restrict,
  generated_at timestamptz not null default now(),
  unique (company_id, batch_reference)
);

create table if not exists public.payroll_bank_export_items (
  id uuid primary key default gen_random_uuid(),
  export_id uuid not null references public.payroll_bank_exports(id) on delete cascade,
  payroll_payment_id uuid references public.payroll_payments(id) on delete restrict,
  employee_id uuid not null references public.employees(id) on delete restrict,
  included boolean not null,
  exclusion_reason text,
  amount numeric(14,2) not null default 0 check (amount >= 0),
  payment_reference text,
  unique (export_id, employee_id),
  check ((included and exclusion_reason is null) or (not included and exclusion_reason is not null))
);

create index if not exists bank_exports_payrun_idx on public.payroll_bank_exports(pay_run_id, generated_at desc);

-- Private bank-export artifacts.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('payroll-bank-exports', 'payroll-bank-exports', false, 10485760,
        array['text/csv','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'])
on conflict (id) do update set public = false;
