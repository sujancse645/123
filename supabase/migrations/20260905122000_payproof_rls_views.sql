-- RLS and safe views for extension objects. Existing policies remain intact.

do $$ declare t text; begin
  foreach t in array array[
    'employee_invitations','working_schedule_segments','employee_schedule_assignments',
    'overtime_policies','overtime_entries','office_geofences','attendance_location_events',
    'sandwich_leave_policies','salary_structure_templates','salary_structure_template_versions',
    'salary_structure_template_rules','company_salary_structure_assignments','company_bank_accounts',
    'bank_export_templates','payroll_bank_exports','payroll_bank_export_items','payroll_deduction_deferrals'
  ] loop execute format('alter table public.%I enable row level security', t); end loop;
end $$;

drop policy if exists employee_invitations_hr_admin on public.employee_invitations;
create policy employee_invitations_hr_admin on public.employee_invitations for select to authenticated
  using (public.has_company_role(company_id, array['hr_manager','admin']::public.app_role[]));

drop policy if exists schedule_segments_member_read on public.working_schedule_segments;
create policy schedule_segments_member_read on public.working_schedule_segments for select to authenticated using (exists (
  select 1 from public.working_schedule_days d join public.working_schedules s on s.id=d.schedule_id
  where d.id=schedule_day_id and public.is_company_member(s.company_id)));
drop policy if exists schedule_segments_hr_admin_manage on public.working_schedule_segments;
create policy schedule_segments_hr_admin_manage on public.working_schedule_segments for all to authenticated using (exists (
  select 1 from public.working_schedule_days d join public.working_schedules s on s.id=d.schedule_id
  where d.id=schedule_day_id and public.has_company_role(s.company_id,array['hr_manager','admin']::public.app_role[])))
  with check (exists (select 1 from public.working_schedule_days d join public.working_schedules s on s.id=d.schedule_id
  where d.id=schedule_day_id and public.has_company_role(s.company_id,array['hr_manager','admin']::public.app_role[])));

drop policy if exists employee_schedules_member_read on public.employee_schedule_assignments;
create policy employee_schedules_member_read on public.employee_schedule_assignments for select to authenticated
  using (public.is_company_member(company_id));
drop policy if exists employee_schedules_hr_admin_manage on public.employee_schedule_assignments;
create policy employee_schedules_hr_admin_manage on public.employee_schedule_assignments for all to authenticated
  using (public.has_company_role(company_id,array['hr_manager','admin']::public.app_role[]))
  with check (public.has_company_role(company_id,array['hr_manager','admin']::public.app_role[]));

drop policy if exists overtime_policy_payroll_read on public.overtime_policies;
create policy overtime_policy_payroll_read on public.overtime_policies for select to authenticated
  using (public.has_company_role(company_id,array['payroll_user','payroll_manager','admin']::public.app_role[]));
drop policy if exists overtime_policy_manager_manage on public.overtime_policies;
create policy overtime_policy_manager_manage on public.overtime_policies for all to authenticated
  using (public.has_company_role(company_id,array['payroll_manager','admin']::public.app_role[]))
  with check (public.has_company_role(company_id,array['payroll_manager','admin']::public.app_role[]));

drop policy if exists overtime_entries_self_payroll_read on public.overtime_entries;
create policy overtime_entries_self_payroll_read on public.overtime_entries for select to authenticated
  using (employee_id=public.current_employee_id(company_id) or public.has_company_role(company_id,array['payroll_user','payroll_manager','admin']::public.app_role[]));
drop policy if exists overtime_entries_manager_manage on public.overtime_entries;
create policy overtime_entries_manager_manage on public.overtime_entries for all to authenticated
  using (public.has_company_role(company_id,array['payroll_manager','admin']::public.app_role[]))
  with check (public.has_company_role(company_id,array['payroll_manager','admin']::public.app_role[]));

drop policy if exists geofences_member_read on public.office_geofences;
create policy geofences_member_read on public.office_geofences for select to authenticated using (public.is_company_member(company_id));
drop policy if exists geofences_admin_manage on public.office_geofences;
create policy geofences_admin_manage on public.office_geofences for all to authenticated
  using (public.has_company_role(company_id,array['admin']::public.app_role[]))
  with check (public.has_company_role(company_id,array['admin']::public.app_role[]));

drop policy if exists location_events_self_staff_read on public.attendance_location_events;
create policy location_events_self_staff_read on public.attendance_location_events for select to authenticated
  using (employee_id=public.current_employee_id(company_id) or public.has_company_role(company_id,array['hr_manager','admin']::public.app_role[]));
drop policy if exists location_events_hr_admin_review on public.attendance_location_events;
create policy location_events_hr_admin_review on public.attendance_location_events for update to authenticated
  using (public.has_company_role(company_id,array['hr_manager','admin']::public.app_role[]))
  with check (public.has_company_role(company_id,array['hr_manager','admin']::public.app_role[]));

