-- Atomic/idempotent workflows and integrity guards.

create or replace function public.prevent_immutable_loan_payment_change()
returns trigger language plpgsql set search_path = '' as $$
begin
  raise exception 'Loan payment ledger entries are immutable';
end; $$;

drop trigger if exists loan_payments_immutable_update on public.loan_payments;
create trigger loan_payments_immutable_update
  before update or delete on public.loan_payments
  for each row execute function public.prevent_immutable_loan_payment_change();

create or replace function public.record_loan_payment(
  p_loan_id uuid,
  p_amount numeric,
  p_payment_type public.loan_payment_type,
  p_reference text,
  p_idempotency_key text,
  p_repayment_adjustment text default 'reduce_tenure',
  p_notes text default null
)
returns jsonb
language plpgsql
security definer set search_path = ''
as $$
declare
  v_loan public.employee_loans;
  v_existing public.loan_payments;
  v_fingerprint text;
  v_interest numeric(14,2);
  v_principal numeric(14,2);
  v_balance_before numeric(14,2);
  v_balance_after numeric(14,2);
  v_payment public.loan_payments;
begin
  if p_amount <= 0 then raise exception 'Payment amount must be positive'; end if;
  if nullif(trim(p_idempotency_key), '') is null then raise exception 'Idempotency key is required'; end if;
  if p_repayment_adjustment not in ('reduce_tenure','reduce_monthly_deduction') then
    raise exception 'Invalid repayment adjustment';
  end if;

  select * into v_loan from public.employee_loans where id = p_loan_id for update;
  if not found then raise exception 'Loan not found'; end if;
  if not public.has_company_role(v_loan.company_id, array['payroll_manager','admin']::public.app_role[]) then
    raise exception 'Payroll Manager or Admin role required';
  end if;

  v_fingerprint := encode(digest(concat_ws('|', p_loan_id, p_amount, p_payment_type, p_reference,
                                            p_repayment_adjustment, coalesce(p_notes,'')), 'sha256'), 'hex');
  select * into v_existing from public.loan_payments
   where company_id = v_loan.company_id and idempotency_key = p_idempotency_key;
  if found then
    if v_existing.request_fingerprint is distinct from v_fingerprint then
      raise exception 'Idempotency key reused with a different payment request';
    end if;
    return jsonb_build_object('payment_id', v_existing.id, 'loan_id', v_loan.id,
      'status', v_loan.status, 'balance_after', v_existing.balance_after, 'replayed', true);
  end if;
  if v_loan.status = 'closed' then raise exception 'Loan is already closed'; end if;

  v_balance_before := v_loan.outstanding_principal + v_loan.outstanding_interest;
  if p_amount > v_balance_before then raise exception 'Payment exceeds outstanding balance'; end if;
  v_interest := least(p_amount, v_loan.outstanding_interest);
  v_principal := least(p_amount - v_interest, v_loan.outstanding_principal);
  v_balance_after := greatest(0, v_balance_before - p_amount);

  insert into public.loan_payments (
    company_id, loan_id, employee_id, payment_type, amount,
    principal_component, interest_component, paid_on, reference, notes,
    recorded_by, idempotency_key, request_fingerprint, balance_before, balance_after, metadata
  ) values (
    v_loan.company_id, v_loan.id, v_loan.employee_id, p_payment_type, p_amount,
    v_principal, v_interest, current_date, p_reference, p_notes,
    (select auth.uid()), p_idempotency_key, v_fingerprint, v_balance_before, v_balance_after,
    jsonb_build_object('repayment_adjustment', p_repayment_adjustment)
  ) returning * into v_payment;

  update public.employee_loans
  set outstanding_principal = greatest(0, outstanding_principal - v_principal),
      outstanding_interest = greatest(0, outstanding_interest - v_interest),
      accrued_interest = greatest(0, accrued_interest - v_interest),
      status = case when v_balance_after = 0 then 'closed'::public.loan_status else status end,
      closed_at = case when v_balance_after = 0 then now() else closed_at end,
      closure_type = case when v_balance_after = 0 then
        case when p_payment_type = 'full_settlement' then 'early_full'::public.settlement_type
             else 'scheduled'::public.settlement_type end else closure_type end,
      closure_reference = case when v_balance_after = 0 then p_reference else closure_reference end
  where id = v_loan.id;

  if v_balance_after = 0 then
    update public.loan_installments
      set status = 'settled', settlement_payment_id = v_payment.id
    where loan_id = v_loan.id and status in ('upcoming','partially_paid','overdue');
  elsif p_repayment_adjustment = 'reduce_monthly_deduction' then
    update public.loan_installments li
    set principal_due = round(greatest(0, v_loan.outstanding_principal - v_principal) /
      greatest(1, (select count(*) from public.loan_installments x
                   where x.loan_id = v_loan.id and x.status in ('upcoming','partially_paid','overdue'))), 2)
    where li.loan_id = v_loan.id and li.status in ('upcoming','partially_paid','overdue');
  end if;

  insert into public.audit_logs(company_id, actor_user_id, action, entity_table, entity_id, summary)
  values (v_loan.company_id, (select auth.uid()), 'loan_payment_recorded', 'employee_loans', v_loan.id::text,
    jsonb_build_object('payment_id', v_payment.id, 'amount', p_amount, 'payment_type', p_payment_type,
                       'balance_before', v_balance_before, 'balance_after', v_balance_after));

  return jsonb_build_object('payment_id', v_payment.id, 'loan_id', v_loan.id,
    'status', case when v_balance_after = 0 then 'closed' else v_loan.status::text end,
    'balance_after', v_balance_after, 'replayed', false);
