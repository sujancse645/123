import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertTriangle, Info, CheckCircle2, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'primary' | 'success';
}

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'primary',
}: ConfirmDialogProps) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-[2px]">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.18 }}
          className="relative w-full max-w-md bg-white rounded-[18px] border border-[#E4E1E5] shadow-2xl p-6 overflow-hidden"
        >
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-full text-[#74717A] hover:bg-[#F4F3F5] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-start gap-4">
            <div
              className={cn(
                'w-10 h-10 rounded-[12px] flex items-center justify-center shrink-0',
                variant === 'danger' && 'bg-[#FDF1F0] text-[#C85A54]',
                variant === 'warning' && 'bg-[#FFF6D2] text-[#9A6B0A]',
                variant === 'success' && 'bg-[#EBF6F0] text-[#438A6B]',
                variant === 'primary' && 'bg-[#F3EEF2] text-[#714B67]'
              )}
            >
              {variant === 'danger' && <AlertTriangle className="w-5 h-5" />}
              {variant === 'warning' && <AlertTriangle className="w-5 h-5" />}
              {variant === 'success' && <CheckCircle2 className="w-5 h-5" />}
              {variant === 'primary' && <Info className="w-5 h-5" />}
            </div>

            <div className="flex-1">
              <h3 className="text-base font-semibold text-[#28262D]">{title}</h3>
              <p className="mt-1.5 text-sm text-[#74717A] leading-relaxed">{description}</p>
            </div>
          </div>

          <div className="mt-6 flex items-center justify-end gap-3 pt-4 border-t border-[#F4F3F5]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-[#28262D] bg-[#F4F3F5] hover:bg-[#E4E1E5] rounded-[10px] transition-colors"
            >
              {cancelText}
            </button>
            <button
              type="button"
              onClick={() => {
                onConfirm();
                onClose();
              }}
              className={cn(
                'px-4 py-2 text-sm font-semibold rounded-[10px] text-white shadow-xs transition-colors',
                variant === 'danger' && 'bg-[#C85A54] hover:bg-[#B34A44]',
                variant === 'warning' && 'bg-[#D49525] hover:bg-[#BE831D]',
                variant === 'success' && 'bg-[#438A6B] hover:bg-[#38765A]',
                variant === 'primary' && 'bg-[#714B67] hover:bg-[#5C3C53]'
              )}
            >
              {confirmText}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
