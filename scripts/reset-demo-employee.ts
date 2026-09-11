import { createClient } from '@supabase/supabase-js';
import { createHash } from 'node:crypto';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;

if (!url || !key) {
  console.error('NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required');
  process.exit(1);
}

const supabase = createClient(url, key, { auth: { persistSession: false } });

async function resetDemoEmployee() {
  console.log('Resetting prototype demo employee (Arjun Kumar)...');

  const companyId = process.env.NEXT_PUBLIC_DEMO_COMPANY_ID || '00000000-0000-4000-8000-000000000001';
  const orgEmail = 'arjun.kumar@peoplepay360.test';
  const personalEmail = 'arjun.demo@peoplepay360.test';

  // 1. Delete existing auth user if present
  const { data: users } = await supabase.auth.admin.listUsers();
  const existingUser = users.users.find((u) => u.email === orgEmail);
  if (existingUser) {
    console.log(`Deleting existing auth user ${existingUser.id}...`);
    await supabase.auth.admin.deleteUser(existingUser.id);
  }

  // 2. Clear employee records with matching employee_code or email
  await supabase.from('employees').delete().eq('company_email', orgEmail);
  await supabase.from('demo_email_outbox').delete().eq('recipient_email', personalEmail);
  await supabase.from('account_invitations').delete().eq('organization_email', orgEmail);

  console.log('Prototype demo employee reset complete!');
}

resetDemoEmployee().catch(console.error);
