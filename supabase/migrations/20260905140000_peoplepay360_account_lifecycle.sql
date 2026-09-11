-- Migration: 20260905140000_peoplepay360_account_lifecycle.sql
-- Description: Supports full HR-created employee lifecycle states, invitations outbox, and onboarding verification tracking.

-- 1. Extend onboarding_status enum values safely
DO $$ BEGIN
  ALTER TYPE public.onboarding_status ADD VALUE IF NOT EXISTS 'email_verification_pending';
  ALTER TYPE public.onboarding_status ADD VALUE IF NOT EXISTS 'email_verified';
  ALTER TYPE public.onboarding_status ADD VALUE IF NOT EXISTS 'password_change_required';
  ALTER TYPE public.onboarding_status ADD VALUE IF NOT EXISTS 'profile_incomplete';
  ALTER TYPE public.onboarding_status ADD VALUE IF NOT EXISTS 'pending_hr_approval';
  ALTER TYPE public.onboarding_status ADD VALUE IF NOT EXISTS 'correction_required';
  ALTER TYPE public.onboarding_status ADD VALUE IF NOT EXISTS 'approved';
  ALTER TYPE public.onboarding_status ADD VALUE IF NOT EXISTS 'suspended';
EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- 2. Extend employees table with lifecycle fields
ALTER TABLE public.employees
  ADD COLUMN IF NOT EXISTS account_status text NOT NULL DEFAULT 'invited',
  ADD COLUMN IF NOT EXISTS must_change_password boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS email_verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS onboarding_submitted_at timestamptz,
  ADD COLUMN IF NOT EXISTS onboarding_reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS onboarding_reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS onboarding_rejection_reason text,
  ADD COLUMN IF NOT EXISTS onboarding_correction_reason text,
  ADD COLUMN IF NOT EXISTS onboarding_correction_fields jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS last_invitation_sent_at timestamptz;

-- 3. Demo email outbox table
CREATE TABLE IF NOT EXISTS public.demo_email_outbox (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  recipient_email text NOT NULL,
  cc_emails text[] DEFAULT '{}',
  subject text NOT NULL,
  safe_html_body text NOT NULL,
  email_type text NOT NULL DEFAULT 'account_invitation',
  delivery_status text NOT NULL DEFAULT 'delivered',
  action_url text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  opened_at timestamptz
);

-- 4. Enhanced account invitations table
CREATE TABLE IF NOT EXISTS public.account_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  auth_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  personal_email text NOT NULL,
  organization_email text NOT NULL,
  requested_role public.app_role NOT NULL DEFAULT 'employee',
  status text NOT NULL DEFAULT 'pending',
  verification_method text NOT NULL DEFAULT 'email_link',
  token_hash text NOT NULL,
  expires_at timestamptz NOT NULL,
  sent_at timestamptz,
  verified_at timestamptz,
  activated_at timestamptz,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 5. Enable RLS on new tables
ALTER TABLE public.demo_email_outbox ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.account_invitations ENABLE ROW LEVEL SECURITY;

-- 6. RLS Policies
DROP POLICY IF EXISTS demo_email_outbox_hr_admin ON public.demo_email_outbox;
CREATE POLICY demo_email_outbox_hr_admin ON public.demo_email_outbox FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_company_roles ucr
      WHERE ucr.user_id = auth.uid()
        AND ucr.company_id = demo_email_outbox.company_id
        AND ucr.role IN ('hr_manager', 'admin')
    )
    OR recipient_email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS account_invitations_hr_admin ON public.account_invitations;
CREATE POLICY account_invitations_hr_admin ON public.account_invitations FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_company_roles ucr
      WHERE ucr.user_id = auth.uid()
        AND ucr.company_id = account_invitations.company_id
        AND ucr.role IN ('hr_manager', 'admin')
    )
    OR auth_user_id = auth.uid()
  );
