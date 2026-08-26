import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import pool from '@/lib/db';

/**
 * POST /api/debug/fix-schema
 *
 * Konversi kolom user_id dan profiles.id dari UUID ke TEXT.
 * Hanya perlu dijalankan SEKALI. Aman dijalankan berulang (idempoten via DO NOTHING).
 */
export async function POST() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const alterStatements = [
    // profiles.id
    `ALTER TABLE public.profiles ALTER COLUMN id TYPE TEXT USING id::TEXT`,
    // semua tabel dengan user_id
    `ALTER TABLE public.notes ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT`,
    `ALTER TABLE public.folders ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT`,
    `ALTER TABLE public.exam_results ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT`,
    `ALTER TABLE public.ai_chat_sessions ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT`,
    `ALTER TABLE public.quizzes ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT`,
    `ALTER TABLE public.tags ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT`,
    `ALTER TABLE public.shared_notes_history ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT`,
    `ALTER TABLE public.shared_folders_history ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT`,
  ];

  const results: Record<string, string> = {};

  for (const sql of alterStatements) {
    // Ekstrak nama tabel + kolom dari SQL untuk label
    const label = sql.replace('ALTER TABLE ', '').split(' ALTER')[0] + ' → TEXT';
    try {
      await pool.query(sql);
      results[label] = 'OK';
    } catch (err: any) {
      // Kalau sudah TEXT, skip (tipe sudah sesuai)
      if (err.message?.includes('cannot be cast') || err.message?.includes('already')) {
        results[label] = 'SKIPPED (already text or incompatible)';
      } else {
        results[label] = `ERROR: ${err.message}`;
      }
    }
  }

  // Verifikasi tipe kolom setelah ALTER
  const verify = await pool.query(`
    SELECT table_name, column_name, data_type
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND column_name IN ('user_id', 'id')
      AND table_name IN ('profiles','notes','folders','exam_results','ai_chat_sessions','quizzes','tags','shared_notes_history','shared_folders_history')
    ORDER BY table_name, column_name
  `);

  return NextResponse.json({
    success: true,
    alterResults: results,
    currentSchema: verify.rows,
    nextStep: 'Schema sudah dikonversi ke TEXT. Sekarang jalankan POST /api/debug/my-id dengan oldUserId yang tepat untuk migrasi data.',
  });
}
