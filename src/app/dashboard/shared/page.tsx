import { auth } from '@clerk/nextjs/server';
import SharedItemsList from '@/components/shared/SharedItemsList';
import pool from '@/lib/db';

export default async function SharedItemsPage() {
  const { userId } = await auth();
  if (!userId) return <div>Silakan login.</div>;

  // 1. Shared notes history
  const noteHistoryRes = await pool.query(
    `SELECT
       sh.created_at,
       json_build_object(
         'id', n.id,
         'title', n.title,
         'transcribed_text', n.transcribed_text,
         'created_at', n.created_at,
         'user_id', n.user_id,
         'note_media', COALESCE(
           json_agg(json_build_object('media_url', nm.media_url, 'order_index', nm.order_index)
             ORDER BY nm.order_index)
           FILTER (WHERE nm.media_url IS NOT NULL), '[]'
         )
       ) AS notes
     FROM public.shared_notes_history sh
     JOIN public.notes n ON n.id = sh.note_id
     LEFT JOIN public.note_media nm ON nm.note_id = n.id
     WHERE sh.user_id = $1
     GROUP BY sh.created_at, n.id`,
    [userId]
  );

  // 2. Shared folders history
  let folderHistory: any[] = [];
  try {
    const folderHistoryRes = await pool.query(
      `SELECT
         sfh.created_at,
         json_build_object(
           'id', f.id,
           'name', f.name,
           'user_id', f.user_id
         ) AS folders
       FROM public.shared_folders_history sfh
       JOIN public.folders f ON f.id = sfh.folder_id
       WHERE sfh.user_id = $1`,
      [userId]
    );
    folderHistory = folderHistoryRes.rows;
  } catch (e) {
    console.error('shared_folders_history query failed:', e);
  }

  // 3. ownerMap is empty since emails aren't in Neon — pass empty map
  const ownerMap: Record<string, { email: string; name: string; avatar: string }> = {};

  return (
    <div className="space-y-5 animate-fadeIn pb-24">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-[var(--text-primary)]">Dibagikan kepada saya</h1>
        <p className="text-[var(--text-secondary)] mt-0.5 text-[11px] sm:text-sm">
          Folder dan catatan dari orang lain yang pernah Anda buka — tersimpan otomatis.
        </p>
      </div>

      <SharedItemsList
        initialNotes={noteHistoryRes.rows}
        initialFolders={folderHistory}
        ownerMap={ownerMap}
      />
    </div>
  );
}
