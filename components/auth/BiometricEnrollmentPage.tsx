'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { startRegistration } from '@simplewebauthn/browser';
import { Camera, CheckCircle2, Fingerprint, ShieldCheck } from 'lucide-react';
import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';
import { PeoplePayLogo } from '@/components/brand/PeoplePayLogo';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

type State = 'idle' | 'working' | 'complete' | 'unavailable';
const MODEL_VERSION = 'face-landmarker-2023-05-25';

async function api(path: string, init: RequestInit = {}) {
  const client = getSupabaseBrowserClient(); if(!client)throw new Error('Supabase is not configured'); const session = (await client.auth.getSession()).data.session;
  if (!session) throw new Error('Your session expired. Please sign in again.');
  const response = await fetch(path, { ...init, headers: { 'content-type': 'application/json', authorization: `Bearer ${session.access_token}`, ...init.headers } });
  const body = await response.json(); if (!response.ok) throw new Error(body.error?.message || 'Enrollment failed'); return body;
}

export function BiometricEnrollmentPage() {
  const router = useRouter(); const videoRef = React.useRef<HTMLVideoElement>(null); const streamRef = React.useRef<MediaStream | null>(null);
  const [faceState,setFaceState]=React.useState<State>('idle'); const [passkeyState,setPasskeyState]=React.useState<State>('idle');
  const [consent,setConsent]=React.useState(false); const [message,setMessage]=React.useState(''); const [finishing,setFinishing]=React.useState(false);
  React.useEffect(()=>()=>streamRef.current?.getTracks().forEach(track=>track.stop()),[]);

  const enrollFace = async () => {
    if(!consent)return setMessage('Confirm biometric consent before enrollment.'); setFaceState('working');setMessage('Starting camera and face landmark pipeline…');
    try {
      const stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:'user',width:640,height:480},audio:false});streamRef.current=stream;
      if(!videoRef.current)throw new Error('Camera preview unavailable');videoRef.current.srcObject=stream;await videoRef.current.play();
      const vision=await FilesetResolver.forVisionTasks('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm');
      const landmarker=await FaceLandmarker.createFromOptions(vision,{baseOptions:{modelAssetPath:'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/latest/face_landmarker.task',delegate:'GPU'},runningMode:'VIDEO',numFaces:1});
      const samples:number[][]=[];
      for(let index=0;index<5;index+=1){await new Promise(resolve=>window.setTimeout(resolve,450));const result=landmarker.detectForVideo(videoRef.current,performance.now());const landmarks=result.faceLandmarks[0];if(!landmarks)throw new Error('Face not detected. Keep your face centered and well lit.');const left=landmarks[33],right=landmarks[263],nose=landmarks[1];const scale=Math.max(Math.hypot(right.x-left.x,right.y-left.y),.001);samples.push(landmarks.flatMap(point=>[(point.x-nose.x)/scale,(point.y-nose.y)/scale,(point.z-nose.z)/scale]));setMessage(`Captured secure face sample ${index+1} of 5…`)}
      const template=samples[0].map((_,coordinate)=>samples.reduce((sum,sample)=>sum+sample[coordinate],0)/samples.length);const movement=Math.max(...samples.slice(1).map(sample=>Math.abs(sample[0]-samples[0][0])+Math.abs(sample[1]-samples[0][1])));if(movement<.00005)throw new Error('Liveness movement was not detected. Turn your head slightly and retry.');
      await api('/api/biometrics/face/enroll',{method:'POST',body:JSON.stringify({template,sampleCount:samples.length,modelName:'MediaPipe Face Landmarker',modelVersion:MODEL_VERSION,consentVersion:'2026-09-v1',livenessPassed:true})});landmarker.close();stream.getTracks().forEach(track=>track.stop());setFaceState('complete');setMessage('Face template encrypted and enrolled for attendance.');
    } catch(error){streamRef.current?.getTracks().forEach(track=>track.stop());setFaceState('idle');setMessage(error instanceof Error?error.message:'Face enrollment failed')}
  };
  const enrollPasskey=async()=>{setPasskeyState('working');setMessage('Waiting for your laptop biometric prompt…');try{if(!window.PublicKeyCredential)throw new Error('This browser does not support platform passkeys.');const available=await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();if(!available){setPasskeyState('unavailable');setMessage('No laptop fingerprint, Windows Hello, or Touch ID authenticator was found.');return}const start=await api('/api/biometrics/webauthn/register');const response=await startRegistration({optionsJSON:start.options});await api('/api/biometrics/webauthn/register',{method:'POST',body:JSON.stringify({challengeId:start.challengeId,response})});setPasskeyState('complete');setMessage('Laptop biometric enrolled. No fingerprint data left your device.')}catch(error){setPasskeyState('idle');setMessage(error instanceof Error?error.message:'Laptop biometric enrollment failed')}};
  const finish=async()=>{setFinishing(true);try{await api('/api/biometrics/enrollment/complete',{method:'POST',body:JSON.stringify({platformAuthenticatorUnavailable:passkeyState==='unavailable'})});router.replace('/dashboard')}catch(error){setMessage(error instanceof Error?error.message:'Unable to finish enrollment');setFinishing(false)}};
  const canFinish=faceState==='complete'&&(passkeyState==='complete'||passkeyState==='unavailable');
  return <main className="min-h-screen bg-[#F7F5F6] p-4 sm:p-8"><div className="mx-auto max-w-4xl"><header className="flex items-center gap-3"><PeoplePayLogo size={42}/><div><h1 className="text-xl font-bold">Secure your attendance account</h1><p className="text-sm text-[#74717A]">First-login biometric enrollment</p></div></header><section className="mt-6 rounded-[16px] border border-[#E4E1E5] bg-white p-5"><div className="flex gap-3"><ShieldCheck className="h-5 w-5 shrink-0 text-[#438A6B]"/><div><h2 className="text-base font-bold">Consent and privacy</h2><p className="mt-1 text-xs leading-5 text-[#74717A]">Camera frames stay in this browser. Only an encrypted landmark template is saved. Your fingerprint stays inside your laptop; the server receives only a WebAuthn public credential.</p><label className="mt-3 flex items-start gap-2 text-xs font-semibold"><input type="checkbox" className="mt-0.5" checked={consent} onChange={event=>setConsent(event.target.checked)}/>I consent to biometric processing for attendance verification.</label></div></div></section><div className="mt-4 grid gap-4 md:grid-cols-2"><EnrollmentCard icon={Camera} title="Face enrollment" state={faceState} action="Capture 5 samples" disabled={!consent} onClick={enrollFace}><video ref={videoRef} muted playsInline className="aspect-video w-full rounded-[10px] bg-[#28262D] object-cover"/></EnrollmentCard><EnrollmentCard icon={Fingerprint} title="Laptop biometric" state={passkeyState} action="Enroll fingerprint / passkey" onClick={enrollPasskey}><p className="rounded-[10px] bg-[#F4F3F5] p-3 text-xs leading-5 text-[#74717A]">Uses Windows Hello, Touch ID, or your operating system platform authenticator. Raw fingerprint data is never available to PeoplePay360.</p></EnrollmentCard></div>{message&&<p role="status" className="mt-4 rounded-[10px] border border-[#D8C7D4] bg-white p-3 text-sm text-[#5C3C53]">{message}</p>}<div className="mt-5 flex justify-end"><button disabled={!canFinish||finishing} onClick={finish} className="rounded-[10px] bg-[#714B67] px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50">{finishing?'Opening workspace…':'Complete enrollment'}</button></div></div></main>;
}

function EnrollmentCard({icon:Icon,title,state,action,onClick,disabled,children}:{icon:typeof Camera;title:string;state:State;action:string;onClick:()=>void;disabled?:boolean;children:React.ReactNode}){return <section className="rounded-[16px] border border-[#E4E1E5] bg-white p-5"><div className="flex items-center justify-between"><div className="flex items-center gap-2"><Icon className="h-5 w-5 text-[#714B67]"/><h2 className="text-base font-bold">{title}</h2></div>{state==='complete'&&<CheckCircle2 className="h-5 w-5 text-[#438A6B]"/>}</div><div className="my-4">{children}</div><button disabled={disabled||state==='working'||state==='complete'||state==='unavailable'} onClick={onClick} className="w-full rounded-[10px] border border-[#714B67] px-3 py-2 text-xs font-bold text-[#714B67] disabled:opacity-50">{state==='working'?'Enrolling…':state==='complete'?'Enrolled':state==='unavailable'?'Not available':action}</button></section>}
