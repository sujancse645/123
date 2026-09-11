-- Migration: 20260905130000_peoplepay360_missing_features.sql
-- Description: Adds tables for profile update requests, attendance correction requests, and payroll simulations.

-- 1. Profile Update Requests
CREATE TABLE IF NOT EXISTS public.profile_update_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
    requested_changes JSONB NOT NULL,
    field_category TEXT NOT NULL DEFAULT 'personal',
    status public.request_status NOT NULL DEFAULT 'pending',
    reviewer_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
    rejection_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Attendance Correction Requests
CREATE TABLE IF NOT EXISTS public.attendance_correction_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
    attendance_date DATE NOT NULL,
    requested_check_in TIMESTAMPTZ,
    requested_check_out TIMESTAMPTZ,
    reason TEXT NOT NULL,
    status public.request_status NOT NULL DEFAULT 'pending',
    reviewer_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
    rejection_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Payroll Simulations & Impacts
CREATE TABLE IF NOT EXISTS public.payroll_simulations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    created_by UUID REFERENCES public.employees(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    simulation_params JSONB NOT NULL DEFAULT '{}'::jsonb,
    status TEXT NOT NULL DEFAULT 'completed',
    total_cost_diff NUMERIC(15,2) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.payroll_simulation_impacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    simulation_id UUID NOT NULL REFERENCES public.payroll_simulations(id) ON DELETE CASCADE,
    employee_id UUID REFERENCES public.employees(id) ON DELETE CASCADE,
    current_gross NUMERIC(15,2) NOT NULL DEFAULT 0,
    simulated_gross NUMERIC(15,2) NOT NULL DEFAULT 0,
    diff NUMERIC(15,2) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS on new tables
ALTER TABLE public.profile_update_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_correction_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll_simulations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll_simulation_impacts ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies (Safe drop before create)

-- Profile Update Requests
DROP POLICY IF EXISTS "Users can view own profile update requests or managers view company requests" ON public.profile_update_requests;
CREATE POLICY "Users can view own profile update requests or managers view company requests"
    ON public.profile_update_requests FOR SELECT
    USING (
        employee_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid()) OR
        EXISTS (
            SELECT 1 FROM public.user_company_roles ucr
            WHERE ucr.user_id = auth.uid()
            AND ucr.company_id = profile_update_requests.company_id
            AND ucr.role IN ('hr_manager', 'admin')
        )
    );

DROP POLICY IF EXISTS "Employees can insert own profile update requests" ON public.profile_update_requests;
CREATE POLICY "Employees can insert own profile update requests"
    ON public.profile_update_requests FOR INSERT
    WITH CHECK (
        employee_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid())
    );

DROP POLICY IF EXISTS "HR managers can update profile update requests" ON public.profile_update_requests;
CREATE POLICY "HR managers can update profile update requests"
    ON public.profile_update_requests FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.user_company_roles ucr
            WHERE ucr.user_id = auth.uid()
            AND ucr.company_id = profile_update_requests.company_id
            AND ucr.role IN ('hr_manager', 'admin')
        )
    );

-- Attendance Correction Requests
DROP POLICY IF EXISTS "Users can view own correction requests or managers view company requests" ON public.attendance_correction_requests;
CREATE POLICY "Users can view own correction requests or managers view company requests"
    ON public.attendance_correction_requests FOR SELECT
    USING (
        employee_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid()) OR
        EXISTS (
            SELECT 1 FROM public.user_company_roles ucr
            WHERE ucr.user_id = auth.uid()
            AND ucr.company_id = attendance_correction_requests.company_id
            AND ucr.role IN ('hr_manager', 'admin')
        )
    );

DROP POLICY IF EXISTS "Employees can insert own correction requests" ON public.attendance_correction_requests;
CREATE POLICY "Employees can insert own correction requests"
    ON public.attendance_correction_requests FOR INSERT
    WITH CHECK (
        employee_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid())
    );

DROP POLICY IF EXISTS "HR managers can update correction requests" ON public.attendance_correction_requests;
CREATE POLICY "HR managers can update correction requests"
    ON public.attendance_correction_requests FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.user_company_roles ucr
            WHERE ucr.user_id = auth.uid()
            AND ucr.company_id = attendance_correction_requests.company_id
            AND ucr.role IN ('hr_manager', 'admin')
        )
    );

-- Notifications (Applies to pre-existing public.notifications table)
DROP POLICY IF EXISTS "Users can view and update own notifications" ON public.notifications;
CREATE POLICY "Users can view and update own notifications"
    ON public.notifications FOR ALL
    USING (user_id = auth.uid());

-- Payroll Simulations
DROP POLICY IF EXISTS "Payroll managers can manage simulations" ON public.payroll_simulations;
CREATE POLICY "Payroll managers can manage simulations"
    ON public.payroll_simulations FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.user_company_roles ucr
            WHERE ucr.user_id = auth.uid()
            AND ucr.company_id = payroll_simulations.company_id
            AND ucr.role IN ('payroll_manager', 'admin')
        )
    );

DROP POLICY IF EXISTS "Payroll managers can manage simulation impacts" ON public.payroll_simulation_impacts;
CREATE POLICY "Payroll managers can manage simulation impacts"
    ON public.payroll_simulation_impacts FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.payroll_simulations ps
            JOIN public.user_company_roles ucr ON ucr.company_id = ps.company_id
            WHERE ps.id = payroll_simulation_impacts.simulation_id
            AND ucr.user_id = auth.uid()
            AND ucr.role IN ('payroll_manager', 'admin')
        )
    );
