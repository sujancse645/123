import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServiceRoleClient, createUserScopedClient } from '@/lib/supabase/server';

const schema = z.object({ platformAuthenticatorUnavailable: z.boolean() });

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace(/^Bearer\s+/, '');
    if (!token) return NextResponse.json({ error: { code: 'UNAUTHENTICATED', message: 'Bearer token required' } }, { status: 401 });
    const input = schema.parse(await request.json()); const scoped = createUserScopedClient(token); const service = createServiceRoleClient();
    const { data: auth } = await scoped.auth.getUser(token); if (!auth.user) return NextResponse.json({ error: { code: 'UNAUTHENTICATED', message: 'Invalid session' } }, { status: 401 });
    const { data: employee } = await service.from('employees').select('*').eq('user_id', auth.user.id).single(); if (!employee) return NextResponse.json({ error: { code: 'EMPLOYEE_NOT_FOUND', message: 'Employee not found' } }, { status: 404 });
    const [{ count: faceCount }, { count: passkeyCount }] = await Promise.all([
      service.from('employee_face_enrollments').select('*', { count: 'exact', head: true }).eq('employee_id', employee.id).is('revoked_at', null),
      service.from('employee_webauthn_credentials').select('*', { count: 'exact', head: true }).eq('employee_id', employee.id).is('revoked_at', null),
    ]);
    if (!faceCount) return NextResponse.json({ error: { code: 'FACE_REQUIRED', message: 'Complete face enrollment first' } }, { status: 409 });
    if (!passkeyCount && !input.platformAuthenticatorUnavailable) return NextResponse.json({ error: { code: 'PASSKEY_REQUIRED', message: 'Complete laptop biometric enrollment first' } }, { status: 409 });
    const now = new Date().toISOString();
    await service.from('employees').update({ biometric_enrollment_required: false, biometric_enrolled_at: now, biometric_platform_unavailable_at: !passkeyCount ? now : null }).eq('id', employee.id);
    if (!passkeyCount) await service.from('biometric_verification_events').insert({ company_id: employee.company_id, employee_id: employee.id, method: 'webauthn', outcome: 'unavailable', metadata: { source: 'first_login_enrollment' } });
    return NextResponse.json({ completed: true, faceEnrolled: true, platformAuthenticatorEnrolled: Boolean(passkeyCount) });
  } catch (error) {
    return NextResponse.json({ error: { code: 'ENROLLMENT_COMPLETION_ERROR', message: error instanceof Error ? error.message : 'Unable to complete enrollment' } }, { status: 400 });
  }
}
