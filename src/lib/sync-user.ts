import pool from '@/lib/db';

/**
 * Ambil Supabase UUID lama berdasarkan email menggunakan Supabase Admin API.
 * Email disimpan di auth.users (Supabase), bukan di tabel profiles Neon.
 */
async function getSupabaseUuidByEmail(email: string): Promise<string | null> {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey || serviceRoleKey.startsWith('GANTI_')) {
    console.warn('[sync-user] SUPABASE_SERVICE_ROLE_KEY belum dikonfigurasi, skip lookup');
    return null;
  }

  console.log(`[sync-user] Looking up Supabase UUID for: ${email}`);

  try {
    // Coba dua endpoint: yang baru (search) dan yang lama (filter)
    const endpoints = [
      `${supabaseUrl}/auth/v1/admin/users?email=${encodeURIComponent(email)}`,
      `${supabaseUrl}/auth/v1/admin/users?filter=${encodeURIComponent(email)}`,
    ];

    let anyApiSuccess = false;

    for (const url of endpoints) {
      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${serviceRoleKey}`,
          apikey: serviceRoleKey,
        },
      });

      if (!res.ok) {
        const body = await res.text();
        console.warn(`[sync-user] Supabase API error (${url}):`, res.status, body);
        continue;
      }

      anyApiSuccess = true;
      const json = await res.json();
      console.log(`[sync-user] API response keys:`, Object.keys(json));

      // Respons bisa berupa array langsung atau { users: [...] }
      const users: Array<{ id: string; email: string }> = Array.isArray(json)
        ? json
        : (json.users ?? []);

      console.log(`[sync-user] Users found: ${users.length}, emails: ${users.map(u => u.email).join(', ')}`);

      const match = users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
      if (match) {
        console.log(`[sync-user] Found UUID: ${match.id}`);
        return match.id;
      }
    }

    if (!anyApiSuccess) {
      console.warn(`[sync-user] All Supabase Admin API calls failed for ${email}`);
      return undefined; // Terjadi error pada semua pemanggilan API
    }

    console.warn(`[sync-user] No Supabase user found for email: ${email}`);
    return null; // Benar-benar tidak ditemukan (API sukses tapi array kosong / tidak match)
  } catch (err) {
    console.warn('[sync-user] Failed to fetch from Supabase Admin API:', err);
    return undefined; // Terjadi error (mis. network), jangan di-treat sebagai "tidak ada"
  }
}


/**
 * Sync user data dari Supabase UUID lama ke Clerk user ID baru.
 *
 * Alur:
 * 1. Fast-path: jika Clerk ID sudah ada di profiles → langsung return (sudah termigrasikan)
 * 2. Gunakan Supabase Admin API untuk dapat UUID lama berdasarkan email
 * 3. Cek apakah UUID itu ada di tabel profiles Neon
 * 4. Jika ya, update semua tabel secara atomik dalam satu transaksi
 *
 * Idempoten — aman dipanggil berulang kali.
 *
 * @param clerkUserId - ID Clerk baru, mis. "user_2abcXYZ..."
 * @param email       - Email utama user dari Clerk
 */
export async function syncUserDataByEmail(
  clerkUserId: string,
  email: string
): Promise<{ migrated: boolean; oldId?: string }> {
  if (!email || !clerkUserId) return { migrated: false };

  // ── Fast-path ──────────────────────────────────────────────────────────────
  // Jika Clerk ID sudah ada di profiles → sudah termigrasikan, langsung return
  const existing = await pool.query(
    `SELECT id FROM public.profiles WHERE id = $1 LIMIT 1`,
    [clerkUserId]
  );
  if (existing.rows.length > 0) {
    return { migrated: false }; // sudah sync sebelumnya
  }

  // ── Lookup UUID Supabase lama via Admin API ────────────────────────────────
  const oldId = await getSupabaseUuidByEmail(email);
  
  if (oldId === undefined) {
    // Terjadi error saat memanggil API Supabase Admin.
    // Jangan buat profil baru agar sistem bisa mencoba lagi di login berikutnya.
    return { migrated: false };
  }

  if (oldId === null) {
    // Pengguna baru (benar-benar tidak ada data lama di Supabase). 
    // Buatkan profil dengan Clerk ID agar login berikutnya tidak perlu 
    // memanggil Admin API lagi (langsung masuk fast-path).
    await pool.query(
      `INSERT INTO public.profiles (id, is_premium, subscription_tier) 
       VALUES ($1, false, 'free') 
       ON CONFLICT (id) DO NOTHING`,
      [clerkUserId]
    );
    console.log(`[sync-user] Created fresh profile for new user: ${email}`);
    return { migrated: false };
  }

  if (oldId === clerkUserId) return { migrated: false };

  // ── Migrasi atomik ────────────────────────────────────────────────────────
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Double-check: Clerk ID belum ada di profiles (race condition guard)
    const doubleCheck = await client.query(
      `SELECT id FROM public.profiles WHERE id = $1 LIMIT 1`,
      [clerkUserId]
    );
    if (doubleCheck.rows.length > 0) {
      await client.query('ROLLBACK');
      return { migrated: false };
    }

    // Hanya tabel yang BENAR-BENAR punya kolom user_id (verified dari information_schema)
    const tablesWithUserId = [
      'public.notes',
      'public.folders',
      'public.exam_results',
      'public.ai_chat_sessions',
      'public.quizzes',
      'public.tags',
      'public.shared_notes_history',
      'public.shared_folders_history',
      // note_media & ai_chat_messages tidak punya user_id — linked via note_id/session_id
    ];


    for (const table of tablesWithUserId) {
      await client.query(
        `UPDATE ${table} SET user_id = $1 WHERE user_id = $2`,
        [clerkUserId, oldId]
      );
    }

    // Update profiles.id (primary key) — terakhir. 
    // Jika profil lama ada, update ID-nya. Jika tidak, insert baru.
    const oldProfileRes = await client.query(
      `SELECT id FROM public.profiles WHERE id = $1 LIMIT 1`, [oldId]
    );
    if (oldProfileRes.rows.length > 0) {
      await client.query(
        `UPDATE public.profiles SET id = $1 WHERE id = $2`,
        [clerkUserId, oldId]
      );
    } else {
      await client.query(
        `INSERT INTO public.profiles (id, is_premium, subscription_tier) VALUES ($1, false, 'free')`,
        [clerkUserId]
      );
    }

    await client.query('COMMIT');

    console.log(`[sync-user] ✅ Migrated ${email}: ${oldId} → ${clerkUserId}`);
    return { migrated: true, oldId };
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[sync-user] Migration failed, rolling back:', err);
    throw err;
  } finally {
    client.release();
  }
}
