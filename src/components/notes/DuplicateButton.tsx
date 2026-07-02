'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function DuplicateButton({ noteId }: { noteId: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [folders, setFolders] = useState<any[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<string>('');
  const [isDuplicating, setIsDuplicating] = useState(false);
  
  const router = useRouter();
  const supabase = createClient();

  const handleOpen = async () => {
    setIsOpen(true);
    // Fetch user's folders
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase.from('folders').select('id, name').eq('user_id', user.id);
      if (data) setFolders(data);
    }
  };

  const handleDuplicate = async () => {
    setIsDuplicating(true);
    try {
      const response = await fetch(`/api/note/${noteId}/duplicate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folderId: selectedFolder || null })
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Gagal menyimpan catatan');
      }

      setIsOpen(false);
      router.push(`/dashboard/note/${result.newNoteId}`);
    } catch (err: any) {
      alert(err.message);
      setIsDuplicating(false);
    }
  };

  return (
    <>
      <button 
        onClick={handleOpen}
        className="flex items-center gap-2 px-4 py-2 bg-[var(--accent)] text-[var(--accent-fg)] rounded-xl font-bold shadow-sm hover:opacity-90 transition-opacity"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
        Simpan ke Catatan Saya
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[var(--bg)] border border-[var(--border)] rounded-2xl shadow-xl w-full max-w-sm p-6 animate-slideUp">
            <h3 className="text-lg font-bold text-[var(--text-primary)] mb-2">Simpan Salinan</h3>
            <p className="text-sm text-[var(--text-secondary)] mb-4">Pilih folder tujuan untuk menyimpan catatan ini ke akun Anda.</p>
            
            <select
              value={selectedFolder}
              onChange={(e) => setSelectedFolder(e.target.value)}
              className="w-full mb-6 p-3 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
            >
              <option value="">Tanpa Folder (Root)</option>
              {folders.map(f => {
                let folderName = f.name;
                try { folderName = JSON.parse(f.name).name || f.name } catch(e){}
                return (
                  <option key={f.id} value={f.id}>{folderName}</option>
                )
              })}
            </select>

            <div className="flex gap-3 justify-end">
              <button 
                onClick={() => setIsOpen(false)}
                className="px-4 py-2 rounded-xl text-sm font-bold text-[var(--text-secondary)] hover:bg-[var(--surface-2)]"
              >
                Batal
              </button>
              <button 
                onClick={handleDuplicate}
                disabled={isDuplicating}
                className="px-5 py-2 rounded-xl text-sm font-bold bg-[var(--accent)] text-[var(--accent-fg)] hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
              >
                {isDuplicating && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin block" />}
                Simpan
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
