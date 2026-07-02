'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';

export default function FolderCard({ folder }: { folder: any }) {
  // Parse folder info if it is a JSON string
  let displayName = folder.name;
  let description = '';
  let color = '';
  let emoji = '📁';
  if (folder.name && folder.name.startsWith('{')) {
    try {
      const parsed = JSON.parse(folder.name);
      displayName = parsed.name || folder.name;
      description = parsed.description || '';
      color = parsed.color || '';
      emoji = parsed.emoji || '📁';
    } catch (e) {
      // fallback
    }
  }

  const [deleting, setDeleting] = useState(false);
  const [editing, setEditing] = useState(false);
  const [newName, setNewName] = useState(displayName);
  const [saving, setSaving] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm(`Hapus folder "${displayName}"? Catatan di dalamnya tidak akan terhapus.`)) return;
    setDeleting(true);

    // Unlink notes inside this folder first
    await supabase.from('notes').update({ folder_id: null }).eq('folder_id', folder.id);

    const { error } = await supabase.from('folders').delete().eq('id', folder.id);
    if (!error) {
      router.refresh();
    } else {
      alert('Gagal menghapus folder');
      setDeleting(false);
    }
  };

  const handleRename = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || newName.trim() === displayName) {
      setEditing(false);
      return;
    }
    setSaving(true);

    // Maintain JSON structure on rename
    const updatedNameJson = JSON.stringify({
      name: newName.trim(),
      description: description,
      color: color,
      emoji: emoji
    });

    const { error } = await supabase
      .from('folders')
      .update({ name: updatedNameJson })
      .eq('id', folder.id);
    if (!error) {
      router.refresh();
    } else {
      alert('Gagal mengubah nama folder');
    }
    setSaving(false);
    setEditing(false);
  };

  if (editing) {
    return (
      <form
        onSubmit={handleRename}
        className="bg-[var(--surface)] border-2 border-[var(--accent)] p-2 sm:p-2.5 rounded-xl flex items-center gap-2 shadow-sm min-w-0 w-full h-[60px] sm:h-[68px]"
      >
        <div className="w-8 h-8 bg-[var(--surface-2)] rounded-lg flex items-center justify-center flex-shrink-0" style={color ? { backgroundColor: `${color}15`, color: color } : {}}>
          <span className="text-sm">{emoji}</span>
        </div>
        <input
          autoFocus
          value={newName}
          onChange={e => setNewName(e.target.value)}
          className="flex-1 min-w-0 text-xs font-medium bg-[var(--surface-2)] border border-[var(--border)] rounded-lg px-2 py-1 focus:outline-none focus:border-[var(--accent)] w-full"
        />
        <div className="flex flex-col gap-0.5 flex-shrink-0">
          <button 
            type="submit" 
            disabled={saving} 
            className="text-[9px] font-bold bg-[var(--accent)] text-[var(--accent-fg)] px-2 py-0.5 rounded-md hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {saving ? '...' : 'Ok'}
          </button>
          <button 
            type="button" 
            onClick={() => setEditing(false)} 
            className="text-[9px] font-semibold text-[var(--text-muted)] hover:text-[var(--text-primary)] px-2 py-0.5 rounded-md hover:bg-[var(--surface-2)] transition-colors"
          >
            X
          </button>
        </div>
      </form>
    );
  }

  return (
    <Link
      href={`/dashboard?folder=${folder.id}`}
      className="bg-[var(--surface)] border border-[var(--border)] p-2.5 sm:p-3 rounded-xl hover:border-[var(--text-muted)] hover:shadow-sm transition-all flex items-center justify-between gap-2 group min-w-0 w-full h-[60px] sm:h-[68px]"
    >
      <div className="flex items-center gap-2.5 min-w-0 flex-1">
        <div className="w-8 h-8 sm:w-9 sm:h-9 bg-[var(--surface-2)] rounded-lg flex items-center justify-center flex-shrink-0" style={color ? { backgroundColor: `${color}15`, color: color } : {}}>
          <span className="text-sm sm:text-base">{emoji}</span>
        </div>
        <div className="min-w-0 flex-1 flex flex-col justify-center">
          <h3 className="font-semibold text-xs sm:text-sm text-[var(--text-primary)] truncate pr-1 leading-tight">{displayName}</h3>
          <p className="text-[9px] sm:text-[10px] text-[var(--text-muted)] mt-0.5">{folder.notes?.length || 0} catatan</p>
        </div>
      </div>

      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-all flex-shrink-0">
        {/* Rename Button */}
        <button
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); setEditing(true); }}
          className="p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-2)] rounded-md"
          title="Ganti Nama"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
        </button>
        {/* Delete Button */}
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="p-1 text-[var(--text-muted)] hover:text-red-500 hover:bg-red-50 rounded-md disabled:opacity-50"
          title="Hapus Folder"
        >
          {deleting ? (
            <span className="w-3.5 h-3.5 border-2 border-red-500 border-t-transparent rounded-full animate-spin block" />
          ) : (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
          )}
        </button>
      </div>
    </Link>
  );
}
