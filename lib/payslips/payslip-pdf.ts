import { jsPDF } from 'jspdf';
import type { Employee, Payslip, PayslipLine } from '@/lib/types';

// jsPDF's built-in Helvetica font does not contain the rupee glyph. Keeping the
// ISO currency code prevents glyph substitution and preserves column alignment.
const money=(value:number)=>`INR ${new Intl.NumberFormat('en-IN',{minimumFractionDigits:2,maximumFractionDigits:2}).format(value)}`;
const ones=['','One','Two','Three','Four','Five','Six','Seven','Eight','Nine','Ten','Eleven','Twelve','Thirteen','Fourteen','Fifteen','Sixteen','Seventeen','Eighteen','Nineteen'];
const tens=['','','Twenty','Thirty','Forty','Fifty','Sixty','Seventy','Eighty','Ninety'];
function belowHundred(n:number){return n<20?ones[n]:`${tens[Math.floor(n/10)]}${n%10?` ${ones[n%10]}`:''}`}
function belowThousand(n:number){return n<100?belowHundred(n):`${ones[Math.floor(n/100)]} Hundred${n%100?` ${belowHundred(n%100)}`:''}`}
export function amountInWords(value:number){
  let n=Math.floor(Math.abs(value)); if(n===0)return 'Zero Rupees Only';
  const parts:string[]=[];
  const units:[[number,string],[number,string],[number,string]]=[[10_000_000,'Crore'],[100_000,'Lakh'],[1_000,'Thousand']];
  for(const [size,label] of units){if(n>=size){parts.push(`${belowThousand(Math.floor(n/size))} ${label}`);n%=size}}
  if(n)parts.push(belowThousand(n)); return `${parts.join(' ')} Rupees Only`;
}

async function imageData(path:string){
  try { const blob=await fetch(path).then(r=>r.ok?r.blob():Promise.reject()); return await new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result));reader.onerror=reject;reader.readAsDataURL(blob)}); } catch { return undefined; }
}