exception when unique_violation then
  select * into v_existing from public.loan_payments
   where company_id = v_loan.company_id and idempotency_key = p_idempotency_key;
  if v_existing.request_fingerprint is distinct from v_fingerprint then
    raise exception 'Idempotency key reused with a different payment request';
  end if;
  return jsonb_build_object('payment_id', v_existing.id, 'loan_id', v_loan.id,
    'status', v_loan.status, 'balance_after', v_existing.balance_after, 'replayed', true);
end; $$;

revoke all on function public.record_loan_payment(uuid,numeric,public.loan_payment_type,text,text,text,text) from public;
grant execute on function public.record_loan_payment(uuid,numeric,public.loan_payment_type,text,text,text,text) to authenticated;

create or replace function public.review_leave_request(
  p_leave_request_id uuid,
  p_decision public.request_status,
  p_rejection_reason text default null
)
returns public.leave_requests
language plpgsql
security definer set search_path = ''
as $$
declare
  v_request public.leave_requests;
  v_user_id uuid;
begin
  if p_decision not in ('approved','rejected') then raise exception 'Decision must be approved or rejected'; end if;
  if p_decision = 'rejected' and nullif(trim(p_rejection_reason), '') is null then
    raise exception 'Rejection reason is required';
  end if;
  select * into v_request from public.leave_requests where id = p_leave_request_id for update;
  if not found then raise exception 'Leave request not found'; end if;
  if not public.has_company_role(v_request.company_id, array['hr_manager','admin']::public.app_role[]) then
    raise exception 'HR Manager or Admin role required';
  end if;
  if v_request.status = p_decision then return v_request; end if;
  if v_request.status <> 'submitted' then raise exception 'Only submitted leave requests can be reviewed'; end if;

  update public.leave_requests set
    status = p_decision,
    approver_id = (select auth.uid()),
    reviewed_at = now(),
    reviewer_note = case when p_decision = 'rejected' then trim(p_rejection_reason) else reviewer_note end,
    rejected_by = case when p_decision = 'rejected' then (select auth.uid()) else null end,
    rejected_at = case when p_decision = 'rejected' then now() else null end,
    rejection_reason = case when p_decision = 'rejected' then trim(p_rejection_reason) else null end
  where id = p_leave_request_id returning * into v_request;

  select user_id into v_user_id from public.employees where id = v_request.employee_id;
  if v_user_id is not null then
    insert into public.notifications(company_id, user_id, title, message, type, metadata)
    values (v_request.company_id, v_user_id,
      case when p_decision = 'approved' then 'Leave approved' else 'Leave refused' end,
      case when p_decision = 'approved' then 'Your leave request has been approved.'
           else 'Your leave request was refused: ' || trim(p_rejection_reason) end,
      'leave', jsonb_build_object('leave_request_id', v_request.id, 'decision', p_decision));
  end if;
  insert into public.audit_logs(company_id, actor_user_id, action, entity_table, entity_id, summary)
  values (v_request.company_id, (select auth.uid()), 'leave_' || p_decision::text,
    'leave_requests', v_request.id::text,
    jsonb_build_object('employee_id', v_request.employee_id, 'reason', p_rejection_reason));
  return v_request;
end; $$;

revoke all on function public.review_leave_request(uuid,public.request_status,text) from public;
grant execute on function public.review_leave_request(uuid,public.request_status,text) to authenticated;

