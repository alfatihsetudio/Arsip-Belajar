import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';

export default async function FoldersPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/');

  const { data: folders } = await supabase
    .from('folders')
    .select(`
      id, name, created_at,
      notes:notes(id)
    `)
    .order('name');

  // Server Action to create folder
  async function createFolder(formData: FormData) {
    'use server';
    const name = formData.get('name') as string;
    if (!name?.trim()) return;

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from('folders').insert({
      name: name.trim(),
      user_id: user.id
    });
    
    redirect('/dashboard/folders');
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fadeIn">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Folders</h1>
      </div>

      {/* Create Folder Form */}
      <form action={createFolder} className="flex gap-3 bg-[var(--surface)] border border-[var(--border)] p-4 rounded-2xl shadow-sm max-w-md">
        <input
          name="name"
          placeholder="New folder name..."
          required
          className="flex-1 px-3 py-2 bg-[var(--surface-2)] border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:border-[var(--accent)] transition-colors"
        />
        <button type="submit" className="bg-[var(--accent)] text-[var(--accent-fg)] px-4 py-2 rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity">
          Create
        </button>
      </form>

      {/* Folders List */}
      {!folders || folders.length === 0 ? (
        <div className="text-center py-16 border-2 border-dashed border-[var(--border)] rounded-2xl">
          <p className="text-[var(--text-secondary)] font-medium">No folders created yet</p>
          <p className="text-xs text-[var(--text-muted)] mt-1">Organize your study archives into folders</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {folders.map((folder: any) => (
            <Link
              key={folder.id}
              href={`/dashboard?folder=${folder.id}`}
              className="bg-[var(--surface)] border border-[var(--border)] p-5 rounded-2xl hover:border-[var(--text-muted)] hover:shadow-md transition-all flex items-start gap-4"
            >
              <div className="w-10 h-10 bg-[var(--surface-2)] rounded-xl flex items-center justify-center text-[var(--text-secondary)] flex-shrink-0">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
              </div>
              <div className="min-w-0">
                <h3 className="font-semibold text-sm text-[var(--text-primary)] truncate">{folder.name}</h3>
                <p className="text-xs text-[var(--text-muted)] mt-0.5">{folder.notes?.length || 0} notes</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
