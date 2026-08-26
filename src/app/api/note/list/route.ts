import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const res = await pool.query(
    `SELECT
       n.id, n.title, n.transcribed_text, n.folder_id,
       CASE WHEN f.id IS NOT NULL THEN json_build_object('id', f.id, 'name', f.name) ELSE NULL END AS folder
     FROM public.notes n
     LEFT JOIN public.folders f ON f.id = n.folder_id
     WHERE n.user_id = $1
       AND n.title NOT LIKE '💬 Riwayat Obrolan:%'
     ORDER BY n.created_at DESC`,
    [userId]
  );

  return NextResponse.json({ notes: res.rows });
}
