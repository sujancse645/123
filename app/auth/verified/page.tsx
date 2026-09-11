'use client';

import React from 'react';
import Link from 'next/link';
import { CheckCircle2, ArrowRight, ShieldCheck } from 'lucide-react';
import { PeoplePayLogo } from '@/components/brand/PeoplePayLogo';

export default function EmailVerifiedPage() {
  return (
    <div className="min-h-screen bg-[#F8F6F8] flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md bg-white rounded-[24px] border border-[#E4E1E5] shadow-xl p-8 text-center space-y-6">
        <div className="flex justify-center mb-2">
          <PeoplePayLogo size={44} />
        </div>

        <div className="w-16 h-16 bg-[#EBF5F0] rounded-full flex items-center justify-center mx-auto text-[#438A6B]">
          <CheckCircle2 className="w-10 h-10" />
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-[#28262D]">Email Verified Successfully</h1>
          <p className="text-sm text-[#74717A]">
            Your organization email has been verified. You can now sign in using your organization email and temporary password provided by HR.
          </p>
        </div>

        <div className="p-4 bg-[#F3EEF2] rounded-[14px] text-xs text-left space-y-2 text-[#3D3940]">
          <div className="flex items-center gap-2 font-semibold text-[#714B67]">
            <ShieldCheck className="w-4 h-4" /> Next Step: First-Login Password Reset
          </div>
          <p className="text-[#74717A]">
            When you sign in for the first time, you will be prompted to replace your temporary password with a secure personal password.
          </p>
        </div>

        <Link
          href="/"
          className="w-full py-3 px-6 bg-[#714B67] hover:bg-[#5A3B52] text-white rounded-[12px] font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-md hover:shadow-lg"
        >
          Continue to Sign In <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}
