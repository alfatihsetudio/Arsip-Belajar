import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { sessionTitle, transcript } = await req.json();
  if (!sessionTitle || !transcript) {
    return NextResponse.json({ error: 'Missing sessionTitle or transcript' }, { status: 400 });
  }

  const noteTitle = `💬 Riwayat Obrolan: ${sessionTitle}`;

  // Upsert: update jika sudah ada, insert jika belum
  const existingRes = await pool.query(
    `SELECT id, visibility, allowed_emails FROM public.notes
     WHERE user_id = $1 AND title = $2 LIMIT 1`,
    [userId, noteTitle]
  );

  if (existingRes.rows.length > 0) {
    const existing = existingRes.rows[0];
    await pool.query(
      `UPDATE public.notes SET transcribed_text = $1 WHERE id = $2`,
      [transcript, existing.id]
    );
    return NextResponse.json({
      noteId: existing.id,
      visibility: existing.visibility,
      allowedEmails: existing.allowed_emails,
    });
  } else {
    const insertRes = await pool.query(
      `INSERT INTO public.notes (user_id, title, transcribed_text, visibility, allowed_emails)
       VALUES ($1, $2, $3, 'private', '{}')
       RETURNING id, visibility, allowed_emails`,
      [userId, noteTitle, transcript]
    );
    const newNote = insertRes.rows[0];
    return NextResponse.json({
      noteId: newNote.id,
      visibility: newNote.visibility,
      allowedEmails: newNote.allowed_emails,
    });
  }
}
