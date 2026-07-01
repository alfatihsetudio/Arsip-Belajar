'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Note {
  id: string;
  title: string;
  transcribed_text: string | null;
  created_at: string;
  folder: { id: string; name: string } | null;
  note_media: { media_url: string; order_index: number }[];
}

interface NotesListProps {
  initialNotes: Note[];
  q?: string;
  folder?: string;
  folders: { id: string; name: string }[];
}

export default function NotesList({ initialNotes, q, folder, folders }: NotesListProps) {
  const [sortBy, setSortBy] = useState('newest');
  const [selectedFolder, setSelectedFolder] = useState(folder || '');
  const [sortedNotes, setSortedNotes] = useState<Note[]>(initialNotes);
  const [lastViewed, setLastViewed] = useState<Record<string, number>>({});

  // Load last viewed timestamps and sort preference from localStorage on mount (prevents SSR hydration mismatch)
  useEffect(() => {
    try {
      const viewedStr = localStorage.getItem('notes_last_viewed') || '{}';
      setLastViewed(JSON.parse(viewedStr));

      const storedSort = localStorage.getItem('notes_sort_by');
      if (storedSort) {
        setSortBy(storedSort);
      }
    } catch (e) {
      console.error('Failed to load local settings:', e);
    }
  }, []);

  // Filter and sort notes whenever sortBy, selectedFolder, initialNotes, or lastViewed changes
  useEffect(() => {
    let filtered = [...initialNotes];

    if (selectedFolder) {
      filtered = filtered.filter((n) => n.folder?.id === selectedFolder);
    }

    filtered.sort((a, b) => {
      if (sortBy === 'newest') {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
      if (sortBy === 'oldest') {
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      }
      if (sortBy === 'last-viewed') {
        const timeA = lastViewed[a.id] || 0;
        const timeB = lastViewed[b.id] || 0;
        // If both have never been viewed, fallback to newest
        if (timeA === 0 && timeB === 0) {
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        }
        return timeB - timeA; // Descending (most recently viewed first)
      }
      if (sortBy === 'folder') {
        let nameA = a.folder?.name?.toLowerCase() || 'zzz_no_folder';
        let nameB = b.folder?.name?.toLowerCase() || 'zzz_no_folder';
        if (nameA.startsWith('{')) {
          try { nameA = JSON.parse(nameA).name.toLowerCase(); } catch (e) {}
        }
        if (nameB.startsWith('{')) {
          try { nameB = JSON.parse(nameB).name.toLowerCase(); } catch (e) {}
        }
        if (nameA < nameB) return -1;
        if (nameA > nameB) return 1;
        // Fallback to newest if in the same folder
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
      return 0;
    });

    setSortedNotes(filtered);
  }, [sortBy, selectedFolder, initialNotes, lastViewed]);

  if (!sortedNotes || sortedNotes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center border-2 border-dashed border-[var(--border)] rounded-2xl animate-fadeIn">
        <svg className="text-[var(--text-muted)] mb-4" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
        <p className="text-[var(--text-secondary)] font-medium mb-1">{q ? 'Tidak ada catatan ditemukan' : 'Belum ada catatan'}</p>
        <p className="text-sm text-[var(--text-muted)]">{q ? 'Coba cari kata kunci lain' : 'Mulai dengan mengunggah catatan pertama Anda'}</p>
        {!q && (
          <Link href={`/dashboard/upload${selectedFolder ? `?folder=${selectedFolder}` : ''}`} className="mt-4 bg-[var(--accent)] text-[var(--accent-fg)] px-5 py-2.5 rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity">
            Unggah Catatan
          </Link>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Sort & Filter Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs text-[var(--text-secondary)] px-1">
        <span>Menampilkan <strong>{sortedNotes.length}</strong> catatan</span>
        <div className="flex flex-row items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
          {folders && folders.length > 0 && (
            <select
              value={selectedFolder}
              onChange={(e) => setSelectedFolder(e.target.value)}
              className="flex-1 sm:flex-initial px-2 py-1.5 bg-[var(--surface)] border border-[var(--border)] rounded-xl font-bold text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)] cursor-pointer text-[11px] sm:text-xs transition-all hover:border-[var(--text-muted)] min-w-0"
            >
              <option value="">📁 All Folders</option>
              {folders.map(f => {
                let displayName = f.name;
                if (f.name && f.name.startsWith('{')) {
                  try { displayName = JSON.parse(f.name).name; } catch (e) {}
                }
                return (
                  <option key={f.id} value={f.id}>📁 {displayName}</option>
                );
              })}
            </select>
          )}

          {/* Sort Controls */}
          <select
            value={sortBy}
            onChange={(e) => {
              const newSort = e.target.value;
              setSortBy(newSort);
              try {
                localStorage.setItem('notes_sort_by', newSort);
              } catch (err) {
                console.error('Failed to save sort preference:', err);
              }
            }}
            className="flex-1 sm:flex-initial px-2 py-1.5 bg-[var(--surface)] border border-[var(--border)] rounded-xl font-bold text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)] cursor-pointer text-[11px] sm:text-xs transition-all hover:border-[var(--text-muted)] min-w-0"
          >
            <option value="newest">📅 Terbaru</option>
            <option value="oldest">⏳ Terlama</option>
            <option value="last-viewed">👁️ Dilihat</option>
            <option value="folder">📁 Folder</option>
          </select>
        </div>
      </div>

      {/* Grid: 2 columns on mobile, 3 on larger screens */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5 sm:gap-4">
        {sortedNotes.map((note) => {
          const thumbnail = note.note_media?.find((m) => m.order_index === 0)?.media_url;
          
          // Format date helper: HH:MM, DD Month YYYY
          const formatNoteDate = (dateStr: string) => {
            const d = new Date(dateStr);
            const hours = String(d.getHours()).padStart(2, '0');
            const minutes = String(d.getMinutes()).padStart(2, '0');
            const day = d.getDate();
            const month = d.toLocaleDateString(undefined, { month: 'short' });
            const year = d.getFullYear();
            return `${hours}:${minutes}, ${day} ${month} ${year}`;
          };

          return (
            <Link
              key={note.id}
              href={`/dashboard/note/${note.id}`}
              className="group bg-[var(--surface)] border border-[var(--border)] rounded-xl sm:rounded-2xl overflow-hidden hover:border-[var(--text-muted)] hover:shadow-md transition-all flex flex-col min-w-0"
            >
              {thumbnail && (
                <div className="h-24 sm:h-36 bg-[var(--surface-2)] overflow-hidden">
                  <img
                    src={thumbnail}
                    alt=""
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                </div>
              )}
              <div className="p-2.5 sm:p-4 flex-1 flex flex-col gap-1.5 sm:gap-2 min-w-0">
                <h3 className="font-semibold text-xs sm:text-sm text-[var(--text-primary)] truncate">{note.title}</h3>
                <p className="text-[11px] sm:text-sm text-[var(--text-secondary)] line-clamp-2 leading-relaxed flex-1">
                  {note.transcribed_text}
                </p>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mt-1 border-t border-[var(--border)] pt-1.5 sm:pt-2">
                  {note.folder ? (
                    <span 
                      className="text-[9px] sm:text-xs font-semibold px-1.5 py-0.5 rounded-md truncate max-w-full inline-block self-start"
                      style={(() => {
                        let color = '';
                        if (note.folder.name.startsWith('{')) {
                          try { color = JSON.parse(note.folder.name).color; } catch (e) {}
                        }
                        return color ? { backgroundColor: `${color}15`, color: color } : { backgroundColor: 'var(--surface-2)', color: 'var(--text-muted)' };
                      })()}
                    >
                      {(() => {
                        if (note.folder.name.startsWith('{')) {
                          try { return JSON.parse(note.folder.name).name; } catch (e) {}
                        }
                        return note.folder.name;
                      })()}
                    </span>
                  ) : (
                    <span className="hidden sm:inline-block" />
                  )}
                  <span className="text-[9px] sm:text-xs text-[var(--text-muted)] sm:ml-auto">
                    {formatNoteDate(note.created_at)}
                  </span>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
