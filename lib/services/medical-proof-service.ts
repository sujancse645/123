import { MedicalProof, MedicalProofStatus, LeaveProofPolicy } from '@/lib/types';
import { DEMO_LEAVE_PROOF_POLICY, INITIAL_MEDICAL_PROOFS } from '@/lib/mock-data/leave-proof-policies';

/**
 * Service abstraction for Medical Proof operations.
 * Designed to be replaced with real backend API calls.
 */
class MedicalProofService {
  private proofs: MedicalProof[] = [...INITIAL_MEDICAL_PROOFS];
  private policy: LeaveProofPolicy = { ...DEMO_LEAVE_PROOF_POLICY };

  async getPolicy(): Promise<LeaveProofPolicy> {
    return { ...this.policy };
  }

  async getAllProofs(): Promise<MedicalProof[]> {
    return [...this.proofs];
  }

  async getProofsForEmployee(employeeId: string): Promise<MedicalProof[]> {
    return this.proofs.filter((p) => p.employeeId === employeeId);
  }

  async submitProof(
    proofId: string,
    file: { name: string; sizeMb: number; type: string }
  ): Promise<MedicalProof> {
    const idx = this.proofs.findIndex((p) => p.id === proofId);
    if (idx === -1) throw new Error('Proof record not found');

    const updated: MedicalProof = {
      ...this.proofs[idx],
      fileName: file.name,
      fileSizeMb: file.sizeMb,
      fileType: file.type,
      uploadedAt: new Date().toISOString().replace('T', ' ').slice(0, 16),
      status: 'submitted',
      hrRemarks: undefined,
    };
    this.proofs[idx] = updated;
    return updated;
  }

  async verifyProof(proofId: string, remarks?: string, verifierName: string = 'HR Manager'): Promise<MedicalProof> {
    const idx = this.proofs.findIndex((p) => p.id === proofId);
    if (idx === -1) throw new Error('Proof record not found');

    const updated: MedicalProof = {
      ...this.proofs[idx],
      status: 'verified',
      hrRemarks: remarks || 'Verified and approved by HR Manager',
      verifiedAt: new Date().toISOString().replace('T', ' ').slice(0, 16),
      verifiedBy: verifierName,
    };
    this.proofs[idx] = updated;
    return updated;
  }

  async rejectProof(proofId: string, reason: string): Promise<MedicalProof> {
    if (!reason || !reason.trim()) {
      throw new Error('A mandatory reason is required when rejecting medical proof.');
    }
    const idx = this.proofs.findIndex((p) => p.id === proofId);
    if (idx === -1) throw new Error('Proof record not found');

    const updated: MedicalProof = {
      ...this.proofs[idx],
      status: 'rejected',
      hrRemarks: reason.trim(),
    };
    this.proofs[idx] = updated;
    return updated;
  }

  async requestResubmission(proofId: string, instructions: string): Promise<MedicalProof> {
    if (!instructions || !instructions.trim()) {
      throw new Error('A mandatory explanation is required when requesting resubmission.');
    }
    const idx = this.proofs.findIndex((p) => p.id === proofId);
    if (idx === -1) throw new Error('Proof record not found');

    const updated: MedicalProof = {
      ...this.proofs[idx],
      status: 'resubmission_required',
      hrRemarks: instructions.trim(),
    };
    this.proofs[idx] = updated;
    return updated;
  }
}

export const medicalProofService = new MedicalProofService();
