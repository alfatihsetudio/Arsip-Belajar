'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { showAlert, showConfirm } from '@/lib/utils/customDialog';

import ShareModal from './ShareModal';

export default function NoteActions({ 
  noteId, 
  noteTitle,
  initialVisibility = 'private',
  initialAllowedEmails = []
}: { 
  noteId: string; 
  noteTitle: string;
  initialVisibility?: 'private' | 'restricted' | 'public';
  initialAllowedEmails?: string[];
}) {
  const [deleting, setDeleting] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleDelete = async () => {
    const confirmDelete = await showConfirm(`Hapus catatan "${noteTitle}" secara permanen? Tindakan ini tidak dapat dibatalkan.`);
    if (!confirmDelete) {
      return;
    }

    try {
      setDeleting(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setDeleting(false);
        return;
      }

      // Delete child rows first to avoid foreign key violations
      const { error: mediaErr } = await supabase.from('note_media').delete().eq('note_id', noteId);
      if (mediaErr) console.error('Media delete error:', mediaErr);
      
      const { error: tagsErr } = await supabase.from('note_tags').delete().eq('note_id', noteId);
      if (tagsErr) console.error('Tags delete error:', tagsErr);

      const { error } = await supabase.from('notes').delete().eq('id', noteId).eq('user_id', user.id);
      if (error) {
        console.error('Notes delete error:', error);
        await showAlert('Gagal menghapus catatan: ' + (error.message || JSON.stringify(error)) + '\n\nPastikan Anda sudah mengaktifkan RLS Policy (Enable delete) untuk tabel notes dan note_media di Supabase.');
        setDeleting(false);
        return;
      }

      router.push('/dashboard');
      router.refresh();
    } catch (err: any) {
      await showAlert('Exception saat menghapus: ' + err.message);
      setDeleting(false);
    }
  };

  const handleShare = () => {
    setIsShareModalOpen(true);
  };

  return (
    <>
    <div className="flex items-center gap-1 relative z-10">
      <button
        onClick={handleShare}
        className={`p-2 rounded-xl transition-all active:scale-95 border text-[var(--text-muted)] border-transparent hover:text-[var(--text-primary)] hover:bg-[var(--surface-2)]`}
        title="Bagikan catatan"
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
      </button>
      <button
        onClick={handleDelete}
        disabled={deleting}
        className="p-2 text-[var(--text-muted)] hover:text-red-500 hover:bg-red-50 rounded-xl transition-all active:scale-95 disabled:opacity-50"
        title="Hapus catatan"
      >
        {deleting ? (
          <span className="w-3.5 h-3.5 border-2 border-red-500 border-t-transparent rounded-full animate-spin block" />
        ) : (
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
        )}
      </button>
      </div>
      
      <ShareModal 
        isOpen={isShareModalOpen} 
        onClose={() => setIsShareModalOpen(false)} 
        noteId={noteId}
        initialVisibility={initialVisibility}
        initialAllowedEmails={initialAllowedEmails}
      />
    </>
  );
}
