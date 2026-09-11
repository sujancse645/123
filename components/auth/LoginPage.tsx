'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Eye, EyeOff, LockKeyhole, Mail, AlertCircle, Loader2 } from 'lucide-react';
import { PeoplePayLogo } from '@/components/brand/PeoplePayLogo';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import type { AppRole } from '@/lib/types';
import { LoginVisual } from './LoginVisual';
import { LoginTransition } from './LoginTransition';
import { EMPLOYEE_DEMO_CREDENTIALS, isEmployeeDemoLogin } from '@/lib/auth/demo-credentials';
import { getHighestRole, getRoleDashboardPath } from '@/lib/auth/role-routing';

export function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [showPassword, setShowPassword] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState('');
  const [authenticated, setAuthenticated] = React.useState(false);
  const sessionNotice=searchParams.get('session')==='invalid'?'Your previous session was invalid or expired. Please sign in again.':'';

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    if (isEmployeeDemoLogin(email, password)) {
      sessionStorage.setItem('peoplepay360-demo-session', 'employee');
      setSubmitting(true);
      setAuthenticated(true);
      router.prefetch('/demo');
      window.setTimeout(() => router.replace('/demo'), 1100);
      return;
    }
    const client = getSupabaseBrowserClient();
    if (!client) {
      setError('Login is not configured. Add the Supabase URL and anonymous key, or open Demo Mode.');
      return;
    }
    setSubmitting(true);

    try {
      // 1. Sign in
      const result = await client.auth.signInWithPassword({ email: email.trim(), password });
      if (result.error) {
        if (result.error.message.includes('Invalid login')) {
          setError('Invalid email or password. Please check your credentials.');
        } else {
          setError(result.error.message);
        }
        setSubmitting(false);
        return;
      }

      const user = result.data.user;
      if (!user) {
        setError('Authentication failed. Please try again.');
        setSubmitting(false);
        return;
      }

      // 2. Read employee record
      const { data: employee, error: empError } = await client
        .from('employees')
        .select('id, company_id, status')
        .eq('user_id', user.id)
        .maybeSingle();

      if (empError) {
        console.error('LoginPage employee query error:', empError);
        setError(`Unable to load your employee record: ${empError.message}`);
        setSubmitting(false);
        return;
      }

      if (!employee) {
        setError('No employee record found for this account. Please contact HR.');
        setSubmitting(false);
        return;
      }

      // 3. Check employee status
      if (employee.status === 'terminated' || employee.status === 'suspended') {
        await client.auth.signOut();
        setError('Your account has been suspended. Please contact your administrator.');
        setSubmitting(false);
        return;
      }

      // 4. Check onboarding
      if (employee.status === 'onboarding') {
        router.replace('/onboarding');
        return;
      }

      // 5. Read roles
      const { data: roles } = await client
        .from('user_company_roles')
        .select('role')
        .eq('company_id', employee.company_id)
        .eq('user_id', user.id);

      const userRoles = (roles || []).map(r => r.role as AppRole);
      if (userRoles.length === 0) {
        userRoles.push('employee');
      }

      // 6. Redirect to highest-role dashboard
      setAuthenticated(true);
      const redirect = searchParams.get('redirect');
      const targetPath = (redirect && redirect.startsWith('/')) ? redirect : getRoleDashboardPath(getHighestRole(userRoles));
      router.prefetch(targetPath);
      window.setTimeout(() => router.replace(targetPath), 800);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error. Please check your connection.');
      setSubmitting(false);
    }
  };

  const inputClass = 'w-full rounded-[10px] border border-[#D9D5D8] bg-white py-3 pl-10 pr-3 text-sm text-[#28262D] outline-none transition focus:border-[#714B67] focus:ring-2 focus:ring-[#714B67]/15';

  if (authenticated) return <LoginTransition />;

  return (
    <main className="grid min-h-screen bg-[#F7F5F6] lg:grid-cols-[minmax(0,1.08fr)_minmax(420px,0.92fr)]">
      <LoginVisual />
      <div className="flex min-h-screen items-center justify-center px-4 py-10 sm:px-8">
        <section className="w-full max-w-md rounded-[18px] border border-[#E4E1E5] bg-white p-6 shadow-sm sm:p-8" aria-labelledby="login-title">
          <div className="mb-7 flex items-center gap-3">
            <PeoplePayLogo size={44} />
            <div>
              <p className="text-lg font-bold text-[#28262D]">PeoplePay360</p>
              <p className="text-xs text-[#74717A]">HR & Payroll Management</p>
            </div>
          </div>

          <h1 id="login-title" className="text-2xl font-bold tracking-tight text-[#28262D]">Sign in to your account</h1>
          <p className="mt-1 text-sm text-[#74717A]">Use your company-issued account credentials.</p>

          <form className="mt-6 space-y-4" onSubmit={submit}>
            <label className="block text-sm font-semibold text-[#3D3940]" htmlFor="login-email">
              Work email
              <span className="relative mt-1.5 block">
                <Mail aria-hidden="true" className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#74717A]" />
                <input id="login-email" className={inputClass} type="email" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} required />
              </span>
            </label>

            <label className="block text-sm font-semibold text-[#3D3940]" htmlFor="login-password">
              Password
              <span className="relative mt-1.5 block">
                <LockKeyhole aria-hidden="true" className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#74717A]" />
                <input id="login-password" className={`${inputClass} pr-11`} type={showPassword ? 'text' : 'password'} autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required />
                <button type="button" onClick={() => setShowPassword((value) => !value)} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-2 text-[#74717A] hover:bg-[#F4F3F5]" aria-label={showPassword ? 'Hide password' : 'Show password'}>
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </span>
            </label>

            <div className="flex justify-end">
              <Link href="/forgot-password" className="text-xs font-medium text-[#714B67] hover:underline">
                Forgot password?
              </Link>
            </div>

            {(error||sessionNotice) && (
              <div role="alert" className="flex items-start gap-2 rounded-[10px] border border-[#F1C3C0] bg-[#FDF1F0] px-3 py-2.5 text-sm text-[#9D3E39]">
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                <span>{error||sessionNotice}</span>
              </div>
            )}

            <button type="submit" disabled={submitting} className="flex w-full items-center justify-center gap-2 rounded-[10px] bg-[#714B67] px-4 py-3 text-sm font-bold text-white transition hover:bg-[#5C3C53] disabled:cursor-not-allowed disabled:opacity-60">
              {submitting ? <><Loader2 className="h-4 w-4 animate-spin" />Signing in…</> : 'Sign in'}
            </button>
          </form>

          <div className="my-6 flex items-center gap-3" aria-hidden="true">
            <span className="h-px flex-1 bg-[#E4E1E5]" />
            <span className="text-xs font-medium text-[#74717A]">For product preview</span>
            <span className="h-px flex-1 bg-[#E4E1E5]" />
          </div>

        <Link href="/demo" className="block w-full rounded-[10px] border border-[#714B67] px-4 py-3 text-center text-sm font-bold text-[#714B67] transition hover:bg-[#F4EFF3]">
          Open Demo Mode
        </Link>
        <p className="mt-3 text-center text-xs text-[#74717A]">Demo Mode uses sample data and does not require an account.</p>
        <p className="mt-3 rounded-[10px] bg-[#F4F3F5] px-3 py-2 text-center text-[11px] text-[#5C5860]">
          Presentation login: <strong>{EMPLOYEE_DEMO_CREDENTIALS.email}</strong> / <strong>{EMPLOYEE_DEMO_CREDENTIALS.password}</strong>
        </p>
      </section>
      </div>
    </main>
  );
}
