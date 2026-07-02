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
    <div className="max-w-4xl mx-auto space-y-6 animate-fadeIn">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Folders</h1>
      </div>

      <FoldersContainer initialFolders={folders || []} q={q} userId={user.id} />
    </div>
  );
}