create or replace function public.enforce_nonnegative_payslip()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.status in ('validated','paid') and new.net_amount < 0 then
    raise exception 'Payslip cannot be finalized: deductions exceed earnings by %', abs(new.net_amount);
  end if;
  return new;
end; $$;
drop trigger if exists payslips_nonnegative_finalization on public.payslips;
create trigger payslips_nonnegative_finalization
  before insert or update of status, net_amount on public.payslips
  for each row execute function public.enforce_nonnegative_payslip();

create or replace function public.defer_payslip_deduction(p_payslip_line_id uuid,p_deferred_amount numeric,p_carry_forward_period date,p_reason text)
returns public.payslips language plpgsql security definer set search_path='' as $$
declare v_line public.payslip_lines; v_payslip public.payslips;
begin
  select * into v_line from public.payslip_lines where id=p_payslip_line_id and category='deduction' for update;if not found then raise exception 'Deduction line not found';end if;
  select * into v_payslip from public.payslips where id=v_line.payslip_id for update;
  if not public.has_company_role(v_payslip.company_id,array['payroll_manager','admin']::public.app_role[]) then raise exception 'Payroll Manager or Admin role required';end if;
  if v_payslip.status<>'draft' then raise exception 'Only a draft payslip deduction can be deferred';end if;
  if p_deferred_amount<=0 or p_deferred_amount>v_line.amount then raise exception 'Invalid deferred amount';end if;
  insert into public.payroll_deduction_deferrals(company_id,employee_id,payslip_id,payslip_line_id,original_amount,deferred_amount,carry_forward_period,reason,created_by)
  values(v_payslip.company_id,v_payslip.employee_id,v_payslip.id,v_line.id,v_line.amount,p_deferred_amount,p_carry_forward_period,trim(p_reason),(select auth.uid()));
  update public.payslip_lines set amount=amount-p_deferred_amount,calculation_note=concat_ws(' ',calculation_note,'Deferred ',p_deferred_amount,' to ',p_carry_forward_period) where id=v_line.id;
  update public.payslips set deduction_amount=deduction_amount-p_deferred_amount,net_amount=net_amount+p_deferred_amount where id=v_payslip.id returning * into v_payslip;
  insert into public.audit_logs(company_id,actor_user_id,action,entity_table,entity_id,summary) values(v_payslip.company_id,(select auth.uid()),'payroll_deduction_deferred','payslips',v_payslip.id::text,jsonb_build_object('payslip_line_id',v_line.id,'amount',p_deferred_amount,'carry_forward_period',p_carry_forward_period,'reason',p_reason));
  return v_payslip;
end; $$;
revoke all on function public.defer_payslip_deduction(uuid,numeric,date,text) from public;
grant execute on function public.defer_payslip_deduction(uuid,numeric,date,text) to authenticated;

create or replace function public.validate_contract_lifecycle()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.status = 'running' and new.approved_at is null then
    raise exception 'An unapproved draft contract cannot be activated';
  end if;
  if new.status in ('scheduled','running') and exists (
    select 1 from public.contracts c where c.employee_id = new.employee_id and c.id <> new.id
      and c.status in ('scheduled','running')
      and daterange(c.start_date, coalesce(c.end_date, 'infinity'::date), '[]') &&
          daterange(new.start_date, coalesce(new.end_date, 'infinity'::date), '[]')
  ) then raise exception 'Employee contracts may not overlap'; end if;
  new.is_active := new.status = 'running';
  return new;
end; $$;
drop trigger if exists validate_contract_lifecycle_before_write on public.contracts;
create trigger validate_contract_lifecycle_before_write
  before insert or update on public.contracts for each row execute function public.validate_contract_lifecycle();

create or replace function public.refresh_contract_statuses(p_as_of date default current_date)
returns integer language plpgsql security definer set search_path = '' as $$
declare v_count integer; v_activated integer;
begin
  if (select auth.uid()) is not null and not exists (
    select 1 from public.user_company_roles r where r.user_id = (select auth.uid()) and r.role = 'admin'
  ) then raise exception 'Admin role required'; end if;
  update public.contracts set status='expired' where status='running' and end_date<p_as_of;
  get diagnostics v_count = row_count;
  update public.contracts set status='running'
  where status='scheduled' and approved_at is not null and start_date<=p_as_of
    and (end_date is null or end_date>=p_as_of)
    and not exists(select 1 from public.contracts current_contract where current_contract.employee_id=contracts.employee_id and current_contract.status='running');
  get diagnostics v_activated = row_count;
  v_count := v_count + v_activated;
  return v_count;
end; $$;

