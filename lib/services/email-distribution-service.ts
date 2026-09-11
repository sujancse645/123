import { EmailDistributionJob, EmailRecipientResult } from '@/lib/types';
import { INITIAL_EMAIL_JOB, generateMockEmailRecipients } from '@/lib/mock-data/email-jobs';

/**
 * Service abstraction for Bulk Payslip Email Distribution
 */
class EmailDistributionService {
  private currentJob: EmailDistributionJob = { ...INITIAL_EMAIL_JOB };

  async getCurrentJob(): Promise<EmailDistributionJob> {
    return { ...this.currentJob };
  }

  async startDistribution(
    recipients: EmailRecipientResult[],
    subject: string,
    payrunName: string
  ): Promise<EmailDistributionJob> {
    const job: EmailDistributionJob = {
      id: `job-${Date.now()}`,
      payrunId: 'pr-202608',
      payrunName,
      period: '01 Aug 2026 – 31 Aug 2026',
      subject,
      templateName: 'Standard Corporate Payslip (HTML + Password Protected PDF)',
      totalSelected: recipients.length,
      queuedCount: 0,
      sendingCount: 0,
      successfullySent: Math.floor(recipients.length * 0.75),
      failedCount: recipients.length - Math.floor(recipients.length * 0.75),
      pendingCount: 0,
      progressPercentage: 100,
      elapsedSeconds: Math.round(recipients.length * 0.12),
      status: 'completed_with_errors',
      recipients,
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
    };
    this.currentJob = job;
    return job;
  }

  async retryFailedOnly(): Promise<{
    retriedCount: number;
    succeededCount: number;
    stillFailedCount: number;
    job: EmailDistributionJob;
  }> {
    const failed = this.currentJob.recipients.filter((r) => r.status === 'failed');
    const retriedCount = failed.length;

    // Simulate 84% recovery on retry (e.g. 50 failures -> 42 succeeded, 8 still failed)
    const succeededCount = Math.floor(retriedCount * 0.84);
    const stillFailedCount = retriedCount - succeededCount;

    let successCounter = 0;
    const updatedRecipients = this.currentJob.recipients.map((r) => {
      if (r.status === 'failed') {
        if (successCounter < succeededCount) {
          successCounter++;
          return {
            ...r,
            status: 'sent' as const,
            retryStatus: 'succeeded' as const,
            attemptCount: r.attemptCount + 1,
            lastAttemptTime: 'Just now (Retry #2)',
            failureReason: undefined,
            failureMessage: undefined,
          };
        } else {
          return {
            ...r,
            status: 'failed' as const,
            retryStatus: 'still_failed' as const,
            attemptCount: r.attemptCount + 1,
            lastAttemptTime: 'Just now (Retry #2)',
            failureMessage: 'Relay unreachable after secondary fallback dispatch',
          };
        }
      }
      return r;
    });

    const updatedJob: EmailDistributionJob = {
      ...this.currentJob,
      successfullySent: this.currentJob.successfullySent + succeededCount,
      failedCount: stillFailedCount,
      recipients: updatedRecipients,
      status: stillFailedCount === 0 ? 'completed' : 'completed_with_errors',
    };

    this.currentJob = updatedJob;

    return {
      retriedCount,
      succeededCount,
      stillFailedCount,
      job: updatedJob,
    };
  }
}

export const emailDistributionService = new EmailDistributionService();
