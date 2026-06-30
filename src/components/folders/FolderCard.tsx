'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';

export default function FolderCard({ folder }: { folder: any }) {
  const [deleting, setDeleting] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm(`Are you sure you want to delete the folder "${folder.name}"? (Your notes will not be deleted).`)) return;

    setDeleting(true);
    const { error } = await supabase.from('folders').delete().eq('id', folder.id);
    if (!error) {
      router.refresh();
    } else {
      alert('Failed to delete folder');
      setDeleting(false);
    }
  };

  return (
    <Link
      href={`/dashboard?folder=${folder.id}`}
      className="bg-[var(--surface)] border border-[var(--border)] p-5 rounded-2xl hover:border-[var(--text-muted)] hover:shadow-md transition-all flex items-start justify-between gap-4 group"
    >
      <div className="flex items-start gap-4 min-w-0">
        <div className="w-10 h-10 bg-[var(--surface-2)] rounded-xl flex items-center justify-center text-[var(--text-secondary)] flex-shrink-0">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
        </div>
        <div className="min-w-0">
          <h3 className="font-semibold text-sm text-[var(--text-primary)] truncate">{folder.name}</h3>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">{folder.notes?.length || 0} notes</p>
        </div>
      </div>
      
      <button
        onClick={handleDelete}
        disabled={deleting}
        className="p-1.5 text-[var(--text-muted)] hover:text-red-500 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all flex-shrink-0 disabled:opacity-50"
        title="Delete Folder"
      >
        {deleting ? (
          <span className="w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin block" />
        ) : (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
        )}
      </button>
    </Link>
  );
}
