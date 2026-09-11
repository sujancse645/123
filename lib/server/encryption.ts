import 'server-only';
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';

function key(){const secret=process.env.BIOMETRIC_DATA_ENCRYPTION_KEY||process.env.BANK_DATA_ENCRYPTION_KEY;if(!secret)throw new Error('BIOMETRIC_DATA_ENCRYPTION_KEY is not configured');return createHash('sha256').update(secret).digest()}

export function encryptSensitiveValue(value: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key(), iv);
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  return `v1:${iv.toString('base64')}:${cipher.getAuthTag().toString('base64')}:${encrypted.toString('base64')}`;
}

export function decryptSensitiveValue(value:string){const [version,iv,tag,payload]=value.split(':');if(version!=='v1'||!iv||!tag||!payload)throw new Error('Unsupported encrypted value');const decipher=createDecipheriv('aes-256-gcm',key(),Buffer.from(iv,'base64'));decipher.setAuthTag(Buffer.from(tag,'base64'));return Buffer.concat([decipher.update(Buffer.from(payload,'base64')),decipher.final()]).toString('utf8')}
