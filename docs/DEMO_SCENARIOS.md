# PeoplePay360 — Demo Scenarios & Integration Guide

This guide details all demo scenarios, test credentials, and steps to evaluate the full Supabase backend integration across all roles.

---

## 🔑 Demo User Accounts

All demo user accounts use the default password: **`PeoplePay@360`**

| Role | Name | Email | Primary Features Tested |
|---|---|---|---|
| **`admin`** | Sudeesh K | `admin@peoplepay360.demo` | Role Permissions Matrix, Biometric Devices, Audit Trail, System Config |
| **`hr_manager`** | Priya Sundaram | `sri7685234@gmail.com` | Employee Directory, Approvals Center, Contracts, Working Schedules, Medical Proofs |
| **`payroll_manager`** | Rajesh Kulkarni | `payroll.mgr@peoplepay360.demo` | Payruns Execution, Salary Structures, Statutory Rules, Overtime Policy, Reports |
| **`payroll_user`** | Neha Gupta | `payroll.user@peoplepay360.demo` | Payruns Drafting, Bank Exports, Payslip Generation |
| **`employee`** | Aravind Krishnan | `employee.aravind@peoplepay360.demo` | Check-in/out, Leave Requests, Payslips View, My Loans, Profile Updates |
| **`employee`** | Ananya Roy | `employee.ananya@peoplepay360.demo` | Alternate Employee Persona for cross-approval testing |

---

## 🚀 How to Run Demo Seeding

To populate demo users and sample data into your linked Supabase database:

```bash
# Ensure environment variables are configured in .env
# NEXT_PUBLIC_SUPABASE_URL=...
# SUPABASE_SERVICE_ROLE_KEY=...
# ALLOW_DEMO_SEED=true

npm run db:seed
```

The script is **idempotent** (safe to run multiple times without duplicating data).

---

## 🧪 Demo Test Scenarios

### Scenario 1: Employee Daily Workflow & Attendance Capture
1. Log in as `employee.aravind@peoplepay360.demo` / `PeoplePay@360`.
2. Navigate to **Attendance**. Click **Check In**.
3. Geofence verification records location and IP address directly to Supabase (`attendance_records` table).
4. View real-time attendance history and weekly summary stats.

### Scenario 2: Leave Request & HR Approval Flow
1. Log in as `employee.aravind@peoplepay360.demo`.
2. Go to **Leave**, click **Apply for Leave**. Select "Casual Leave" and request 2 days.
3. System calculates Sandwich policy impact via `preview_leave_impact_v2` RPC. Submit request.
4. Log out and log in as `sri7685234@gmail.com`.
5. Open **Approvals Center**, find Aravind's leave request, click **Approve**.
6. Switch back to Employee view to observe updated leave balances.

### Scenario 3: Monthly Payroll Run & Finalization
1. Log in as `payroll.mgr@peoplepay360.demo`.
2. Navigate to **Payruns Wizard**. Select period (e.g., August 2026).
3. Click **Calculate Payroll**. Backend RPC computes earnings, LOP deductions, statutory PF/ESI, and overtime.
4. Review readiness check (`v_payroll_readiness`). Click **Finalize Payrun**.
5. Log in as `employee.aravind@peoplepay360.demo` to inspect the generated payslip and download the PDF.

### Scenario 4: Loan Repayment & Ledger Tracking
1. Log in as `employee.aravind@peoplepay360.demo`.
2. Go to **My Loans**. View active loan status and repayment schedule.
3. Click **Make Repayment**. Record a sample payment.
4. RPC `record_loan_payment` updates principal balance and records an audited ledger item (`loan_payments`).

### Scenario 5: Admin Audit Log & Biometric Device Management
1. Log in as `admin@peoplepay360.demo`.
2. Access **Audit Trail** to view all system activity (logins, leave approvals, payroll finalizations).
3. Access **Biometric Devices** to inspect synced biometric clock-in hardware.