drop policy if exists sandwich_policy_member_read on public.sandwich_leave_policies;
create policy sandwich_policy_member_read on public.sandwich_leave_policies for select to authenticated using (public.is_company_member(company_id));
drop policy if exists sandwich_policy_hr_admin_manage on public.sandwich_leave_policies;
create policy sandwich_policy_hr_admin_manage on public.sandwich_leave_policies for all to authenticated
  using (public.has_company_role(company_id,array['hr_manager','admin']::public.app_role[]))
  with check (public.has_company_role(company_id,array['hr_manager','admin']::public.app_role[]));

-- Global templates are readable by payroll roles in any company; only admins manage.
drop policy if exists salary_templates_payroll_read on public.salary_structure_templates;
create policy salary_templates_payroll_read on public.salary_structure_templates for select to authenticated using (exists (
  select 1 from public.user_company_roles r where r.user_id=(select auth.uid()) and r.role in ('payroll_user','payroll_manager','admin')));
drop policy if exists salary_templates_admin_manage on public.salary_structure_templates;
create policy salary_templates_admin_manage on public.salary_structure_templates for all to authenticated using (exists (
  select 1 from public.user_company_roles r where r.user_id=(select auth.uid()) and r.role='admin')) with check (exists (
  select 1 from public.user_company_roles r where r.user_id=(select auth.uid()) and r.role='admin'));

drop policy if exists template_versions_payroll_read on public.salary_structure_template_versions;
create policy template_versions_payroll_read on public.salary_structure_template_versions for select to authenticated using (exists (
  select 1 from public.user_company_roles r where r.user_id=(select auth.uid()) and r.role in ('payroll_user','payroll_manager','admin')));
drop policy if exists template_rules_payroll_read on public.salary_structure_template_rules;
create policy template_rules_payroll_read on public.salary_structure_template_rules for select to authenticated using (exists (
  select 1 from public.user_company_roles r where r.user_id=(select auth.uid()) and r.role in ('payroll_user','payroll_manager','admin')));
drop policy if exists template_versions_admin_manage on public.salary_structure_template_versions;
create policy template_versions_admin_manage on public.salary_structure_template_versions for all to authenticated using (exists (
  select 1 from public.user_company_roles r where r.user_id=(select auth.uid()) and r.role='admin')) with check (exists (
  select 1 from public.user_company_roles r where r.user_id=(select auth.uid()) and r.role='admin'));
drop policy if exists template_rules_admin_manage on public.salary_structure_template_rules;
create policy template_rules_admin_manage on public.salary_structure_template_rules for all to authenticated using (exists (
  select 1 from public.user_company_roles r where r.user_id=(select auth.uid()) and r.role='admin')) with check (exists (
  select 1 from public.user_company_roles r where r.user_id=(select auth.uid()) and r.role='admin'));

drop policy if exists salary_assignments_payroll_read on public.company_salary_structure_assignments;
create policy salary_assignments_payroll_read on public.company_salary_structure_assignments for select to authenticated
  using (public.has_company_role(company_id,array['payroll_user','payroll_manager','admin']::public.app_role[]));
drop policy if exists salary_assignments_manager_manage on public.company_salary_structure_assignments;
create policy salary_assignments_manager_manage on public.company_salary_structure_assignments for all to authenticated
  using (public.has_company_role(company_id,array['payroll_manager','admin']::public.app_role[]))
  with check (public.has_company_role(company_id,array['payroll_manager','admin']::public.app_role[]));

do $$ declare t text; begin
  foreach t in array array['company_bank_accounts','bank_export_templates','payroll_bank_exports'] loop
    execute format('create policy %I on public.%I for select to authenticated using (public.has_company_role(company_id,array[''payroll_manager'',''admin'']::public.app_role[]))', t||'_manager_read', t);
    execute format('create policy %I on public.%I for all to authenticated using (public.has_company_role(company_id,array[''payroll_manager'',''admin'']::public.app_role[])) with check (public.has_company_role(company_id,array[''payroll_manager'',''admin'']::public.app_role[]))', t||'_manager_manage', t);
  end loop;
exception when duplicate_object then null; end $$;

drop policy if exists bank_export_items_manager_access on public.payroll_bank_export_items;
create policy bank_export_items_manager_access on public.payroll_bank_export_items for all to authenticated using (exists (
  select 1 from public.payroll_bank_exports e where e.id=export_id and public.has_company_role(e.company_id,array['payroll_manager','admin']::public.app_role[])))
  with check (exists (select 1 from public.payroll_bank_exports e where e.id=export_id and public.has_company_role(e.company_id,array['payroll_manager','admin']::public.app_role[])));

