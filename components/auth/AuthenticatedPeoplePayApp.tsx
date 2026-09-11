'use client';

import React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { PeoplePayLogo } from '@/components/brand/PeoplePayLogo';
import PeoplePayApp from '@/components/application/PeoplePayApp';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import type { AppRole } from '@/lib/types';
import { isLocalOnboardingComplete } from '@/lib/demo/local-fallback';

export interface AuthenticatedSession {
  userId: string;
  email: string;
  employeeId: string;
  companyId: string;
  fullName: string;
  roles: AppRole[];
  onboardingStatus: string;
}

export function AuthenticatedPeoplePayApp() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [session, setSession] = React.useState<AuthenticatedSession | null>(null);
  const [loading, setLoading] = React.useState(true);

  const withTimeout = React.useCallback(async <T,>(promise:PromiseLike<T>,milliseconds=10000):Promise<T>=>Promise.race([Promise.resolve(promise),new Promise<T>((_,reject)=>window.setTimeout(()=>reject(new Error('Session verification timed out')),milliseconds))]),[]);

  React.useEffect(() => {
    const client = getSupabaseBrowserClient();
    if (!client) {
      router.replace('/');
      return;
    }
    (async () => {
      try {
        const { data: { user } } = await withTimeout(client.auth.getUser());
        if (!user) {
          router.replace('/');
          return;
        }

        // Keep login compatible with databases where the optional biometric
        // migration has not been applied yet.
        const biometricsEnabled=process.env.NEXT_PUBLIC_BIOMETRICS_ENABLED==='true';
        const employeeResult=biometricsEnabled
          ? await client.from('employees').select('id, company_id, full_name, status, employee_code, biometric_enrollment_required').eq('user_id',user.id).maybeSingle()
          : await client.from('employees').select('id, company_id, full_name, status, employee_code').eq('user_id',user.id).maybeSingle();
        const employee=employeeResult.data;const empErr=employeeResult.error;

        if (empErr || !employee) {
          await client.auth.signOut({scope:'local'}).catch(()=>undefined);
          router.replace('/?session=invalid');
          return;
        }

        // Check onboarding
        if (employee.status === 'onboarding'&&!isLocalOnboardingComplete(user.id)) {
          router.replace('/onboarding');
          return;
        }

        if (biometricsEnabled&&'biometric_enrollment_required' in employee&&employee.biometric_enrollment_required) {
          router.replace('/enrollment');
          return;
        }

        // Get roles
        const { data: roleData } = await client
          .from('user_company_roles')
          .select('role')
          .eq('company_id', employee.company_id)
          .eq('user_id', user.id);

        const roles = (roleData || []).map(r => r.role as AppRole);
        if (roles.length === 0) roles.push('employee');

        setSession({
          userId: user.id,
          email: user.email || '',
          employeeId: employee.id,
          companyId: employee.company_id,
          fullName: employee.full_name,
          roles,
          onboardingStatus: employee.status,
        });

        // Apply view parameter from URL if present
        const view = searchParams.get('view');
        if (view) {
          // The view will be picked up by AppProvider
        }
      } catch {
        await client.auth.signOut({scope:'local'}).catch(()=>undefined);
        router.replace('/?session=invalid');
      } finally {
        setLoading(false);
      }
    })();
  }, [router, searchParams,withTimeout]);

  if (loading || !session) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#FBFAFB] p-6" aria-busy="true">
        <div className="flex flex-col items-center gap-3 text-center">
          <PeoplePayLogo size={44} />
          <p className="text-sm font-semibold text-[#714B67]">Verifying your session…</p>
          <div className="w-6 h-6 rounded-full border-2 border-[#714B67] border-t-transparent animate-spin" />
        </div>
      </main>
    );
  }

  return <PeoplePayApp authenticatedSession={session} />;
}
