import { StatutoryContributionRule } from '@/lib/types';
import { STATUTORY_PF_RULES, calculateStatutoryPF } from '@/lib/mock-data/statutory-rules';

/**
 * Service abstraction for Statutory Contribution Rules (PF, etc.)
 */
class StatutoryRuleService {
  private rules: StatutoryContributionRule[] = [...STATUTORY_PF_RULES];

  async getActivePFRule(): Promise<StatutoryContributionRule | undefined> {
    return this.rules.find((r) => r.contributionType === 'PF' && r.status === 'active');
  }

  async getAllPFRules(): Promise<StatutoryContributionRule[]> {
    return this.rules.filter((r) => r.contributionType === 'PF');
  }

  async calculatePFBreakdown(basicSalary: number) {
    const activeRule = await this.getActivePFRule();
    if (!activeRule) {
      throw new Error('No active statutory Provident Fund rule configured');
    }
    return calculateStatutoryPF(basicSalary, activeRule);
  }
}

export const statutoryRuleService = new StatutoryRuleService();