drop policy if exists deduction_deferrals_payroll_read on public.payroll_deduction_deferrals;
create policy deduction_deferrals_payroll_read on public.payroll_deduction_deferrals for select to authenticated using(public.has_company_role(company_id,array['payroll_user','payroll_manager','admin']::public.app_role[]));
drop policy if exists deduction_deferrals_manager_manage on public.payroll_deduction_deferrals;
create policy deduction_deferrals_manager_manage on public.payroll_deduction_deferrals for all to authenticated using(public.has_company_role(company_id,array['payroll_manager','admin']::public.app_role[])) with check(public.has_company_role(company_id,array['payroll_manager','admin']::public.app_role[]));

-- Public-facing clients use these safe projections, not broad sensitive selects.
create or replace view public.v_employee_leave_summary with (security_invoker=true) as
with leave_totals as (
  select r.employee_id,r.company_id,extract(year from r.start_date)::integer as leave_year,
    coalesce(sum(r.requested_days) filter(where not t.is_paid and r.status='approved'),0) as approved_unpaid_days,
    coalesce(sum(r.requested_days) filter(where not t.is_paid and r.status='submitted'),0) as pending_unpaid_days,
    coalesce(sum(r.estimated_unpaid_deduction) filter(where not t.is_paid and r.status in('submitted','approved')),0) as estimated_lop
  from public.leave_requests r join public.leave_types t on t.id=r.leave_type_id
  where r.employee_id=public.current_employee_id(r.company_id)
     or public.has_company_role(r.company_id,array['hr_manager','payroll_user','payroll_manager','admin']::public.app_role[])
  group by r.employee_id,r.company_id,extract(year from r.start_date)
), payslip_totals as (
  select p.employee_id,p.company_id,extract(year from p.period_end)::integer as leave_year,
    coalesce(sum(p.actual_unpaid_leave_deduction),0) as actual_lop
  from public.payslips p group by p.employee_id,p.company_id,extract(year from p.period_end)
)
select l.employee_id,l.company_id,l.leave_year,l.approved_unpaid_days,l.pending_unpaid_days,l.estimated_lop,
  coalesce(p.actual_lop,0) as actual_lop
from leave_totals l left join payslip_totals p using(employee_id,company_id,leave_year);

create or replace view public.v_employee_bank_accounts_masked with (security_invoker=true) as
select id,company_id,employee_id,account_holder_name,bank_name,account_last4,ifsc_code,is_primary,is_verified,verification_status,updated_at
from public.employee_bank_accounts
where employee_id=public.current_employee_id(company_id)
   or public.has_company_role(company_id,array['payroll_user','payroll_manager','admin']::public.app_role[]);

grant select on public.v_employee_leave_summary, public.v_employee_bank_accounts_masked to authenticated;

drop policy if exists payroll_bank_exports_storage on storage.objects;
create policy payroll_bank_exports_storage on storage.objects for all to authenticated
using (bucket_id='payroll-bank-exports' and public.has_company_role(((storage.foldername(name))[1])::uuid,array['payroll_manager','admin']::public.app_role[]))
with check (bucket_id='payroll-bank-exports' and public.has_company_role(((storage.foldername(name))[1])::uuid,array['payroll_manager','admin']::public.app_role[]));

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('profile-photos','profile-photos',false,5242880,array['image/jpeg','image/png','image/webp'])
on conflict(id) do update set public=false;
drop policy if exists profile_photos_self_read on storage.objects;
create policy profile_photos_self_read on storage.objects for select to authenticated using(bucket_id='profile-photos' and ((storage.foldername(name))[2]=public.current_employee_id(((storage.foldername(name))[1])::uuid)::text or public.has_company_role(((storage.foldername(name))[1])::uuid,array['hr_manager','admin']::public.app_role[])));
drop policy if exists profile_photos_self_upload on storage.objects;
create policy profile_photos_self_upload on storage.objects for insert to authenticated with check(bucket_id='profile-photos' and (storage.foldername(name))[2]=public.current_employee_id(((storage.foldername(name))[1])::uuid)::text);

grant select,insert,update,delete on all tables in schema public to authenticated;

-- Column privilege hardening: browser clients never receive encrypted account,
-- statutory ID, invitation token, or company settlement-account values.
revoke select on public.employee_bank_accounts from authenticated;
grant select(id,company_id,employee_id,account_holder_name,bank_name,account_last4,ifsc_code,is_primary,verification_status,is_verified,verified_at,created_at,updated_at) on public.employee_bank_accounts to authenticated;
revoke select on public.company_bank_accounts from authenticated;
grant select(id,company_id,display_name,bank_name,account_last4,ifsc_code,is_active,created_at) on public.company_bank_accounts to authenticated;
revoke select on public.employee_invitations from authenticated;
grant select(id,company_id,employee_id,invited_email,application_role,expires_at,delivery_status,provider_message_id,failure_reason,invited_by,sent_at,activated_at,created_at) on public.employee_invitations to authenticated;
