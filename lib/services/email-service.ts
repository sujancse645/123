import { createServiceRoleClient } from '@/lib/supabase/server';

export interface EmailParams {
  companyId: string;
  recipientEmail: string;
  ccEmails?: string[];
  subject: string;
  safeHtmlBody: string;
  emailType?: string;
  actionUrl?: string;
  createdBy?: string;
}

export interface EmailResult {
  success: boolean;
  messageId?: string;
  provider: 'demo' | 'webhook' | 'smtp';
  failureReason?: string;
}

export class EmailService {
  /**
   * Send an email using either the Demo Mailbox provider or an external email provider webhook.
   */
  static async sendEmail(params: EmailParams): Promise<EmailResult> {
    const provider = process.env.EMAIL_PROVIDER ?? 'demo';
    const isDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE === 'true' || provider === 'demo' || provider === 'console';

    const service = createServiceRoleClient();

    // 1. Record in demo_email_outbox for UI visibility if demo mode is active
    if (isDemoMode) {
      try {
        const {error}=await service.from('demo_email_outbox').insert({
          company_id: params.companyId,
          recipient_email: params.recipientEmail,
          cc_emails: params.ccEmails ?? [],
          subject: params.subject,
          safe_html_body: params.safeHtmlBody,
          email_type: params.emailType ?? 'account_invitation',
          delivery_status: 'delivered',
          action_url: params.actionUrl,
          created_by: params.createdBy,
        });
        if(error)throw error;
      } catch (err) {
        console.error('Failed to log email to demo_email_outbox:', err);
        return {success:false,provider:'demo',failureReason:err instanceof Error?err.message:'Demo mailbox is not installed'};
      }
    }

    // 2. Check for real webhook/SMTP provider configuration
    const webhookUrl = process.env.EMAIL_DELIVERY_WEBHOOK_URL;
    if (webhookUrl && provider !== 'demo') {
      try {
        const response = await fetch(webhookUrl, {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            authorization: `Bearer ${process.env.EMAIL_DELIVERY_WEBHOOK_SECRET ?? ''}`,
          },
          body: JSON.stringify(params),
        });

        if (!response.ok) {
          const failureReason = (await response.text()).slice(0, 500);
          return {
            success: false,
            provider: 'webhook',
            failureReason: `Email provider error (${response.status}): ${failureReason}`,
          };
        }

        const data = (await response.json()) as { messageId?: string };
        return {
          success: true,
          provider: 'webhook',
          messageId: data.messageId ?? `msg_${Date.now()}`,
        };
      } catch (err) {
        return {
          success: false,
          provider: 'webhook',
          failureReason: err instanceof Error ? err.message : 'Webhook delivery failed',
        };
      }
    }

    // Default: Demo mode delivery
    return {
      success: true,
      provider: 'demo',
      messageId: `demo_msg_${Date.now()}`,
    };
  }
}
