import { Check } from 'lucide-react';
import { PeoplePayLogo } from '@/components/brand/PeoplePayLogo';

export function LoginTransition() {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-[#FBFAFB]" role="status" aria-live="polite" aria-label="Login successful. Opening your workspace.">
      <div className="flex flex-col items-center text-center">
        <div className="login-loader relative grid h-24 w-24 place-items-center">
          <span className="login-loader-ring absolute inset-0 rounded-full border-2 border-[#E4E1E5]" />
          <span className="login-loader-ring login-loader-ring-delayed absolute inset-2 rounded-full border-2 border-[#714B67]/25" />
          <PeoplePayLogo size={42} />
          <span className="absolute -right-1 bottom-1 grid h-7 w-7 place-items-center rounded-full bg-[#438A6B] text-white shadow-md"><Check className="h-4 w-4" /></span>
        </div>
        <h1 className="mt-6 text-2xl font-semibold text-[#28262D]">Welcome back</h1>
        <p className="mt-1 text-sm text-[#74717A]">Preparing your PeoplePay360 workspace…</p>
        <span className="mt-5 h-1 w-44 overflow-hidden rounded-full bg-[#E4E1E5]" aria-hidden="true"><span className="login-progress block h-full rounded-full bg-[#714B67]" /></span>
      </div>
    </div>
  );
}
