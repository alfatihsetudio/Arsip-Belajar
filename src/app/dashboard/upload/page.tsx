import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import UploadForm from '@/components/notes/UploadForm';
import pool from '@/lib/db';

export default async function UploadDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ folder?: string }>;
}) {
  const { userId } = await auth();
  if (!userId) redirect('/');

  const foldersRes = await pool.query(
    `SELECT id, name FROM public.folders WHERE user_id = $1 ORDER BY name`,
    [userId]
  );

  const { folder } = await searchParams;
  const initialFolderId = folder || '';

  return (
    <UploadForm folders={foldersRes.rows} initialFolderId={initialFolderId} />
  );
}
