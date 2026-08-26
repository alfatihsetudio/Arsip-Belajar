import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import FoldersContainer from '@/components/folders/FoldersContainer';
import pool from '@/lib/db';

export default async function FoldersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const { userId } = await auth();
  if (!userId) redirect('/');

  const params: unknown[] = [userId];
  let whereExtra = '';
  if (q?.trim()) {
    params.push(`%${q.trim()}%`);
    whereExtra = `AND f.name ILIKE $2`;
  }

  const foldersRes = await pool.query(
    `SELECT
       f.id, f.name, f.created_at,
       COALESCE(json_agg(json_build_object('id', n.id)) FILTER (WHERE n.id IS NOT NULL), '[]') AS notes
     FROM public.folders f
     LEFT JOIN public.notes n ON n.folder_id = f.id
     WHERE f.user_id = $1 ${whereExtra}
     GROUP BY f.id
     ORDER BY f.name`,
    params
  );

  return (
    <div className="max-w-5xl mx-auto animate-fadeIn">
      <FoldersContainer initialFolders={foldersRes.rows} q={q} userId={userId} />
    </div>
  );
}
