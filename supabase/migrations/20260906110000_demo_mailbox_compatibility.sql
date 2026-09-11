-- Demo invitation mailbox for installations created from initialization_query.sql.
create table if not exists public.demo_email_outbox (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  recipient_email text not null,
  cc_emails text[] not null default '{}',
  subject text not null,
  safe_html_body text not null,
  email_type text not null default 'account_invitation',
  delivery_status text not null default 'delivered',
  action_url text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  opened_at timestamptz
);

create index if not exists demo_email_outbox_company_created_idx
  on public.demo_email_outbox(company_id,created_at desc);

alter table public.demo_email_outbox enable row level security;
drop policy if exists demo_email_outbox_hr_admin on public.demo_email_outbox;
create policy demo_email_outbox_hr_admin on public.demo_email_outbox
for all to authenticated
using (
  public.has_company_role(company_id,array['hr_manager','admin']::public.app_role[])
  or recipient_email=(select email from auth.users where id=(select auth.uid()))
)
with check (public.has_company_role(company_id,array['hr_manager','admin']::public.app_role[]));

notify pgrst,'reload schema';
