begin;
create extension if not exists pgtap with schema extensions;
select plan(16);

select ok(exists(select 1 from pg_policies where schemaname='public' and tablename='employees' and policyname='employees_self_or_staff_read'),'Employee/HR/Payroll/Admin employee read policy remains');
select ok(exists(select 1 from pg_policies where schemaname='public' and tablename='leave_requests' and policyname='leave_self_or_staff_read'),'Leave self/staff read policy remains');
select ok(exists(select 1 from pg_policies where schemaname='public' and tablename='payslips' and policyname='payslips_self_or_payroll_read'),'Employee/payroll payslip policy remains');
select ok(exists(select 1 from pg_policies where schemaname='public' and tablename='employee_loans' and policyname='loans_self_or_payroll_read'),'Employee/payroll loan policy remains');
select ok(exists(select 1 from pg_policies where schemaname='public' and tablename='attendance_records' and policyname='attendance_self_or_staff_read'),'Employee/staff attendance policy remains');

select ok(exists(select 1 from pg_policies where schemaname='public' and tablename='overtime_policies' and policyname='overtime_policy_payroll_read'),'Payroll User can read overtime policy');
select ok(exists(select 1 from pg_policies where schemaname='public' and tablename='overtime_policies' and policyname='overtime_policy_manager_manage'),'Payroll Manager/Admin manage overtime policy');
select ok(exists(select 1 from pg_policies where schemaname='public' and tablename='attendance_location_events' and policyname='location_events_self_staff_read'),'Location snapshots are self/HR scoped');
select ok(exists(select 1 from pg_policies where schemaname='public' and tablename='payroll_bank_exports' and policyname='payroll_bank_exports_manager_read'),'Bank exports are manager/admin scoped');
select ok(exists(select 1 from pg_policies where schemaname='public' and tablename='employee_invitations' and policyname='employee_invitations_hr_admin'),'Invitations are HR/Admin scoped');

select ok(not has_column_privilege('authenticated','public.employee_bank_accounts','account_number_encrypted','SELECT'),'Encrypted employee bank account is not selectable by authenticated clients');
select ok(not has_column_privilege('authenticated','public.company_bank_accounts','account_number_encrypted','SELECT'),'Encrypted company bank account is not selectable by authenticated clients');
select ok(not has_column_privilege('authenticated','public.employee_invitations','token_hash','SELECT'),'Invitation token hash is not selectable by authenticated clients');
select ok(has_function_privilege('authenticated','public.record_loan_payment(uuid,numeric,public.loan_payment_type,text,text,text,text)','EXECUTE'),'Authenticated callers may enter role-checked atomic loan RPC');
select ok(has_function_privilege('authenticated','public.review_leave_request(uuid,public.request_status,text)','EXECUTE'),'Authenticated callers may enter role-checked leave RPC');
select ok(not has_function_privilege('anon','public.record_loan_payment(uuid,numeric,public.loan_payment_type,text,text,text,text)','EXECUTE'),'Anonymous callers cannot execute loan settlement');

select * from finish();
rollback;
