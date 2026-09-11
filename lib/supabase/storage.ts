import { getSupabaseBrowserClient } from '@/lib/supabase/client';

export const BUCKETS = {
  MEDICAL_PROOFS: 'medical-proofs',
  PAYSLIPS: 'payslips',
  PROFILE_IMAGES: 'profile-images',
} as const;

/**
 * Uploads a file to a Supabase storage bucket.
 * Standard path convention: {companyId}/{employeeId}/{filename}
 */
export async function uploadFileToStorage(
  bucket: string,
  filePath: string,
  file: File | Blob,
  options?: { upsert?: boolean; contentType?: string }
): Promise<{ path: string | null; error: Error | null }> {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return { path: null, error: new Error('Supabase client is not available.') };
  const { data, error } = await supabase.storage.from(bucket).upload(filePath, file, {
    upsert: options?.upsert ?? true,
    contentType: options?.contentType,
  });

  if (error) {
    console.error(`Storage upload error (${bucket}/${filePath}):`, error);
    return { path: null, error: new Error(error.message) };
  }

  return { path: data.path, error: null };
}

/**
 * Creates a signed download URL valid for specified duration (default 1 hour = 3600s).
 */
export async function getSignedUrl(
  bucket: string,
  filePath: string,
  expiresInSeconds = 3600
): Promise<string | null> {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return null;
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(filePath, expiresInSeconds);

  if (error || !data?.signedUrl) {
    console.error(`Signed URL error (${bucket}/${filePath}):`, error);
    return null;
  }

  return data.signedUrl;
}

/**
 * Retrieves public URL for public bucket objects.
 */
export function getPublicUrl(bucket: string, filePath: string): string {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return '';
  const { data } = supabase.storage.from(bucket).getPublicUrl(filePath);
  return data.publicUrl;
}
