import { createClient } from '@supabase/supabase-js';
import type { Database } from '../lib/supabase/database.types';
import { DEMO_COMPANY_ID } from './seed-demo-users';

export const DEMO_STRUCTURE_ID = '00000000-0000-0000-0000-000000000002';

export async function seedDemoData(supabaseUrl: string, serviceRoleKey: string) {
  const supabase = createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  console.log('--- Seeding Functional Demo Data ---');

  // 1. Salary Structure (matching initialization_query.sql public.salary_structures)
  const { data: salaryStructure } = await supabase
    .from('salary_structures')
    .upsert(
      {
        id: DEMO_STRUCTURE_ID,
        company_id: DEMO_COMPANY_ID,
        name: 'Standard Executive Salary Structure',
        code: 'EXEC_STD',
        description: 'Standard CTC structure including Basic, HRA, Special Allowance, and PF',
        effective_from: '2023-01-01',
        is_active: true,
      },
      { onConflict: 'company_id,code,effective_from' }
    )
    .select()
    .single();

  const structureId = salaryStructure?.id || DEMO_STRUCTURE_ID;
  console.log('✅ Salary structure seeded.');

  // 2. Leave Types (matching initialization_query.sql public.leave_types)
  const leaveTypes = [
    { company_id: DEMO_COMPANY_ID, name: 'Casual Leave', code: 'CL', is_paid: true, annual_allocation: 12, carry_forward_limit: 3 },
    { company_id: DEMO_COMPANY_ID, name: 'Sick Leave', code: 'SL', is_paid: true, annual_allocation: 10, carry_forward_limit: 0 },
    { company_id: DEMO_COMPANY_ID, name: 'Earned / Privileged Leave', code: 'EL', is_paid: true, annual_allocation: 18, carry_forward_limit: 15 },
    { company_id: DEMO_COMPANY_ID, name: 'Loss of Pay / Leave Without Pay', code: 'LOP', is_paid: false, annual_allocation: 0, carry_forward_limit: 0 },
  ];

  for (const lt of leaveTypes) {
    await supabase.from('leave_types').upsert(lt, { onConflict: 'company_id,code' });
  }
  console.log('✅ Leave types seeded.');

  // 3. Working Schedule (matching initialization_query.sql public.working_schedules & days)
  const { data: schedule } = await supabase
    .from('working_schedules')
    .upsert(
      {
        company_id: DEMO_COMPANY_ID,
        name: 'Standard General Shift (9:00 AM - 6:00 PM)',
        timezone: 'Asia/Kolkata',
        grace_minutes: 15,
        is_default: true,
      },
      { onConflict: 'company_id,name' }
    )
    .select()
    .single();

  if (schedule) {
    for (let day = 1; day <= 5; day++) {
      await supabase.from('working_schedule_days').upsert({
        schedule_id: schedule.id,
        iso_weekday: day,
        start_time: '09:00:00',
        end_time: '18:00:00',
        break_minutes: 60,
        is_working_day: true,
      });
    }
    console.log('✅ Working schedule & days seeded.');
  }

  // 4. Office Geofence (matching migration 1 public.office_geofences)
  try {
    await supabase.from('office_geofences').upsert({
      company_id: DEMO_COMPANY_ID,
      name: 'Bengaluru Tech Park HQ',
      latitude: 12.971598,
      longitude: 77.594566,
      allowed_radius_meters: 200,
      maximum_accuracy_meters: 50,
      is_active: true,
    });
    console.log('✅ Geofence seeded.');
  } catch (e) {
    console.log('ℹ️ Skipping geofence (optional).');
  }

  // 5. Get seeded employees
  const { data: employees } = await supabase.from('employees').select('id, full_name, user_id').eq('company_id', DEMO_COMPANY_ID);

  if (!employees || employees.length === 0) return;

  // 6. Seed Attendance for last 5 days (matching initialization_query.sql public.attendance_records)
  for (const emp of employees) {
    for (let i = 1; i <= 5; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];

      await supabase.from('attendance_records').upsert(
        {
          company_id: DEMO_COMPANY_ID,
          employee_id: emp.id,
          date: dateStr,
          work_date: dateStr,
          check_in: `${dateStr}T09:05:00Z`,
          check_in_at: `${dateStr}T09:05:00Z`,
          check_out: `${dateStr}T18:10:00Z`,
          check_out_at: `${dateStr}T18:10:00Z`,
          check_in_method: 'location_geofence' as any,
          check_out_method: 'location_geofence' as any,
          worked_minutes: 510,
          total_hours: 8.5,
          overtime_minutes: 30,
          overtime_hours: 0.5,
          status: 'present' as any,
        },
        { onConflict: 'company_id,employee_id,work_date' }
      );
    }
  }
  console.log('✅ Recent attendance records seeded.');

  // 7. Contracts (matching initialization_query.sql public.contracts)
  for (const emp of employees) {
    await supabase.from('contracts').upsert(
      {
        company_id: DEMO_COMPANY_ID,
        employee_id: emp.id,
        salary_structure_id: structureId,
        start_date: '2023-01-15',
        monthly_ctc: 120000,
        monthly_gross: 100000,
        basic_salary: 50000,
        allowance_config: { hra: 25000, special: 25000 },
        is_active: true,
      },
      { onConflict: 'company_id,employee_id,start_date' }
    );
  }
  console.log('✅ Employee contracts seeded.');

  // 8. Initial Pay Run & Payslips (matching initialization_query.sql public.pay_runs & public.payslips)
  const { data: payrun } = await supabase
    .from('pay_runs')
    .upsert(
      {
        company_id: DEMO_COMPANY_ID,
        name: 'August 2026 Monthly Payrun',
        period_start: '2026-08-01',
        period_end: '2026-08-31',
        status: 'finalized' as any,
        employee_count: employees.length,
        total_employees: employees.length,
        total_gross: employees.length * 100000,
        total_deductions: employees.length * 12000,
        total_net: employees.length * 88000,
      },
      { onConflict: 'company_id,period_start,period_end' }
    )
    .select()
    .single();

  if (payrun) {
    for (const emp of employees) {
      await supabase.from('payslips').upsert(
        {
          company_id: DEMO_COMPANY_ID,
          pay_run_id: payrun.id,
          employee_id: emp.id,
          period_start: '2026-08-01',
          period_end: '2026-08-31',
          paid_days: 31,
          unpaid_leave_days: 0,
          gross_amount: 100000,
          deduction_amount: 12000,
          employer_contribution: 6000,
          net_amount: 88000,
          currency_code: 'INR',
          status: 'paid' as any,
          explanation: { basic: 50000, hra: 25000, special: 25000, pf: 6000, tax: 6000 },
          generated_at: new Date().toISOString(),
        },
        { onConflict: 'pay_run_id,employee_id' }
      );
    }
    console.log('✅ Pay run & payslips seeded.');
  }

  console.log('🎉 Demo data seeding complete!');
}
