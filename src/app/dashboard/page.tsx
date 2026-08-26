import { auth } from '@clerk/nextjs/server';
import Link from 'next/link';
import NotesList from '@/components/notes/NotesList';
import pool from '@/lib/db';

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; folder?: string; tag?: string }>;
}) {
  const { q, folder } = await searchParams;
  const { userId } = await auth();
  if (!userId) return null;

  // Build notes query
  const params: unknown[] = [userId];
  let whereExtra = '';

  if (q) {
    params.push(`%${q}%`);
    whereExtra += ` AND (n.title ILIKE $${params.length} OR n.transcribed_text ILIKE $${params.length})`;
    params.push(`%${q}%`);
    whereExtra = ` AND (n.title ILIKE $2 OR n.transcribed_text ILIKE $2)`;
    params.length = 2; // reset to 2 params
  }

  if (folder) {
    params.push(folder);
    whereExtra += ` AND n.folder_id = $${params.length}`;
  }

  const notesRes = await pool.query(
    `SELECT
       n.id, n.title, n.transcribed_text, n.created_at,
       CASE WHEN f.id IS NOT NULL
         THEN json_build_object('id', f.id, 'name', f.name)
         ELSE NULL
       END AS folder,
       COALESCE(
         json_agg(json_build_object('media_url', nm.media_url, 'order_index', nm.order_index)
           ORDER BY nm.order_index)
         FILTER (WHERE nm.media_url IS NOT NULL), '[]'
       ) AS note_media
     FROM public.notes n
     LEFT JOIN public.folders f ON f.id = n.folder_id
     LEFT JOIN public.note_media nm ON nm.note_id = n.id
     WHERE n.user_id = $1
       AND n.title NOT LIKE '💬 Riwayat Obrolan:%'
       ${whereExtra}
     GROUP BY n.id, f.id
     ORDER BY n.created_at DESC`,
    params
  );

  const foldersRes = await pool.query(
    `SELECT id, name FROM public.folders WHERE user_id = $1 ORDER BY name`,
    [userId]
  );

  const notes = notesRes.rows;
  const folders = foldersRes.rows;

  return (
    <div className="max-w-5xl mx-auto space-y-4 animate-fadeIn">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">My Notes</h1>
        <Link href={`/dashboard/upload${folder ? `?folder=${folder}` : ''}`} className="hidden sm:flex items-center gap-2 bg-[var(--accent)] text-[var(--accent-fg)] px-4 py-2 rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          New Note
        </Link>
      </div>

      {/* Search & Filter */}
      <form method="get" className="flex gap-2 max-w-xl">
        <div className="relative flex-1 flex items-center">
          <svg className="absolute left-2.5 text-[var(--text-muted)]" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input
            name="q"
            defaultValue={q}
            placeholder="Cari catatan..."
            className="w-full pl-8 pr-20 py-1.5 bg-[var(--surface)] border border-[var(--border)] rounded-lg text-xs focus:outline-none focus:border-[var(--accent)] transition-colors"
          />
          <div className="absolute right-1 flex items-center gap-1">
            {q && (
              <Link href="/dashboard" className="px-1.5 py-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors text-xs font-bold">
                ✕
              </Link>
            )}
            <button type="submit" className="px-2.5 py-1 bg-[var(--accent)] text-[var(--accent-fg)] rounded-md text-[10px] font-bold hover:opacity-90 transition-opacity">
              Cari
            </button>
          </div>
        </div>
      </form>

      {/* Notes Grid with Sorting & Folder Filter */}
      <NotesList initialNotes={notes} q={q} folder={folder} folders={folders} />
    </div>
  );
}
