import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import FoldersContainer from '@/components/folders/FoldersContainer';

export default async function FoldersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/');

  let query = supabase
    .from('folders')
    .select(`
      id, name, created_at,
      notes:notes(id)
    `)
    .eq('user_id', user.id)
    .order('name');

  if (q?.trim()) {
    query = query.ilike('name', `%${q.trim()}%`);
  }

  const { data: folders } = await query;

  return (
    <div className="max-w-5xl mx-auto animate-fadeIn">
      <FoldersContainer initialFolders={folders || []} q={q} userId={user.id} />
    </div>
  );
}
