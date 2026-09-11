import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { buildPayslipPdf } from '@/lib/payslips/payslip-pdf';
import { createServiceRoleClient, createUserScopedClient } from '@/lib/supabase/server';
import type { Employee, Payslip, PayslipLine } from '@/lib/types';

const Id=z.string().uuid();
const PDF_TEMPLATE_VERSION='v2';
function bearer(request:NextRequest){const value=request.headers.get('authorization');return value?.startsWith('Bearer ')?value.slice(7):null}

export async function POST(request:NextRequest,{params}:{params:Promise<{id:string}>}) {
  try {
    const id=Id.parse((await params).id); const token=bearer(request);
    if(!token)return NextResponse.json({error:{code:'UNAUTHENTICATED',message:'Bearer token required'}},{status:401});
    const scoped=createUserScopedClient(token); const service=createServiceRoleClient();
    const {data:userData,error:userError}=await scoped.auth.getUser(token);
    if(userError||!userData.user)return NextResponse.json({error:{code:'UNAUTHENTICATED',message:'Invalid session'}},{status:401});
    const {data:row,error}=await scoped.from('payslips').select('*').eq('id',id).single();
    if(error||!row)return NextResponse.json({error:{code:'NOT_FOUND',message:'Payslip not found'}},{status:404});

    const {data:coveredContract}=row.contract_id?await service.from('contracts').select('id').eq('id',row.contract_id).eq('employee_id',row.employee_id).eq('company_id',row.company_id).not('approved_at','is',null).lte('start_date',row.period_end).or(`end_date.is.null,end_date.gte.${row.period_start}`).or(`terminated_at.is.null,terminated_at.gte.${row.period_start}T00:00:00Z`).maybeSingle():{data:null};
    if(!coveredContract)return NextResponse.json({error:{code:'CONTRACT_NOT_ELIGIBLE',message:'This employee has no approved contract covering the payslip period. PDF generation is blocked.'}},{status:409});

    if(row.pdf_storage_path?.includes(`/${PDF_TEMPLATE_VERSION}/`)){const signed=await service.storage.from('payslips').createSignedUrl(row.pdf_storage_path,300);if(!signed.error)return NextResponse.json({signedUrl:signed.data.signedUrl,expiresIn:300})}
    const {data:roles}=await scoped.from('user_company_roles').select('role').eq('company_id',row.company_id).eq('user_id',userData.user.id);
    if(!roles?.some(r=>r.role==='payroll_manager'||r.role==='admin'))return NextResponse.json({error:{code:'FORBIDDEN',message:'Only Payroll Manager or Admin can generate a missing PDF'}},{status:403});

    const [{data:employee},{data:lineRows},{data:company}]=await Promise.all([
      service.from('employees').select('*').eq('id',row.employee_id).single(),
      service.from('payslip_lines').select('*').eq('payslip_id',row.id).order('sequence'),
      service.from('companies').select('*').eq('id',row.company_id).single(),
    ]);
    if(!employee||!company)throw new Error('Payslip employee or company is missing');
    const lines:PayslipLine[]=(lineRows??[]).map(line=>({id:line.id,name:line.name,code:line.code,category:line.category==='earning'?(line.code==='OT'?'overtime':line.code==='BASIC'?'basic':'allowance'):line.category==='deduction'?'deduction':'adjustment',amount:Number(line.amount),source:line.code==='OT'?'overtime':'salary_rule',explanation:line.calculation_note??undefined,hoursAffected:line.code==='OT'?Number(line.quantity):undefined}));
    const payslip:Payslip={id:row.id,payrunId:row.pay_run_id,payrunName:'',employeeId:row.employee_id,employeeName:employee.full_name,employeeCode:employee.employee_code,department:'',jobPosition:'',contractId:row.contract_id??'',salaryStructureId:'',salaryStructureName:'',payrollPeriod:`${row.period_start} – ${row.period_end}`,workedDays:Number(row.paid_days),paidLeaveDays:0,unpaidLeaveDays:Number(row.unpaid_leave_days),basicSalary:Number(lines.find(l=>l.code==='BASIC')?.amount??0),hra:Number(lines.find(l=>l.code==='HRA')?.amount??0),travelAllowance:0,otherAllowances:0,grossSalary:Number(row.gross_amount),bonus:0,appraisalAdjustment:0,overtime:Number(row.overtime_amount),paidLeaveAdjustment:0,unpaidLeaveDeduction:Number(row.actual_unpaid_leave_deduction),taxDeduction:Number(lines.find(l=>l.category==='tax')?.amount??0),otherDeductions:0,totalDeductions:Number(row.deduction_amount),netSalary:Number(row.net_amount),status:row.status==='paid'?'paid':'validated',warnings:[],lines,payslipNumber:row.id};
    const employeeView:Employee={id:employee.id,employeeId:employee.employee_code,name:employee.full_name,avatar:'',email:employee.company_email,phone:employee.phone??'',personalEmail:'',address:'',jobPosition:'',departmentId:employee.department_id??'',departmentName:'',reportingManagerId:employee.manager_id??'',reportingManagerName:'',joiningDate:employee.joining_date,employmentStatus:'active',employeeType:employee.employment_category==='intern'?'intern':'full_time',currentAttendanceStatus:'checked_out',bankAccountMasked:'••••',ifscCode:'',panNumber:'',emergencyContact:{name:'',relation:'',phone:''},activeContractId:row.contract_id??'',workingScheduleId:'',workingScheduleName:'',paidLeaveBalance:0,unpaidLeaveTaken:Number(row.unpaid_leave_days),pendingRequestsCount:0,attendanceException:false,baseSalary:payslip.basicSalary};
    const logo=await readFile(path.join(process.cwd(),'public','logo.png')).then(b=>`data:image/png;base64,${b.toString('base64')}`).catch(()=>undefined);
    const doc=await buildPayslipPdf(payslip,employeeView,{legalName:company.legal_name??company.name,address:company.legal_address??''},logo);
    const bytes=Buffer.from(doc.output('arraybuffer'));const checksum=createHash('sha256').update(bytes).digest('hex');const storagePath=`${row.company_id}/${row.employee_id}/${PDF_TEMPLATE_VERSION}/${row.id}.pdf`;
    const upload=await service.storage.from('payslips').upload(storagePath,bytes,{contentType:'application/pdf',upsert:true});if(upload.error)throw upload.error;
    const updated=await service.from('payslips').update({pdf_storage_path:storagePath,pdf_checksum:checksum,generated_at:new Date().toISOString()}).eq('id',row.id);if(updated.error)throw updated.error;
    const signed=await service.storage.from('payslips').createSignedUrl(storagePath,300);if(signed.error)throw signed.error;
    return NextResponse.json({signedUrl:signed.data.signedUrl,expiresIn:300,checksum});
  } catch(error) { const message=error instanceof Error?error.message:'Unable to generate payslip';return NextResponse.json({error:{code:'PAYSLIP_PDF_ERROR',message}},{status:400}); }
}
