'use client';

import React from 'react';
import Link from 'next/link';
import { Mail, CheckCircle2, ExternalLink, ArrowLeft, RefreshCw, Clock, ShieldAlert } from 'lucide-react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

type EmailRecord = {
  id: string;
  recipient_email: string;
  cc_emails: string[];
  subject: string;
  safe_html_body: string;
  delivery_status: string;
  action_url: string | null;
  created_at: string;
  opened_at: string | null;
};

export default function DemoMailboxPage() {
  const [emails, setEmails] = React.useState<EmailRecord[]>([]);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error,setError]=React.useState('');

  const fetchEmails = React.useCallback(async () => {
    setLoading(true);
    setError('');
    const client = getSupabaseBrowserClient();
    if (client) {
      const { data,error:queryError } = await client
        .from('demo_email_outbox')
        .select('*')
        .order('created_at', { ascending: false });
      if(queryError)setError(queryError.message);
      if (data && data.length > 0) {
        setEmails(data as EmailRecord[]);
        setSelectedId((prev) => prev ?? data[0].id);
      }
    }
    setLoading(false);
  }, []);

  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchEmails();
  }, [fetchEmails]);

  const selectedEmail = emails.find((e) => e.id === selectedId) ?? emails[0];

  return (
    <div className="min-h-screen bg-[#F8F6F8] flex flex-col">
      {/* Top Banner */}
      <header className="bg-[#714B67] text-white px-6 py-4 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-3">
          <div className="px-2.5 py-1 bg-amber-400 text-slate-900 rounded font-bold text-xs uppercase tracking-wider">
            Prototype Demo Mailbox
          </div>
          <h1 className="font-bold text-lg">Simulated Outbox</h1>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <button
            onClick={fetchEmails}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-[8px] transition-all font-semibold"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Refresh Inbox
          </button>
          <Link
            href="/"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-[8px] transition-all font-semibold"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to App
          </Link>
        </div>
      </header>

      {/* Main Mailbox Interface */}
      <div className="flex-1 flex max-w-7xl w-full mx-auto p-6 gap-6 overflow-hidden">
        {/* Email List Sidebar */}
        <div className="w-1/3 bg-white rounded-[18px] border border-[#E4E1E5] shadow-sm flex flex-col overflow-hidden">
          <div className="p-4 border-b border-[#E4E1E5] flex justify-between items-center bg-[#FAF8FA]">
            <span className="font-bold text-sm text-[#28262D]">Messages ({emails.length})</span>
            <span className="text-xs text-[#74717A]">Realtime Outbox</span>
          </div>
          <div className="flex-1 overflow-y-auto divide-y divide-[#E4E1E5]">
            {loading ? (
              <div className="p-6 text-center text-xs text-[#74717A]">Loading mailbox...</div>
            ) : emails.length === 0 ? (
              <div className="p-6 text-center text-xs text-[#74717A]">
                {error?<><ShieldAlert className="mx-auto mb-2 h-5 w-5 text-[#C85A54]"/><span className="text-[#9D3E39]">Mailbox unavailable: {error}</span></>:'No emails sent yet. Create an employee account from HR Manager view to generate an invitation email.'}
              </div>
            ) : (
              emails.map((email) => (
                <button
                  key={email.id}
                  onClick={() => setSelectedId(email.id)}
                  className={`w-full text-left p-4 transition-colors flex flex-col gap-1.5 ${
                    selectedId === email.id ? 'bg-[#F3EEF2] border-l-4 border-[#714B67]' : 'hover:bg-[#FAF8FA]'
                  }`}
                >
                  <div className="flex justify-between items-start w-full">
                    <span className="font-bold text-xs text-[#28262D] truncate max-w-[180px]">
                      {email.recipient_email}
                    </span>
                    <span className="text-[10px] text-[#74717A] flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(email.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div className="text-xs font-semibold text-[#3D3940] truncate">{email.subject}</div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#EBF5F0] text-[#438A6B]">
                      {email.delivery_status}
                    </span>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Email Viewer Panel */}
        <div className="flex-1 bg-white rounded-[18px] border border-[#E4E1E5] shadow-sm flex flex-col overflow-hidden">
          {selectedEmail ? (
            <div className="flex-1 flex flex-col overflow-y-auto">
              <div className="p-6 border-b border-[#E4E1E5] bg-[#FAF8FA] space-y-3">
                <div className="flex justify-between items-start">
                  <h2 className="text-lg font-bold text-[#28262D]">{selectedEmail.subject}</h2>
                  <span className="text-xs text-[#74717A]">
                    {new Date(selectedEmail.created_at).toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="text-xs space-y-1 text-[#3D3940]">
                  <div>
                    <span className="text-[#74717A]">To:</span> <strong>{selectedEmail.recipient_email}</strong>
                  </div>
                  {selectedEmail.cc_emails && selectedEmail.cc_emails.length > 0 && (
                    <div>
                      <span className="text-[#74717A]">CC:</span> {selectedEmail.cc_emails.join(', ')}
                    </div>
                  )}
                  <div>
                    <span className="text-[#74717A]">From:</span> PeoplePay360 HR Automation System &lt;no-reply@peoplepay360.test&gt;
                  </div>
                </div>
              </div>

              {/* Action Link Highlight Box */}
              {selectedEmail.action_url && (
                <div className="m-6 p-4 bg-[#F3EEF2] border border-[#714B67]/20 rounded-[14px] flex items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="text-xs font-bold text-[#714B67] flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-[#438A6B]" /> Verification Action Required
                    </div>
                    <p className="text-xs text-[#74717A]">
                      Clicking the button will trigger the Supabase Auth email verification callback.
                    </p>
                  </div>
                  <a
                    href={selectedEmail.action_url}
                    className="px-5 py-2.5 bg-[#714B67] hover:bg-[#5A3B52] text-white rounded-[10px] font-bold text-xs flex items-center gap-2 shadow-sm hover:shadow transition-all whitespace-nowrap"
                  >
                    Verify Email <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              )}

              {/* HTML Body Render */}
              <div className="p-6 prose text-xs max-w-none">
                <div dangerouslySetInnerHTML={{ __html: selectedEmail.safe_html_body }} />
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col justify-center items-center p-8 text-center text-[#74717A]">
              <Mail className="w-12 h-12 stroke-[1.5] text-[#A29FA6] mb-3" />
              <p className="font-semibold text-sm">Select an email to inspect</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
