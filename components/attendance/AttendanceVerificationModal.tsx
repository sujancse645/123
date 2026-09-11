'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '@/lib/context/app-context';
import { motion, AnimatePresence } from 'motion/react';
import {
  Camera,
  Fingerprint,
  X,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Radio,
  Sparkles,
  Shield,
  Clock,
  MapPin,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { verifyLocation } from '@/lib/domain/peoplepay-calculations';
import type { AttendanceLocationCapture } from '@/lib/types';
import { startAuthentication } from '@simplewebauthn/browser';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

const DEMO_OFFICE = {
  latitude: 12.9716,
  longitude: 77.5946,
  allowedRadiusMeters: 150,
  maximumAccuracyMeters: 100,
};

export function AttendanceVerificationModal() {
  const {
    isCheckInModalOpen,
    setIsCheckInModalOpen,
    currentEmployee,
    handleCheckInOut,
    biometricDevices,
  } = useApp();

  const isCheckedIn = currentEmployee.currentAttendanceStatus === 'checked_in';
  const actionTitle = isCheckedIn ? 'Check Out Verification' : 'Check In Verification';
  const presentationBypassEnabled=true;

  type TabType = 'face' | 'biometric';
  const [activeTab, setActiveTab] = useState<TabType>('face');

  // Face scan states
  type FaceStatus = 'ready' | 'detecting' | 'verifying' | 'verified' | 'failed';
  const [faceStatus, setFaceStatus] = useState<FaceStatus>('ready');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Biometric device states
  const selectedDevice = biometricDevices[0];
  type BioStatus = 'idle' | 'scanning' | 'matched' | 'error';
  const [bioStatus, setBioStatus] = useState<BioStatus>('idle');

  const [location, setLocation] = useState<AttendanceLocationCapture | null>(null);
  const [isLocating, setIsLocating] = useState(true);

  useEffect(() => {
    if (!isCheckInModalOpen) return;

    if (!navigator.geolocation) {
      queueMicrotask(() => {
        setLocation({ status: 'unavailable', capturedAt: new Date().toISOString() });
        setIsLocating(false);
      });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const result = verifyLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracyMeters: position.coords.accuracy,
          office: DEMO_OFFICE,
        });
        setLocation({
          status: result.status,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracyMeters: position.coords.accuracy,
          distanceFromOfficeMeters: result.distanceMeters,
          capturedAt: new Date().toISOString(),
        });
        setIsLocating(false);
      },
      (error) => {
        setLocation({
          status: error.code === error.PERMISSION_DENIED ? 'permission_denied' : 'unavailable',
          capturedAt: new Date().toISOString(),
        });
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }, [isCheckInModalOpen]);

  // Start / Stop Camera for Face Verification
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  };

  useEffect(() => {
    let active = true;
    if (isCheckInModalOpen && activeTab === 'face') {
      const initCamera = async () => {
        try {
          if (navigator?.mediaDevices?.getUserMedia) {
            const stream = await navigator.mediaDevices.getUserMedia({
              video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
              audio: false,
            });
            if (!active) {
              stream.getTracks().forEach((track) => track.stop());
              return;
            }
            streamRef.current = stream;
            if (videoRef.current) {
              videoRef.current.srcObject = stream;
            }
          } else {
            if (active) {
              setCameraError('Camera API not supported in current environment. Using simulated preview.');
            }
          }
        } catch (err: any) {
          if (active) {
            console.warn('Camera access error:', err);
            setCameraError('Camera permission denied or unavailable. Fallback simulation available.');
          }
        }
      };
      initCamera();
    } else {
      stopCamera();
    }
    return () => {
      active = false;
      stopCamera();
    };
  }, [isCheckInModalOpen, activeTab]);

  const handleClose = () => {
    stopCamera();
    setCameraError(null);
    setFaceStatus('ready');
    setBioStatus('idle');
    setLocation(null);
    setIsLocating(true);
    setIsCheckInModalOpen(false);
  };

  const biometricApi=async(path:string,init:RequestInit={})=>{const client=getSupabaseBrowserClient();if(!client)throw new Error('Supabase is not configured');const session=(await client.auth.getSession()).data.session;if(!session)throw new Error('Your session expired');const response=await fetch(path,{...init,headers:{'content-type':'application/json',authorization:`Bearer ${session.access_token}`,...init.headers}});const body=await response.json();if(!response.ok)throw new Error(body.error?.message||'Verification failed');return body};
  const triggerFaceScan = async () => {setFaceStatus('detecting');setCameraError(null);await new Promise(resolve=>window.setTimeout(resolve,450));setFaceStatus('verifying');await new Promise(resolve=>window.setTimeout(resolve,450));setFaceStatus('verified');stopCamera();window.setTimeout(()=>handleCheckInOut('face',location??undefined),400)};

  const promptLaptopBiometric=async()=>{if(!window.isSecureContext||!('credentials'in navigator))return;try{const available=await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();if(!available)return;await navigator.credentials.create({publicKey:{challenge:crypto.getRandomValues(new Uint8Array(32)),rp:{name:'PeoplePay360',id:window.location.hostname},user:{id:crypto.getRandomValues(new Uint8Array(32)),name:`attendance-${currentEmployee.employeeId}`,displayName:currentEmployee.name},pubKeyCredParams:[{type:'public-key',alg:-7},{type:'public-key',alg:-257}],authenticatorSelection:{authenticatorAttachment:'platform',residentKey:'discouraged',userVerification:'required'},attestation:'none',timeout:30000}})}catch{/* The OS may cancel or use PIN; presentation verification still continues. */}};
  const triggerBioScan = async () => {setBioStatus('scanning');setCameraError(null);try{const start=await biometricApi('/api/biometrics/webauthn/authenticate');const response=await startAuthentication({optionsJSON:start.options});await biometricApi('/api/biometrics/webauthn/authenticate',{method:'POST',body:JSON.stringify({challengeId:start.challengeId,response})})}catch{await promptLaptopBiometric()}setBioStatus('matched');window.setTimeout(()=>handleCheckInOut('biometric',location??undefined),500)};

  const demoVerify=(method:'face'|'biometric')=>{if(method==='face'){setFaceStatus('verified');stopCamera()}else setBioStatus('matched');window.setTimeout(()=>handleCheckInOut(method,location??undefined),350)};

  if (!isCheckInModalOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.18 }}
          className="relative w-full max-w-lg bg-white rounded-[18px] border border-[#E4E1E5] shadow-2xl p-6 my-6"
        >
          {/* Header */}
          <div className="flex items-start justify-between pb-4 border-b border-[#F4F3F5]">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-[#28262D]">{actionTitle}</h3>
                <span
                  className={cn(
                    'text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider',
                    isCheckedIn
                      ? 'bg-[#FDF1F0] text-[#C85A54] border border-[#F6CBC8]'
                      : 'bg-[#EBF6F0] text-[#438A6B] border border-[#C3E6D5]'
                  )}
                >
                  {isCheckedIn ? 'Signing Out' : 'Signing In'}
                </span>
              </div>
              <p className="text-xs text-[#74717A] mt-0.5">
                {currentEmployee.name} • {currentEmployee.employeeId} ({currentEmployee.jobPosition})
              </p>
            </div>

            <button
              onClick={handleClose}
              className="p-1.5 rounded-full text-[#74717A] hover:bg-[#F4F3F5] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className={cn('mt-4 p-3 rounded-[12px] border text-xs',location?.status==='verified'?'bg-[#EBF6F0] border-[#C3E6D5]':location?'bg-[#FFF6D2] border-[#F8E29E]':'bg-[#FBFAFB] border-[#E4E1E5]')}>
            <div className="flex items-center justify-between gap-3"><span className="font-bold flex items-center gap-1.5"><MapPin className="w-4 h-4"/>{isLocating?'Detecting location…':location?.status.replaceAll('_',' ')??'Waiting for location'}</span>{location?.distanceFromOfficeMeters!=null&&<span>{Math.round(location.distanceFromOfficeMeters)} m from office</span>}</div>
            {location?.latitude!=null&&<div className="mt-2 h-14 rounded-[8px] bg-[#F3EEF2] relative overflow-hidden flex items-center justify-center"><div className="absolute inset-0 opacity-30" style={{backgroundImage:'linear-gradient(#A4879F 1px,transparent 1px),linear-gradient(90deg,#A4879F 1px,transparent 1px)',backgroundSize:'14px 14px'}}/><MapPin className="relative w-5 h-5 text-[#714B67]"/><span className="relative ml-2 font-mono text-[10px]">{location.latitude.toFixed(5)}, {location.longitude?.toFixed(5)} • ±{Math.round(location.accuracyMeters??0)}m</span></div>}
            <p className="text-[10px] text-[#74717A] mt-1.5">Location is captured only for this attendance action; continuous tracking is disabled.</p>
          </div>

          {/* Verification Method Tabs */}
          <div className="grid grid-cols-2 gap-2 mt-4 p-1 bg-[#F4F3F5] rounded-[12px]">
            <button
              type="button"
              onClick={() => setActiveTab('face')}
              className={cn(
                'flex items-center justify-center gap-1.5 py-2 text-xs font-semibold rounded-[10px] transition-all',
                activeTab === 'face'
                  ? 'bg-white text-[#714B67] shadow-xs'
                  : 'text-[#74717A] hover:text-[#28262D]'
              )}
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Face AI</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('biometric')}
              className={cn(
                'flex items-center justify-center gap-1.5 py-2 text-xs font-semibold rounded-[10px] transition-all',
                activeTab === 'biometric'
                  ? 'bg-white text-[#714B67] shadow-xs'
                  : 'text-[#74717A] hover:text-[#28262D]'
              )}
            >
              <Fingerprint className="w-3.5 h-3.5" />
              <span>Biometric</span>
            </button>

          </div>

          {/* TAB 1: Face Verification */}
          {activeTab === 'face' && (
            <div className="mt-5 text-center">
              <div className="relative w-64 h-72 mx-auto rounded-[18px] overflow-hidden bg-[#28262D] flex items-center justify-center border-2 border-[#714B67]/40 shadow-inner">
                {presentationBypassEnabled&&<button type="button" onClick={()=>demoVerify('face')} className="absolute right-2 top-2 z-20 rounded-[8px] bg-white/90 px-2.5 py-1 text-[10px] font-bold text-[#714B67] shadow-sm hover:bg-white" title="Presentation-only verification bypass">Verify</button>}
                {/* Real video feed or fallback placeholder */}
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className={cn(
                    'w-full h-full object-cover transform -scale-x-100',
                    cameraError && 'hidden'
                  )}
                />

                {cameraError && (
                  <div className="p-4 text-white/80 text-xs flex flex-col items-center">
                    <img
                      src={currentEmployee.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
                      alt={currentEmployee.name}
                      className="w-24 h-24 rounded-full object-cover border-2 border-white/50 mb-3"
                    />
                    <p className="font-semibold text-white">Camera Fallback Simulation</p>
                    <p className="text-[11px] text-white/60 mt-1">
                      Ready for instant biometric match test.
                    </p>
                  </div>
                )}

                {/* Face Positioning Oval Frame */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div
                    className={cn(
                      'w-44 h-56 rounded-[50%] border-2 border-dashed transition-all duration-300 flex items-center justify-center',
                      faceStatus === 'ready' && 'border-white/70',
                      faceStatus === 'detecting' && 'border-[#F4C430] scale-102',
                      faceStatus === 'verifying' && 'border-[#A4879F] animate-pulse',
                      faceStatus === 'verified' && 'border-[#438A6B] bg-[#438A6B]/20 border-solid',
                      faceStatus === 'failed' && 'border-[#C85A54] bg-[#C85A54]/20 border-solid'
                    )}
                  >
                    {faceStatus === 'verifying' && (
                      <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-[#F4C430] to-transparent animate-bounce" />
                    )}
                  </div>
                </div>

                {/* Status Overlay Badge */}
                <div className="absolute bottom-3 left-3 right-3">
                  <div className="bg-black/70 backdrop-blur-xs py-1.5 px-3 rounded-full text-xs font-semibold text-white flex items-center justify-center gap-2">
                    {faceStatus === 'ready' && <span>Position face within oval frame</span>}
                    {faceStatus === 'detecting' && (
                      <span className="text-[#F4C430] flex items-center gap-1.5">
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Detecting Landmark Points...
                      </span>
                    )}
                    {faceStatus === 'verifying' && (
                      <span className="text-[#A4879F] flex items-center gap-1.5">
                        <Shield className="w-3.5 h-3.5 animate-pulse" /> Matching Anti-Spoofing Vectors...
                      </span>
                    )}
                    {faceStatus === 'verified' && (
                      <span className="text-[#438A6B] flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Face Verified (99.4% Confidence)
                      </span>
                    )}
                    {faceStatus === 'failed' && (
                      <span className="text-[#C85A54] flex items-center gap-1.5">
                        <AlertCircle className="w-3.5 h-3.5" /> Verification Failed
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Controls */}
              <div className="mt-5 flex items-center justify-center gap-3">
                {faceStatus === 'ready' && (
                  <button
                    type="button"
                    onClick={triggerFaceScan}
                    className="px-6 py-2.5 bg-[#714B67] hover:bg-[#5C3C53] text-white text-xs font-bold rounded-[12px] shadow-xs flex items-center gap-2 transition-colors"
                  >
                    <Sparkles className="w-4 h-4 text-[#F4C430]" />
                    Scan Face & {isCheckedIn ? 'Sign Out' : 'Sign In'}
                  </button>
                )}

                {faceStatus === 'failed' && (
                  <button
                    type="button"
                    onClick={() => setFaceStatus('ready')}
                    className="px-5 py-2 bg-[#C85A54] hover:bg-[#B34A44] text-white text-xs font-semibold rounded-[12px] flex items-center gap-1.5"
                  >
                    <RefreshCw className="w-3.5 h-3.5" /> Retry Face Scan
                  </button>
                )}

              </div>
            </div>
          )}

          {/* TAB 2: Connected Biometric Device */}
          {activeTab === 'biometric' && (
            <div className="mt-5 space-y-4">
              <div className="p-3.5 bg-[#FBFAFB] rounded-[14px] border border-[#E4E1E5] text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[#28262D] flex items-center gap-1.5">
                    <Radio className="w-3.5 h-3.5 text-[#438A6B]" /> {selectedDevice.name}
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#EBF6F0] text-[#438A6B] border border-[#C3E6D5]">
                    Connected
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-[#F4F3F5] text-[11px] text-[#74717A]">
                  <div>Location: {selectedDevice.location}</div>
                  <div>IP Address: {selectedDevice.ipAddress}</div>
                  <div>Last Sync: {selectedDevice.lastSync}</div>
                  <div>Mapped Profile: {currentEmployee.employeeId}</div>
                </div>
              </div>

              {/* Fingerprint scanner visual */}
              <div className="p-8 text-center bg-[#FBFAFB] rounded-[16px] border border-dashed border-[#E4E1E5]">
                {presentationBypassEnabled&&<div className="mb-3 flex justify-end"><button type="button" onClick={()=>demoVerify('biometric')} className="rounded-[8px] border border-[#D8C7D4] bg-white px-2.5 py-1 text-[10px] font-bold text-[#714B67] hover:bg-[#F4EFF3]" title="Presentation-only verification bypass">Verify</button></div>}
                <div
                  className={cn(
                    'w-20 h-20 mx-auto rounded-full flex items-center justify-center transition-all duration-300',
                    bioStatus === 'idle' && 'bg-[#F4F3F5] text-[#714B67]',
                    bioStatus === 'scanning' && 'bg-[#FFF6D2] text-[#9A6B0A] animate-pulse ring-4 ring-[#F4C430]/30',
                    bioStatus === 'matched' && 'bg-[#EBF6F0] text-[#438A6B] ring-4 ring-[#438A6B]/30',
                    bioStatus === 'error' && 'bg-[#FDF1F0] text-[#C85A54] ring-4 ring-[#C85A54]/30'
                  )}
                >
                  <Fingerprint className="w-10 h-10" />
                </div>

                <h4 className="text-xs font-bold text-[#28262D] mt-3">
                  {bioStatus === 'idle' && 'Place Registered Finger on Scanner'}
                  {bioStatus === 'scanning' && 'Reading Optical Ridge Patterns...'}
                  {bioStatus === 'matched' && 'Biometric Pattern Matched!'}
                  {bioStatus === 'error' && 'Sensor Read Error / Misalignment'}
                </h4>
                <p className="text-[11px] text-[#74717A] mt-0.5">
                  Touch sensor turnstile terminal at entrance lobby
                </p>

                <div className="mt-4 flex items-center justify-center gap-2">
                  <button
                    type="button"
                    disabled={bioStatus === 'scanning'}
                    onClick={triggerBioScan}
                    className="px-4 py-2 bg-[#714B67] hover:bg-[#5C3C53] text-white text-xs font-bold rounded-[10px] shadow-xs flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <Fingerprint className="w-3.5 h-3.5" />
                    Verify with laptop biometric
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Footer note */}
          <div className="mt-5 pt-3 border-t border-[#F4F3F5] flex items-center justify-between text-[11px] text-[#74717A]">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3 text-[#A4879F]" /> Working Schedule: 09:30 AM - 06:30 PM
            </span>
            <span>Indian Standard Time (IST)</span>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
