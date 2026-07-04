'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function DuplicateFolderButton({
  folderId,
  isGuest
}: {
  folderId: string;
  isGuest: boolean;
}) {
  const [isDuplicating, setIsDuplicating] = useState(false);
  const router = useRouter();

  const handleDuplicate = async () => {
    if (isGuest) {
      router.push(`/?next=/folder/${folderId}`);
      return;
    }

    setIsDuplicating(true);
    try {
      const response = await fetch(`/api/folder/${folderId}/duplicate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Gagal menyimpan folder');
      }

      router.push(`/dashboard/folder/${result.newFolderId}`);
    } catch (err: any) {
      alert(err.message);
      setIsDuplicating(false);
    }
  };

  return (
    <button
      onClick={handleDuplicate}
      disabled={isDuplicating}
      className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--accent)] text-[var(--accent-fg)] rounded-lg font-semibold text-xs hover:opacity-90 transition-opacity flex-shrink-0 shadow-sm disabled:opacity-50"
    >
      {isDuplicating ? (
        <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
      ) : (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
          <line x1="12" y1="11" x2="12" y2="17"/>
          <line x1="9" y1="14" x2="15" y2="14"/>
        </svg>
      )}
      <span>{isGuest ? 'Masuk & Simpan Folder' : 'Simpan ke Folder Saya'}</span>
    </button>
  );
}
