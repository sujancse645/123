'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '@/lib/context/app-context';
import {
  FileCheck,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Clock,
  Eye,
  FileText,
  AlertTriangle,
  RotateCcw,
  Download,
  Calendar,
  Check,
  Building,
} from 'lucide-react';
import { KPICard } from '@/components/shared/KPICard';
import { SemanticIconTile } from '@/components/shared/SemanticIconTile';
import { formatDate, cn } from '@/lib/utils';
import { MedicalProof, MedicalProofStatus } from '@/lib/types';
import { medicalProofService } from '@/lib/services/medical-proof-service';

export function MedicalProofsQueueView() {
  const { currentRole, showToast } = useApp();

  const [proofs, setProofs] = useState<MedicalProof[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedProof, setSelectedProof] = useState<MedicalProof | null>(null);

  // Modals for actions
  const [isVerifyModalOpen, setIsVerifyModalOpen] = useState(false);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [isResubmitModalOpen, setIsResubmitModalOpen] = useState(false);
  const [actionRemarks, setActionRemarks] = useState('');

  const reloadData = () => {
    medicalProofService.getAllProofs().then(setProofs);
  };

  useEffect(() => {
    reloadData();
  }, []);

  const handleVerify = async () => {
    if (!selectedProof) return;
    try {
      await medicalProofService.verifyProof(selectedProof.id, actionRemarks || 'Hospital certificate verified');
      showToast('success', `Medical proof for ${selectedProof.employeeName} verified`);
      setIsVerifyModalOpen(false);
      setActionRemarks('');
      reloadData();
    } catch {
      showToast('error', 'Failed to verify proof');
    }
  };

  const handleReject = async () => {
    if (!selectedProof) return;
    if (!actionRemarks.trim()) {
      showToast('error', 'Mandatory remarks are required to reject proof');
      return;
    }
    try {
      await medicalProofService.rejectProof(selectedProof.id, actionRemarks);
      showToast('info', `Medical proof for ${selectedProof.employeeName} rejected`);
      setIsRejectModalOpen(false);
      setActionRemarks('');
      reloadData();
    } catch {
      showToast('error', 'Failed to reject proof');
    }
  };

  const handleResubmit = async () => {
    if (!selectedProof) return;
    if (!actionRemarks.trim()) {
      showToast('error', 'Please provide instructions for what needs re-uploading');
      return;
    }
    try {
      await medicalProofService.requestResubmission(selectedProof.id, actionRemarks);
      showToast('info', `Resubmission requested from ${selectedProof.employeeName}`);
      setIsResubmitModalOpen(false);
      setActionRemarks('');
      reloadData();
    } catch {
      showToast('error', 'Failed to request resubmission');
    }
  };

  const filteredProofs = proofs.filter((p) => {
    const matchesSearch =
      p.employeeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.department.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.fileName && p.fileName.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!matchesSearch) return false;
    if (filterStatus === 'all') return true;
    return p.status === filterStatus;
  });

  const pendingReviewCount = proofs.filter((p) => p.status === 'submitted' || p.status === 'under_hr_review').length;
  const overdueCount = proofs.filter((p) => p.status === 'overdue').length;
  const verifiedCount = proofs.filter((p) => p.status === 'verified').length;

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E4E1E5] pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <SemanticIconTile icon={<FileCheck className="w-5 h-5" />} variant="leave" size="table" />
            <h1 className="text-2xl font-black tracking-tight text-[#28262D]">Medical Proof Verification Queue</h1>
          </div>
          <p className="text-xs text-[#74717A]">
            Audit and verify hospital discharge certificates, diagnostic reports, and medical proof for leaves ≥10 days.
          </p>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Pending HR Review"
          value={pendingReviewCount}
          subtitle="Awaiting doctor certificate check"
          icon={<Clock className="w-5 h-5" />}
          iconVariant="warning"
          warning={pendingReviewCount > 0}
        />
        <KPICard
          title="Overdue Submissions"
          value={overdueCount}
          subtitle="Passed return + 3 day deadline"
          icon={<AlertTriangle className="w-5 h-5" />}
          iconVariant="failure"
        />
        <KPICard
          title="Verified Proofs"
          value={verifiedCount}
          subtitle="Approved by HR Manager"
          icon={<CheckCircle2 className="w-5 h-5" />}
          iconVariant="verified"
          highlight
        />
        <KPICard
          title="Proof Policy Threshold"
          value="≥ 10 Days"
          subtitle="Mandatory certificate rule"
          icon={<FileText className="w-5 h-5" />}
          iconVariant="documents"
        />
      </div>

      {/* Filters & Search */}
      <div className="p-4 rounded-[16px] bg-white border border-[#E4E1E5] shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-[#74717A] absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search employee, certificate file..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 text-xs rounded-[10px] border border-[#E4E1E5] focus:outline-none focus:border-[#714B67]"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap w-full md:w-auto">
          <span className="text-xs font-semibold text-[#74717A] flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" /> Status:
          </span>
          {[
            { id: 'all', label: 'All' },
            { id: 'submitted', label: 'Submitted' },
            { id: 'under_hr_review', label: 'In Review' },
            { id: 'pending_upload', label: 'Pending Upload' },
            { id: 'overdue', label: 'Overdue' },
            { id: 'verified', label: 'Verified' },
            { id: 'resubmission_required', label: 'Resubmit' },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setFilterStatus(item.id)}
              className={cn(
                'px-2.5 py-1 rounded-[8px] text-xs font-bold transition-all',
                filterStatus === item.id
                  ? 'bg-[#714B67] text-white shadow-xs'
                  : 'bg-[#F4F3F5] text-[#74717A] hover:text-[#28262D]'
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Proofs Queue Table */}
      <div className="rounded-[18px] bg-white border border-[#E4E1E5] shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-[#FBFAFB] text-[#74717A] uppercase text-[10px] tracking-wider border-b border-[#F4F3F5]">
              <tr>
                <th className="py-3 px-4">Employee</th>
                <th className="py-3 px-4">Department</th>
                <th className="py-3 px-4">Leave Duration</th>
                <th className="py-3 px-4 text-center">Days</th>
                <th className="py-3 px-4">Uploaded File</th>
                <th className="py-3 px-4">Submission Deadline</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-center">HR Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F4F3F5]">
              {filteredProofs.map((proof) => (
                <tr key={proof.id} className="hover:bg-[#FBFAFB] transition-colors">
                  <td className="py-3 px-4">
                    <div className="font-bold text-[#28262D]">{proof.employeeName}</div>
                    <div className="text-[10px] text-[#74717A]">{proof.submissionOption === 'with_application' ? 'Uploaded with Request' : 'Post-Return Upload'}</div>
                  </td>
                  <td className="py-3 px-4 text-[#74717A]">{proof.department}</td>
                  <td className="py-3 px-4 text-[#28262D]">
                    {formatDate(proof.leaveStartDate)} – {formatDate(proof.leaveEndDate)}
                  </td>
                  <td className="py-3 px-4 text-center font-bold text-[#92400E]">
                    {proof.totalDays} Days
                  </td>
                  <td className="py-3 px-4">
                    {proof.fileName ? (
                      <div className="flex items-center gap-1.5 text-[#714B67] font-semibold hover:underline cursor-pointer">
                        <FileText className="w-3.5 h-3.5 text-[#5C6470]" />
                        <span className="max-w-[140px] truncate" title={proof.fileName}>
                          {proof.fileName}
                        </span>
                        <span className="text-[10px] text-[#74717A]">({proof.fileSizeMb}MB)</span>
                      </div>
                    ) : (
                      <span className="text-[#74717A] italic text-[11px]">Not uploaded yet</span>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <div className="text-[#28262D]">{formatDate(proof.submissionDeadline)}</div>
                    {proof.status === 'overdue' && (
                      <span className="text-[10px] text-[#C85A54] font-bold">Deadline Expired</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span
                      className={cn(
                        'px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider',
                        proof.status === 'verified' && 'bg-[#DCFCE7] text-[#166534]',
                        proof.status === 'submitted' && 'bg-[#FFF6D2] text-[#9A6B0A] border border-[#F8E29E]',
                        proof.status === 'under_hr_review' && 'bg-[#FEF3C7] text-[#92400E]',
                        proof.status === 'overdue' && 'bg-[#FEE2E2] text-[#991B1B]',
                        proof.status === 'resubmission_required' && 'bg-[#FFF8E1] text-[#B45309]',
                        proof.status === 'pending_upload' && 'bg-[#F4F3F5] text-[#74717A]'
                      )}
                    >
                      {proof.status.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <div className="flex items-center justify-center gap-1">
                      {proof.fileName && proof.status !== 'verified' && (
                        <button
                          onClick={() => {
                            setSelectedProof(proof);
                            setIsVerifyModalOpen(true);
                          }}
                          className="px-2 py-1 bg-[#438A6B] text-white rounded-[6px] text-[10px] font-bold hover:bg-[#346F55] transition-colors"
                          title="Verify Certificate"
                        >
                          Verify
                        </button>
                      )}

                      {proof.fileName && proof.status !== 'verified' && (
                        <button
                          onClick={() => {
                            setSelectedProof(proof);
                            setIsResubmitModalOpen(true);
                          }}
                          className="px-2 py-1 bg-[#FFF8E1] text-[#92400E] border border-[#FCD34D] rounded-[6px] text-[10px] font-bold hover:bg-[#FBE6A2] transition-colors"
                          title="Request Resubmission"
                        >
                          Resubmit
                        </button>
                      )}

                      {proof.status !== 'rejected' && proof.status !== 'verified' && (
                        <button
                          onClick={() => {
                            setSelectedProof(proof);
                            setIsRejectModalOpen(true);
                          }}
                          className="p-1 text-[#C85A54] hover:bg-[#FDF1F0] rounded-[6px]"
                          title="Reject Proof"
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                      )}

                      {proof.status === 'verified' && (
                        <span className="text-[10px] text-[#438A6B] font-bold flex items-center gap-1">
                          <Check className="w-3.5 h-3.5" /> Done
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* VERIFY MODAL */}
      {isVerifyModalOpen && selectedProof && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-[18px] p-6 shadow-xl border border-[#E4E1E5] space-y-4">
            <h3 className="text-sm font-bold text-[#28262D]">Verify Medical Certificate</h3>
            <p className="text-xs text-[#74717A]">
              Confirm that the uploaded document from <span className="font-bold text-[#28262D]">{selectedProof.employeeName}</span> satisfies hospital admission/physician proof requirements for {selectedProof.totalDays} days leave.
            </p>

            <div>
              <label className="block text-xs font-bold text-[#28262D] mb-1">HR Verification Remarks (Optional)</label>
              <textarea
                rows={2}
                value={actionRemarks}
                onChange={(e) => setActionRemarks(e.target.value)}
                placeholder="e.g. Validated against clinic letterhead and physician seal."
                className="w-full p-2.5 text-xs rounded-[10px] border border-[#E4E1E5] focus:outline-none focus:border-[#714B67]"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-[#F4F3F5]">
              <button
                onClick={() => setIsVerifyModalOpen(false)}
                className="px-3 py-1.5 text-xs font-semibold text-[#74717A] rounded-[8px] hover:bg-[#F4F3F5]"
              >
                Cancel
              </button>
              <button
                onClick={handleVerify}
                className="px-4 py-1.5 text-xs font-bold text-white bg-[#438A6B] rounded-[8px] hover:bg-[#346F55]"
              >
                Confirm Verification
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RESUBMIT MODAL */}
      {isResubmitModalOpen && selectedProof && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-[18px] p-6 shadow-xl border border-[#E4E1E5] space-y-4">
            <h3 className="text-sm font-bold text-[#28262D]">Request Resubmission</h3>
            <p className="text-xs text-[#74717A]">
              Notify {selectedProof.employeeName} to re-upload a compliant certificate.
            </p>

            <div>
              <label className="block text-xs font-bold text-[#28262D] mb-1">
                Reason & Resubmission Instructions <span className="text-[#C85A54]">*</span>
              </label>
              <textarea
                rows={3}
                value={actionRemarks}
                onChange={(e) => setActionRemarks(e.target.value)}
                placeholder="e.g. Document image is cut off at the bottom. Please upload full hospital discharge summary."
                className="w-full p-2.5 text-xs rounded-[10px] border border-[#E4E1E5] focus:outline-none focus:border-[#714B67]"
                required
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-[#F4F3F5]">
              <button
                onClick={() => setIsResubmitModalOpen(false)}
                className="px-3 py-1.5 text-xs font-semibold text-[#74717A] rounded-[8px] hover:bg-[#F4F3F5]"
              >
                Cancel
              </button>
              <button
                onClick={handleResubmit}
                className="px-4 py-1.5 text-xs font-bold text-white bg-[#B45309] rounded-[8px] hover:bg-[#92400E]"
              >
                Send Request to Employee
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REJECT MODAL */}
      {isRejectModalOpen && selectedProof && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-[18px] p-6 shadow-xl border border-[#E4E1E5] space-y-4">
            <h3 className="text-sm font-bold text-[#C85A54]">Reject Medical Proof</h3>
            <p className="text-xs text-[#74717A]">
              Rejecting medical proof will mark the corresponding leave days as non-compliant / loss-of-pay (LOP).
            </p>

            <div>
              <label className="block text-xs font-bold text-[#28262D] mb-1">
                Mandatory Rejection Justification <span className="text-[#C85A54]">*</span>
              </label>
              <textarea
                rows={3}
                value={actionRemarks}
                onChange={(e) => setActionRemarks(e.target.value)}
                placeholder="Specify regulatory or internal policy reason for rejection..."
                className="w-full p-2.5 text-xs rounded-[10px] border border-[#E4E1E5] focus:outline-none focus:border-[#C85A54]"
                required
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-[#F4F3F5]">
              <button
                onClick={() => setIsRejectModalOpen(false)}
                className="px-3 py-1.5 text-xs font-semibold text-[#74717A] rounded-[8px] hover:bg-[#F4F3F5]"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                className="px-4 py-1.5 text-xs font-bold text-white bg-[#C85A54] rounded-[8px] hover:bg-[#B04540]"
              >
                Reject Proof
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
