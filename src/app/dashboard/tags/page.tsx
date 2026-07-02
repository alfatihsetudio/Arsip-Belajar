import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import TagChip from '@/components/tags/TagChip';

export default async function TagsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/');

  const { data: tags } = await supabase
    .from('tags')
    .select(`
      id, name, created_at,
      note_tags(note_id)
    `)
    .eq('user_id', user.id)
    .order('name');

  // Server Action to create tag
  async function createTag(formData: FormData) {
    'use server';
    const name = formData.get('name') as string;
    if (!name?.trim()) return;

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from('tags').insert({
      name: name.trim().toLowerCase(),
      user_id: user.id
    });
    
    redirect('/dashboard/tags');
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fadeIn">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Tags</h1>
      </div>

      {/* Create Tag Form */}
      <form action={createTag} className="flex gap-3 bg-[var(--surface)] border border-[var(--border)] p-4 rounded-2xl shadow-sm max-w-md">
        <input
          name="name"
          placeholder="New tag name (e.g. math)..."
          required
          className="flex-1 px-3 py-2 bg-[var(--surface-2)] border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:border-[var(--accent)] transition-colors"
        />
        <button type="submit" className="bg-[var(--accent)] text-[var(--accent-fg)] px-4 py-2 rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity">
          Create
        </button>
      </form>

      {/* Tags List */}
      {!tags || tags.length === 0 ? (
        <div className="text-center py-16 border-2 border-dashed border-[var(--border)] rounded-2xl">
          <p className="text-[var(--text-secondary)] font-medium">No tags created yet</p>
          <p className="text-xs text-[var(--text-muted)] mt-1">Categorize your notes with tags</p>
        </div>
      ) : (
        <div className="flex flex-wrap gap-3">
          {tags.map((tag: any) => (
            <TagChip key={tag.id} tag={tag} />
          ))}
        </div>
      )}
    </div>
  );
}
