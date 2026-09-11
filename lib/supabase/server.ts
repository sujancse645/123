import 'server-only';

import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import type { Database, AppRole } from './database.types';

function required(name: string, value: string | undefined): string {
  if (!value) throw new Error(`${name} is not configured`);
  return value;
}

/**
 * Cookie-based server client that inherits the authenticated user's session.
 * Use in Server Components, Server Actions, and Route Handlers.
 */
export async function createServerSupabaseClient() {
  const cookieStore = await cookies();
  return createServerClient<Database>(
    required('NEXT_PUBLIC_SUPABASE_URL', process.env.NEXT_PUBLIC_SUPABASE_URL),
    required('NEXT_PUBLIC_SUPABASE_ANON_KEY', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
    {
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
            // setAll may fail in Server Components (read-only cookies).
            // This is expected; the middleware handles refresh.
          }
        },
      },
    }
  );
}

/**
 * Legacy helper – uses a raw access token instead of cookies.
 * Prefer createServerSupabaseClient() for new code.
 */
export function createUserScopedClient(accessToken: string) {
  return createClient<Database>(
    required('NEXT_PUBLIC_SUPABASE_URL', process.env.NEXT_PUBLIC_SUPABASE_URL),
    required('NEXT_PUBLIC_SUPABASE_ANON_KEY', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
    { global: { headers: { Authorization: `Bearer ${accessToken}` } }, auth: { persistSession: false } }
  );
}

/**
 * Service-role client for admin operations. NEVER import from client components.
 */
export function createServiceRoleClient() {
  const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  return createClient<Database>(
    required('NEXT_PUBLIC_SUPABASE_URL', process.env.NEXT_PUBLIC_SUPABASE_URL),
    required('SUPABASE_SERVICE_ROLE_KEY', key),
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}

/**
 * Get the authenticated user from the server-side session.
 */
export async function getServerUser() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

/**
 * Verify that the current user holds one of the allowed roles for a company.
 * Returns the user's roles if authorized; throws otherwise.
 */
export async function requireCompanyRole(
  companyId: string,
  allowedRoles: AppRole[]
): Promise<{ userId: string; roles: AppRole[] }> {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data: userRoles } = await supabase
    .from('user_company_roles')
    .select('role')
    .eq('company_id', companyId)
    .eq('user_id', user.id);

  if (!userRoles || userRoles.length === 0) {
    throw new Error('No roles found for this company');
  }

  const roles = userRoles.map(r => r.role as AppRole);
  const hasRole = roles.some(r => allowedRoles.includes(r));

  if (!hasRole) {
    throw new Error(`Insufficient permissions. Required: ${allowedRoles.join(', ')}`);
  }

  return { userId: user.id, roles };
}

/**
 * Get the highest-priority role for redirect purposes.
 */
export function getHighestRole(roles: AppRole[]): AppRole {
  const priority: AppRole[] = ['admin', 'payroll_manager', 'payroll_user', 'hr_manager', 'employee'];
  for (const role of priority) {
    if (roles.includes(role)) return role;
  }
  return 'employee';
}

/**
 * Get the dashboard path for a given role.
 */
export function getRoleDashboardPath(role: AppRole): string {
  switch (role) {
    case 'admin': return '/dashboard?view=admin_overview';
    case 'payroll_manager': return '/dashboard?view=payroll_dashboard';
    case 'payroll_user': return '/dashboard?view=payroll_dashboard';
    case 'hr_manager': return '/dashboard?view=employees';
    case 'employee':
    default: return '/dashboard?view=overview';
  }
}
