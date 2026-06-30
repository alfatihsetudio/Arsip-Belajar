'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';

export default function TagChip({ tag }: { tag: any }) {
  const [deleting, setDeleting] = useState(false);
  const [editing, setEditing] = useState(false);
  const [newName, setNewName] = useState(tag.name);
  const [saving, setSaving] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm(`Hapus tag "#${tag.name}"?`)) return;
    setDeleting(true);

    // Delete tag associations first
    await supabase.from('note_tags').delete().eq('tag_id', tag.id);

    const { error } = await supabase.from('tags').delete().eq('id', tag.id);
    if (!error) {
      router.refresh();
    } else {
      alert('Gagal menghapus tag');
      setDeleting(false);
    }
  };

  const handleRename = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newName.trim().toLowerCase();
    if (!trimmed || trimmed === tag.name) {
      setEditing(false);
      return;
    }
    setSaving(true);
    const { error } = await supabase.from('tags').update({ name: trimmed }).eq('id', tag.id);
    if (!error) {
      router.refresh();
    } else {
      alert('Gagal mengubah nama tag');
    }
    setSaving(false);
    setEditing(false);
  };

  if (editing) {
    return (
      <form onSubmit={handleRename} className="flex items-center gap-2 border-2 border-[var(--accent)] bg-[var(--surface)] px-3 py-1.5 rounded-2xl shadow-sm">
        <span className="text-[var(--text-muted)] text-sm font-medium">#</span>
        <input
          autoFocus
          value={newName}
          onChange={e => setNewName(e.target.value)}
          className="text-sm font-medium bg-transparent focus:outline-none w-24"
        />
        <button type="submit" disabled={saving} className="text-xs font-semibold bg-[var(--accent)] text-[var(--accent-fg)] px-2 py-1 rounded-lg hover:opacity-90 disabled:opacity-50">
          {saving ? '...' : '✓'}
        </button>
        <button type="button" onClick={() => setEditing(false)} className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)]">✕</button>
      </form>
    );
  }

  return (
    <div className="flex items-center bg-[var(--surface)] border border-[var(--border)] rounded-2xl hover:border-[var(--text-muted)] hover:shadow-md transition-all group">
      <Link
        href={`/dashboard?tag=${tag.id}`}
        className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-[var(--text-primary)]"
      >
        <span className="text-[var(--text-muted)]">#</span>
        <span>{tag.name}</span>
        <span className="text-xs text-[var(--text-muted)] bg-[var(--surface-2)] px-2 py-0.5 rounded-full">
          {tag.note_tags?.length || 0}
        </span>
      </Link>

      <div className="flex items-center gap-0.5 pr-2 opacity-0 group-hover:opacity-100 transition-all">
        {/* Rename */}
        <button
          onClick={() => setEditing(true)}
          className="p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-2)] rounded-md"
          title="Ganti Nama"
        >
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
        </button>
        {/* Delete */}
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="p-1 text-[var(--text-muted)] hover:text-red-500 hover:bg-red-50 rounded-md disabled:opacity-50"
          title="Hapus Tag"
        >
          {deleting ? (
            <span className="w-3 h-3 border-2 border-red-400 border-t-transparent rounded-full animate-spin block" />
          ) : (
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          )}
        </button>
      </div>
    </div>
  );
}
