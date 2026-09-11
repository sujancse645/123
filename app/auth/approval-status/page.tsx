'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CheckCircle2, Clock, ShieldCheck, LogOut, ArrowRight, AlertTriangle, RefreshCw } from 'lucide-react';
import { PeoplePayLogo } from '@/components/brand/PeoplePayLogo';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

export default function ApprovalStatusPage() {
  const router = useRouter();
  const [employee, setEmployee] = React.useState<{
    id: string;
    fullName: string;
    employeeCode: string;
    companyEmail: string;
    accountStatus: string;
    submittedAt: string | null;
    correctionReason?: string | null;
  } | null>(null);

  const [loading, setLoading] = React.useState(true);

  const checkStatus = React.useCallback(async () => {
    const client = getSupabaseBrowserClient();
    if (!client) return;

    const { data: { user } } = await client.auth.getUser();
    if (!user) {
      router.replace('/');
      return;
    }

    const { data } = await client
      .from('employees')
      .select('id, full_name, employee_code, company_email, account_status, onboarding_submitted_at, onboarding_correction_reason')
      .eq('user_id', user.id)
      .maybeSingle();

    if (data) {
      const emp = data as any;
      setEmployee({
        id: emp.id,
        fullName: emp.full_name,
        employeeCode: emp.employee_code,
        companyEmail: emp.company_email,
        accountStatus: emp.account_status ?? 'pending_hr_approval',
        submittedAt: emp.onboarding_submitted_at,
        correctionReason: emp.onboarding_correction_reason,
      });

      if (emp.account_status === 'approved') {
        // Safe redirect to dashboard if approved
      }
    }
    setLoading(false);
  }, [router]);

  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    checkStatus();
    // Safe polling every 4 seconds to listen for HR approval
    const interval = setInterval(checkStatus, 4000);
    return () => clearInterval(interval);
  }, [checkStatus]);

  const signOut = async () => {
    const client = getSupabaseBrowserClient();
    if (client) {
      await client.auth.signOut();
    }
    router.replace('/');
  };

  const isApproved = employee?.accountStatus === 'approved';
  const isCorrection = employee?.accountStatus === 'correction_required';

  return (
    <div className="min-h-screen bg-[#F8F6F8] flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-xl bg-white rounded-[24px] border border-[#E4E1E5] shadow-xl p-8 space-y-6">
        <div className="flex justify-between items-center border-b border-[#E4E1E5] pb-4">
          <div className="flex items-center gap-3">
            <PeoplePayLogo size={40} />
            <div>
              <h1 className="text-lg font-bold text-[#28262D]">Onboarding Status</h1>
              <p className="text-xs text-[#74717A]">PeoplePay360 Employee Verification Portal</p>
            </div>
          </div>
          <button
            onClick={signOut}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-[#E4E1E5] hover:bg-[#F3EEF2] rounded-[8px] text-xs font-semibold text-[#74717A]"
          >
            <LogOut className="w-3.5 h-3.5" /> Sign Out
          </button>
        </div>

        {loading ? (
          <div className="py-12 text-center text-xs text-[#74717A] flex items-center justify-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin text-[#714B67]" /> Fetching verification status…
          </div>
        ) : (
          <>
            {/* Status Banner */}
            {isApproved ? (
              <div className="p-4 bg-[#EBF5F0] border border-[#438A6B]/30 rounded-[16px] text-center space-y-2">
                <div className="w-12 h-12 bg-[#438A6B] text-white rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-7 h-7" />
                </div>
                <h2 className="font-bold text-lg text-[#28262D]">Account Verified & Approved</h2>
                <p className="text-xs text-[#438A6B] font-medium">
                  Your onboarding request has been verified by HR. You now have full access to your employee workspace!
                </p>
              </div>
            ) : isCorrection ? (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-[16px] space-y-2">
                <div className="flex items-center gap-2 font-bold text-amber-800 text-sm">
                  <AlertTriangle className="w-5 h-5 text-amber-600" /> HR Requested Corrections
                </div>
                <p className="text-xs text-amber-700">
                  {employee?.correctionReason ?? 'HR requested updates to your submitted onboarding details.'}
                </p>
                <Link
                  href="/auth/complete-profile?mode=correction"
                  className="inline-block mt-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-[9px] font-bold text-xs"
                >
                  Edit & Resubmit Details
                </Link>
              </div>
            ) : (
              <div className="p-4 bg-[#F3EEF2] border border-[#714B67]/20 rounded-[16px] text-center space-y-2">
                <div className="w-12 h-12 bg-[#714B67] text-white rounded-full flex items-center justify-center mx-auto">
                  <Clock className="w-6 h-6 animate-pulse" />
                </div>
                <h2 className="font-bold text-base text-[#28262D]">HR Verification Pending</h2>
                <p className="text-xs text-[#74717A]">
                  Your personal, bank, and statutory information has been submitted. HR is currently reviewing your profile.
                </p>
              </div>
            )}

            {/* Lifecycle Stepper */}
            <div className="p-5 bg-[#FAF8FA] border border-[#E4E1E5] rounded-[16px] space-y-3">
              <h3 className="font-bold text-xs text-[#28262D] uppercase tracking-wider">Verification Steps</h3>
              <div className="space-y-2 text-xs">
                <div className="flex items-center gap-3 text-[#438A6B] font-medium">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>Account Created & Assigned</span>
                </div>
                <div className="flex items-center gap-3 text-[#438A6B] font-medium">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>Organization Email Verified</span>
                </div>
                <div className="flex items-center gap-3 text-[#438A6B] font-medium">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>Password Reset Completed</span>
                </div>
                <div className="flex items-center gap-3 text-[#438A6B] font-medium">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>Profile & Bank Details Submitted</span>
                </div>
                <div
                  className={`flex items-center gap-3 font-semibold ${
                    isApproved ? 'text-[#438A6B]' : 'text-[#714B67]'
                  }`}
                >
                  {isApproved ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                  ) : (
                    <Clock className="w-4 h-4 shrink-0 animate-spin" />
                  )}
                  <span>HR Manager Review & Verification</span>
                </div>
              </div>
            </div>

            {/* Employee Metadata */}
            {employee && (
              <div className="grid grid-cols-2 gap-3 text-xs p-4 bg-white border border-[#E4E1E5] rounded-[14px]">
                <div>
                  <span className="text-[#74717A]">Employee Name:</span>
                  <p className="font-bold text-[#28262D]">{employee.fullName}</p>
                </div>
                <div>
                  <span className="text-[#74717A]">Employee ID:</span>
                  <p className="font-bold text-[#28262D]">{employee.employeeCode}</p>
                </div>
                <div>
                  <span className="text-[#74717A]">Organization Email:</span>
                  <p className="font-bold text-[#28262D] truncate">{employee.companyEmail}</p>
                </div>
                <div>
                  <span className="text-[#74717A]">Submitted On:</span>
                  <p className="font-bold text-[#28262D]">
                    {employee.submittedAt ? new Date(employee.submittedAt).toLocaleDateString('en-IN') : 'Recently'}
                  </p>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            {isApproved ? (
              <Link
                href="/dashboard"
                className="w-full py-3 bg-[#714B67] hover:bg-[#5A3B52] text-white rounded-[12px] font-bold text-sm flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all"
              >
                Continue to Employee Dashboard <ArrowRight className="w-4 h-4" />
              </Link>
            ) : (
              <div className="text-center pt-2">
                <p className="text-[11px] text-[#74717A]">
                  Need urgent assistance? Contact HR at <a href="mailto:sri7685234360.test" className="text-[#714B67] underline font-semibold">sri7685234360.test</a>
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
