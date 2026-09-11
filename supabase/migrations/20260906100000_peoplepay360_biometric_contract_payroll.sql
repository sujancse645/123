-- Secure browser biometrics and contract-backed payroll eligibility.
-- Fingerprints remain inside the platform authenticator; only WebAuthn public
-- credential material is stored here. Face templates must be encrypted by API.

create table if not exists public.employee_webauthn_credentials (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  credential_id text not null unique,
  public_key text not null,
  counter bigint not null default 0,
  transports text[] not null default '{}',
  device_label text not null default 'Platform authenticator',
  backed_up boolean not null default false,
  revoked_at timestamptz,
  last_used_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.webauthn_challenges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  purpose text not null check (purpose in ('registration','authentication')),
  challenge text not null,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.employee_face_enrollments (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete cascade,
  encrypted_template text not null,
  template_checksum text not null,
  model_name text not null,
  model_version text not null,
  sample_count integer not null check (sample_count between 3 and 20),
  consent_version text not null,
  consented_at timestamptz not null,
  revoked_at timestamptz,
  enrolled_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  unique (employee_id, model_name, model_version)
);

create table if not exists public.biometric_verification_events (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete cascade,
  method text not null check (method in ('face','webauthn')),
  outcome text not null check (outcome in ('verified','rejected','unavailable','cancelled')),
  confidence numeric(6,5),
  liveness_passed boolean,
  model_version text,
  credential_id text,
  occurred_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);

alter table if exists public.employees
  add column if not exists current_contract_id uuid references public.contracts(id) on delete set null,
  add column if not exists biometric_enrollment_required boolean not null default true,
  add column if not exists biometric_enrolled_at timestamptz,
  add column if not exists biometric_platform_unavailable_at timestamptz;

create index if not exists webauthn_credentials_employee_idx on public.employee_webauthn_credentials(employee_id) where revoked_at is null;
create index if not exists webauthn_challenges_expiry_idx on public.webauthn_challenges(user_id, expires_at desc) where consumed_at is null;
create index if not exists face_enrollments_employee_idx on public.employee_face_enrollments(employee_id) where revoked_at is null;
create index if not exists biometric_events_employee_time_idx on public.biometric_verification_events(employee_id, occurred_at desc);
create index if not exists contracts_payroll_period_idx on public.contracts(company_id, employee_id, start_date, end_date);

create or replace function public.assign_employee_contract(p_contract_id uuid)
returns public.contracts
language plpgsql security definer set search_path=''
as $$
declare v_contract public.contracts;
begin
  select * into v_contract from public.contracts where id=p_contract_id for update;
  if v_contract.id is null then raise exception 'Contract not found'; end if;
  if not public.has_company_role(v_contract.company_id,array['hr_manager','admin']::public.app_role[]) then raise exception 'HR Manager or Admin access required'; end if;
  if exists(select 1 from public.contracts c where c.employee_id=v_contract.employee_id and c.id<>v_contract.id and c.approved_at is not null and daterange(c.start_date,coalesce(c.end_date,'infinity'::date),'[]') && daterange(v_contract.start_date,coalesce(v_contract.end_date,'infinity'::date),'[]')) then raise exception 'Employee already has an overlapping approved contract'; end if;
  update public.contracts set approved_at=coalesce(approved_at,now()),approved_by=(select auth.uid()),status=case when start_date>current_date then 'scheduled'::public.contract_status else 'running'::public.contract_status end,is_active=start_date<=current_date and (end_date is null or end_date>=current_date),updated_at=now() where id=p_contract_id returning * into v_contract;
  update public.employees set current_contract_id=p_contract_id,updated_at=now() where id=v_contract.employee_id;
  insert into public.audit_logs(company_id,actor_user_id,action,entity_table,entity_id,summary) values(v_contract.company_id,(select auth.uid()),'employee_contract_assigned','contracts',v_contract.id::text,jsonb_build_object('employee_id',v_contract.employee_id));
  return v_contract;
end;$$;

create or replace function public.payroll_contract_eligibility(p_company_id uuid,p_period_start date,p_period_end date)
returns table(employee_id uuid,contract_id uuid,is_eligible boolean,eligible_from date,eligible_to date,exclusion_reason text)
language sql stable security invoker set search_path=''
as $$
  select e.id,c.id,c.id is not null,
    case when c.id is null then null else greatest(c.start_date,p_period_start) end,
    case when c.id is null then null else least(coalesce(c.end_date,p_period_end),p_period_end) end,
    case when c.id is not null then null when not exists(select 1 from public.contracts any_c where any_c.employee_id=e.id and any_c.approved_at is not null) then 'No approved contract assigned' else 'Contract does not cover this payroll period' end
  from public.employees e
  left join lateral (
    select c1.* from public.contracts c1 where c1.employee_id=e.id and c1.company_id=p_company_id and c1.approved_at is not null and c1.start_date<=p_period_end and coalesce(c1.end_date,'infinity'::date)>=p_period_start and (c1.terminated_at is null or c1.terminated_at::date>=p_period_start) order by c1.start_date desc limit 1
  ) c on true
  where e.company_id=p_company_id and e.status not in ('inactive','terminated');
$$;

create or replace function public.enforce_payslip_contract_coverage()
returns trigger language plpgsql set search_path='' as $$
begin
  if new.contract_id is null or not exists(select 1 from public.contracts c where c.id=new.contract_id and c.employee_id=new.employee_id and c.company_id=new.company_id and c.approved_at is not null and c.start_date<=new.period_end and coalesce(c.end_date,'infinity'::date)>=new.period_start and (c.terminated_at is null or c.terminated_at::date>=new.period_start)) then
    raise exception 'Payslip requires an approved employee contract covering the payroll period';
  end if;
  return new;
end;$$;

drop trigger if exists payslip_contract_coverage_guard on public.payslips;
create trigger payslip_contract_coverage_guard before insert or update of contract_id,employee_id,period_start,period_end on public.payslips for each row execute function public.enforce_payslip_contract_coverage();

alter table public.employee_webauthn_credentials enable row level security;
alter table public.webauthn_challenges enable row level security;
alter table public.employee_face_enrollments enable row level security;
alter table public.biometric_verification_events enable row level security;

drop policy if exists webauthn_owner_read on public.employee_webauthn_credentials;
create policy webauthn_owner_read on public.employee_webauthn_credentials for select to authenticated using(user_id=(select auth.uid()) or public.has_company_role(company_id,array['admin']::public.app_role[]));
drop policy if exists face_owner_read on public.employee_face_enrollments;
create policy face_owner_read on public.employee_face_enrollments for select to authenticated using(employee_id=public.current_employee_id(company_id) or public.has_company_role(company_id,array['hr_manager','admin']::public.app_role[]));
drop policy if exists biometric_events_owner_read on public.biometric_verification_events;
create policy biometric_events_owner_read on public.biometric_verification_events for select to authenticated using(employee_id=public.current_employee_id(company_id) or public.has_company_role(company_id,array['hr_manager','admin']::public.app_role[]));

revoke all on function public.assign_employee_contract(uuid) from public;
grant execute on function public.assign_employee_contract(uuid) to authenticated;
grant execute on function public.payroll_contract_eligibility(uuid,date,date) to authenticated;
