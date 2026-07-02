import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import UploadForm from '@/components/notes/UploadForm';

export default async function UploadDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ folder?: string }>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/');

  // Fetch folders directly on the server (100% reliable)
  const { data: folders } = await supabase
    .from('folders')
    .select('id, name')
    .eq('user_id', user.id)
    .order('name');

  const { folder } = await searchParams;
  const initialFolderId = folder || '';

  return (
    <UploadForm folders={folders || []} initialFolderId={initialFolderId} />
  );
}