export async function buildPayslipPdf(ps:Payslip, employee:Employee, company={legalName:'PeoplePay360 Technologies Private Limited',address:'Bengaluru, Karnataka, India'}, logoDataUrl?:string) {
  const doc=new jsPDF({unit:'mm',format:'a4',orientation:'portrait',compress:true});
  const plum:[number,number,number]=[113,75,103]; const ink:[number,number,number]=[47,47,51]; const grey:[number,number,number]=[116,116,122];
  const logo=logoDataUrl ?? (typeof window !== 'undefined' ? await imageData('/logo.png') : undefined);
  if(logo) doc.addImage(logo,'PNG',16,12,28,16,undefined,'FAST');
  doc.setTextColor(...plum);doc.setFont('helvetica','bold');doc.setFontSize(14);doc.text(company.legalName,194,16,{align:'right'});
  doc.setTextColor(...grey);doc.setFont('helvetica','normal');doc.setFontSize(8);doc.text(company.address,194,21,{align:'right',maxWidth:120});
  doc.setDrawColor(113,75,103);doc.setLineWidth(.5);doc.line(16,32,194,32);
  doc.setTextColor(...ink);doc.setFont('helvetica','bold');doc.setFontSize(18);doc.text(employee.employeeType==='intern'?'STIPEND SLIP':'PAYSLIP',16,43);
  doc.setFontSize(9);doc.setTextColor(...grey);doc.text(ps.payrollPeriod,16,49);doc.text(ps.payslipNumber??ps.id,194,45,{align:'right'});

  const info=[['Employee',ps.employeeName],['Employee ID',ps.employeeCode],['Department',ps.department],['Designation',ps.jobPosition],['Joining date',employee.joiningDate],['Bank account',employee.bankAccountMasked],['PAN',employee.panNumber||'—'],['UAN',employee.uanNumber||'—']];
  doc.setFillColor(251,250,251);doc.roundedRect(16,55,178,33,2,2,'F');doc.setFontSize(8);
  info.forEach(([label,value],i)=>{const col=i%4,row=Math.floor(i/4),x=20+col*43.5,y=63+row*14;doc.setTextColor(...grey);doc.setFont('helvetica','normal');doc.text(label,x,y);doc.setTextColor(...ink);doc.setFont('helvetica','bold');doc.text(String(value),x,y+4,{maxWidth:39})});
  const fallbackLines: PayslipLine[] = [
    { id: 'pdf-basic', name: 'Basic Salary', code: 'BASIC', category: 'basic' as const, amount: Number(ps.basicSalary || ps.grossSalary || 0), source: 'salary_rule' as const },
    { id: 'pdf-hra', name: 'House Rent Allowance (HRA)', code: 'HRA', category: 'allowance' as const, amount: Number(ps.hra || 0), source: 'salary_rule' as const },
    { id: 'pdf-travel', name: 'Travel Allowance', code: 'TRAV', category: 'allowance' as const, amount: Number(ps.travelAllowance || 0), source: 'salary_rule' as const },
    { id: 'pdf-other-earning', name: 'Other Allowances', code: 'OTHER', category: 'allowance' as const, amount: Number(ps.otherAllowances || 0) + Number(ps.overtime || 0) + Math.max(0, Number(ps.grossSalary || 0) - Number(ps.basicSalary || 0) - Number(ps.hra || 0) - Number(ps.travelAllowance || 0) - Number(ps.otherAllowances || 0) - Number(ps.overtime || 0)), source: 'salary_rule' as const },
    { id: 'pdf-tax', name: 'Tax Deduction', code: 'TDS', category: 'tax' as const, amount: Number(ps.taxDeduction || 0), source: 'salary_rule' as const },
    { id: 'pdf-other-deduction', name: 'Other Deductions', code: 'OTHER_DED', category: 'deduction' as const, amount: Math.max(0, Number(ps.totalDeductions || 0) - Number(ps.taxDeduction || 0) - Number(ps.unpaidLeaveDeduction || 0)), source: 'salary_rule' as const },
  ].filter(line => line.amount > 0);
  const pdfLines = ps.lines?.length ? ps.lines : fallbackLines;
  const lop=ps.lopDays??ps.unpaidLeaveDays??0;const otHours=pdfLines.find(l=>l.category==='overtime')?.hoursAffected??0;
  const metrics=[['Paid days',String(ps.workedDays+ps.paidLeaveDays)],['Unpaid-leave days',String(lop)],['Overtime hours',String(otHours)],['Actual loss of pay',money(ps.unpaidLeaveDeduction)]];
  metrics.forEach(([l,v],i)=>{const x=16+i*44.5;doc.setDrawColor(228,225,229);doc.rect(x,93,42,16);doc.setTextColor(...grey);doc.setFont('helvetica','normal');doc.text(l,x+3,99);doc.setTextColor(...ink);doc.setFont('helvetica','bold');doc.setFontSize(10);doc.text(v,x+3,105);doc.setFontSize(8)});

  const earnings=pdfLines.filter(l=>['basic','allowance','overtime','adjustment'].includes(l.category));
  const deductions=pdfLines.filter(l=>['deduction','tax'].includes(l.category));
  const grossTotal=earnings.reduce((sum,line)=>sum+Number(line.amount),0);
  const lineDeductions=deductions.reduce((sum,line)=>sum+Number(line.amount),0);
  const hasLopLine=deductions.some(line=>['LOP','UNPAID_LEAVE','UNPAID_LEAVE_DEDUCTION'].includes(line.code));
  const lossOfPay=hasLopLine?0:Number(ps.unpaidLeaveDeduction||0);
  const deductionTotal=lineDeductions+lossOfPay;
  const netTotal=grossTotal-deductionTotal;
  const table=(title:string,rows:typeof pdfLines,x:number,y:number,w:number,color:[number,number,number],extra?:{name:string;amount:number})=>{
    doc.setFillColor(...color);doc.rect(x,y,w,8,'F');doc.setTextColor(255,255,255);doc.setFont('helvetica','bold');doc.setFontSize(8);doc.text(title,x+3,y+5.3);doc.text('AMOUNT',x+w-3,y+5.3,{align:'right'});
    let yy=y+8;const visible=extra?[...rows,{...rows[0],id:'pdf-lop',name:extra.name,amount:extra.amount}]:rows;
    visible.forEach((row,index)=>{doc.setFillColor(index%2===0?251:255,index%2===0?250:255,index%2===0?251:255);doc.rect(x,yy,w,8,'F');doc.setTextColor(...ink);doc.setFont('helvetica','normal');doc.setFontSize(8);const label=doc.splitTextToSize(row.name,w-31)[0];doc.text(label,x+3,yy+5.2);doc.setFont('helvetica','bold');doc.text(money(Number(row.amount)),x+w-3,yy+5.2,{align:'right'});yy+=8});
    doc.setDrawColor(228,225,229);doc.line(x,yy,x+w,yy);doc.setFont('helvetica','bold');doc.text('TOTAL',x+3,yy+6);doc.text(money(title==='EARNINGS'?grossTotal:deductionTotal),x+w-3,yy+6,{align:'right'});return yy+9;
  };
  const ey=table('EARNINGS',earnings,16,115,86,plum);const dy=table('DEDUCTIONS',deductions,108,115,86,[200,90,84],lossOfPay>0?{name:'Loss of pay',amount:lossOfPay}:undefined);const end=Math.max(ey,dy)+5;
  doc.setDrawColor(228,225,229);doc.line(16,end,194,end);doc.setFontSize(9);doc.setTextColor(...ink);doc.text(`Gross earnings: ${money(grossTotal)}`,16,end+7);doc.text(`Overtime included: ${money(earnings.find(l=>l.code==='OT')?.amount??0)}`,16,end+13);doc.text(`Loan deduction: ${money(deductions.find(l=>l.code.includes('LOAN'))?.amount??0)}`,16,end+19);doc.text(`PF contribution: ${money(deductions.find(l=>l.code==='PF_EMP')?.amount??0)}`,16,end+25);
  doc.setFillColor(...plum);doc.roundedRect(108,end+3,86,28,2,2,'F');doc.setTextColor(255,255,255);doc.setFontSize(9);doc.setFont('helvetica','normal');doc.text('Gross earnings',112,end+10);doc.text(money(grossTotal),190,end+10,{align:'right'});doc.text('Total deductions',112,end+16);doc.text(money(deductionTotal),190,end+16,{align:'right'});doc.setFontSize(14);doc.setFont('helvetica','bold');doc.text('NET PAY',112,end+26);doc.text(money(netTotal),190,end+26,{align:'right'});
  doc.setTextColor(...ink);doc.setFontSize(8);doc.text('Net pay in words',16,end+39);doc.setFont('helvetica','bold');doc.text(amountInWords(netTotal),16,end+44,{maxWidth:178});
  doc.setFont('helvetica','normal');doc.setTextColor(...grey);doc.text('Important deductions',16,end+53);let noteY=end+58;deductions.slice(0,3).forEach(line=>{const note=`${line.name}: ${line.explanation??'Calculated under the applicable payroll rule.'}`;const split=doc.splitTextToSize(note,178);doc.text(split,16,noteY);noteY+=split.length*3.5+2});
  const signY=Math.min(265,Math.max(230,noteY+8));
  doc.setTextColor(...plum);doc.setFont('times','italic');doc.setFontSize(16);doc.text('Sudeesh K',169.5,signY-5,{align:'center'});
  doc.setDrawColor(...plum);doc.setLineWidth(.35);doc.line(151,signY-3,188,signY-6);doc.line(160,signY-2,181,signY-2.8);
  doc.setDrawColor(116,116,122);doc.setLineWidth(.25);doc.line(145,signY,194,signY);doc.setTextColor(...grey);doc.setFont('helvetica','normal');doc.setFontSize(8);doc.text('Digitally authorized by Sudeesh K',169.5,signY+5,{align:'center'});doc.text('Payroll Administrator',169.5,signY+9,{align:'center'});doc.text(`Generated: ${new Date().toLocaleDateString('en-IN')}`,16,signY+5);
  doc.setDrawColor(228,225,229);doc.line(16,280,194,280);doc.setFontSize(7);doc.text('This is a computer-generated payslip. No physical signature is required.',105,286,{align:'center'});
  return doc;
}
