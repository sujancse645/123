# PeoplePay360

**Explainable HR and Payroll Management Platform**

PeoplePay360 is a role-based HR and payroll platform that connects employee records, contracts, attendance, leave, salary structures, payruns, and payslips in one interface.

The platform helps employees understand their salary and leave impact while helping HR and payroll teams identify errors before payment. Its core idea is simple: **every salary should be calculated correctly, verified before payment, and clearly explained to the employee.**

> Current status: the original demo UI is now accompanied by an additive Supabase compatibility layer, protected employee-invitation and onboarding routes, atomic leave/loan/payroll RPCs, private document exports, and domain regression tests. Some legacy screens still use deterministic mock state until a Supabase project is linked and seeded.

## Problem

Many organizations manage employee information, attendance, leave, contracts, and payroll in separate systems. This creates several problems:

- Incorrect or unexplained salary deductions
- Duplicate payslips
- Missing attendance and check-out records
- Expired or overlapping contracts
- Manual leave-balance calculations
- Payroll errors discovered only after payment
- Limited transparency for employees

## Solution

PeoplePay360 brings the complete employee-to-payroll workflow into a single role-based application.

Employees can mark attendance, request leave, view leave balances, estimate unpaid-leave deductions, and understand their salary breakdown. HR teams manage employees, contracts, schedules, attendance, and approvals. Payroll teams create payruns, review warnings, calculate payslips, and analyze payroll readiness.

## Unique Value Proposition

> **PeoplePay360 detects, explains, and simulates payroll changes before employees are paid.**

The platform adds three differentiating capabilities:

### Payroll Readiness Score

Checks a payrun for issues such as:

- Missing bank details
- Missing, expired, or overlapping contracts
- Duplicate payslips
- Attendance exceptions
- Leave conflicts
- Unusual salary changes

Each warning links to the affected employee or payslip.

### Explainable Salary Difference

Compares the current salary with the previous payslip and explains every change.

Example:

```text
Previous net salary: ₹42,000
Current net salary:  ₹39,550

Unpaid leave deduction: -₹2,800
Approved overtime:       +₹750
Other deduction:         -₹400
Total difference:      -₹2,450
```

### Payroll Impact Simulator

Allows a payroll manager to preview the effect of a proposed change before applying it to actual payroll.

The simulation can show:

- Current and simulated payroll cost
- Affected employees
- Employee-level salary differences
- Department-level cost impact
- New warnings created by the change
- Reasons for every calculated difference

## User Roles

| Role | Main permissions |
|---|---|
| Employee | Attendance, leave requests, payslips, salary details, and personal profile |
| HR Manager | Employee, contract, schedule, attendance, leave, and request management; no payroll administration |
| HR Payroll User | HR Manager access plus create, read, and update access to payruns and payslips; salary structures and rules are read-only |
| HR Payroll Manager | Full payroll management, including payruns, draft payslips, salary structures, and salary rules |
| Admin | Complete access to users, permissions, HR, attendance, leave, payroll, reports, integrations, and audit history |

All internal roles also receive Employee Self-Service features for their own attendance, leave, salary, payslips, and profile.

## Core Modules

### Employee Management

- Employee Kanban, list, and detail views
- Department, job position, manager, and employment status
- Employee search and filtering
- Active contract and contract history
- Attendance and leave summaries

### Attendance

- Check-in and check-out experience
- Live worked-hours summary
- Attendance history and monthly calendar
- Missing check-out and attendance exception states
- Attendance correction requests
- Face-verification interface prototype
- External biometric-device integration interface

The current face and fingerprint flows are frontend demonstrations. A production deployment requires secure enrollment, consent, liveness checks, device APIs, and protected biometric data handling.

### Leave Management

- Paid and unpaid leave requests
- Calendar-based date selection
- Working-day calculation
- Paid-leave balance preview
- Estimated unpaid-leave deduction
- Leave approval workflow
- Leave allocations and time-off types

When selected leave exceeds the available paid balance, the interface separates paid and unpaid days and displays an estimated salary impact in Indian rupees.

### Contracts and Working Schedules

- Contract history
- Active contract indicator
- Wage and salary-structure information
- Missing and overlapping-contract warnings
- Weekly working schedules
- Start time, end time, break, and total hours

### Payroll

- Two-step payrun wizard
- Eligible employee selection
- Draft payroll computation interface
- Payslip review
- Compute, Validate, Mark Paid, Generate PDF, and Send Payslips actions
- Salary structures
- Sequential salary rules
- Payroll warnings and readiness checks

