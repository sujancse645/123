-- Location, overtime and sandwich-leave calculation entry points.

create or replace function public.record_attendance_with_location(
  p_company_id uuid, p_event_type text, p_method public.verification_method,
  p_latitude numeric default null, p_longitude numeric default null,
  p_accuracy_meters numeric default null, p_permission_denied boolean default false,
  p_device_id uuid default null
)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_employee uuid; v_geofence public.office_geofences; v_attendance public.attendance_records; v_status public.location_verification_status; v_distance numeric; v_event public.attendance_location_events; v_action text;
begin
  if p_event_type not in ('check_in','check_out') then raise exception 'Invalid attendance event type'; end if;
  v_employee:=public.current_employee_id(p_company_id);if v_employee is null then raise exception 'No employee is linked to this user';end if;
  select * into v_geofence from public.office_geofences where company_id=p_company_id and is_active order by created_at limit 1;
  if p_permission_denied then v_status:='permission_denied';
  elsif p_latitude is null or p_longitude is null or p_accuracy_meters is null then v_status:='unavailable';
  elsif v_geofence.id is null then v_status:='unavailable';
  else
    v_distance:=6371000*acos(least(1,greatest(-1,sin(radians(p_latitude))*sin(radians(v_geofence.latitude))+cos(radians(p_latitude))*cos(radians(v_geofence.latitude))*cos(radians(p_longitude-v_geofence.longitude)))));
    if p_accuracy_meters>v_geofence.maximum_accuracy_meters then v_status:='low_accuracy';
    elsif v_distance>v_geofence.allowed_radius_meters then v_status:='outside_allowed_location';else v_status:='verified';end if;
  end if;
  select outside_location_action into v_action from public.companies where id=p_company_id;
  if v_action='block' and v_status<>'verified' then raise exception 'Attendance blocked: location verification failed (%)',v_status;end if;
  if p_event_type='check_in' then v_attendance:=public.check_in(p_company_id,p_method,p_device_id);else v_attendance:=public.check_out(p_company_id,p_method,p_device_id);end if;
  insert into public.attendance_location_events(company_id,employee_id,attendance_id,event_type,latitude,longitude,accuracy_meters,geofence_id,distance_meters,verification_status,review_required)
  values(p_company_id,v_employee,v_attendance.id,p_event_type,p_latitude,p_longitude,p_accuracy_meters,v_geofence.id,v_distance,v_status,v_action='review' and v_status<>'verified') returning * into v_event;
  return jsonb_build_object('attendance_id',v_attendance.id,'location_event_id',v_event.id,'verification_status',v_status,'distance_meters',v_distance,'review_required',v_event.review_required);
end; $$;
revoke all on function public.record_attendance_with_location(uuid,text,public.verification_method,numeric,numeric,numeric,boolean,uuid) from public;
grant execute on function public.record_attendance_with_location(uuid,text,public.verification_method,numeric,numeric,numeric,boolean,uuid) to authenticated;

create or replace function public.preview_leave_impact_v2(p_company_id uuid,p_leave_type_id uuid,p_start_date date,p_end_date date)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_base record; v_policy public.sandwich_leave_policies; v_employee uuid; v_category text; v_sandwich numeric:=0; v_total numeric; v_paid boolean; v_extra_unpaid numeric:=0; v_salary numeric:=0; v_workdays numeric:=1;
begin
  select * into v_base from public.preview_leave_impact(p_company_id,p_leave_type_id,p_start_date,p_end_date);
  v_employee:=public.current_employee_id(p_company_id);select employment_category into v_category from public.employees where id=v_employee;
  select * into v_policy from public.sandwich_leave_policies where company_id=p_company_id and enabled and effective_from<=p_start_date and (effective_to is null or effective_to>=p_end_date) order by version desc limit 1;
  select is_paid into v_paid from public.leave_types where id=p_leave_type_id;
  if v_policy.id is not null and (cardinality(v_policy.applicable_leave_type_ids)=0 or p_leave_type_id=any(v_policy.applicable_leave_type_ids)) and not(v_category=any(v_policy.excluded_employment_categories)) and v_base.working_days>=v_policy.minimum_leave_span then
    select count(*) into v_sandwich from generate_series(p_start_date,p_end_date,interval '1 day') d where
      (v_policy.include_public_holidays and exists(select 1 from public.holidays h where h.company_id=p_company_id and h.holiday_date=d::date)) or
      (v_policy.include_weekly_offs and not exists(select 1 from public.contracts c join public.working_schedule_days wd on wd.schedule_id=c.working_schedule_id where c.employee_id=v_employee and c.status='running' and wd.iso_weekday=extract(isodow from d)::smallint and wd.is_working_day));
  end if;
  v_total:=v_base.working_days+v_sandwich;
  if v_policy.charge_as='unpaid' then v_extra_unpaid:=v_sandwich;elsif v_paid then v_extra_unpaid:=greatest(0,v_total-v_base.available_paid_days)-v_base.unpaid_days;end if;
  select case co.unpaid_leave_deduction_basis when 'basic' then c.basic_salary else c.monthly_gross end into v_salary from public.contracts c join public.companies co on co.id=c.company_id where c.employee_id=v_employee and c.status='running' limit 1;
  select greatest(1,count(*)) into v_workdays from generate_series(date_trunc('month',p_start_date)::date,(date_trunc('month',p_start_date)+interval '1 month - 1 day')::date,interval '1 day') d where extract(isodow from d)<6;
  return jsonb_build_object('normal_working_days',v_base.working_days,'available_paid_days',case when v_paid then v_base.available_paid_days else null end,'sandwich_days',v_sandwich,'total_chargeable_days',v_total,'unpaid_days',v_base.unpaid_days+greatest(0,v_extra_unpaid),'estimated_salary_deduction',round(v_base.estimated_salary_deduction+greatest(0,v_extra_unpaid)*coalesce(v_salary,0)/v_workdays,2),'sandwich_policy_id',v_policy.id,'explanation',case when v_sandwich>0 then 'Sandwich leave detected using assigned schedule and holiday calendar' else 'No sandwich leave applies' end);
