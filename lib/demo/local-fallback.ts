'use client';

export type LocalFallbackArea = 'onboarding' | 'attendance' | 'payroll' | 'application';

export interface LocalFallbackEvent {
  id: string;
  area: LocalFallbackArea;
  action: string;
  timestamp: string;
  payload?: Record<string, unknown>;
  databaseFailure?: string;
}

const EVENT_KEY = 'peoplepay360-local-audit-log';
const ONBOARDING_KEY = 'peoplepay360-local-onboarding-complete';
const INVITATION_KEY = 'peoplepay360-local-invitations';
const ACTIVE_INVITATION_KEY = 'peoplepay360-active-local-invitation';
const DATA_PREFIX = 'peoplepay360-local-data-';

export interface LocalInvitation {token:string;fullName:string;personalEmail:string;joiningDate:string;employmentCategory:string;createdAt:string;passwordCreatedAt?:string;profile?:Record<string,unknown>}

const storage = () => typeof window === 'undefined' ? null : window.localStorage;

export function readLocalData<T>(key:string,fallback:T):T {
  const target=storage();if(!target)return fallback;
  try {const value=target.getItem(`${DATA_PREFIX}${key}`);return value===null?fallback:JSON.parse(value) as T;} catch {return fallback;}
}

export function writeLocalData<T>(key:string,value:T) {
  const target=storage();if(!target)return;
  try {target.setItem(`${DATA_PREFIX}${key}`,JSON.stringify(value));} catch { /* Local persistence must not block the workflow. */ }
}

export function logLocalFallback(area:LocalFallbackArea,action:string,payload?:Record<string,unknown>,error?:unknown) {
  const target=storage();if(!target)return;
  try {
    const existing=JSON.parse(target.getItem(EVENT_KEY)??'[]') as LocalFallbackEvent[];
    const event:LocalFallbackEvent={id:crypto.randomUUID(),area,action,timestamp:new Date().toISOString(),payload,databaseFailure:error instanceof Error?error.message:error?String(error):undefined};
    target.setItem(EVENT_KEY,JSON.stringify([event,...existing].slice(0,500)));
  } catch { /* Local logging must never interrupt a presentation flow. */ }
}

export function markLocalOnboardingComplete(userId:string,payload:Record<string,unknown>) {
  const target=storage();if(!target)return;
  try {const values=JSON.parse(target.getItem(ONBOARDING_KEY)??'{}');values[userId]={completedAt:new Date().toISOString(),...payload};target.setItem(ONBOARDING_KEY,JSON.stringify(values));} catch { /* no-op */ }
}

export function isLocalOnboardingComplete(userId:string) {
  const target=storage();if(!target)return false;
  try {return Boolean(JSON.parse(target.getItem(ONBOARDING_KEY)??'{}')[userId]);} catch {return false;}
}

export function createLocalInvitation(input:Omit<LocalInvitation,'token'|'createdAt'>){const target=storage();const invitation:LocalInvitation={...input,token:crypto.randomUUID(),createdAt:new Date().toISOString()};if(target){try{const existing=JSON.parse(target.getItem(INVITATION_KEY)??'{}');existing[invitation.token]=invitation;target.setItem(INVITATION_KEY,JSON.stringify(existing));logLocalFallback('onboarding','local_invitation_created',{token:invitation.token,recipient:invitation.personalEmail})}catch{/* caller still receives a usable in-memory-shaped invitation */}}return invitation;}

export function getLocalInvitation(token:string):LocalInvitation|null{const target=storage();if(!target)return null;try{return JSON.parse(target.getItem(INVITATION_KEY)??'{}')[token]??null}catch{return null}}

export function updateLocalInvitation(token:string,changes:Partial<LocalInvitation>){const target=storage();if(!target)return null;try{const existing=JSON.parse(target.getItem(INVITATION_KEY)??'{}');if(!existing[token])return null;existing[token]={...existing[token],...changes};target.setItem(INVITATION_KEY,JSON.stringify(existing));return existing[token] as LocalInvitation}catch{return null}}

export function activateLocalInvitation(token:string){const target=storage();if(target)target.setItem(ACTIVE_INVITATION_KEY,token)}
export function getActiveLocalInvitation(){const target=storage();if(!target)return null;const token=target.getItem(ACTIVE_INVITATION_KEY);return token?getLocalInvitation(token):null}