revoke all on function public.refresh_contract_statuses(date) from public;
grant execute on function public.refresh_contract_statuses(date) to service_role;

create or replace function public.prepare_payroll_bank_export(
  p_pay_run_id uuid, p_company_bank_account_id uuid, p_template_id uuid,
  p_batch_reference text, p_payment_date date
)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_pay_run public.pay_runs; v_export public.payroll_bank_exports; v_included integer; v_excluded integer; v_total numeric(16,2); v_check numeric(16,2);
begin
  select * into v_pay_run from public.pay_runs where id=p_pay_run_id for update;
  if not found then raise exception 'Pay run not found'; end if;
  if not public.has_company_role(v_pay_run.company_id,array['payroll_manager','admin']::public.app_role[]) then raise exception 'Payroll Manager or Admin role required'; end if;
  if v_pay_run.status not in ('approved','paid') then raise exception 'Bank export requires an approved pay run'; end if;
  insert into public.payroll_bank_exports(company_id,pay_run_id,company_bank_account_id,template_id,batch_reference,payment_date,generated_by)
  values(v_pay_run.company_id,p_pay_run_id,p_company_bank_account_id,p_template_id,trim(p_batch_reference),p_payment_date,(select auth.uid())) returning * into v_export;
  insert into public.payroll_bank_export_items(export_id,payroll_payment_id,employee_id,included,exclusion_reason,amount,payment_reference)
  select v_export.id, pp.id, pp.employee_id,
    ba.id is not null and ba.is_verified and pp.amount >= 0,
    case when ba.id is null then 'Missing primary bank account' when not ba.is_verified then 'Bank account not verified' when pp.amount < 0 then 'Negative payment amount' else null end,
    case when ba.id is not null and ba.is_verified and pp.amount >= 0 then pp.amount else 0 end,
    coalesce(pp.bank_reference,p_batch_reference||'-'||e.employee_code)
  from public.payroll_payments pp join public.employees e on e.id=pp.employee_id
  left join lateral(select * from public.employee_bank_accounts x where x.employee_id=pp.employee_id and x.is_primary order by x.updated_at desc limit 1) ba on true
  where pp.pay_run_id=p_pay_run_id and pp.status not in ('cancelled','failed');
  select count(*) filter(where included),count(*) filter(where not included),coalesce(sum(amount) filter(where included),0),coalesce(sum(amount),0)
    into v_included,v_excluded,v_total,v_check from public.payroll_bank_export_items where export_id=v_export.id;
  if v_total<>v_check then raise exception 'Bank export total reconciliation failed'; end if;
  update public.payroll_bank_exports set included_employee_count=v_included,excluded_employee_count=v_excluded,total_amount=v_total where id=v_export.id;
  insert into public.audit_logs(company_id,actor_user_id,action,entity_table,entity_id,summary) values(v_pay_run.company_id,(select auth.uid()),'payroll_bank_export_prepared','payroll_bank_exports',v_export.id::text,jsonb_build_object('batch_reference',p_batch_reference,'included',v_included,'excluded',v_excluded,'total_amount',v_total));
  return jsonb_build_object('export_id',v_export.id,'included_count',v_included,'excluded_count',v_excluded,'total_amount',v_total);
end; $$;

revoke all on function public.prepare_payroll_bank_export(uuid,uuid,uuid,text,date) from public;
grant execute on function public.prepare_payroll_bank_export(uuid,uuid,uuid,text,date) to authenticated;

create or replace function public.validate_salary_template_version(p_version_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_primary_count integer; v_rule_count integer; v_cycle boolean;
begin
  select count(*), count(*) filter (where is_primary_basic)
    into v_rule_count, v_primary_count
  from public.salary_structure_template_rules where template_version_id = p_version_id and is_active;
  with recursive deps(code, dependency, path, cycle) as (
    select r.code, unnest(r.dependency_codes), array[r.code], false
      from public.salary_structure_template_rules r where r.template_version_id = p_version_id
    union all
    select d.code, unnest(r.dependency_codes), d.path || r.code, r.code = any(d.path)
      from deps d join public.salary_structure_template_rules r
        on r.template_version_id = p_version_id and r.code = d.dependency where not d.cycle
  ) select coalesce(bool_or(cycle), false) into v_cycle from deps;
  return jsonb_build_object(
    'valid', v_rule_count > 0 and v_primary_count = 1 and not v_cycle,
    'rule_count', v_rule_count, 'primary_basic_count', v_primary_count,
    'has_circular_dependencies', v_cycle
  );
end; $$;
