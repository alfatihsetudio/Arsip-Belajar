'use server';

import { auth } from '@clerk/nextjs/server';
import { getUploadPresignedUrl } from '@/lib/s3';
import pool from '@/lib/db';

export async function generatePresignedUrls(files: { name: string; type: string; size: number }[]) {
  const { userId } = await auth();
  if (!userId) throw new Error('Unauthorized');

  // Periksa kuota (optional)
  const profileRes = await pool.query(`SELECT storage_used, subscription_tier FROM public.profiles WHERE id = $1 LIMIT 1`, [userId]);
  const profile = profileRes.rows[0];
  const storageUsed = profile?.storage_used || 0;
  const subscriptionTier = profile?.subscription_tier || 'free';
  const quota = subscriptionTier === 'free' ? 100 * 1024 * 1024 : 
                subscriptionTier === 'premium_1' ? 1024 * 1024 * 1024 : 
                3 * 1024 * 1024 * 1024;
  
  const totalUploadSize = files.reduce((acc, f) => acc + f.size, 0);
  if (storageUsed + totalUploadSize > quota) {
    throw new Error('Penyimpanan penuh! Silakan hapus catatan lama atau upgrade ke Premium.');
  }

  const results = await Promise.all(
    files.map(async (file, index) => {
      const ext = file.name.split('.').pop() || 'jpg';
      const key = `${userId}/${Date.now()}-${index}.${ext}`;
      const url = await getUploadPresignedUrl(key, file.type);
      return { key, url };
    })
  );

  return results;
}
