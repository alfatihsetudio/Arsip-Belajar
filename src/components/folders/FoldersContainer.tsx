'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import FolderCard from './FolderCard';

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

  return (
    <div className="space-y-6">
      {/* Search Folders Form */}
      <div className="flex justify-end">
        <form method="get" className="relative flex items-center w-full max-w-sm">
          <svg className="absolute left-2.5 text-[var(--text-muted)]" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input
            name="q"
            defaultValue={q}
            placeholder="Search folders..."
            className="w-full pl-8 pr-16 py-1.5 bg-[var(--surface)] border border-[var(--border)] rounded-xl text-xs focus:outline-none focus:border-[var(--accent)] transition-colors"
          />
          <button type="submit" className="absolute right-1 px-2.5 py-1 bg-[var(--accent)] text-[var(--accent-fg)] rounded-md text-[10px] font-bold hover:opacity-90 transition-opacity">
            Search
          </button>
        </form>
      </div>

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
          {initialFolders.map((folder: any) => (
            <FolderCard key={folder.id} folder={folder} />
          ))}
        </div>
      )}
    </div>
  );
}
