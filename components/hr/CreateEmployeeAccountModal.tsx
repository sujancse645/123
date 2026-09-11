'use client';

import React from 'react';
import { CheckCircle2, UserPlus, X } from 'lucide-react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { useApp } from '@/lib/context/app-context';
import { DEPARTMENTS,WORKING_SCHEDULES } from '@/lib/mock-data/departments-schedules';
import { SALARY_STRUCTURES } from '@/lib/mock-data/payroll';
import { createLocalInvitation } from '@/lib/demo/local-fallback';

type Department = { id: string; name: string };
type Position = { id: string; title: string; department_id: string | null };
type NamedRecord = { id: string; name: string };
type MailDraft = { to: string; subject: string; body: string };

const gmailComposeUrl = ({to,subject,body}:MailDraft) => {
  const query=new URLSearchParams({view:'cm',fs:'1',to,su:subject,body});
  return `https://mail.google.com/mail/?${query.toString()}`;
};

export function CreateEmployeeAccountModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const {authenticated,companyId,createLocalEmployee}=useApp();
  const [departments, setDepartments] = React.useState<Department[]>([]);
  const [positions, setPositions] = React.useState<Position[]>([]);
  const [structures,setStructures]=React.useState<NamedRecord[]>([]); const [schedules,setSchedules]=React.useState<NamedRecord[]>([]);
  const [form, setForm] = React.useState({
    fullName: '', personalEmail: '', departmentId: '', positionId: '',
    employmentCategory: 'full_time', applicationRole: 'employee', joiningDate: new Date().toISOString().slice(0,10), salaryStructureId:'',workingScheduleId:'',contractEndDate:'',monthlyCtc:60000,monthlyGross:50000,basicSalary:25000,
  });
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState('');
  const [sent, setSent] = React.useState(false);
  const [mailDraft,setMailDraft]=React.useState<MailDraft|null>(null);
  const configurationError = authenticated&&(!getSupabaseBrowserClient()||!companyId)?'Your company session is unavailable. Sign in again.':'';

  React.useEffect(() => {
    if (!open) return;
    if(!authenticated){queueMicrotask(()=>{const demoDepartments=DEPARTMENTS.map(item=>({id:item.id,name:item.name}));const demoPositions=demoDepartments.flatMap(department=>['Manager','Executive','Specialist'].map((title,index)=>({id:`${department.id}-pos-${index+1}`,title:`${department.name} ${title}`,department_id:department.id})));setDepartments(demoDepartments);setPositions(demoPositions);setStructures(SALARY_STRUCTURES.map(item=>({id:item.id,name:item.name})));setSchedules(WORKING_SCHEDULES.map(item=>({id:item.id,name:item.name})));setForm(value=>({...value,departmentId:demoDepartments[0]?.id??'',positionId:demoPositions[0]?.id??'',salaryStructureId:SALARY_STRUCTURES[0]?.id??'',workingScheduleId:WORKING_SCHEDULES[0]?.id??''}))});return}
    const client=getSupabaseBrowserClient();if(!client||!companyId)return;
    client.auth.getSession().then(async({data})=>{if(!data.session)throw new Error('Your session expired');const response=await fetch(`/api/employees/reference-options?companyId=${encodeURIComponent(companyId)}`,{headers:{authorization:`Bearer ${data.session.access_token}`}});const body=await response.json();if(!response.ok)throw new Error(body.error?.message||'Unable to load employee options');return body}).then((options:{departments:Department[];positions:Position[];structures:NamedRecord[];schedules:NamedRecord[]})=>{
      setDepartments(options.departments);setPositions(options.positions);setStructures(options.structures);setSchedules(options.schedules);
      const firstDepartment=options.departments[0]?.id??'';const firstPosition=options.positions.find(position=>position.department_id===firstDepartment||!position.department_id)?.id??'';
      setForm((value) => ({
        ...value,
        departmentId:firstDepartment,positionId:firstPosition,salaryStructureId:options.structures[0]?.id??'',workingScheduleId:options.schedules[0]?.id??'',
      }));
    }).catch(caught=>setError(caught instanceof Error?caught.message:'Unable to load employee options'));
  }, [open,authenticated,companyId]);

  if (!open) return null;

  const create = async (event: React.FormEvent) => {
    event.preventDefault(); setBusy(true); setError('');
    // Opening the tab during the submit event avoids browser popup blocking.
    const gmailTab=window.open('about:blank','peoplepay360-gmail-compose');
    if(gmailTab){gmailTab.document.title='Preparing PeoplePay360 invitation…';gmailTab.document.body.innerHTML='<p style="font:16px system-ui;padding:24px">Creating employee account and preparing Gmail…</p>'}
    try {
      if(!authenticated){
        await new Promise(resolve=>window.setTimeout(resolve,450));
        const firstName=form.fullName.trim().split(/\s+/)[0]||'Employee';
        const invitation=createLocalInvitation({fullName:form.fullName.trim(),personalEmail:form.personalEmail.trim(),joiningDate:form.joiningDate,employmentCategory:form.employmentCategory});
        createLocalEmployee({name:form.fullName.trim(),email:form.personalEmail.trim(),joiningDate:form.joiningDate,employeeType:form.employmentCategory==='intern'?'intern':form.employmentCategory==='contractor'?'contractor':'full_time',departmentId:form.departmentId,departmentName:departments.find(item=>item.id===form.departmentId)?.name||'General',jobPosition:positions.find(item=>item.id===form.positionId)?.title||'Employee',baseSalary:form.basicSalary,monthlySalaryGross:form.monthlyGross,salaryStructureName:structures.find(item=>item.id===form.salaryStructureId)?.name||'Standard Corporate Salary Structure',workingScheduleId:form.workingScheduleId,workingScheduleName:schedules.find(item=>item.id===form.workingScheduleId)?.name||'Company Default'});
        const appUrl=process.env.NEXT_PUBLIC_APP_URL||window.location.origin;const activationUrl=`${appUrl}/reset-password?invite=1&demoInvite=${encodeURIComponent(invitation.token)}`;const draft={to:form.personalEmail.trim(),subject:'Activate your PeoplePay360 employee account',body:`Hello ${firstName},\n\nYour PeoplePay360 employee account and contract are ready.\n\nCreate your password and complete your employee profile using this link:\n\n${activationUrl}\n\nRegards,\nPeoplePay360 HR`};setMailDraft(draft);if(gmailTab)gmailTab.location.replace(gmailComposeUrl(draft));else window.open(gmailComposeUrl(draft),'_blank','noopener,noreferrer');setSent(true);return}
      const client = getSupabaseBrowserClient();
      if (!client || !companyId) throw new Error('Supabase is not configured');
      const { data: { session } } = await client.auth.getSession();
      if (!session) throw new Error('Your session has expired');
      const response = await fetch('/api/employees/invite', {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ ...form, companyId,workingScheduleId:form.workingScheduleId||null,contractEndDate:form.contractEndDate||null }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error?.message ?? 'Account creation failed');
      const draft=body.mailDraft as MailDraft|undefined;
      if(draft){
        setMailDraft(draft);
        if(gmailTab)gmailTab.location.replace(gmailComposeUrl(draft));
        else window.open(gmailComposeUrl(draft),'_blank','noopener,noreferrer');
      }else gmailTab?.close();
      setSent(true);
    } catch (caught) {
      gmailTab?.close();
      setError(caught instanceof Error ? caught.message : 'Account creation failed');
    } finally { setBusy(false); }
  };

  const input = 'w-full mt-1 px-3 py-2 rounded-[9px] border border-[#E4E1E5] text-xs outline-none focus:border-[#714B67]';
  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-xl max-h-[calc(100vh-48px)] overflow-y-auto bg-white rounded-[18px] border border-[#E4E1E5] shadow-2xl p-5">
        <div className="flex justify-between gap-4"><div><h3 className="font-bold">Create Employee Account</h3><p className="text-xs text-[#74717A]">Auth creation, approved role assignment and invitation are server protected.</p></div><button type="button" onClick={onClose} aria-label="Close employee account dialog"><X className="w-5 h-5" /></button></div>
        {(configurationError || error) && <p className="mt-3 p-2 bg-[#FDF1F0] text-[#C85A54] rounded text-xs">{error || configurationError}</p>}
        {sent ? (
          <div className="py-10 text-center"><CheckCircle2 className="w-12 h-12 text-[#438A6B] mx-auto" /><h4 className="font-bold mt-3">Employee created and Gmail draft opened</h4><p className="text-xs text-[#74717A] mt-1">Recipient, subject and invitation details are prefilled. Review the Gmail draft and press Send.</p><div className="mt-4 flex justify-center gap-2">{mailDraft&&<button type="button" onClick={()=>window.open(gmailComposeUrl(mailDraft),'_blank','noopener,noreferrer')} className="px-4 py-2 border border-[#714B67] text-[#714B67] rounded-[9px] text-xs font-bold">Open Gmail again</button>}<button type="button" onClick={onClose} className="px-4 py-2 bg-[#714B67] text-white rounded-[9px] text-xs font-bold">Back to employees</button></div></div>
        ) : (
          <form onSubmit={create} className="mt-4 grid sm:grid-cols-2 gap-3 text-xs">
            <label>Full name *<input required className={input} value={form.fullName} onChange={(event) => setForm({ ...form, fullName: event.target.value })} /></label>
            <label>Personal email *<input required type="email" className={input} value={form.personalEmail} onChange={(event) => setForm({ ...form, personalEmail: event.target.value })} /></label>
            <label>Department *<select required className={input} value={form.departmentId} onChange={(event) => {const departmentId=event.target.value;const positionId=positions.find(position=>position.department_id===departmentId||!position.department_id)?.id??'';setForm({...form,departmentId,positionId})}}><option value="">Select department</option>{departments.map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}</select></label>
            <label>Designation *<select required className={input} value={form.positionId} onChange={(event) => setForm({ ...form, positionId: event.target.value })}><option value="">{positions.length?'Select designation':'No designations configured'}</option>{positions.filter((position) => !position.department_id || position.department_id === form.departmentId).map((position) => <option key={position.id} value={position.id}>{position.title}</option>)}</select></label>
            <label>Employment category<select className={input} value={form.employmentCategory} onChange={(event) => setForm({ ...form, employmentCategory: event.target.value })}>{['full_time', 'part_time', 'contractor', 'intern', 'trainee'].map((value) => <option key={value}>{value}</option>)}</select></label>
            <label>Approved application role<select className={input} value={form.applicationRole} onChange={(event) => setForm({ ...form, applicationRole: event.target.value })}>{['employee', 'hr_manager', 'payroll_user', 'payroll_manager', 'admin'].map((value) => <option key={value}>{value}</option>)}</select></label>
            <label>Joining date<input required type="date" className={input} value={form.joiningDate} onChange={(event) => setForm({ ...form, joiningDate: event.target.value })} /></label>
            <label>Contract end date<input type="date" min={form.joiningDate} className={input} value={form.contractEndDate} onChange={event=>setForm({...form,contractEndDate:event.target.value})}/></label>
            <label>Salary structure *<select required className={input} value={form.salaryStructureId} onChange={event=>setForm({...form,salaryStructureId:event.target.value})}><option value="">Select structure</option>{structures.map(item=><option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
            <label>Working schedule<select className={input} value={form.workingScheduleId} onChange={event=>setForm({...form,workingScheduleId:event.target.value})}><option value="">Company default</option>{schedules.map(item=><option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
            <label>Monthly CTC *<input required min="1" type="number" className={input} value={form.monthlyCtc} onChange={event=>setForm({...form,monthlyCtc:Number(event.target.value)})}/></label>
            <label>Monthly gross *<input required min="1" type="number" className={input} value={form.monthlyGross} onChange={event=>setForm({...form,monthlyGross:Number(event.target.value)})}/></label>
            <label>Basic salary *<input required min="1" type="number" className={input} value={form.basicSalary} onChange={event=>setForm({...form,basicSalary:Number(event.target.value)})}/></label>
            <div className="sm:col-span-2 flex justify-end"><button disabled={busy || Boolean(configurationError) || !form.departmentId || !form.positionId||!form.salaryStructureId} className="px-4 py-2 bg-[#714B67] text-white rounded-[9px] font-bold flex items-center gap-2 disabled:opacity-50"><UserPlus className="w-4 h-4" />{busy ? 'Creating securely…' : 'Create, assign contract & send email'}</button></div>
          </form>
        )}
      </div>
    </div>
  );
}
