import { createClient } from '@supabase/supabase-js';
import type { Database, AppRole } from '../lib/supabase/database.types';

export const DEMO_COMPANY_ID = '00000000-0000-0000-0000-000000000001';
export const DEMO_PASSWORD = process.env.DEMO_DEFAULT_PASSWORD || 'PeoplePay@360';

export interface SeedUserSpec {
  email: string;
  name: string;
  code: string;
  role: AppRole;
  department: string;
  position: string;
  phone: string;
}

export const DEMO_USER_SPECS: SeedUserSpec[] = [
  {
    email: 'admin@peoplepay360.demo',
    name: 'Sudeesh K',
    code: 'EMP-001',
    role: 'admin',
    department: 'Executive Leadership',
    position: 'Chief Executive Officer',
    phone: '+919876543210',
  },
  {
    email: 'sri7685234@gmail.com',
    name: 'Priya Sundaram',
    code: 'EMP-002',
    role: 'hr_manager',
    department: 'Human Resources',
    position: 'HR Director',
    phone: '+919876543211',
  },
  {
    email: 'payroll.mgr@peoplepay360.demo',
    name: 'Rajesh Kulkarni',
    code: 'EMP-003',
    role: 'payroll_manager',
    department: 'Finance & Payroll',
    position: 'Head of Payroll',
    phone: '+919876543212',
  },
  {
    email: 'payroll.user@peoplepay360.demo',
    name: 'Neha Gupta',
    code: 'EMP-004',
    role: 'payroll_user',
    department: 'Finance & Payroll',
    position: 'Payroll Specialist',
    phone: '+919876543213',
  },
  {
    email: 'employee.aravind@peoplepay360.demo',
    name: 'Aravind Krishnan',
    code: 'EMP-005',
    role: 'employee',
    department: 'Engineering',
    position: 'Senior Software Engineer',
    phone: '+919876543214',
  },
  {
    email: 'employee.ananya@peoplepay360.demo',
    name: 'Ananya Roy',
    code: 'EMP-006',
    role: 'employee',
    department: 'Product',
    position: 'Product Manager',
    phone: '+919876543215',
  },
];

export async function seedDemoUsers(supabaseUrl: string, serviceRoleKey: string) {
  const supabase = createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  console.log('--- Seeding Company & Demo Users ---');

  // 1. Ensure Company exists (matching initialization_query.sql public.companies exactly)
  const { data: company, error: companyErr } = await supabase
    .from('companies')
    .upsert(
      {
        id: DEMO_COMPANY_ID,
        name: 'Acme India Pvt Ltd',
        legal_name: 'Acme Technology Solutions India Pvt Ltd',
        currency_code: 'INR',
        timezone: 'Asia/Kolkata',
      },
      { onConflict: 'id' }
    )
    .select()
    .single();

  if (companyErr) throw companyErr;
  console.log(`✅ Company ready: ${company.name} (${company.id})`);

  // 2. Create Users & Profiles & Employees
  for (const spec of DEMO_USER_SPECS) {
    // Check if auth user exists
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    let authUser = existingUsers?.users?.find((u) => u.email?.toLowerCase() === spec.email.toLowerCase());

    if (!authUser) {
      const { data: newUser, error: createErr } = await supabase.auth.admin.createUser({
        email: spec.email,
        password: DEMO_PASSWORD,
        email_confirm: true,
        user_metadata: { full_name: spec.name },
      });
      if (createErr) {
        console.error(`Failed to create user ${spec.email}:`, createErr);
        continue;
      }
      authUser = newUser.user;
      console.log(`  Created Auth user: ${spec.email}`);
    } else {
      console.log(`  Existing Auth user: ${spec.email}`);
      const { error: passwordError } = await supabase.auth.admin.updateUserById(authUser.id, {
        password: DEMO_PASSWORD,
        email_confirm: true,
        user_metadata: { full_name: spec.name },
      });
      if (passwordError) throw passwordError;
    }

    const departmentCode=spec.department.replace(/[^A-Za-z]/g,'').slice(0,8).toUpperCase();
    const {data:department,error:departmentError}=await supabase.from('departments').upsert({company_id:DEMO_COMPANY_ID,name:spec.department,code:departmentCode,is_active:true},{onConflict:'company_id,code'}).select().single();
    if(departmentError)throw departmentError;
    const positionCode=`${departmentCode}-${spec.position.replace(/[^A-Za-z]/g,'').slice(0,8).toUpperCase()}`;
    const {data:position,error:positionError}=await supabase.from('job_positions').upsert({company_id:DEMO_COMPANY_ID,department_id:department.id,title:spec.position,code:positionCode,is_active:true},{onConflict:'company_id,code'}).select().single();
    if(positionError)throw positionError;

    // Profile (matching initialization_query.sql public.profiles exactly)
    await supabase.from('profiles').upsert(
      {
        id: authUser.id,
        full_name: spec.name,
        personal_email: spec.email,
        phone: spec.phone,
      },
      { onConflict: 'id' }
    );

    // Employee (matching initialization_query.sql public.employees exactly)
    const { data: emp } = await supabase
      .from('employees')
      .upsert(
        {
          company_id: DEMO_COMPANY_ID,
          user_id: authUser.id,
          employee_code: spec.code,
          full_name: spec.name,
          company_email: spec.email,
          phone: spec.phone,
          joining_date: '2023-01-15',
          status: 'active' as any,
          work_location: 'Bengaluru HQ',
          department_id: department.id,
          position_id: position.id,
        },
        { onConflict: 'company_id,employee_code' }
      )
      .select()
      .single();

    // User Company Role (matching initialization_query.sql public.user_company_roles exactly)
    if (emp) {
      await supabase.from('user_company_roles').upsert(
        {
          company_id: DEMO_COMPANY_ID,
          user_id: authUser.id,
          role: spec.role,
        },
        { onConflict: 'company_id,user_id,role' }
      );
      console.log(`  ✅ Synced employee & role (${spec.role}): ${spec.name}`);
    }
  }
}