### Reports and Dashboard

- Total net salary
- Payslips generated
- Average salary
- Salary cost by department
- Monthly payroll trend
- Attendance health
- Leave overview
- Payroll status distribution
- Department headcount and payroll cost
- Filters by period, department, employee type, status, and salary structure

## Leave Salary-Impact Preview

The frontend demonstrates the following estimate:

```text
Estimated deduction = Eligible monthly salary / Payable working days × Unpaid leave days
```

Example:

```text
Selected working days:       5
Available paid leave:        3 days
Paid leave used:             3 days
Unpaid leave:                2 days
Estimated deduction per day: ₹1,167
Estimated total deduction:   ₹2,334
```

The UI labels this value as an estimate. The final amount must come from the connected payroll rules and backend calculation service.

## Frontend Technology

- [Next.js 15](https://nextjs.org/)
- TypeScript
- Tailwind CSS
- shadcn/ui
- Lucide React
- Recharts
- Framer Motion

## Design System

The visual identity is inspired by Odoo's professional plum palette while using an original application layout.

| Purpose | Color |
|---|---|
| Primary plum | `#714B67` |
| Deep plum | `#4D3348` |
| Muted lavender | `#A4879F` |
| Warm yellow | `#F4C430` |
| Warm white | `#FBFAFB` |
| Surface white | `#FFFFFF` |
| Border grey | `#E4E1E5` |
| Primary text | `#28262D` |
| Success | `#438A6B` |
| Warning | `#D49525` |
| Error | `#C85A54` |

The interface uses restrained glass effects, accessible contrast, responsive cards, clear data tables, meaningful status colors, and subtle motion.

## Project Structure

```text
app/                         Next.js routes and layouts
components/
├── attendance/             Attendance and verification UI
├── dashboard/              KPI cards, charts, and summaries
├── employees/              Employee management UI
├── leave/                  Leave request and impact preview
├── payroll/                Payruns, payslips, and simulation
└── shared/                 Reusable navigation, dialogs, and tables
hooks/                       Reusable React hooks
lib/
├── mock-data/              Demonstration records
├── services/               Replaceable frontend service layer
├── types/                  TypeScript domain interfaces
└── utils/                  Formatting and calculation helpers
public/                      Static assets
```

The exact folders may vary as development progresses. Keep UI components separate from data services so mock functions can later be replaced with backend APIs.

## Getting Started

### Prerequisites

- Node.js 20 or later
- npm, pnpm, yarn, or bun

### Installation

```bash
git clone <YOUR_REPOSITORY_URL>
cd PeoplePay360
npm install
```

### Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Production build

```bash
npm run build
npm start
```

## Demo Accounts

The frontend should provide role-selection cards or sample credentials for these accounts:

| Demo user | Role |
|---|---|
| Employee Demo | Employee |
| HR Manager Demo | HR Manager |
| Payroll User Demo | HR Payroll User |
| Payroll Manager Demo | HR Payroll Manager |
| Admin Demo | Admin |

Replace this section with the final demonstration credentials before submission. Never commit real passwords or employee information.

## Suggested Demo Flow

### Flow 1: Attendance to Payslip

1. Employee completes the mock face-verification check-in.
2. Attendance is displayed on the employee dashboard.
3. Payroll user creates a payrun and selects eligible employees.
4. The system displays payroll warnings and a readiness score.
5. Payroll is computed and the employee's payslip is opened.
6. The salary explanation shows the source of every amount.

### Flow 2: Leave to Salary Impact

1. Employee opens the leave calendar.
2. The employee selects dates exceeding the paid-leave balance.
3. PeoplePay360 separates paid and unpaid days.
4. The interface displays the estimated salary deduction.
5. HR approves the request.
6. The draft payslip is recomputed.
7. The salary difference explains the unpaid-leave deduction.

### WOW Moment: Payroll Simulation

1. Payroll Manager changes a salary rule in Simulation mode.
2. The simulator shows affected employees and total company cost.
3. The actual payroll remains unchanged.
4. The manager reviews the impact and submits the simulation for approval.

## Current Scope

The current project focuses on the frontend experience using realistic mock records and local state.

Available in the frontend prototype:

- Role-based dashboards
- Employee Self-Service
- Attendance and mock biometric flows
- Leave and deduction-impact preview
- Employee, contract, and schedule screens
- Payrun and payslip workflows
- Payroll Readiness Score
- Explainable salary differences
- Payroll Impact Simulator
- Responsive reports and dashboards

Implemented backend integration points:

- Supabase Auth clients and server-only Admin API usage
- Additive PostgreSQL migrations that preserve the original schema and data
- Role-checked, transactional leave review, loan payment, attendance, and bank-export RPCs
- Private profile-photo, payslip, and bank-export storage
- Real A4 PDF generation and short-lived signed downloads
- Protected email-provider webhook adapter with delivery tracking
- Audit records for privileged workflows

Still external or deployment-specific:

- A linked Supabase project and production credentials
- Email provider credentials and webhook implementation
- Physical biometric-device integration and production face liveness verification
- A scheduler for the contract lifecycle RPC
- Migrating the remaining legacy demo screens from local state to live queries

## Supabase compatibility and deployment

The legacy bootstrap file at `sql/initialization_query.sql` is intentionally unchanged. Run it only for a fresh database. For an existing PeoplePay360 database, apply only the ordered files in `supabase/migrations/`:

```text
20260905120000_peoplepay360_compatibility_extensions.sql
20260905121000_peoplepay360_atomic_workflows.sql
20260905122000_peoplepay360_rls_views.sql
20260905123000_peoplepay360_calculation_rpcs.sql
```

The first migration safely backfills contract lifecycle values without removing `is_active`:

```text
is_active = true                         -> running
is_active = false and start_date future -> scheduled
is_active = false and end_date past     -> expired
otherwise                               -> draft
```

After linking the Supabase CLI, regenerate the checked-in database type snapshot:

```bash
supabase link --project-ref <project-ref>
npm run db:types
```

Run `supabase/tests/rls_policy_regression.sql` with pgTAP after applying migrations. It verifies that the original Employee, HR, Payroll User, Payroll Manager, and Admin policy paths still exist and that sensitive encrypted columns are not broadly selectable.

## Future Odoo Integration

The frontend service layer can later connect with Odoo modules for:

- Employees
- Contracts
- Working schedules
- Attendance
- Time Off
- Payroll
- Salary structures
- Salary rules
- Payruns and payslips

All permissions, salary calculations, leave deductions, payroll validation, and biometric verification must be enforced by the backend. Frontend role visibility alone is not a security control.

## Privacy and Security Considerations

- Mask bank-account details by default.
- Do not store real biometric images in frontend storage.
- Request camera access only after an explicit employee action.
- Stop the camera when verification closes.
- Do not commit passwords, employee documents, salary records, or secrets.
- Require backend authorization for payroll and employee records.
- Maintain audit history for attendance, leave, profile, and payroll changes.
- Use employee forecasts only for staffing assistance, with human review.

## Team Collaboration

Use short feature branches and pull requests so every contribution is visible.

Example branches:

```text
feat/employee-dashboard
feat/attendance-verification
feat/leave-impact-preview
feat/payroll-readiness
feat/payroll-simulator
feat/admin-dashboard
```

Use meaningful commits:

```text
feat: add unpaid leave deduction preview
feat: create payroll readiness dashboard
fix: preserve leave form after validation error
refactor: move mock payroll data into service layer
```

## Contributing

1. Create a feature branch.
2. Implement and test the feature.
3. Commit with a meaningful message.
4. Push the branch.
5. Open a pull request.
6. Request review from another team member.
7. Merge after review and conflict resolution.

## Roadmap

- [x] Define roles and module access
- [x] Design employee and payroll workflows
- [x] Add leave salary-impact experience
- [x] Define Payroll Readiness and Impact Simulator
- [ ] Complete responsive frontend implementation
- [ ] Connect Odoo backend services
- [ ] Integrate attendance-device events
- [ ] Add secure face verification
- [ ] Generate real payslip PDFs
- [ ] Add email delivery
- [ ] Add automated tests and deployment workflow

Update the roadmap checkboxes to match the repository's actual implementation before submission.

## Team

Add the final team information here:

| Member | Responsibility |
|---|---|
| Team Member 1 | Project lead and integration |
| Team Member 2 | Employee and attendance experience |
| Team Member 3 | Leave and HR workflows |
| Team Member 4 | Payroll and salary explanation |
| Team Member 5 | Dashboards and reports |
| Team Member 6 | Testing, documentation, and demo |

## Hackathon

Developed for **Odoo Hackathon 2026** under the **PeoplePay360 HR & Payroll** problem statement.

## License

Add the license selected by the team before public distribution. If no license is included, the repository remains protected by default copyright rules.

---

**PeoplePay360 — Accurate payroll. Clear explanations. Confident decisions.**
