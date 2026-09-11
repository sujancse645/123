'use client';

import React, { useState } from 'react';
import { useApp } from '@/lib/context/app-context';
import {
  Cpu,
  RefreshCw,
  Activity,
  CheckCircle2,
  AlertTriangle,
  Wifi,
  WifiOff,
  Server,
  Building,
} from 'lucide-react';
import { BIOMETRIC_DEVICES } from '@/lib/mock-data/devices-and-audit';
import { formatDateTime } from '@/lib/utils';

export function BiometricDevicesView() {
  const { addToast } = useApp();
  const [devices, setDevices] = useState(BIOMETRIC_DEVICES);
  const [syncingId, setSyncingId] = useState<string | null>(null);

  const handleSync = (id: string, name: string) => {
    setSyncingId(id);
    setTimeout(() => {
      setSyncingId(null);
      setDevices((prev) =>
        prev.map((d) => (d.id === id ? { ...d, lastSync: new Date().toISOString() } : d))
      );
      addToast({
        title: 'Biometric Device Synced',
        description: `${name} synchronized attendance punch cache with central server.`,
        type: 'success',
      });
    }, 800);
  };

  const handlePing = (name: string, ip: string) => {
    addToast({
      title: 'Ping Successful',
      description: `ICMP response from ${name} (${ip}) in 14ms.`,
      type: 'info',
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-[16px] border border-[#E4E1E5] shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-[#28262D] tracking-tight">Biometric Hardware & Turnstiles</h2>
          <p className="text-xs text-[#74717A] mt-0.5">
            Monitor optical turnstiles, facial recognition gates, and physical access controllers.
          </p>
        </div>

        <button
          onClick={() => {
            addToast({
              title: 'Fleet Sync Triggered',
              description: 'Initiated broadcast synchronization across all hardware devices.',
              type: 'success',
            });
          }}
          className="px-4 py-2 bg-[#714B67] hover:bg-[#5C3C53] text-white text-xs font-bold rounded-[10px] shadow-xs flex items-center gap-1.5 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Sync All Turnstiles</span>
        </button>
      </div>

      {/* Devices Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {devices.map((device) => {
          const isOnline = device.status === 'connected';
          const isWarning = device.status === 'syncing';
          const isSyncing = syncingId === device.id;

          return (
            <div
              key={device.id}
              className="bg-white rounded-[16px] border border-[#E4E1E5] shadow-xs p-5 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-[12px] flex items-center justify-center font-bold ${
                        isOnline
                          ? 'bg-[#EBF6F0] text-[#438A6B]'
                          : isWarning
                          ? 'bg-[#FFF6D2] text-[#9A6B0A]'
                          : 'bg-[#FDF1F0] text-[#C85A54]'
                      }`}
                    >
                      <Cpu className="w-5 h-5" />
                    </div>

                    <div>
                      <h3 className="text-sm font-bold text-[#28262D]">{device.name}</h3>
                      <p className="text-xs text-[#74717A] mt-0.5">{device.location}</p>
                    </div>
                  </div>

                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      isOnline
                        ? 'bg-[#EBF6F0] text-[#438A6B]'
                        : isWarning
                        ? 'bg-[#FFF6D2] text-[#9A6B0A]'
                        : 'bg-[#FDF1F0] text-[#C85A54]'
                    }`}
                  >
                    {isOnline ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
                    <span className="capitalize">{device.status}</span>
                  </span>
                </div>

                <div className="mt-4 pt-3 border-t border-[#F4F3F5] space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[#74717A]">IP Address:</span>
                    <span className="font-mono text-[#28262D]">{device.ipAddress}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-[#74717A]">Firmware Version:</span>
                    <span className="font-mono text-[#28262D]">{device.firmware || 'v3.8.4-stable'}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-[#74717A]">Last Heartbeat / Sync:</span>
                    <span className="text-[#74717A]">{device.lastSync}</span>
                  </div>
                </div>
              </div>

              <div className="mt-5 pt-3 border-t border-[#F4F3F5] flex items-center justify-end gap-2 text-xs">
                <button
                  onClick={() => handlePing(device.name, device.ipAddress)}
                  className="px-3 py-1.5 rounded-[8px] border border-[#E4E1E5] hover:bg-[#F4F3F5] text-[#28262D] font-medium transition-colors"
                >
                  Ping ICMP
                </button>

                <button
                  onClick={() => handleSync(device.id, device.name)}
                  disabled={isSyncing}
                  className="px-3.5 py-1.5 rounded-[8px] bg-[#714B67] hover:bg-[#5C3C53] text-white font-bold transition-colors flex items-center gap-1.5 disabled:opacity-60"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                  <span>{isSyncing ? 'Syncing...' : 'Sync Logs'}</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
