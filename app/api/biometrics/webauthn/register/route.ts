import { NextRequest, NextResponse } from 'next/server';
import { generateRegistrationOptions, verifyRegistrationResponse } from '@simplewebauthn/server';
import type { RegistrationResponseJSON } from '@simplewebauthn/server';
import { z } from 'zod';
import { createServiceRoleClient, createUserScopedClient } from '@/lib/supabase/server';

const bodySchema = z.object({ challengeId: z.string().uuid(), response: z.custom<RegistrationResponseJSON>() });
const bearer = (request: NextRequest) => request.headers.get('authorization')?.replace(/^Bearer\s+/, '') || null;

async function context(request: NextRequest) {
  const token = bearer(request);
  if (!token) throw new Error('UNAUTHENTICATED');
  const scoped = createUserScopedClient(token);
  const service = createServiceRoleClient();
  const { data: auth } = await scoped.auth.getUser(token);
  if (!auth.user) throw new Error('UNAUTHENTICATED');
  const { data: employee } = await service.from('employees').select('*').eq('user_id', auth.user.id).single();
  if (!employee) throw new Error('EMPLOYEE_NOT_FOUND');
  return { service, user: auth.user, employee };
}

export async function GET(request: NextRequest) {
  try {
    const { service, user, employee } = await context(request);
    const rpID = process.env.WEBAUTHN_RP_ID || request.nextUrl.hostname;
    const { data: existing } = await service.from('employee_webauthn_credentials').select('credential_id,transports').eq('user_id', user.id).is('revoked_at', null);
    const options = await generateRegistrationOptions({ rpName: 'PeoplePay360', rpID, userName: user.email || employee.company_email, userID: new TextEncoder().encode(user.id), userDisplayName: employee.full_name, attestationType: 'none', preferredAuthenticatorType: 'localDevice', authenticatorSelection: { authenticatorAttachment: 'platform', residentKey: 'preferred', userVerification: 'required' }, excludeCredentials: (existing || []).map(item => ({ id: item.credential_id, transports: item.transports })) });
    const { data: challenge, error } = await service.from('webauthn_challenges').insert({ user_id: user.id, purpose: 'registration', challenge: options.challenge, expires_at: new Date(Date.now() + 5 * 60_000).toISOString() }).select().single();
    if (error || !challenge) throw error || new Error('Unable to save credential challenge');
    return NextResponse.json({ challengeId: challenge.id, options });
  } catch (error) {
    const unauthenticated = error instanceof Error && error.message === 'UNAUTHENTICATED';
    return NextResponse.json({ error: { code: unauthenticated ? 'UNAUTHENTICATED' : 'WEBAUTHN_OPTIONS_ERROR', message: unauthenticated ? 'Authentication required' : error instanceof Error ? error.message : 'Unable to start biometric enrollment' } }, { status: unauthenticated ? 401 : 400 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { service, user, employee } = await context(request);
    const input = bodySchema.parse(await request.json());
    const { data: challenge } = await service.from('webauthn_challenges').select('*').eq('id', input.challengeId).eq('user_id', user.id).eq('purpose', 'registration').is('consumed_at', null).gt('expires_at', new Date().toISOString()).single();
    if (!challenge) return NextResponse.json({ error: { code: 'CHALLENGE_EXPIRED', message: 'Enrollment challenge expired. Please try again.' } }, { status: 409 });
    const verification = await verifyRegistrationResponse({ response: input.response, expectedChallenge: challenge.challenge, expectedOrigin: process.env.WEBAUTHN_ORIGIN || request.nextUrl.origin, expectedRPID: process.env.WEBAUTHN_RP_ID || request.nextUrl.hostname, requireUserVerification: true });
    if (!verification.verified || !verification.registrationInfo) throw new Error('Platform authenticator verification failed');
    const info = verification.registrationInfo;
    const { error } = await service.from('employee_webauthn_credentials').upsert({ company_id: employee.company_id, employee_id: employee.id, user_id: user.id, credential_id: info.credential.id, public_key: Buffer.from(info.credential.publicKey).toString('base64url'), counter: info.credential.counter, transports: info.credential.transports || input.response.response.transports || [], device_label: 'Laptop biometric / platform passkey', backed_up: info.credentialBackedUp, revoked_at: null }, { onConflict: 'credential_id' });
    if (error) throw error;
    await service.from('webauthn_challenges').update({ consumed_at: new Date().toISOString() }).eq('id', challenge.id);
    return NextResponse.json({ enrolled: true, method: 'webauthn' });
  } catch (error) {
    return NextResponse.json({ error: { code: 'WEBAUTHN_REGISTRATION_ERROR', message: error instanceof Error ? error.message : 'Unable to register platform biometric' } }, { status: 400 });
  }
}
