import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const res = await pool.query(
    `SELECT id, name FROM public.folders WHERE user_id = $1 ORDER BY name`,
    [userId]
  );

  return NextResponse.json({ folders: res.rows });
}
