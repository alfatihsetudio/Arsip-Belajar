import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import pool from '@/lib/db';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Verify session belongs to user
    const sessionRes = await pool.query(
      'SELECT * FROM public.ai_chat_sessions WHERE id = $1 AND user_id = $2 LIMIT 1',
      [id, userId]
    );

    if (sessionRes.rows.length === 0) {
      return NextResponse.json({ error: 'Sesi obrolan tidak ditemukan' }, { status: 404 });
    }

    // Fetch messages
    const messagesRes = await pool.query(
      'SELECT id, role, content, created_at FROM public.ai_chat_messages WHERE session_id = $1 ORDER BY created_at ASC',
      [id]
    );

    return NextResponse.json({ session: sessionRes.rows[0], messages: messagesRes.rows });
  } catch (err: any) {
    console.error('API GET Session Details Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Delete messages and session
    await pool.query('DELETE FROM public.ai_chat_messages WHERE session_id = $1', [id]);
    await pool.query(
      'DELETE FROM public.ai_chat_sessions WHERE id = $1 AND user_id = $2',
      [id, userId]
    );

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('API DELETE Session Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const { title } = body;

    if (!title || !title.trim()) {
      return NextResponse.json({ error: 'Judul tidak boleh kosong' }, { status: 400 });
    }

    await pool.query(
      'UPDATE public.ai_chat_sessions SET title = $1 WHERE id = $2 AND user_id = $3',
      [title.trim(), id, userId]
    );

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('API PUT Session Rename Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
