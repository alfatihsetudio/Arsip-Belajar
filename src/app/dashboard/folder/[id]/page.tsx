import { auth } from '@clerk/nextjs/server';
import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import NotesList from '@/components/notes/NotesList';
import pool from '@/lib/db';

export default async function DashboardFolderPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ q?: string; tag?: string }>;
}) {
  const { id } = await params;
  const { q } = await searchParams;
  const { userId } = await auth();
  if (!userId) redirect('/');

  // Fetch the folder (must belong to this user)
  const folderRes = await pool.query(
    `SELECT * FROM public.folders WHERE id = $1 AND user_id = $2 LIMIT 1`,
    [id, userId]
  );
  if (folderRes.rows.length === 0) notFound();
  const folder = folderRes.rows[0];

  // Parse folder name if JSON
  let displayName = folder.name;
  let color = '';
  let emoji = '📁';
  if (folder.name?.startsWith('{')) {
    try {
      const parsed = JSON.parse(folder.name);
      displayName = parsed.name || folder.name;
      color = parsed.color || '';
      emoji = parsed.emoji || '📁';
    } catch {}
  }

  // Fetch notes in this folder
  const noteParams: unknown[] = [userId, id];
  let whereExtra = '';
  if (q) {
    noteParams.push(`%${q}%`);
    whereExtra = `AND (n.title ILIKE $3 OR n.transcribed_text ILIKE $3)`;
  }

  const notesRes = await pool.query(
    `SELECT
       n.id, n.title, n.transcribed_text, n.created_at,
       json_build_object('id', f.id, 'name', f.name) AS folder,
       COALESCE(
         json_agg(json_build_object('media_url', nm.media_url, 'order_index', nm.order_index)
           ORDER BY nm.order_index)
         FILTER (WHERE nm.media_url IS NOT NULL), '[]'
       ) AS note_media
     FROM public.notes n
     LEFT JOIN public.folders f ON f.id = n.folder_id
     LEFT JOIN public.note_media nm ON nm.note_id = n.id
     WHERE n.user_id = $1
       AND n.folder_id = $2
       AND n.title NOT LIKE '💬 Riwayat Obrolan:%'
       ${whereExtra}
     GROUP BY n.id, f.id
     ORDER BY n.created_at DESC`,
    noteParams
  );

  const foldersRes = await pool.query(
    `SELECT id, name FROM public.folders WHERE user_id = $1 ORDER BY name`,
    [userId]
  );

  return (
    <div className="max-w-5xl mx-auto space-y-4 animate-fadeIn">
      {/* Breadcrumb Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-1.5 text-xs text-[var(--text-muted)] overflow-x-auto whitespace-nowrap custom-scrollbar pb-1 sm:pb-0">
          <Link href="/dashboard" className="hover:text-[var(--text-primary)] transition-colors">
            Arsip Belajar
          </Link>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
          <span className="font-semibold text-[var(--text-primary)] flex items-center gap-1" style={color ? { color } : {}}>
            <span>{emoji}</span>
            {displayName}
          </span>
        </div>
        <Link href={`/dashboard/upload?folder=${id}`} className="hidden sm:flex flex-shrink-0 items-center gap-1.5 bg-[var(--accent)] text-[var(--accent-fg)] px-3 py-1.5 rounded-lg text-xs font-semibold hover:opacity-90 transition-opacity">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Catatan Baru
        </Link>
      </div>

      {/* Search */}
      <form method="get" className="flex gap-2 max-w-xl">
        <div className="relative flex-1 flex items-center">
          <svg className="absolute left-2.5 text-[var(--text-muted)]" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input
            name="q"
            defaultValue={q}
            placeholder={`Cari di folder ${displayName}...`}
            className="w-full pl-8 pr-20 py-1.5 bg-[var(--surface)] border border-[var(--border)] rounded-lg text-xs focus:outline-none focus:border-[var(--accent)] transition-colors"
          />
          <div className="absolute right-1 flex items-center gap-1">
            {q && (
              <Link href={`/dashboard/folder/${id}`} className="px-1.5 py-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors text-xs font-bold">✕</Link>
            )}
            <button type="submit" className="px-2.5 py-1 bg-[var(--accent)] text-[var(--accent-fg)] rounded-md text-[10px] font-bold hover:opacity-90 transition-opacity">Cari</button>
          </div>
        </div>
      </form>

      <NotesList initialNotes={notesRes.rows} folders={foldersRes.rows} hideFolderFilter={true} />
    </div>
  );
}
