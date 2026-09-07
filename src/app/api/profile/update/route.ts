import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import pool from '@/lib/db';

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { full_name, education_level, avatar_url } = await req.json();

    // Pastikan profil user sudah ada di database, jika belum maka buat
    await pool.query(
      `INSERT INTO public.profiles (id, full_name, education_level, avatar_url, updated_at)
       VALUES ($1, $2, $3, $4, NOW())
       ON CONFLICT (id) DO UPDATE SET
         full_name = COALESCE($2, public.profiles.full_name),
         education_level = COALESCE($3, public.profiles.education_level),
         avatar_url = COALESCE($4, public.profiles.avatar_url),
         updated_at = NOW()`,
      [userId, full_name !== undefined ? full_name : null, education_level !== undefined ? education_level : null, avatar_url !== undefined ? avatar_url : null]
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error updating profile:', error);
    return NextResponse.json({ error: error.message || 'Gagal menyimpan profil' }, { status: 500 });
  }
}
