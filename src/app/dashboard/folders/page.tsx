import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import FolderCard from '@/components/folders/FolderCard';

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
            <FolderCard key={folder.id} folder={folder} />
          ))}
        </div>
      )}
    </div>
  );
}
