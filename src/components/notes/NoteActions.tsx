'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function NoteActions({ noteId, noteTitle }: { noteId: string; noteTitle: string }) {
  const [deleting, setDeleting] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleDelete = async () => {
    if (!window.confirm(`Hapus catatan "${noteTitle}" secara permanen? Tindakan ini tidak dapat dibatalkan.`)) {
      return;
    }

    try {
      setDeleting(true);

      // Delete child rows first to avoid foreign key violations
      const { error: mediaErr } = await supabase.from('note_media').delete().eq('note_id', noteId);
      if (mediaErr) console.error('Media delete error:', mediaErr);
      
      const { error: tagsErr } = await supabase.from('note_tags').delete().eq('note_id', noteId);
      if (tagsErr) console.error('Tags delete error:', tagsErr);

      const { error } = await supabase.from('notes').delete().eq('id', noteId);
      if (error) {
        console.error('Notes delete error:', error);
        alert('Gagal menghapus catatan: ' + (error.message || JSON.stringify(error)) + '\\n\\nPastikan Anda sudah mengaktifkan RLS Policy (Enable delete) untuk tabel notes dan note_media di Supabase.');
        setDeleting(false);
        return;
      }

      router.push('/dashboard');
      router.refresh();
    } catch (err: any) {
      alert('Exception saat menghapus: ' + err.message);
      setDeleting(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(window.location.href);
  };

  return (
    <div className="flex items-center gap-2 relative z-10">
      <button
        onClick={handleCopy}
        className="p-2 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-2)] rounded-lg transition-colors"
        title="Copy link"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
      </button>
      <button
        onClick={handleDelete}
        disabled={deleting}
        className="p-2 text-[var(--text-muted)] hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
        title="Delete note"
      >
        {deleting ? (
          <span className="w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin block" />
        ) : (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
        )}
      </button>
    </div>
  );
}
