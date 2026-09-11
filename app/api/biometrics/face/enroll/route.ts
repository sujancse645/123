import { createHash } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServiceRoleClient, createUserScopedClient } from '@/lib/supabase/server';
import { encryptSensitiveValue } from '@/lib/server/encryption';

const schema = z.object({ template: z.array(z.number().finite().min(-2).max(2)).min(100).max(2000), sampleCount: z.number().int().min(3).max(20), modelName: z.literal('MediaPipe Face Landmarker'), modelVersion: z.string().min(1).max(50), consentVersion: z.literal('2026-09-v1'), livenessPassed: z.literal(true) });

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace(/^Bearer\s+/, '');
    if (!token) return NextResponse.json({ error: { code: 'UNAUTHENTICATED', message: 'Bearer token required' } }, { status: 401 });
    const input = schema.parse(await request.json());
    const scoped = createUserScopedClient(token); const service = createServiceRoleClient();
    const { data: auth } = await scoped.auth.getUser(token);
    if (!auth.user) return NextResponse.json({ error: { code: 'UNAUTHENTICATED', message: 'Invalid session' } }, { status: 401 });
    const { data: employee } = await service.from('employees').select('*').eq('user_id', auth.user.id).single();
    if (!employee) return NextResponse.json({ error: { code: 'EMPLOYEE_NOT_FOUND', message: 'No employee is linked to this account' } }, { status: 404 });
    const serialized = JSON.stringify(input.template.map(value => Math.round(value * 100000) / 100000));
    const checksum = createHash('sha256').update(serialized).digest('hex');
    const { error } = await service.from('employee_face_enrollments').upsert({ company_id: employee.company_id, employee_id: employee.id, encrypted_template: encryptSensitiveValue(serialized), template_checksum: checksum, model_name: input.modelName, model_version: input.modelVersion, sample_count: input.sampleCount, consent_version: input.consentVersion, consented_at: new Date().toISOString(), enrolled_by: auth.user.id, revoked_at: null }, { onConflict: 'employee_id,model_name,model_version' });
    if (error) throw error;
    await service.from('audit_logs').insert({ company_id: employee.company_id, actor_user_id: auth.user.id, action: 'face_biometric_enrolled', entity_table: 'employee_face_enrollments', entity_id: employee.id, summary: { modelVersion: input.modelVersion, sampleCount: input.sampleCount } });
    return NextResponse.json({ enrolled: true, method: 'face', checksum });
  } catch (error) {
    return NextResponse.json({ error: { code: 'FACE_ENROLLMENT_ERROR', message: error instanceof Error ? error.message : 'Unable to enroll face template' } }, { status: 400 });
  }
}
