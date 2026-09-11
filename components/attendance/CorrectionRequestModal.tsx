'use client';

import React, { useState } from 'react';
import { useApp } from '@/lib/context/app-context';
import { motion, AnimatePresence } from 'motion/react';
import { X, Clock, Calendar, AlertCircle } from 'lucide-react';

export function CorrectionRequestModal() {
  const { isCorrectionModalOpen, setIsCorrectionModalOpen, submitCorrectionRequest } = useApp();

  const [date, setDate] = useState('2026-09-03');
  const [inTime, setInTime] = useState('09:30 AM');
  const [outTime, setOutTime] = useState('06:30 PM');
  const [reason, setReason] = useState('');

  if (!isCorrectionModalOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) return;
    submitCorrectionRequest(date, inTime, outTime, reason);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative w-full max-w-md bg-white rounded-[18px] border border-[#E4E1E5] shadow-2xl p-6"
        >
          <div className="flex items-center justify-between pb-3 border-b border-[#F4F3F5]">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-[10px] bg-[#FFF6D2] text-[#9A6B0A] flex items-center justify-center">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#28262D]">Attendance Regularization</h3>
                <p className="text-[11px] text-[#74717A]">Request correction for missed or erroneous punch</p>
              </div>
            </div>
            <button
              onClick={() => setIsCorrectionModalOpen(false)}
              className="p-1 rounded-full text-[#74717A] hover:bg-[#F4F3F5]"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="mt-4 space-y-3.5">
            <div>
              <label className="block text-xs font-semibold text-[#28262D] mb-1">
                Affected Date *
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 bg-[#FBFAFB] border border-[#E4E1E5] focus:border-[#714B67] rounded-[10px] text-xs text-[#28262D] outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[#28262D] mb-1">
                  Actual Check-In *
                </label>
                <input
                  type="text"
                  placeholder="09:30 AM"
                  required
                  value={inTime}
                  onChange={(e) => setInTime(e.target.value)}
                  className="w-full px-3 py-2 bg-[#FBFAFB] border border-[#E4E1E5] focus:border-[#714B67] rounded-[10px] text-xs text-[#28262D] outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#28262D] mb-1">
                  Actual Check-Out *
                </label>
                <input
                  type="text"
                  placeholder="06:30 PM"
                  required
                  value={outTime}
                  onChange={(e) => setOutTime(e.target.value)}
                  className="w-full px-3 py-2 bg-[#FBFAFB] border border-[#E4E1E5] focus:border-[#714B67] rounded-[10px] text-xs text-[#28262D] outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#28262D] mb-1">
                Reason for Discrepancy *
              </label>
              <textarea
                rows={3}
                required
                placeholder="e.g. Biometric scanner turnstile failed to register exit, verified by security guard log..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full px-3 py-2 bg-[#FBFAFB] border border-[#E4E1E5] focus:border-[#714B67] rounded-[10px] text-xs text-[#28262D] outline-none resize-none"
              />
            </div>

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsCorrectionModalOpen(false)}
                className="px-4 py-2 text-xs font-medium text-[#74717A] hover:bg-[#F4F3F5] rounded-[10px]"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-[#714B67] hover:bg-[#5C3C53] text-white text-xs font-bold rounded-[10px] shadow-xs"
              >
                Submit for Approval
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
