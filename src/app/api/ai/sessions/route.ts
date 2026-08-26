import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import pool from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const res = await pool.query(
      'SELECT id, title, created_at FROM public.ai_chat_sessions WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );

    return NextResponse.json({ sessions: res.rows });
  } catch (err: any) {
    console.error('API GET Sessions Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { title } = await req.json();

    if (!title?.trim()) {
      return NextResponse.json({ error: 'Judul kosong' }, { status: 400 });
    }

    const res = await pool.query(
      'INSERT INTO public.ai_chat_sessions (title, user_id) VALUES ($1, $2) RETURNING *',
      [title.trim(), userId]
    );

    return NextResponse.json({ session: res.rows[0] });
  } catch (err: any) {
    console.error('API POST Session Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
