'use client';

import React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Eye, EyeOff, LockKeyhole, Loader2, CheckCircle2 } from 'lucide-react';
import { PeoplePayLogo } from '@/components/brand/PeoplePayLogo';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { getLocalInvitation,logLocalFallback,updateLocalInvitation } from '@/lib/demo/local-fallback';

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isInvitation = searchParams.get('invite') === '1';
  const demoInvite=searchParams.get('demoInvite');
  const [password, setPassword] = React.useState('');
  const [confirm, setConfirm] = React.useState('');
  const [showPassword, setShowPassword] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [done, setDone] = React.useState(false);
  const [error, setError] = React.useState('');

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    if (password !== confirm) { setError('Passwords do not match.'); return; }
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return; }

    if(demoInvite){const invitation=getLocalInvitation(demoInvite);if(!invitation){setError('This presentation invitation is unavailable or was opened in another browser.');return}setSubmitting(true);updateLocalInvitation(demoInvite,{passwordCreatedAt:new Date().toISOString()});logLocalFallback('onboarding','local_password_created',{token:demoInvite});setDone(true);setSubmitting(false);setTimeout(()=>router.replace(`/onboarding?demoInvite=${encodeURIComponent(demoInvite)}`),900);return}

    const client = getSupabaseBrowserClient();
    if (!client) { setError('Supabase is not configured.'); return; }
    setSubmitting(true);

    const { error: updateError } = await client.auth.updateUser({
      password,
      ...(isInvitation ? { data: { onboarding_password_set: true } } : {}),
    });
    if (updateError) {
      setError(updateError.message);
      setSubmitting(false);
      return;
    }
    setDone(true);
    setSubmitting(false);
    if (isInvitation) await client.auth.signOut({ scope: 'local' });
    setTimeout(() => router.replace(isInvitation ? '/?onboarding=1' : '/'), 1800);
  };

  const inputClass = 'w-full rounded-[10px] border border-[#D9D5D8] bg-white py-3 pl-10 pr-3 text-sm text-[#28262D] outline-none transition focus:border-[#714B67] focus:ring-2 focus:ring-[#714B67]/15';

  return (
    <main className="min-h-screen bg-[#F7F5F6] px-4 py-10 sm:grid sm:place-items-center">
      <section className="mx-auto w-full max-w-md rounded-[18px] border border-[#E4E1E5] bg-white p-6 shadow-sm sm:p-8">
        <div className="mb-7 flex items-center gap-3">
          <PeoplePayLogo size={44} />
          <div>
            <p className="text-lg font-bold text-[#28262D]">PeoplePay360</p>
            <p className="text-xs text-[#74717A]">Set New Password</p>
          </div>
        </div>

        {done ? (
          <div className="text-center py-4">
            <CheckCircle2 className="w-12 h-12 text-[#438A6B] mx-auto" />
            <h1 className="text-xl font-bold mt-4 text-[#28262D]">Password updated</h1>
            <p className="text-sm text-[#74717A] mt-2">{isInvitation?'Redirecting you to sign in and complete your profile…':'Redirecting you to sign in…'}</p>
          </div>
        ) : (
          <>
            <h1 className="text-2xl font-bold tracking-tight text-[#28262D]">{isInvitation?'Create your password':'Set a new password'}</h1>
            <p className="mt-1 text-sm text-[#74717A]">{isInvitation?'Create your password, then sign in to complete your employee profile.':'Choose a strong password for your PeoplePay360 account.'}</p>

            <form className="mt-6 space-y-4" onSubmit={submit}>
              <label className="block text-sm font-semibold text-[#3D3940]" htmlFor="new-password">
                New password
                <span className="relative mt-1.5 block">
                  <LockKeyhole aria-hidden="true" className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#74717A]" />
                  <input id="new-password" className={`${inputClass} pr-11`} type={showPassword ? 'text' : 'password'} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} />
                  <button type="button" onClick={() => setShowPassword(v => !v)} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-2 text-[#74717A] hover:bg-[#F4F3F5]" aria-label={showPassword ? 'Hide' : 'Show'}>
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </span>
              </label>

              <label className="block text-sm font-semibold text-[#3D3940]" htmlFor="confirm-password">
                Confirm password
                <span className="relative mt-1.5 block">
                  <LockKeyhole aria-hidden="true" className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#74717A]" />
                  <input id="confirm-password" className={inputClass} type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required minLength={8} />
                </span>
              </label>

              {error && <p role="alert" className="rounded-[10px] border border-[#F1C3C0] bg-[#FDF1F0] px-3 py-2.5 text-sm text-[#9D3E39]">{error}</p>}

              <button type="submit" disabled={submitting} className="flex w-full items-center justify-center gap-2 rounded-[10px] bg-[#714B67] px-4 py-3 text-sm font-bold text-white transition hover:bg-[#5C3C53] disabled:cursor-not-allowed disabled:opacity-60">
                {submitting ? <><Loader2 className="h-4 w-4 animate-spin" />Updating…</> : 'Update password'}
              </button>
            </form>
          </>
        )}
      </section>
    </main>
  );
}
