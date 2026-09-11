'use client';

import React, { useState } from 'react';
import { useApp } from '@/lib/context/app-context';
import { UploadCloud, FileText, Check, AlertCircle, X, ShieldAlert } from 'lucide-react';
import { formatINR, formatDate, cn } from '@/lib/utils';
import { MedicalProof } from '@/lib/types';
import { DEMO_LEAVE_PROOF_POLICY } from '@/lib/mock-data/leave-proof-policies';
import { medicalProofService } from '@/lib/services/medical-proof-service';

interface MedicalProofUploadModalProps {
  proof: MedicalProof;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function MedicalProofUploadModal({
  proof,
  isOpen,
  onClose,
  onSuccess,
}: MedicalProofUploadModalProps) {
  const { showToast } = useApp();

  const [file, setFile] = useState<File | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMsg(null);
    if (!e.target.files || e.target.files.length === 0) return;

    const selected = e.target.files[0];
    const allowed = ['application/pdf', 'image/jpeg', 'image/png'];

    if (!allowed.includes(selected.type)) {
      setErrorMsg('Invalid file format. Please upload a PDF, JPEG, or PNG document.');
      return;
    }

    const sizeMb = selected.size / (1024 * 1024);
    if (sizeMb > DEMO_LEAVE_PROOF_POLICY.maximumFileSizeMb) {
      setErrorMsg(`File exceeds the maximum allowed size of ${DEMO_LEAVE_PROOF_POLICY.maximumFileSizeMb}MB.`);
      return;
    }

    setFile(selected);
  };

  const handleUpload = async () => {
    if (!file) {
      setErrorMsg('Please select a certificate or discharge document to upload.');
      return;
    }

    setIsUploading(true);
    try {
      await medicalProofService.submitProof(proof.id, {
        name: file.name,
        sizeMb: parseFloat((file.size / (1024 * 1024)).toFixed(1)),
        type: file.type,
      });
      showToast('success', 'Medical certificate successfully submitted for HR review');
      onSuccess();
      onClose();
    } catch {
      showToast('error', 'Failed to upload document');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
      <div className="w-full max-w-lg bg-white rounded-[18px] p-6 shadow-xl border border-[#E4E1E5] space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[#F4F3F5]">
          <div>
            <h3 className="text-base font-bold text-[#28262D]">Upload Medical Proof</h3>
            <p className="text-xs text-[#74717A]">
              Leave duration: {proof.totalDays} days ({formatDate(proof.leaveStartDate)} – {formatDate(proof.leaveEndDate)})
            </p>
          </div>
          <button onClick={onClose} className="p-1 rounded-md text-[#74717A] hover:text-[#28262D]">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Policy notice */}
        <div className="p-3.5 rounded-[12px] bg-[#FFF8E1] border border-[#FBE6A2] text-xs text-[#92400E] space-y-1">
          <p className="font-bold flex items-center gap-1.5">
            <ShieldAlert className="w-4 h-4" />
            Mandatory Medical Policy Threshold
          </p>
          <p>
            Company policy requires verified hospital discharge summaries or signed physician certificates for medical leave of 10 days or longer.
          </p>
          <p className="text-[11px] text-[#74717A]">
            Deadline: <span className="font-semibold text-[#28262D]">{formatDate(proof.submissionDeadline)}</span> (3 days post-return).
          </p>
        </div>

        {proof.hrRemarks && (
          <div className="p-3 rounded-[10px] bg-[#FEE2E2] border border-[#FECACA] text-xs text-[#991B1B]">
            <span className="font-bold block mb-0.5">HR Remarks / Resubmission note:</span>
            {proof.hrRemarks}
          </div>
        )}

        {/* Upload dropzone */}
        <div>
          <label className="block text-xs font-bold text-[#28262D] mb-1.5">
            Attach Medical Certificate / Hospital Notes (PDF, JPG, PNG up to 10MB)
          </label>
          <div className="p-6 rounded-[14px] border-2 border-dashed border-[#E4E1E5] hover:border-[#714B67] bg-[#FBFAFB] text-center transition-colors">
            <UploadCloud className="w-8 h-8 text-[#74717A] mx-auto mb-2" />
            {file ? (
              <div className="flex items-center justify-center gap-2 text-xs font-bold text-[#714B67]">
                <FileText className="w-4 h-4" />
                <span>{file.name}</span>
                <span className="text-[10px] text-[#74717A]">({(file.size / (1024 * 1024)).toFixed(1)} MB)</span>
              </div>
            ) : (
              <div>
                <p className="text-xs font-semibold text-[#28262D]">
                  Drag and drop your file here, or click to browse
                </p>
                <p className="text-[10px] text-[#74717A] mt-1">
                  Accepted formats: PDF, JPEG, PNG (Max 10 MB)
                </p>
              </div>
            )}
            <input
              type="file"
              id="medical-proof-file"
              accept=".pdf,.jpg,.jpeg,.png"
              className="hidden"
              onChange={handleFileChange}
            />
            <label
              htmlFor="medical-proof-file"
              className="inline-block mt-3 px-4 py-1.5 rounded-[8px] bg-white border border-[#E4E1E5] text-xs font-bold text-[#714B67] cursor-pointer hover:bg-[#F4F3F5] transition-colors"
            >
              Select File
            </label>
          </div>
          {errorMsg && (
            <p className="text-xs text-[#C85A54] font-semibold mt-1.5 flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5" />
              {errorMsg}
            </p>
          )}
        </div>

        <div className="pt-3 border-t border-[#F4F3F5] flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-[#74717A] rounded-[10px] hover:bg-[#F4F3F5]"
          >
            Cancel
          </button>
          <button
            onClick={handleUpload}
            disabled={!file || isUploading}
            className="px-5 py-2 text-xs font-bold text-white bg-[#714B67] rounded-[10px] hover:bg-[#5E3D55] disabled:opacity-50 transition-colors flex items-center gap-1.5"
          >
            <Check className="w-4 h-4" />
            <span>{isUploading ? 'Uploading...' : 'Submit Document'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
