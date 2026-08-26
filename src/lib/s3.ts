import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

export const R2_BUCKET = process.env.R2_BUCKET_NAME || 'arsipbelajar';
// Pastikan menambahkan variabel ini di .env.local jika bucket R2 dibuat public, 
// atau biarkan kosong jika Anda menggunakan presigned URL untuk baca.
export const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL || ''; 

/**
 * Mendapatkan Presigned URL untuk proses upload langsung dari browser ke R2.
 */
export async function getUploadPresignedUrl(key: string, contentType: string) {
  const command = new PutObjectCommand({
    Bucket: R2_BUCKET,
    Key: key,
    ContentType: contentType,
  });
  return await getSignedUrl(s3, command, { expiresIn: 3600 });
}

/**
 * Mendapatkan URL publik untuk membaca file dari R2.
 * Menggunakan custom domain (R2_PUBLIC_URL) jika ada, atau fallback ke Presigned URL.
 */
export async function getPublicUrl(key: string) {
  if (R2_PUBLIC_URL) {
    // Hilangkan trailing slash jika ada
    const baseUrl = R2_PUBLIC_URL.replace(/\/$/, '');
    return `${baseUrl}/${key}`;
  }
  
  // Fallback: Presigned URL untuk baca (valid selama 7 hari - maks R2)
  const command = new GetObjectCommand({
    Bucket: R2_BUCKET,
    Key: key,
  });
  return await getSignedUrl(s3, command, { expiresIn: 7 * 24 * 3600 });
}

/**
 * Menghapus objek dari R2.
 */
export async function deleteS3Object(key: string) {
  const command = new DeleteObjectCommand({
    Bucket: R2_BUCKET,
    Key: key,
  });
  await s3.send(command);
}