end; $$;
revoke all on function public.preview_leave_impact_v2(uuid,uuid,date,date) from public;
grant execute on function public.preview_leave_impact_v2(uuid,uuid,date,date) to authenticated;

create or replace function public.calculate_overtime_entry(p_attendance_id uuid)
returns public.overtime_entries language plpgsql security definer set search_path='' as $$
declare a public.attendance_records; p public.overtime_policies; c public.contracts; d public.working_schedule_days; v_raw integer; v_minutes integer; v_hourly numeric; v_row public.overtime_entries;
begin
  select * into a from public.attendance_records where id=p_attendance_id for update;if not found then raise exception 'Attendance record not found';end if;
  if a.check_out_at is null then raise exception 'Overtime cannot be calculated from an open attendance session';end if;
  select * into p from public.overtime_policies where company_id=a.company_id and effective_from<=a.work_date and (effective_to is null or effective_to>=a.work_date) order by version desc limit 1;
  if p.id is null or not p.enabled then raise exception 'Overtime tracking is disabled';end if;
  select * into c from public.contracts where employee_id=a.employee_id and status='running' and start_date<=a.work_date and (end_date is null or end_date>=a.work_date) limit 1;
  select * into d from public.working_schedule_days where schedule_id=c.working_schedule_id and iso_weekday=extract(isodow from a.work_date)::smallint;
  v_raw:=greatest(0,floor(extract(epoch from(a.check_out_at-a.check_in_at))/60)::integer-d.break_minutes-floor(extract(epoch from(d.end_time-d.start_time))/60)::integer);
  v_minutes:=case when v_raw<p.minimum_eligible_minutes then 0 else least(floor(v_raw/p.rounding_interval_minutes)*p.rounding_interval_minutes,(p.max_hours_per_day*60)::integer) end;
  v_hourly:=case p.calculation_base when 'fixed_hourly' then p.fixed_hourly_rate when 'gross' then c.monthly_gross/208 else c.basic_salary/208 end;
  insert into public.overtime_entries(company_id,employee_id,attendance_id,policy_id,overtime_minutes,approved_minutes,status,amount,calculation)
  values(a.company_id,a.employee_id,a.id,p.id,v_minutes,case when p.requires_manager_approval then 0 else v_minutes end,case when p.requires_manager_approval then 'submitted' else 'approved' end,case when p.pay_enabled and not p.requires_manager_approval then round(v_minutes/60.0*v_hourly*p.multiplier,2) else 0 end,jsonb_build_object('raw_minutes',v_raw,'hourly_rate',v_hourly,'multiplier',p.multiplier,'pay_enabled',p.pay_enabled,'unpaid_break_minutes',d.break_minutes))
  on conflict(attendance_id) do update set overtime_minutes=excluded.overtime_minutes,calculation=excluded.calculation where public.overtime_entries.payslip_id is null returning * into v_row;
  return v_row;
end; $$;
revoke all on function public.calculate_overtime_entry(uuid) from public;
grant execute on function public.calculate_overtime_entry(uuid) to authenticated;
