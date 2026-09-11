'use client';

import React from 'react';
import { useApp } from '@/lib/context/app-context';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export function ToastContainer() {
  const { toasts, removeToast } = useApp();

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none px-4 sm:px-0">
      <AnimatePresence>
        {toasts.map((toast) => {
          let icon = <Info className="w-5 h-5 text-[#714B67]" />;
          let border = 'border-[#E4E1E5]';
          let accent = 'bg-[#714B67]';

          if (toast.type === 'success') {
            icon = <CheckCircle2 className="w-5 h-5 text-[#438A6B]" />;
            border = 'border-[#C3E6D5]';
            accent = 'bg-[#438A6B]';
          } else if (toast.type === 'warning') {
            icon = <AlertTriangle className="w-5 h-5 text-[#D49525]" />;
            border = 'border-[#F8E29E]';
            accent = 'bg-[#D49525]';
          } else if (toast.type === 'error') {
            icon = <XCircle className="w-5 h-5 text-[#C85A54]" />;
            border = 'border-[#F6CBC8]';
            accent = 'bg-[#C85A54]';
          }

          return (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 15, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.15 } }}
              transition={{ duration: 0.2 }}
              className={cn(
                'pointer-events-auto relative flex items-start gap-3 p-4 bg-white/95 backdrop-blur-md rounded-[14px] border shadow-lg overflow-hidden',
                border
              )}
            >
              <div className={cn('absolute left-0 top-0 bottom-0 w-1', accent)} />
              <div className="shrink-0 pt-0.5">{icon}</div>
              <div className="flex-1 min-w-0 pr-2">
                <p className="text-sm font-semibold text-[#28262D]">{toast.title}</p>
                <p className="text-xs text-[#74717A] mt-0.5 leading-relaxed">{toast.message}</p>
              </div>
              <button
                onClick={() => removeToast(toast.id)}
                className="shrink-0 p-1 text-[#74717A] hover:text-[#28262D] rounded-md transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
