'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Play, Mail, ShieldCheck, UserCheck, RefreshCw, X, ChevronUp, ChevronDown, Key } from 'lucide-react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

export function DemoSimulationControls() {
  const [collapsed, setCollapsed] = useState(false);
  const [stage, setStage] = useState<string>('Initializing');
  const [latestEmployee, setLatestEmployee] = useState<{
    fullName: string;
    orgEmail: string;
    accountStatus: string;
  } | null>(null);

  const fetchCurrentStage = async () => {
    const client = getSupabaseBrowserClient();
    if (!client) return;

    const { data } = await client
      .from('employees')
      .select('full_name, company_email, account_status, onboarding_status')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (data) {
      setLatestEmployee({
        fullName: data.full_name,
        orgEmail: data.company_email,
        accountStatus: data.account_status ?? data.onboarding_status ?? 'invited',
      });
      setStage(data.account_status ?? data.onboarding_status ?? 'invited');
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchCurrentStage();
    const interval = setInterval(fetchCurrentStage, 4000);
    return () => clearInterval(interval);
  }, []);

  const isDemo = process.env.NEXT_PUBLIC_DEMO_MODE === 'true' || process.env.NODE_ENV === 'development';
  if (!isDemo) return null;

  return (
    <aside
      aria-label="Demo simulation panel"
      className="fixed bottom-4 right-4 z-50 bg-[#28262D] text-white rounded-[16px] border border-white/10 shadow-2xl overflow-hidden max-w-sm transition-all"
    >
      <div className="px-4 py-2.5 bg-[#714B67] flex items-center justify-between font-bold text-xs">
        <div className="flex items-center gap-2">
          <Play className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
          <span>Demo Lifecycle Simulation</span>
        </div>
        <button onClick={() => setCollapsed(!collapsed)} aria-label="Toggle panel" className="hover:bg-white/10 p-1 rounded">
          {collapsed ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {!collapsed && (
        <div className="p-4 space-y-3 text-xs">
          {/* Current Stage Indicator */}
          <div className="p-2.5 bg-white/5 rounded-[10px] border border-white/10 space-y-1">
            <div className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">Active Employee Stage</div>
            {latestEmployee ? (
              <div>
                <div className="font-bold text-amber-300 truncate">{latestEmployee.fullName}</div>
                <div className="text-[11px] text-gray-300 font-mono truncate">{latestEmployee.orgEmail}</div>
                <div className="inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-bold bg-[#714B67] text-white">
                  Stage: {stage}
                </div>
              </div>
            ) : (
              <p className="text-[11px] text-gray-400">No active employee being simulated.</p>
            )}
          </div>

          {/* Quick Shortcuts */}
          <div className="space-y-1.5 pt-1">
            <div className="text-[10px] text-gray-400 uppercase font-semibold">Quick Stage Shortcuts</div>

            <Link
              href="/demo/mailbox"
              target="_blank"
              className="w-full flex items-center justify-between p-2 rounded-[8px] bg-white/5 hover:bg-white/10 transition-colors text-white"
            >
              <span className="flex items-center gap-2 font-medium">
                <Mail className="w-3.5 h-3.5 text-amber-400" /> Open Demo Mailbox
              </span>
              <span className="text-[10px] text-gray-400">/demo/mailbox</span>
            </Link>

            <Link
              href="/auth/verified"
              className="w-full flex items-center justify-between p-2 rounded-[8px] bg-white/5 hover:bg-white/10 transition-colors text-white"
            >
              <span className="flex items-center gap-2 font-medium">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> View Verification Screen
              </span>
              <span className="text-[10px] text-gray-400">/auth/verified</span>
            </Link>

            <Link
              href="/auth/approval-status"
              className="w-full flex items-center justify-between p-2 rounded-[8px] bg-white/5 hover:bg-white/10 transition-colors text-white"
            >
              <span className="flex items-center gap-2 font-medium">
                <UserCheck className="w-3.5 h-3.5 text-sky-400" /> Approval Status Tracker
              </span>
              <span className="text-[10px] text-gray-400">/auth/approval-status</span>
            </Link>

            <Link
              href="/dashboard?view=approvals"
              className="w-full flex items-center justify-between p-2 rounded-[8px] bg-white/5 hover:bg-white/10 transition-colors text-white"
            >
              <span className="flex items-center gap-2 font-medium">
                <UserCheck className="w-3.5 h-3.5 text-purple-400" /> HR Onboarding Approvals
              </span>
              <span className="text-[10px] text-gray-400">HR View</span>
            </Link>
          </div>
        </div>
      )}
    </aside>
  );
}
