'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Mail, Loader2, CheckCircle2 } from 'lucide-react';
import { PeoplePayLogo } from '@/components/brand/PeoplePayLogo';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

export default function ForgotPasswordPage() {
  const [email, setEmail] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);
  const [sent, setSent] = React.useState(false);
  const [error, setError] = React.useState('');

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    const client = getSupabaseBrowserClient();
    if (!client) { setError('Supabase is not configured.'); return; }
    setSubmitting(true);
    const { error: resetError } = await client.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (resetError) {
      setError(resetError.message);
      setSubmitting(false);
      return;
    }
    setSent(true);
    setSubmitting(false);
  };

  const inputClass = 'w-full rounded-[10px] border border-[#D9D5D8] bg-white py-3 pl-10 pr-3 text-sm text-[#28262D] outline-none transition focus:border-[#714B67] focus:ring-2 focus:ring-[#714B67]/15';

  return (
    <main className="min-h-screen bg-[#F7F5F6] px-4 py-10 sm:grid sm:place-items-center">
      <section className="mx-auto w-full max-w-md rounded-[18px] border border-[#E4E1E5] bg-white p-6 shadow-sm sm:p-8">
        <div className="mb-7 flex items-center gap-3">
          <PeoplePayLogo size={44} />
          <div>
            <p className="text-lg font-bold text-[#28262D]">PeoplePay360</p>
            <p className="text-xs text-[#74717A]">Password Recovery</p>
          </div>
        </div>

        {sent ? (
          <div className="text-center py-4">
            <CheckCircle2 className="w-12 h-12 text-[#438A6B] mx-auto" />
            <h1 className="text-xl font-bold mt-4 text-[#28262D]">Check your email</h1>
            <p className="text-sm text-[#74717A] mt-2">
              We sent a password reset link to <strong>{email}</strong>. Check your inbox and follow the instructions.
            </p>
            <Link href="/" className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-[#714B67] hover:underline">
              <ArrowLeft className="h-4 w-4" /> Back to sign in
            </Link>
          </div>
        ) : (
          <>
            <h1 className="text-2xl font-bold tracking-tight text-[#28262D]">Reset your password</h1>
            <p className="mt-1 text-sm text-[#74717A]">Enter your work email and we&apos;ll send you a reset link.</p>

            <form className="mt-6 space-y-4" onSubmit={submit}>
              <label className="block text-sm font-semibold text-[#3D3940]" htmlFor="forgot-email">
                Work email
                <span className="relative mt-1.5 block">
                  <Mail aria-hidden="true" className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#74717A]" />
                  <input id="forgot-email" className={inputClass} type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                </span>
              </label>

              {error && <p role="alert" className="rounded-[10px] border border-[#F1C3C0] bg-[#FDF1F0] px-3 py-2.5 text-sm text-[#9D3E39]">{error}</p>}

              <button type="submit" disabled={submitting} className="flex w-full items-center justify-center gap-2 rounded-[10px] bg-[#714B67] px-4 py-3 text-sm font-bold text-white transition hover:bg-[#5C3C53] disabled:cursor-not-allowed disabled:opacity-60">
                {submitting ? <><Loader2 className="h-4 w-4 animate-spin" />Sending…</> : 'Send reset link'}
              </button>
            </form>

            <Link href="/" className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-[#74717A] hover:text-[#714B67]">
              <ArrowLeft className="h-4 w-4" /> Back to sign in
            </Link>
          </>
        )}
      </section>
    </main>
  );
}
