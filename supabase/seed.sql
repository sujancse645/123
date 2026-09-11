-- Deterministic development-only policy and rejection examples. This seed is
-- intentionally conditional: it never creates companies/employees in production.
do $$
declare v_company uuid; v_employee uuid; v_leave_type uuid; v_reviewer uuid;
begin
  select id into v_company from public.companies order by created_at limit 1;
  if v_company is null then raise notice 'PeoplePay360 seed skipped: create a company first'; return; end if;
  select id into v_employee from public.employees where company_id=v_company order by created_at limit 1;
  select id into v_leave_type from public.leave_types where company_id=v_company and is_paid order by created_at limit 1;
  select user_id into v_reviewer from public.user_company_roles where company_id=v_company and role in ('hr_manager','admin') order by role limit 1;

  insert into public.overtime_policies(id,company_id,version,enabled,pay_enabled,minimum_eligible_minutes,max_hours_per_day,max_hours_per_month,rounding_interval_minutes,multiplier,calculation_base,requires_manager_approval,effective_from)
  values('00000000-0000-4000-8000-000000000601',v_company,1,true,true,30,4,40,15,1.5,'basic',true,'2026-01-01') on conflict(id) do nothing;
  insert into public.sandwich_leave_policies(id,company_id,version,enabled,applicable_leave_type_ids,include_weekly_offs,include_public_holidays,minimum_leave_span,charge_as,effective_from)
  values('00000000-0000-4000-8000-000000000602',v_company,1,true,case when v_leave_type is null then '{}'::uuid[] else array[v_leave_type] end,true,true,2,'paid','2026-01-01') on conflict(id) do nothing;
  insert into public.office_geofences(id,company_id,name,latitude,longitude,allowed_radius_meters,maximum_accuracy_meters)
  values('00000000-0000-4000-8000-000000000603',v_company,'Bengaluru HQ',12.9716000,77.5946000,150,100) on conflict(id) do nothing;

  if v_employee is not null and v_leave_type is not null then
    perform set_config('session_replication_role','replica',true);
    insert into public.leave_requests(id,company_id,employee_id,leave_type_id,start_date,end_date,requested_days,reason,status,approver_id,reviewed_at,reviewer_note,rejected_by,rejected_at,rejection_reason,normal_working_days,total_chargeable_days,created_at)
    values('00000000-0000-4000-8000-000000000610',v_company,v_employee,v_leave_type,'2026-07-17','2026-07-17',1,'Deterministic refused-leave demonstration','rejected',v_reviewer,'2026-07-13 10:00:00+05:30','Release coverage required',v_reviewer,'2026-07-13 10:00:00+05:30','Release coverage required; please choose another date.',1,1,'2026-07-12 09:00:00+05:30')
    on conflict(id) do nothing;
    perform set_config('session_replication_role','origin',true);
  end if;
end $$;
