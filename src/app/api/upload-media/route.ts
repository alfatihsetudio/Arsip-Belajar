import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import pool from '@/lib/db';
import { s3, R2_BUCKET, getPublicUrl } from '@/lib/s3';

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const formData = await req.formData();
    const files = formData.getAll('file') as File[];
    
    if (files.length === 0) {
      return NextResponse.json({ error: 'No files provided' }, { status: 400 });
    }

    // Check quota
    const profileRes = await pool.query(
      'SELECT storage_used, subscription_tier FROM public.profiles WHERE id = $1 LIMIT 1',
      [userId]
    );
    const profile = profileRes.rows[0] || {};
    const storageUsed = profile.storage_used || 0;
    const tier = profile.subscription_tier || 'free';
    const quota = tier === 'free' ? 100 * 1024 * 1024 :
                  tier === 'premium_1' ? 1024 * 1024 * 1024 :
                  3 * 1024 * 1024 * 1024;

    const totalSize = files.reduce((acc, f) => acc + f.size, 0);
    if (storageUsed + totalSize > quota) {
      return NextResponse.json({ error: 'Penyimpanan penuh! Silakan hapus catatan lama atau upgrade ke Premium.' }, { status: 403 });
    }

    const results: { key: string; url: string }[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const ext = file.name.split('.').pop() || 'bin';
      const key = `${userId}/${Date.now()}-${i}.${ext}`;
      const buffer = Buffer.from(await file.arrayBuffer());

      await s3.send(new PutObjectCommand({
        Bucket: R2_BUCKET,
        Key: key,
        Body: buffer,
        ContentType: file.type,
      }));

      const url = await getPublicUrl(key);
      results.push({ key, url });
    }

    return NextResponse.json({ data: results, error: null });
  } catch (err: any) {
    console.error('[upload-media]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
