'use server';

import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import pool from '@/lib/db';
import TagChip from '@/components/tags/TagChip';

export default async function TagsPage() {
  const { userId } = await auth();
  if (!userId) redirect('/');

  const tagsRes = await pool.query(
    `SELECT t.id, t.name, t.created_at,
       COALESCE(json_agg(json_build_object('note_id', nt.note_id)) FILTER (WHERE nt.note_id IS NOT NULL), '[]') AS note_tags
     FROM public.tags t
     LEFT JOIN public.note_tags nt ON nt.tag_id = t.id
     WHERE t.user_id = $1
     GROUP BY t.id
     ORDER BY t.name`,
    [userId]
  );

  async function createTag(formData: FormData) {
    'use server';
    const name = formData.get('name') as string;
    if (!name?.trim()) return;

    const { userId } = await auth();
    if (!userId) return;

    await pool.query(
      `INSERT INTO public.tags (user_id, name) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [userId, name.trim().toLowerCase()]
    );

    redirect('/dashboard/tags');
  }

  const tags = tagsRes.rows;

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
      {tags.length === 0 ? (
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
