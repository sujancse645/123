import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const token_hash = requestUrl.searchParams.get('token_hash');
  const type = requestUrl.searchParams.get('type');
  const next = requestUrl.searchParams.get('next') ?? '/auth/verified';

  const origin = requestUrl.origin;

  if (!code && !token_hash) {
    return NextResponse.redirect(`${origin}/?error=Missing verification code`);
  }

  const cookieStore = await cookies();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Read-only server components
        }
      },
    },
  });

  try {
    let authUser = null;

    if (code) {
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) throw error;
      authUser = data.user;
    } else if (token_hash && type) {
      const { data, error } = await supabase.auth.verifyOtp({
        token_hash,
        type: type as any,
      });
      if (error) throw error;
      authUser = data.user;
    }

    if (!authUser) {
      return NextResponse.redirect(`${origin}/?error=Invalid or expired verification session`);
    }

    // Update employee status using Service Role client
    const service = createServiceRoleClient();
    const { data: employee } = await service
      .from('employees')
      .select('id, company_id, account_status')
      .eq('user_id', authUser.id)
      .maybeSingle();

    if (employee) {
      const now = new Date().toISOString();
      await service
        .from('employees')
        .update({
          email_verified_at: now,
          account_status: 'email_verified',
          onboarding_status: 'email_verified',
        } as any)
        .eq('id', employee.id);

      // Update invitations status
      await service
        .from('employee_invitations')
        .update({
          activated_at: now,
          delivery_status: 'activated',
        })
        .eq('employee_id', employee.id);

      // Record audit log
      await service.from('audit_logs').insert({
        company_id: employee.company_id,
        actor_user_id: authUser.id,
        action: 'employee_email_verified',
        entity_table: 'employees',
        entity_id: employee.id,
        summary: { email: authUser.email },
      });
    }

    return NextResponse.redirect(`${origin}${next}`);
  } catch (caught) {
    const message = caught instanceof Error ? caught.message : 'Verification failed';
    return NextResponse.redirect(`${origin}/?error=${encodeURIComponent(message)}`);
  }
}
