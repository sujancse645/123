import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient, createUserScopedClient } from '@/lib/supabase/server';

const BUCKET = 'profile-photos';
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

export async function GET(request:NextRequest){try{const token=request.headers.get('authorization')?.replace(/^Bearer\s+/,'');if(!token)return NextResponse.json({error:{message:'Authentication required'}},{status:401});const scoped=createUserScopedClient(token),service=createServiceRoleClient();const {data:auth}=await scoped.auth.getUser(token);if(!auth.user)return NextResponse.json({error:{message:'Invalid session'}},{status:401});const {data:employee}=await service.from('employees').select('profile_photo_path').eq('user_id',auth.user.id).single();if(!employee?.profile_photo_path)return NextResponse.json({signedUrl:null});const signed=await service.storage.from(BUCKET).createSignedUrl(employee.profile_photo_path,60*60*24*7);if(signed.error)throw signed.error;return NextResponse.json({signedUrl:signed.data.signedUrl});}catch(error){return NextResponse.json({error:{message:error instanceof Error?error.message:'Unable to load profile photo'}},{status:400})}}

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace(/^Bearer\s+/, '');
    if (!token) return NextResponse.json({ error: { code: 'UNAUTHENTICATED', message: 'Bearer token required' } }, { status: 401 });

    const scoped = createUserScopedClient(token);
    const service = createServiceRoleClient();
    const { data: auth, error: authError } = await scoped.auth.getUser(token);
    if (authError || !auth.user) return NextResponse.json({ error: { code: 'UNAUTHENTICATED', message: 'Invalid session' } }, { status: 401 });

    const { data: employee, error: employeeError } = await scoped
      .from('employees')
      .select('id,company_id,profile_photo_path')
      .eq('user_id', auth.user.id)
      .single();
    if (employeeError || !employee) throw employeeError ?? new Error('No employee record is linked to this account');

    const formData = await request.formData();
    const photo = formData.get('photo');
    if (!(photo instanceof File)) return NextResponse.json({ error: { code: 'PHOTO_REQUIRED', message: 'Choose a profile photograph.' } }, { status: 422 });
    if (!ALLOWED_TYPES.has(photo.type)) return NextResponse.json({ error: { code: 'INVALID_PHOTO_TYPE', message: 'Use a JPEG, PNG or WebP image.' } }, { status: 422 });
    if (photo.size > MAX_FILE_SIZE) return NextResponse.json({ error: { code: 'PHOTO_TOO_LARGE', message: 'Profile photograph must be 5 MB or smaller.' } }, { status: 422 });

    const bucket = await service.storage.getBucket(BUCKET);
    if (bucket.error) {
      const created = await service.storage.createBucket(BUCKET, {
        public: false,
        fileSizeLimit: MAX_FILE_SIZE,
        allowedMimeTypes: [...ALLOWED_TYPES],
      });
      if (created.error && !created.error.message.toLowerCase().includes('already exists')) throw created.error;
    }

    const extension = photo.type === 'image/png' ? 'png' : photo.type === 'image/webp' ? 'webp' : 'jpg';
    const path = `${employee.company_id}/${employee.id}/${crypto.randomUUID()}.${extension}`;
    const upload = await service.storage.from(BUCKET).upload(path, Buffer.from(await photo.arrayBuffer()), {
      contentType: photo.type,
      upsert: false,
    });
    if (upload.error) throw upload.error;

    const updated=await service.from('employees').update({profile_photo_path:path}).eq('id',employee.id);
    if(updated.error)throw updated.error;
    const signed=await service.storage.from(BUCKET).createSignedUrl(path,60*60*24*7);
    await service.from('audit_logs').insert({company_id:employee.company_id,actor_user_id:auth.user.id,action:'employee_profile_photo_updated',entity_table:'employees',entity_id:employee.id,summary:{profile_photo_path:path,face_reference_updated:true}});
    if(employee.profile_photo_path&&employee.profile_photo_path!==path)await service.storage.from(BUCKET).remove([employee.profile_photo_path]);

    return NextResponse.json({ profilePhotoPath: path, signedUrl:signed.data?.signedUrl??null, faceReferenceUpdated:true }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: { code: 'PROFILE_PHOTO_UPLOAD_ERROR', message: error instanceof Error ? error.message : 'Unable to upload profile photograph' } }, { status: 400 });
  }
}
