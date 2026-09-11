import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServiceRoleClient, createUserScopedClient } from '@/lib/supabase/server';

const reviewSchema = z.object({
  employeeId: z.string().uuid(),
  action: z.enum(['approve', 'request_correction', 'reject']),
  reason: z.string().optional(),
  correctionFields: z.array(z.string()).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace(/^Bearer\s+/, '');
    if (!token) return NextResponse.json({ error: { code: 'UNAUTHENTICATED', message: 'Bearer token required' } }, { status: 401 });

    const input = reviewSchema.parse(await request.json());
    const scoped = createUserScopedClient(token);
    const service = createServiceRoleClient();

    const { data: auth } = await scoped.auth.getUser(token);
    if (!auth.user) return NextResponse.json({ error: { code: 'UNAUTHENTICATED', message: 'Invalid session' } }, { status: 401 });

    const { data: employee } = await service
      .from('employees')
      .select('id, company_id, full_name, user_id, company_email')
      .eq('id', input.employeeId)
      .single();

    if (!employee) throw new Error('Employee not found');

    // Verify caller is HR Manager or Admin
    const { data: roles } = await scoped
      .from('user_company_roles')
      .select('role')
      .eq('company_id', employee.company_id)
      .eq('user_id', auth.user.id);

    const callerRoles = roles?.map((r) => r.role) ?? [];
    if (!callerRoles.some((r) => r === 'hr_manager' || r === 'admin')) {
      return NextResponse.json({ error: { code: 'FORBIDDEN', message: 'HR Manager or Admin role required' } }, { status: 403 });
    }

    const now = new Date().toISOString();

    if (input.action === 'approve') {
      // 1. Update Employee status
      await service
        .from('employees')
        .update({
          account_status: 'approved',
          onboarding_status: 'approved',
          onboarding_reviewed_at: now,
          onboarding_reviewed_by: auth.user.id,
          status: 'active',
        } as any)
        .eq('id', employee.id);

      // 2. Mark Bank account verified
      await service
        .from('employee_bank_accounts')
        .update({
          is_verified: true,
          verification_status: 'approved' as any,
          verified_by: auth.user.id,
          verified_at: now,
        })
        .eq('employee_id', employee.id);

      // 3. Notify Employee
      await service.from('notifications').insert({
        company_id: employee.company_id,
        user_id: employee.user_id,
        title: 'Onboarding Approved!',
        content: 'Your profile and bank details have been verified by HR. You now have full access to your PeoplePay360 dashboard.',
        type: 'onboarding',
      } as any);

      // 4. Record Audit Log
      await service.from('audit_logs').insert({
        company_id: employee.company_id,
        actor_user_id: auth.user.id,
        action: 'employee_onboarding_approved',
        entity_table: 'employees',
        entity_id: employee.id,
        summary: { approved_by: auth.user.id },
      });

      return NextResponse.json({ message: 'Onboarding approved successfully' });
    } else if (input.action === 'request_correction') {
      if (!input.reason) throw new Error('Reason required for requesting correction');

      await service
        .from('employees')
        .update({
          account_status: 'correction_required',
          onboarding_status: 'correction_required',
          onboarding_correction_reason: input.reason,
          onboarding_correction_fields: input.correctionFields ?? [],
        } as any)
        .eq('id', employee.id);

      await service.from('notifications').insert({
        company_id: employee.company_id,
        user_id: employee.user_id,
        title: 'Onboarding Correction Requested',
        content: `HR requested corrections to your onboarding details: ${input.reason}`,
        type: 'onboarding',
      } as any);

      await service.from('audit_logs').insert({
        company_id: employee.company_id,
        actor_user_id: auth.user.id,
        action: 'employee_onboarding_correction_requested',
        entity_table: 'employees',
        entity_id: employee.id,
        summary: { reason: input.reason },
      });

      return NextResponse.json({ message: 'Correction request sent to employee' });
    } else if (input.action === 'reject') {
      if (!input.reason) throw new Error('Reason required for rejection');

      await service
        .from('employees')
        .update({
          account_status: 'rejected',
          onboarding_status: 'rejected',
          onboarding_rejection_reason: input.reason,
          onboarding_reviewed_at: now,
          onboarding_reviewed_by: auth.user.id,
        } as any)
        .eq('id', employee.id);

      await service.from('notifications').insert({
        company_id: employee.company_id,
        user_id: employee.user_id,
        title: 'Onboarding Submission Update',
        content: `Your onboarding submission was rejected by HR: ${input.reason}`,
        type: 'onboarding',
      } as any);

      await service.from('audit_logs').insert({
        company_id: employee.company_id,
        actor_user_id: auth.user.id,
        action: 'employee_onboarding_rejected',
        entity_table: 'employees',
        entity_id: employee.id,
        summary: { reason: input.reason },
      });

      return NextResponse.json({ message: 'Onboarding rejected' });
    }

    return NextResponse.json({ error: { message: 'Invalid review action' } }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      { error: { code: 'REVIEW_ERROR', message: error instanceof Error ? error.message : 'Review action failed' } },
      { status: 400 }
    );
  }
}
