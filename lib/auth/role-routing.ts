import type { AppRole } from '@/lib/types';
export function getHighestRole(roles:AppRole[]):AppRole{for(const role of ['admin','payroll_manager','payroll_user','hr_manager','employee'] as AppRole[])if(roles.includes(role))return role;return 'employee'}
export function getRoleDashboardPath(role:AppRole){return role==='admin'?'/dashboard?view=admin_overview':role==='hr_manager'?'/dashboard?view=employees':role==='employee'?'/dashboard?view=overview':'/dashboard?view=payroll_dashboard'}
