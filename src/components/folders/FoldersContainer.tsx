'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import FolderCard from './FolderCard';
import ShareModal from '../notes/ShareModal';

const COLOR_OPTIONS = [
  { name: 'Default', value: '' },
  { name: 'Red', value: '#ef4444' },
  { name: 'Blue', value: '#3b82f6' },
  { name: 'Green', value: '#10b981' },
  { name: 'Purple', value: '#8b5cf6' },
  { name: 'Orange', value: '#f97316' },
  { name: 'Pink', value: '#ec4899' },
  { name: 'Yellow', value: '#eab308' },
];

export default function FoldersContainer({ initialFolders, q, userId }: { initialFolders: any[]; q?: string; userId: string }) {
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState('');
  const [saving, setSaving] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  // Selection states
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isBulkShareOpen, setIsBulkShareOpen] = useState(false);

  useEffect(() => {
    const handleOpenModal = () => {
      setShowModal(true);
    };
    window.addEventListener('open-create-folder-modal', handleOpenModal);
    return () => {
      window.removeEventListener('open-create-folder-modal', handleOpenModal);
    };
  }, []);

  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setSaving(true);

    // Store as JSON string in the 'name' field
    const folderNameJson = JSON.stringify({
      name: name.trim(),
      description: description.trim(),
      color: color
    });

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setSaving(false);
      return;
    }

    const { error } = await supabase.from('folders').insert({
      name: folderNameJson,
      user_id: user.id
    });

    if (!error) {
      setName('');
      setDescription('');
      setColor('');
      setShowModal(false);
      router.refresh();
    } else {
      alert('Gagal membuat folder');
    }
    setSaving(false);
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    const confirmDelete = confirm(`Apakah Anda yakin ingin menghapus ${selectedIds.length} folder yang dipilih? Catatan di dalamnya tidak akan terhapus.`);
    if (!confirmDelete) return;

    setIsDeleting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Unauthorized');

      // Unlink notes inside these folders first
      await supabase
        .from('notes')
        .update({ folder_id: null })
        .in('folder_id', selectedIds)
        .eq('user_id', user.id);

      // Delete folders
      const { error } = await supabase
        .from('folders')
        .delete()
        .in('id', selectedIds)
        .eq('user_id', user.id);

      if (error) throw error;

      setSelectedIds([]);
      setIsSelectMode(false);
      router.refresh();
    } catch (err: any) {
      alert('Gagal menghapus folder: ' + err.message);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with Title and Desktop Add Button */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">My Folders</h1>
        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="hidden sm:flex items-center gap-2 bg-[var(--accent)] text-[var(--accent-fg)] px-4 py-2 rounded-xl text-sm font-semibold hover:opacity-90 transition-all active:scale-95 cursor-pointer shadow-sm"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          New Folder
        </button>
      </div>

      {/* Search Bar - Identical to Notes Page */}
      <form method="get" className="flex gap-2 max-w-xl">
        <div className="relative flex-1 flex items-center">
          <svg className="absolute left-2.5 text-[var(--text-muted)]" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input
            name="q"
            defaultValue={q}
            placeholder="Cari folder..."
            className="w-full pl-8 pr-20 py-1.5 bg-[var(--surface)] border border-[var(--border)] rounded-lg text-xs focus:outline-none focus:border-[var(--accent)] transition-colors"
          />
          <div className="absolute right-1 flex items-center gap-1">
            {q && (
              <button
                type="button"
                onClick={() => {
                  router.push(window.location.pathname);
                }}
                className="px-1.5 py-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors text-xs font-bold"
              >
                ✕
              </button>
            )}
            <button type="submit" className="px-2.5 py-1 bg-[var(--accent)] text-[var(--accent-fg)] rounded-md text-[10px] font-bold hover:opacity-90 transition-opacity">
              Cari
            </button>
          </div>
        </div>
      </form>

      {/* Folders Summary Info & Kelola Folder Button */}
      {isSelectMode ? (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-[var(--surface)] border border-[var(--border)] rounded-2xl animate-fadeIn text-xs sm:text-sm shadow-sm">
          <div className="flex items-center gap-3">
            <span className="text-[var(--text-secondary)] font-semibold">Terpilih: <strong>{selectedIds.length}</strong> folder</span>
            <button
              type="button"
              onClick={() => {
                if (selectedIds.length === initialFolders.length) {
                  setSelectedIds([]);
                } else {
                  setSelectedIds(initialFolders.map(f => f.id));
                }
              }}
              className="text-[var(--accent)] hover:underline font-bold cursor-pointer text-xs"
            >
              {selectedIds.length === initialFolders.length ? 'Batal Pilih' : 'Pilih Semua'}
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {/* Bulk Share Action (Bypass Premium Alert) */}
            <button
              type="button"
              disabled={selectedIds.length === 0}
              onClick={() => setIsBulkShareOpen(true)}
              className="px-2.5 py-1.5 bg-[var(--surface-2)] hover:bg-[var(--border)] text-[var(--text-secondary)] rounded-xl font-bold cursor-pointer transition-all text-xs disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
            >
              🔗 Bagikan
            </button>

            {/* Bulk Delete Action */}
            <button
              type="button"
              disabled={selectedIds.length === 0 || isDeleting}
              onClick={handleBulkDelete}
              className="px-3.5 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95 text-xs flex items-center gap-1"
            >
              🗑️ {isDeleting ? 'Menghapus...' : 'Hapus'}
            </button>

            <button
              type="button"
              onClick={() => {
                setIsSelectMode(false);
                setSelectedIds([]);
              }}
              className="px-3.5 py-1.5 bg-[var(--surface-2)] hover:bg-[var(--border)] text-[var(--text-primary)] rounded-xl font-bold cursor-pointer transition-all text-xs"
            >
              Batal
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between text-xs text-[var(--text-secondary)] px-1 w-full">
          <div>
            <span>Menampilkan <strong>{initialFolders.length}</strong> folder</span>
          </div>
          <button
            type="button"
            onClick={() => setIsSelectMode(true)}
            className="flex-shrink-0 px-2.5 py-1.5 bg-[var(--surface)] border border-[var(--border)] rounded-xl font-bold text-[var(--text-primary)] hover:bg-[var(--surface-2)] transition-all cursor-pointer text-[10px] sm:text-[11px] min-h-[32px] flex items-center gap-1"
          >
            ⚙️ Kelola Folder
          </button>
        </div>
      )}

      {/* Folders List */}
      {!initialFolders || initialFolders.length === 0 ? (
        <div className="text-center py-16 border-2 border-dashed border-[var(--border)] rounded-2xl">
          <p className="text-[var(--text-secondary)] font-medium">{q ? 'No folders found' : 'No folders created yet'}</p>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            {q ? 'Try a different search term' : 'Organize your study archives into folders'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
          {initialFolders.map((folder: any) => {
            const isSelected = selectedIds.includes(folder.id);
            return (
              <div 
                key={folder.id} 
                onClick={(e) => {
                  if (isSelectMode) {
                    e.preventDefault();
                    setSelectedIds(prev => 
                      prev.includes(folder.id) 
                        ? prev.filter(id => id !== folder.id) 
                        : [...prev, folder.id]
                    );
                  }
                }}
                className={`transition-all rounded-xl relative ${
                  isSelectMode 
                    ? 'cursor-pointer select-none active:scale-95' 
                    : ''
                }`}
              >
                {/* Select Mode Overlay Indicator */}
                {isSelectMode && (
                  <div className={`absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full z-35 flex items-center justify-center border-2 transition-all ${
                    isSelected 
                      ? 'bg-[var(--accent)] border-[var(--accent)] text-[var(--accent-fg)] scale-110 shadow' 
                      : 'bg-[var(--surface)] border-[var(--border)]'
                  }`}>
                    {isSelected && (
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                    )}
                  </div>
                )}
                
                {/* Wrapper to disable default inner actions during select mode */}
                <div className={isSelectMode ? 'pointer-events-none opacity-80' : ''}>
                  <FolderCard folder={folder} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Bulk Share Modal */}
      {selectedIds.length > 0 && (
        <ShareModal
          isOpen={isBulkShareOpen}
          onClose={() => {
            setIsBulkShareOpen(false);
            setSelectedIds([]);
            setIsSelectMode(false);
            router.refresh();
          }}
          itemId={selectedIds.join(',')} // join all selected IDs with comma
          itemType="folder"
          initialVisibility="private"
          initialAllowedEmails={[]}
        />
      )}
    </div>
  );
}
