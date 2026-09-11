import 'server-only';

import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

function required(name: string, value: string | undefined): string {
  if (!value) throw new Error(`${name} is not configured`);
  return value;
}

/**
 * Admin client using the service-role key.
 *
 * Use ONLY for:
 * - Creating Auth accounts (admin.createUser)
 * - Sending invitations
 * - Updating Auth users
 * - Demo-user seeding
 * - Administrative background jobs
 *
 * NEVER import this module from client components.
 * NEVER return the secret key to the browser.
 */
export function createAdminClient() {
  const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  return createClient<Database>(
    required('NEXT_PUBLIC_SUPABASE_URL', process.env.NEXT_PUBLIC_SUPABASE_URL),
    required('SUPABASE_SERVICE_ROLE_KEY', key),
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    }
  );
}
