import { auth, currentUser } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import pool from '@/lib/db';

/**
 * GET /api/debug/my-id
 *
 * Endpoint debug: tampilkan Clerk user ID, email, dan apakah data ada di DB.
 * Gunakan ini untuk diagnosa masalah migrasi data.
 *
 * Hapus atau proteksi endpoint ini setelah selesai debugging.
 */
export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const user = await currentUser();
  const email = user?.emailAddresses.find(e => e.id === user.primaryEmailAddressId)
    ?.emailAddress ?? user?.emailAddresses[0]?.emailAddress ?? '';

  // Cek apakah ada profil dengan Clerk ID ini
  const profileByClerkId = await pool.query(
    `SELECT id FROM public.profiles WHERE id = $1`, [userId]
  );

  // Cek berapa banyak notes dengan Clerk ID ini
  const notesByClerkId = await pool.query(
    `SELECT COUNT(*) FROM public.notes WHERE user_id = $1`, [userId]
  );

  // Ambil semua user_id dari notes beserta jumlah dan sample judul
  const topOwners = await pool.query(
    `SELECT
       n.user_id,
       COUNT(*) AS note_count,
       array_agg(n.title ORDER BY n.created_at DESC) FILTER (WHERE n.title NOT LIKE '💬%') AS sample_titles
     FROM public.notes n
     GROUP BY n.user_id
     ORDER BY note_count DESC
     LIMIT 15`
  );

  return NextResponse.json({
    clerkUserId: userId,
    email,
    profileExistsWithClerkId: profileByClerkId.rows.length > 0,
    notesCountWithClerkId: parseInt(notesByClerkId.rows[0].count, 10),
    topNoteOwners: topOwners.rows.map(r => ({
      user_id: r.user_id,
      note_count: parseInt(r.note_count, 10),
      sample_titles: (r.sample_titles || []).slice(0, 3),
    })),
    hint: profileByClerkId.rows.length === 0
      ? 'Cari user_id yang cocok dari topNoteOwners (lihat sample_titles), lalu POST ke endpoint ini dengan { oldUserId: "..." }'
      : 'Profil sudah ada dengan Clerk ID — data seharusnya sudah muncul',
  });
}


/**
 * POST /api/debug/my-id
 * Body: { "oldUserId": "uuid-supabase-lama" }
 *
 * Jalankan migrasi manual: pindahkan semua data dari UUID Supabase lama ke Clerk ID.
 */
export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { oldUserId } = await req.json();
  if (!oldUserId) {
    return NextResponse.json({ error: 'oldUserId wajib diisi' }, { status: 400 });
  }

  // Pastikan oldUserId punya notes (verifikasi ada datanya)
  const notesCheck = await pool.query(
    `SELECT COUNT(*) as cnt FROM public.notes WHERE user_id = $1`, [oldUserId]
  );
  const noteCount = parseInt(notesCheck.rows[0].cnt, 10);
  if (noteCount === 0) {
    return NextResponse.json({
      error: `Tidak ada notes ditemukan untuk user_id "${oldUserId}"`,
      hint: 'Cek topNoteOwners dari GET endpoint untuk menemukan UUID yang benar',
    }, { status: 404 });
  }

  // Pastikan Clerk ID belum dipakai (idempoten)
  const clerkNotesCheck = await pool.query(
    `SELECT COUNT(*) as cnt FROM public.notes WHERE user_id = $1`, [userId]
  );
  if (parseInt(clerkNotesCheck.rows[0].cnt, 10) > 0) {
    return NextResponse.json({ message: 'Data sudah termigrasikan sebelumnya', migrated: false });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const tables = [
      'public.notes', 'public.folders', 'public.exam_results',
      'public.ai_chat_sessions', 'public.quizzes',
      'public.tags', 'public.shared_notes_history',
      'public.shared_folders_history',
    ];


    const results: Record<string, number> = {};
    for (const table of tables) {
      const r = await client.query(
        `UPDATE ${table} SET user_id = $1 WHERE user_id = $2`,
        [userId, oldUserId]
      );
      results[table] = r.rowCount ?? 0;
    }

    // Update profiles jika ada, atau insert baru jika tidak ada
    const profileExists = await client.query(
      `SELECT id FROM public.profiles WHERE id = $1 LIMIT 1`, [oldUserId]
    );
    if (profileExists.rows.length > 0) {
      await client.query(
        `UPDATE public.profiles SET id = $1 WHERE id = $2`,
        [userId, oldUserId]
      );
    } else {
      await client.query(
        `INSERT INTO public.profiles (id, is_premium, subscription_tier) VALUES ($1, false, 'free')`,
        [userId]
      );
    }

    await client.query('COMMIT');


    return NextResponse.json({
      success: true,
      migrated: true,
      oldUserId,
      newUserId: userId,
      tablesUpdated: results,
    });
  } catch (err: any) {
    await client.query('ROLLBACK');
    return NextResponse.json({ error: err.message }, { status: 500 });
  } finally {
    client.release();
  }
}
