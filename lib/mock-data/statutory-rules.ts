import { StatutoryContributionRule } from '@/lib/types';

/**
 * Statutory PF contribution rules configuration.
 * Kept entirely inside mock configuration rather than hardcoded in components.
 */
export const STATUTORY_PF_RULES: StatutoryContributionRule[] = [
  {
    id: 'rule-stat-pf-2026',
    name: 'India PF Policy — Effective April 2026',
    country: 'IN',
    contributionType: 'PF',
    employeeRate: 0.12, // 12%
    employerRate: 0.12, // 12%
    wageBasis: 'PF Eligible Wages (Basic + DA capped at ceiling)',
    wageCeiling: 15000,
    effectiveFrom: '2026-04-01',
    version: 'v2026.1',
    status: 'active',
    description:
      'Statutory employee and employer retirement savings contribution under EPF & MP Act 1952. 12% on Basic up to ₹15,000 statutory limit.',
    affectedEmployeesCount: 142,
    eligibilityWageThreshold: 15000,
  },
  {
    id: 'rule-stat-pf-2027-sched',
    name: 'India PF Wage Ceiling Revision — FY 2027',
    country: 'IN',
    contributionType: 'PF',
    employeeRate: 0.12,
    employerRate: 0.12,
    wageBasis: 'PF Eligible Wages (Basic + DA capped at ₹21,000 proposed ceiling)',
    wageCeiling: 21000,
    effectiveFrom: '2027-04-01',
    version: 'v2027.0-Draft',
    status: 'scheduled',
    description:
      'Proposed Ministry of Labour & Employment wage threshold enhancement from ₹15,000 to ₹21,000.',
    affectedEmployeesCount: 142,
    eligibilityWageThreshold: 21000,
  },
  {
    id: 'rule-stat-pf-2024-exp',
    name: 'India PF Policy — Historical FY24-25',
    country: 'IN',
    contributionType: 'PF',
    employeeRate: 0.12,
    employerRate: 0.12,
    wageBasis: 'Basic Pay',
    wageCeiling: 15000,
    effectiveFrom: '2024-04-01',
    effectiveTo: '2026-03-31',
    version: 'v2024.3',
    status: 'expired',
    description: 'Archived legacy PF calculation schedule.',
    affectedEmployeesCount: 130,
  },
];

/**
 * Calculates statutory PF breakdown based on current active rule
 */
export function calculateStatutoryPF(
  basicSalary: number,
  rule: StatutoryContributionRule = STATUTORY_PF_RULES[0]
) {
  const applicableWage = rule.wageCeiling
    ? Math.min(basicSalary, rule.wageCeiling)
    : basicSalary;

  const employeeContribution = Math.round(applicableWage * rule.employeeRate);
  const employerContribution = Math.round(applicableWage * rule.employerRate);

  // Breakdown of employer contribution:
  // EPS (Pension Fund): 8.33% (up to 1,250)
  // EPF (Provident Fund): Balance (approx 3.67% or ₹550)
  const employerEPS = Math.min(Math.round(applicableWage * 0.0833), 1250);
  const employerEPF = employerContribution - employerEPS;

  return {
    rule,
    applicableWage,
    isCappedByCeiling: rule.wageCeiling ? basicSalary > rule.wageCeiling : false,
    employeeContribution,
    employerContribution,
    employerEPS,
    employerEPF,
    formulaExplanation: `Min(Basic Salary ₹${basicSalary.toLocaleString('en-IN')}, Statutory Ceiling ₹${(rule.wageCeiling ?? 15000).toLocaleString('en-IN')}) × ${rule.employeeRate * 100}% = ₹${employeeContribution.toLocaleString('en-IN')}`,
  };
}
