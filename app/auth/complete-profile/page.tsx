'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import {
  User,
  CreditCard,
  Briefcase,
  CheckCircle,
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
  Building,
  Upload,
  Calendar,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { PeoplePayLogo } from '@/components/brand/PeoplePayLogo';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

export default function CompleteProfilePage() {
  const router = useRouter();
  const [step, setStep] = React.useState<1 | 2 | 3 | 4>(1);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState('');

  const [employeeDetails, setEmployeeDetails] = React.useState<{
    employeeCode: string;
    companyEmail: string;
    companyName: string;
    departmentName: string;
    positionTitle: string;
    employmentCategory: string;
    joiningDate: string;
    workLocation: string;
    applicationRole: string;
  } | null>(null);

  // Form State
  const [form, setForm] = React.useState({
    fullName: '',
    dateOfBirth: '2000-01-01',
    phone: '+91 ',
    personalEmail: '',
    street: '',
    city: '',
    state: '',
    postalCode: '',
    emergencyName: '',
    emergencyRelation: 'Parent',
    emergencyPhone: '+91 ',
    accountHolderName: '',
    bankName: '',
    accountNumber: '',
    confirmAccountNumber: '',
    ifscCode: '',
    pan: '',
    uan: '',
    paymentMethod: 'bank_transfer',
    consentAgreed: false,
    profilePhotoPath: '',
  });

  // Calculate Age automatically from DOB
  const calculateAge = (dobString: string): number => {
    if (!dobString) return 0;
    const dob = new Date(dobString);
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const m = today.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
      age--;
    }
    return age > 0 ? age : 0;
  };

  React.useEffect(() => {
    const client = getSupabaseBrowserClient();
    if (!client) return;

    client.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        router.replace('/');
        return;
      }
      setForm((prev) => ({
        ...prev,
        fullName: user.user_metadata?.full_name ?? '',
        personalEmail: user.user_metadata?.personal_email ?? user.email ?? '',
        accountHolderName: user.user_metadata?.full_name ?? '',
      }));

      // Fetch employee & department & job position details
      client
        .from('employees')
        .select(`
          employee_code, company_email, joining_date,
          companies(name), departments(name), job_positions(title)
        `)
        .eq('user_id', user.id)
        .maybeSingle()
        .then(({ data }) => {
          if (data) {
            const emp = data as any;
            setEmployeeDetails({
              employeeCode: emp.employee_code ?? 'EMP-NEW',
              companyEmail: emp.company_email ?? user.email,
              companyName: emp.companies?.name ?? 'PeoplePay360',
              departmentName: emp.departments?.name ?? 'Engineering',
              positionTitle: emp.job_positions?.title ?? 'Software Engineer',
              employmentCategory: 'full_time',
              joiningDate: emp.joining_date ?? new Date().toISOString().slice(0, 10),
              workLocation: 'Headquarters',
              applicationRole: 'Employee',
            });
          }
        });
    });
  }, [router]);

  const handleSubmit = async () => {
    setError('');
    if (!form.consentAgreed) {
      setError('You must accept the bank account verification consent checkbox.');
      return;
    }

    setSubmitting(true);

    try {
      const client = getSupabaseBrowserClient();
      if (!client) throw new Error('Supabase client is not configured');

      const { data: { session } } = await client.auth.getSession();
      if (!session) throw new Error('Session expired');

      const response = await fetch('/api/onboarding', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          fullName: form.fullName,
          dateOfBirth: form.dateOfBirth,
          phone: form.phone,
          personalEmail: form.personalEmail,
          address: {
            street: form.street,
            city: form.city,
            state: form.state,
            postalCode: form.postalCode,
          },
          emergencyContact: {
            name: form.emergencyName,
            relation: form.emergencyRelation,
            phone: form.emergencyPhone,
          },
          accountHolderName: form.accountHolderName,
          bankName: form.bankName,
          accountNumber: form.accountNumber,
          confirmAccountNumber: form.confirmAccountNumber,
          ifscCode: form.ifscCode.toUpperCase(),
          pan: form.pan.toUpperCase(),
          uan: form.uan ? form.uan : undefined,
          profilePhotoPath: form.profilePhotoPath,
          consentAgreed: form.consentAgreed,
        }),
      });

      const body = await response.json();
      if (!response.ok) throw new Error(body.error?.message ?? 'Onboarding submission failed');

      router.replace('/auth/approval-status');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Submission failed');
      setSubmitting(false);
    }
  };

  const inputClass =
    'w-full mt-1 px-3.5 py-2.5 rounded-[10px] border border-[#E4E1E5] text-xs outline-none focus:border-[#714B67] bg-white text-[#28262D]';

  return (
    <div className="min-h-screen bg-[#F8F6F8] py-8 px-4 flex flex-col items-center">
      <div className="w-full max-w-3xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between bg-white rounded-[20px] border border-[#E4E1E5] p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <PeoplePayLogo size={40} />
            <div>
              <h1 className="text-lg font-bold text-[#28262D]">Employee Profile Onboarding</h1>
              <p className="text-xs text-[#74717A]">Complete your personal, statutory, and bank details for HR review.</p>
            </div>
          </div>
        </div>

        {/* Multi-step Stepper */}
        <div className="bg-white rounded-[18px] border border-[#E4E1E5] p-4 shadow-sm grid grid-cols-4 gap-2 text-center text-xs">
          {[
            { num: 1, label: 'Personal', icon: User },
            { num: 2, label: 'Bank & Statutory', icon: CreditCard },
            { num: 3, label: 'Employment (Read Only)', icon: Briefcase },
            { num: 4, label: 'Review & Submit', icon: CheckCircle },
          ].map((s) => {
            const Icon = s.icon;
            const active = step === s.num;
            const completed = step > s.num;
            return (
              <button
                key={s.num}
                type="button"
                onClick={() => (completed ? setStep(s.num as any) : null)}
                className={`p-3 rounded-[12px] flex flex-col items-center gap-1.5 transition-all ${
                  active
                    ? 'bg-[#714B67] text-white font-bold shadow-sm'
                    : completed
                    ? 'bg-[#EBF5F0] text-[#438A6B] font-semibold hover:bg-[#D9EFE4]'
                    : 'bg-[#FAF8FA] text-[#74717A]'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="text-[11px] hidden sm:inline">{s.label}</span>
              </button>
            );
          })}
        </div>

        {error && (
          <div className="p-4 bg-[#FDF1F0] border border-[#C85A54]/30 rounded-[14px] text-xs text-[#C85A54] flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Step 1: Personal Details */}
        {step === 1 && (
          <div className="bg-white rounded-[20px] border border-[#E4E1E5] p-6 shadow-sm space-y-4">
            <h2 className="font-bold text-base text-[#28262D] border-b border-[#E4E1E5] pb-3">Step 1: Personal Information</h2>

            <div className="grid sm:grid-cols-2 gap-4 text-xs">
              <label className="block sm:col-span-2">
                Full Legal Name *
                <input required className={inputClass} value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
              </label>

              <label className="block">
                Date of Birth * (Age: {calculateAge(form.dateOfBirth)} yrs)
                <input
                  required
                  type="date"
                  className={inputClass}
                  value={form.dateOfBirth}
                  onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })}
                />
              </label>

              <label className="block">
                Phone Number *
                <input required className={inputClass} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </label>

              <label className="block sm:col-span-2">
                Personal Email *
                <input required type="email" className={inputClass} value={form.personalEmail} onChange={(e) => setForm({ ...form, personalEmail: e.target.value })} />
              </label>

              <label className="block sm:col-span-2">
                Residential Street Address *
                <input required className={inputClass} value={form.street} onChange={(e) => setForm({ ...form, street: e.target.value })} />
              </label>

              <label className="block">
                City *
                <input required className={inputClass} value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
              </label>

              <label className="block">
                State / Province *
                <input required className={inputClass} value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} />
              </label>

              <label className="block">
                Postal / ZIP Code *
                <input required className={inputClass} value={form.postalCode} onChange={(e) => setForm({ ...form, postalCode: e.target.value })} />
              </label>

              <div className="sm:col-span-2 pt-2 border-t border-[#E4E1E5] mt-2 space-y-3">
                <h3 className="font-bold text-[#714B67]">Emergency Contact</h3>
                <div className="grid sm:grid-cols-3 gap-3">
                  <label className="block">
                    Contact Name *
                    <input required className={inputClass} value={form.emergencyName} onChange={(e) => setForm({ ...form, emergencyName: e.target.value })} />
                  </label>
                  <label className="block">
                    Relationship *
                    <input required className={inputClass} value={form.emergencyRelation} onChange={(e) => setForm({ ...form, emergencyRelation: e.target.value })} />
                  </label>
                  <label className="block">
                    Emergency Phone *
                    <input required className={inputClass} value={form.emergencyPhone} onChange={(e) => setForm({ ...form, emergencyPhone: e.target.value })} />
                  </label>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-[#E4E1E5]">
              <button
                type="button"
                onClick={() => setStep(2)}
                disabled={!form.fullName || !form.phone || !form.personalEmail || !form.street}
                className="px-6 py-2.5 bg-[#714B67] hover:bg-[#5A3B52] text-white rounded-[10px] font-bold text-xs flex items-center gap-2 disabled:opacity-50"
              >
                Continue to Bank & Statutory <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Bank & Statutory Details */}
        {step === 2 && (
          <div className="bg-white rounded-[20px] border border-[#E4E1E5] p-6 shadow-sm space-y-4">
            <h2 className="font-bold text-base text-[#28262D] border-b border-[#E4E1E5] pb-3">Step 2: Bank Account & Statutory Information</h2>

            <div className="grid sm:grid-cols-2 gap-4 text-xs">
              <label className="block sm:col-span-2">
                Account Holder Name *
                <input required className={inputClass} value={form.accountHolderName} onChange={(e) => setForm({ ...form, accountHolderName: e.target.value })} />
              </label>

              <label className="block">
                Bank Name *
                <input required placeholder="e.g. HDFC Bank" className={inputClass} value={form.bankName} onChange={(e) => setForm({ ...form, bankName: e.target.value })} />
              </label>

              <label className="block">
                IFSC Code * (Format: HDFC0001234)
                <input
                  required
                  placeholder="HDFC0001234"
                  className={`${inputClass} uppercase`}
                  value={form.ifscCode}
                  onChange={(e) => setForm({ ...form, ifscCode: e.target.value })}
                />
              </label>

              <label className="block">
                Bank Account Number *
                <input
                  required
                  type="password"
                  placeholder="Enter account number"
                  className={inputClass}
                  value={form.accountNumber}
                  onChange={(e) => setForm({ ...form, accountNumber: e.target.value })}
                />
              </label>

              <label className="block">
                Confirm Bank Account Number *
                <input
                  required
                  placeholder="Re-enter account number"
                  className={inputClass}
                  value={form.confirmAccountNumber}
                  onChange={(e) => setForm({ ...form, confirmAccountNumber: e.target.value })}
                />
              </label>

              {/* Masked Display Preview */}
              {form.accountNumber && form.accountNumber === form.confirmAccountNumber && (
                <div className="sm:col-span-2 p-3 bg-[#EBF5F0] border border-[#438A6B]/30 rounded-[10px] text-xs text-[#438A6B] font-semibold flex items-center justify-between">
                  <span>✓ Account Numbers Match</span>
                  <span>Masked Display: •••••••••• {form.accountNumber.slice(-4)}</span>
                </div>
              )}

              <label className="block">
                PAN Number * (Format: ABCDE1234F)
                <input
                  required
                  placeholder="ABCDE1234F"
                  className={`${inputClass} uppercase`}
                  value={form.pan}
                  onChange={(e) => setForm({ ...form, pan: e.target.value })}
                />
              </label>

              <label className="block">
                UAN Number (12 digits, Optional)
                <input
                  placeholder="100000000000"
                  className={inputClass}
                  value={form.uan}
                  onChange={(e) => setForm({ ...form, uan: e.target.value })}
                />
              </label>

              <div className="sm:col-span-2 pt-3 border-t border-[#E4E1E5] space-y-3">
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    className="mt-0.5 rounded border-[#E4E1E5] text-[#714B67] focus:ring-[#714B67]"
                    checked={form.consentAgreed}
                    onChange={(e) => setForm({ ...form, consentAgreed: e.target.checked })}
                  />
                  <span className="text-xs text-[#74717A]">
                    I confirm that the bank and statutory information provided above is accurate and belongs to me. I consent to bank verification for salary processing.
                  </span>
                </label>
              </div>
            </div>

            <div className="flex justify-between pt-4 border-t border-[#E4E1E5]">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="px-5 py-2.5 border border-[#E4E1E5] hover:bg-[#F3EEF2] rounded-[10px] font-semibold text-xs text-[#3D3940] flex items-center gap-1.5"
              >
                <ArrowLeft className="w-4 h-4" /> Back to Personal
              </button>
              <button
                type="button"
                onClick={() => setStep(3)}
                disabled={!form.bankName || !form.accountNumber || form.accountNumber !== form.confirmAccountNumber || !form.ifscCode || !form.pan || !form.consentAgreed}
                className="px-6 py-2.5 bg-[#714B67] hover:bg-[#5A3B52] text-white rounded-[10px] font-bold text-xs flex items-center gap-2 disabled:opacity-50"
              >
                Continue to Employment Details <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Employment Details (Read Only) */}
        {step === 3 && (
          <div className="bg-white rounded-[20px] border border-[#E4E1E5] p-6 shadow-sm space-y-4">
            <div className="flex justify-between items-center border-b border-[#E4E1E5] pb-3">
              <div>
                <h2 className="font-bold text-base text-[#28262D]">Step 3: HR Assigned Employment Details</h2>
                <p className="text-xs text-[#74717A]">Read-only information assigned during account creation.</p>
              </div>
              <span className="px-2.5 py-1 bg-[#F3EEF2] text-[#714B67] font-bold text-[10px] rounded-full uppercase">
                HR Controlled
              </span>
            </div>

            {employeeDetails ? (
              <div className="grid sm:grid-cols-2 gap-4 text-xs p-4 bg-[#FAF8FA] rounded-[14px] border border-[#E4E1E5]">
                <div>
                  <span className="text-[#74717A]">Employee Code:</span>
                  <p className="font-bold text-[#28262D] mt-0.5">{employeeDetails.employeeCode}</p>
                </div>
                <div>
                  <span className="text-[#74717A]">Organization Work Email:</span>
                  <p className="font-bold text-[#28262D] mt-0.5">{employeeDetails.companyEmail}</p>
                </div>
                <div>
                  <span className="text-[#74717A]">Company Name:</span>
                  <p className="font-bold text-[#28262D] mt-0.5">{employeeDetails.companyName}</p>
                </div>
                <div>
                  <span className="text-[#74717A]">Department:</span>
                  <p className="font-bold text-[#28262D] mt-0.5">{employeeDetails.departmentName}</p>
                </div>
                <div>
                  <span className="text-[#74717A]">Designation:</span>
                  <p className="font-bold text-[#28262D] mt-0.5">{employeeDetails.positionTitle}</p>
                </div>
                <div>
                  <span className="text-[#74717A]">Employment Category:</span>
                  <p className="font-bold text-[#28262D] capitalize mt-0.5">{employeeDetails.employmentCategory.replace('_', ' ')}</p>
                </div>
                <div>
                  <span className="text-[#74717A]">Joining Date:</span>
                  <p className="font-bold text-[#28262D] mt-0.5">{employeeDetails.joiningDate}</p>
                </div>
                <div>
                  <span className="text-[#74717A]">Work Location:</span>
                  <p className="font-bold text-[#28262D] mt-0.5">{employeeDetails.workLocation}</p>
                </div>
              </div>
            ) : (
              <p className="text-xs text-[#74717A]">Loading employment details...</p>
            )}

            <div className="flex justify-between pt-4 border-t border-[#E4E1E5]">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="px-5 py-2.5 border border-[#E4E1E5] hover:bg-[#F3EEF2] rounded-[10px] font-semibold text-xs text-[#3D3940] flex items-center gap-1.5"
              >
                <ArrowLeft className="w-4 h-4" /> Back to Bank Details
              </button>
              <button
                type="button"
                onClick={() => setStep(4)}
                className="px-6 py-2.5 bg-[#714B67] hover:bg-[#5A3B52] text-white rounded-[10px] font-bold text-xs flex items-center gap-2"
              >
                Review & Submit <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Review & Submit */}
        {step === 4 && (
          <div className="bg-white rounded-[20px] border border-[#E4E1E5] p-6 shadow-sm space-y-5">
            <h2 className="font-bold text-base text-[#28262D] border-b border-[#E4E1E5] pb-3">Step 4: Final Review & HR Submission</h2>

            <div className="space-y-4 text-xs">
              <div className="p-4 bg-[#FAF8FA] rounded-[14px] border border-[#E4E1E5] space-y-2">
                <div className="flex justify-between items-center">
                  <h3 className="font-bold text-[#714B67]">Personal Information</h3>
                  <button type="button" onClick={() => setStep(1)} className="text-xs text-[#714B67] font-semibold hover:underline">Edit</button>
                </div>
                <p><strong>Name:</strong> {form.fullName} | <strong>DOB:</strong> {form.dateOfBirth} ({calculateAge(form.dateOfBirth)} yrs)</p>
                <p><strong>Phone:</strong> {form.phone} | <strong>Email:</strong> {form.personalEmail}</p>
                <p><strong>Address:</strong> {form.street}, {form.city}, {form.state} {form.postalCode}</p>
                <p><strong>Emergency Contact:</strong> {form.emergencyName} ({form.emergencyRelation}) - {form.emergencyPhone}</p>
              </div>

              <div className="p-4 bg-[#FAF8FA] rounded-[14px] border border-[#E4E1E5] space-y-2">
                <div className="flex justify-between items-center">
                  <h3 className="font-bold text-[#714B67]">Bank & Statutory Information</h3>
                  <button type="button" onClick={() => setStep(2)} className="text-xs text-[#714B67] font-semibold hover:underline">Edit</button>
                </div>
                <p><strong>Account Holder:</strong> {form.accountHolderName} | <strong>Bank:</strong> {form.bankName}</p>
                <p><strong>Account Number:</strong> •••••••••• {form.accountNumber.slice(-4)} | <strong>IFSC:</strong> {form.ifscCode}</p>
                <p><strong>PAN:</strong> {form.pan} {form.uan ? `| UAN: ${form.uan}` : ''}</p>
              </div>
            </div>

            <div className="flex justify-between pt-4 border-t border-[#E4E1E5]">
              <button
                type="button"
                onClick={() => setStep(3)}
                className="px-5 py-2.5 border border-[#E4E1E5] hover:bg-[#F3EEF2] rounded-[10px] font-semibold text-xs text-[#3D3940] flex items-center gap-1.5"
              >
                <ArrowLeft className="w-4 h-4" /> Back to Employment
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={handleSubmit}
                className="px-6 py-3 bg-[#714B67] hover:bg-[#5A3B52] text-white rounded-[10px] font-bold text-xs flex items-center gap-2 shadow-md hover:shadow-lg disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Submitting to HR…
                  </>
                ) : (
                  <>
                    Submit Onboarding to HR <CheckCircle className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
