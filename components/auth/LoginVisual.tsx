'use client';

import React from 'react';
import { BarChart3, CalendarCheck, ShieldCheck } from 'lucide-react';
import { PeoplePayLogo } from '@/components/brand/PeoplePayLogo';

export function LoginVisual() {
  const sceneRef = React.useRef<HTMLDivElement>(null);

  const moveScene = (event: React.PointerEvent<HTMLDivElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - bounds.left) / bounds.width - 0.5) * 2;
    const y = ((event.clientY - bounds.top) / bounds.height - 0.5) * 2;
    sceneRef.current?.style.setProperty('--pointer-x', x.toFixed(3));
    sceneRef.current?.style.setProperty('--pointer-y', y.toFixed(3));
  };

  const resetScene = () => {
    sceneRef.current?.style.setProperty('--pointer-x', '0');
    sceneRef.current?.style.setProperty('--pointer-y', '0');
  };

  return (
    <aside ref={sceneRef} onPointerMove={moveScene} onPointerLeave={resetScene} className="login-scene relative hidden min-h-screen overflow-hidden bg-[#51364A] p-10 text-white lg:flex lg:flex-col lg:justify-between" aria-label="PeoplePay360 product overview">
      <div className="login-scene-grid absolute inset-0" aria-hidden="true" />
      {Array.from({ length: 7 }, (_, index) => <span key={index} className={`login-bubble login-bubble-${index + 1}`} aria-hidden="true" />)}

      <div className="relative z-10 flex items-center gap-3">
        <span className="rounded-[12px] bg-white p-2 shadow-lg"><PeoplePayLogo size={38} /></span>
        <div>
          <p className="text-xl font-bold">PeoplePay360</p>
          <p className="text-xs text-white/70">One workspace for your people operations</p>
        </div>
      </div>

      <div className="relative z-10 max-w-xl">
        <p className="mb-3 text-xs font-bold uppercase tracking-[0.22em] text-[#F4C430]">Workforce operations, connected</p>
        <h2 className="max-w-lg text-5xl font-semibold leading-[1.05]">Payroll clarity for every working day.</h2>
        <p className="mt-5 max-w-lg text-base leading-7 text-white/75">Manage attendance, leave, contracts, payroll, loans, and employee records from one secure workspace.</p>
        <div className="mt-8 grid max-w-lg grid-cols-3 gap-3">
          <Feature icon={CalendarCheck} label="Attendance" />
          <Feature icon={BarChart3} label="Payroll" />
          <Feature icon={ShieldCheck} label="Secure access" />
        </div>
      </div>

      <p className="relative z-10 text-xs text-white/55">Built for HR, payroll teams, and employees.</p>
    </aside>
  );
}

function Feature({ icon: Icon, label }: { icon: typeof CalendarCheck; label: string }) {
  return <div className="flex items-center gap-2 rounded-[10px] border border-white/15 bg-white/10 px-3 py-2.5 text-xs font-semibold backdrop-blur-sm"><Icon className="h-4 w-4 text-[#F4C430]" />{label}</div>;
}
