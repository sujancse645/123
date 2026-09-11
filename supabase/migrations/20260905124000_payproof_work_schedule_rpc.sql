-- Atomic creation of an effective-dated work schedule and its ordered segments.
-- This extends the legacy working_schedules/working_schedule_days tables.

create or replace function public.create_work_schedule(
  p_company_id uuid,
  p_name text,
  p_timezone text,
  p_effective_from date,
  p_effective_to date,
  p_assignment_type text,
  p_assignment_id uuid,
  p_is_company_default boolean,
  p_days jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_schedule_id uuid;
  v_day_id uuid;
  v_day jsonb;
  v_start time;
  v_end time;
  v_lunch_start time;
  v_lunch_end time;
  v_grace integer;
begin
  if not public.has_company_role(
    p_company_id,
    array['hr_manager','payroll_user','payroll_manager','admin']::public.app_role[]
  ) then
    raise exception 'HR or Admin access is required to create a work schedule';
  end if;
  if nullif(trim(p_name), '') is null then raise exception 'Schedule name is required'; end if;
  if p_effective_to is not null and p_effective_to < p_effective_from then
    raise exception 'Effective-to date cannot precede effective-from date';
  end if;
  if p_assignment_type not in ('company','department','employee') then
    raise exception 'Invalid schedule assignment type';
  end if;
  if p_assignment_type <> 'company' and p_assignment_id is null then
    raise exception 'An employee or department assignment is required';
  end if;
  if jsonb_typeof(p_days) <> 'array' or jsonb_array_length(p_days) <> 7 then
    raise exception 'Exactly seven weekday definitions are required';
  end if;

  insert into public.working_schedules(company_id,name,timezone,grace_minutes,is_default)
  values(p_company_id,trim(p_name),coalesce(nullif(trim(p_timezone),''),'Asia/Kolkata'),0,p_is_company_default)
  returning id into v_schedule_id;

  for v_day in select value from jsonb_array_elements(p_days) loop
    if coalesce((v_day->>'isWorking')::boolean,false) then
      v_start := (v_day->>'startTime')::time;
      v_end := (v_day->>'endTime')::time;
      v_grace := greatest(0,coalesce((v_day->>'graceMinutes')::integer,0));
      if v_end <= v_start then raise exception 'Working-day end time must be after start time'; end if;

      insert into public.working_schedule_days(schedule_id,iso_weekday,start_time,end_time,break_minutes,is_working_day)
      values(v_schedule_id,(v_day->>'isoWeekday')::smallint,v_start,v_end,
        greatest(0,coalesce((v_day->>'breakMinutes')::integer,0)),true)
      returning id into v_day_id;

      insert into public.working_schedule_segments(schedule_day_id,sequence,segment_type,start_time,end_time,is_paid,is_required,grace_minutes,overtime_eligible)
      values(v_day_id,1,'check_in',v_start-(greatest(v_grace,1)||' minutes')::interval,v_start,false,true,v_grace,false);

      if nullif(v_day->>'lunchStart','') is not null and nullif(v_day->>'lunchEnd','') is not null then
        v_lunch_start := (v_day->>'lunchStart')::time;
        v_lunch_end := (v_day->>'lunchEnd')::time;
        if not (v_start < v_lunch_start and v_lunch_start < v_lunch_end and v_lunch_end < v_end) then
          raise exception 'Lunch segment must fall inside working hours';
        end if;
        insert into public.working_schedule_segments(schedule_day_id,sequence,segment_type,start_time,end_time,is_paid,is_required,grace_minutes,overtime_eligible)
        values
          (v_day_id,2,'work',v_start,v_lunch_start,true,true,0,false),
          (v_day_id,3,'break',v_lunch_start,v_lunch_end,false,true,0,false),
          (v_day_id,4,'work',v_lunch_end,v_end,true,true,0,coalesce((v_day->>'overtimeEligible')::boolean,false)),
          (v_day_id,5,'check_out',v_end,v_end+(greatest(v_grace,1)||' minutes')::interval,false,true,v_grace,false);
      else
        insert into public.working_schedule_segments(schedule_day_id,sequence,segment_type,start_time,end_time,is_paid,is_required,grace_minutes,overtime_eligible)
        values
          (v_day_id,2,'work',v_start,v_end,true,true,0,coalesce((v_day->>'overtimeEligible')::boolean,false)),
          (v_day_id,3,'check_out',v_end,v_end+(greatest(v_grace,1)||' minutes')::interval,false,true,v_grace,false);
      end if;
    else
      insert into public.working_schedule_days(schedule_id,iso_weekday,is_working_day)
      values(v_schedule_id,(v_day->>'isoWeekday')::smallint,false);
    end if;
  end loop;

  if p_assignment_type = 'department' then
    insert into public.employee_schedule_assignments(company_id,department_id,schedule_id,effective_from,effective_to,created_by)
    values(p_company_id,p_assignment_id,v_schedule_id,p_effective_from,p_effective_to,(select auth.uid()));
  elsif p_assignment_type = 'employee' then
    insert into public.employee_schedule_assignments(company_id,employee_id,schedule_id,effective_from,effective_to,created_by)
    values(p_company_id,p_assignment_id,v_schedule_id,p_effective_from,p_effective_to,(select auth.uid()));
  end if;

  insert into public.audit_logs(company_id,actor_user_id,action,entity_table,entity_id,summary)
  values(p_company_id,(select auth.uid()),'work_schedule_created','working_schedules',v_schedule_id::text,
    jsonb_build_object('name',trim(p_name),'assignment_type',p_assignment_type,
      'assignment_id',p_assignment_id,'effective_from',p_effective_from,'effective_to',p_effective_to));
  return v_schedule_id;
end;
$$;

revoke all on function public.create_work_schedule(uuid,text,text,date,date,text,uuid,boolean,jsonb) from public;
grant execute on function public.create_work_schedule(uuid,text,text,date,date,text,uuid,boolean,jsonb) to authenticated;
