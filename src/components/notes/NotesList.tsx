'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import DatePicker from '@/components/ui/DatePicker';
import ShareModal from '@/components/notes/ShareModal';

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
  hideFolderFilter?: boolean;
}

export default function NotesList({ initialNotes, q, folder, folders, hideFolderFilter }: NotesListProps) {
  const [sortBy, setSortBy] = useState('newest');
  const [selectedFolder, setSelectedFolder] = useState(folder || '');
  const [notesState, setNotesState] = useState<Note[]>(initialNotes);
  const [sortedNotes, setSortedNotes] = useState<Note[]>(initialNotes);
  const [lastViewed, setLastViewed] = useState<Record<string, number>>({});
  
  // Selection states
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isBulkShareOpen, setIsBulkShareOpen] = useState(false);

  // Dropdown states
  const [isSortDropdownOpen, setIsSortDropdownOpen] = useState(false);
  const [isFolderDropdownOpen, setIsFolderDropdownOpen] = useState(false);
  const [isInnerFolderOpen, setIsInnerFolderOpen] = useState(false);
  const [filterDate, setFilterDate] = useState('');

  const sortDropdownRef = useRef<HTMLDivElement>(null);
  const folderDropdownRef = useRef<HTMLDivElement>(null);

  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilterDate(e.target.value);
    if (q) {
      router.push(pathname);
    }
  };

  const handleSortChange = (newSort: string) => {
    setSortBy(newSort);
    setIsSortDropdownOpen(false);
    try {
      localStorage.setItem('notes_sort_by', newSort);
    } catch (e) {}
    if (q) {
      router.push(pathname);
    }
  };

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (sortDropdownRef.current && !sortDropdownRef.current.contains(event.target as Node)) {
        setIsSortDropdownOpen(false);
      }
      if (folderDropdownRef.current && !folderDropdownRef.current.contains(event.target as Node)) {
        const target = event.target as HTMLElement;
        // Do not close if clicking inside the DatePicker portal calendar
        if (!target.closest('.datepicker-portal-content')) {
          setIsFolderDropdownOpen(false);
          setIsInnerFolderOpen(false);
        }
      }
    }
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  useEffect(() => {
    setNotesState(initialNotes);
  }, [initialNotes]);

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

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    const confirmDelete = confirm(`Apakah Anda yakin ingin menghapus ${selectedIds.length} catatan yang dipilih? Tindakan ini tidak dapat dibatalkan.`);
    if (!confirmDelete) return;

    setIsDeleting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Unauthorized');

      const { error } = await supabase
        .from('notes')
        .delete()
        .in('id', selectedIds)
        .eq('user_id', user.id);

      if (error) throw error;

      setNotesState(prev => prev.filter(n => !selectedIds.includes(n.id)));
      setSelectedIds([]);
      setIsSelectMode(false);
      router.refresh();
    } catch (err: any) {
      alert('Gagal menghapus catatan: ' + err.message);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCardClick = (e: React.MouseEvent, noteId: string) => {
    if (isSelectMode) {
      e.preventDefault();
      setSelectedIds(prev => 
        prev.includes(noteId) 
          ? prev.filter(id => id !== noteId) 
          : [...prev, noteId]
      );
    }
  };

  // Filter and sort notes whenever sortBy, selectedFolder, filterDate, notesState, or lastViewed changes
  useEffect(() => {
    let filtered = [...notesState];

    if (selectedFolder) {
      filtered = filtered.filter((n) => n.folder?.id === selectedFolder);
    }

    if (filterDate) {
      filtered = filtered.filter(n => {
        const localDate = new Date(n.created_at);
        const yyyy = localDate.getFullYear();
        const mm = String(localDate.getMonth() + 1).padStart(2, '0');
        const dd = String(localDate.getDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}` === filterDate;
      });
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
  }, [sortBy, selectedFolder, filterDate, notesState, lastViewed]);



  return (
    <div className="space-y-4">
      {/* Bulk Select Control Bar */}
      {isSelectMode ? (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-[var(--surface)] border border-[var(--border)] rounded-2xl animate-fadeIn text-xs sm:text-sm shadow-sm">
          <div className="flex items-center gap-3">
            <span className="text-[var(--text-secondary)] font-semibold">Terpilih: <strong>{selectedIds.length}</strong> catatan</span>
            <button
              onClick={() => {
                if (selectedIds.length === sortedNotes.length) {
                  setSelectedIds([]);
                } else {
                  setSelectedIds(sortedNotes.map(n => n.id));
                }
              }}
              className="text-[var(--accent)] hover:underline font-bold cursor-pointer text-xs"
            >
              {selectedIds.length === sortedNotes.length ? 'Batal Pilih' : 'Pilih Semua'}
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {/* Move Folder Action (Bypass Premium Alert) */}
            <button
              type="button"
              disabled={selectedIds.length === 0}
              onClick={() => alert('Fitur Pindahkan Folder Massal: Sedang memindahkan catatan terpilih...')}
              className="px-2.5 py-1.5 bg-[var(--surface-2)] hover:bg-[var(--border)] text-[var(--text-secondary)] rounded-xl font-bold cursor-pointer transition-all text-xs disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
            >
              📂 Pindahkan
            </button>

            {/* Share Action (Bypass Premium Alert & Open Share Modal) */}
            <button
              type="button"
              disabled={selectedIds.length === 0}
              onClick={() => setIsBulkShareOpen(true)}
              className="px-2.5 py-1.5 bg-[var(--surface-2)] hover:bg-[var(--border)] text-[var(--text-secondary)] rounded-xl font-bold cursor-pointer transition-all text-xs disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
            >
              🔗 Bagikan
            </button>

            {/* Delete Action (Active) */}
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
        /* Sort & Filter Controls */
        <div className="flex flex-row items-center justify-between gap-3 text-xs text-[var(--text-secondary)] px-1 w-full">
          <div className="flex items-center text-left">
            <span>Menampilkan <strong>{sortedNotes.length}</strong> catatan</span>
          </div>
          
          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              onClick={() => setIsSelectMode(true)}
              className="flex-shrink-0 px-2.5 py-1.5 bg-[var(--surface)] border border-[var(--border)] rounded-xl font-bold text-[var(--text-primary)] hover:bg-[var(--surface-2)] transition-all cursor-pointer text-[10px] sm:text-[11px] min-h-[32px] flex items-center gap-1"
            >
              ⚙️ Kelola Catatan
            </button>
            
            {/* Unified Filter Dropdown */}
            <div className="relative flex-shrink-0" ref={folderDropdownRef}>
              <button
                type="button"
                onClick={() => setIsFolderDropdownOpen(!isFolderDropdownOpen)}
                className={`px-2.5 py-1.5 bg-[var(--surface)] border border-[var(--border)] rounded-xl font-bold hover:bg-[var(--surface-2)] transition-all cursor-pointer text-[10px] sm:text-[11px] min-h-[32px] flex items-center gap-1.5 justify-between min-w-[90px] select-none ${
                  selectedFolder || filterDate || sortBy !== 'newest'
                    ? 'border-[var(--accent)] text-[var(--accent)]'
                    : 'text-[var(--text-primary)]'
                }`}
              >
                <span>🔍 Filter</span>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={`transition-transform flex-shrink-0 ${isFolderDropdownOpen ? 'rotate-180' : ''}`}><path d="m6 9 6 6 6-6"/></svg>
              </button>

              {isFolderDropdownOpen && (
                <div className="absolute right-0 mt-1.5 w-60 bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-lg p-3.5 z-50 animate-fadeIn text-[11px] sm:text-xs space-y-3.5">
                  
                  {/* Folder Section */}
                  {!hideFolderFilter && folders && folders.length > 0 && (
                    <div className="space-y-1 relative">
                      <label className="block text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Folder</label>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsInnerFolderOpen(!isInnerFolderOpen);
                        }}
                        className="w-full px-3 py-2 bg-[var(--surface-2)] border border-[var(--border)] rounded-xl text-xs text-[var(--text-primary)] hover:bg-[var(--border)] transition-colors flex items-center justify-between cursor-pointer font-medium select-none"
                      >
                        <span className="truncate">
                          {selectedFolder ? (
                            `📁 ${(() => {
                              const found = folders.find(x => x.id === selectedFolder);
                              if (!found) return 'Semua Folder';
                              let nameStr = found.name;
                              if (nameStr && nameStr.startsWith('{')) {
                                try { nameStr = JSON.parse(nameStr).name; } catch (err) {}
                              }
                              return nameStr;
                            })()}`
                          ) : (
                            '📁 Semua Folder'
                          )}
                        </span>
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={`transition-transform flex-shrink-0 text-[var(--text-secondary)] ${isInnerFolderOpen ? 'rotate-180' : ''}`}><path d="m6 9 6 6 6-6"/></svg>
                      </button>

                      {isInnerFolderOpen && (
                        <div className="absolute left-0 right-0 mt-1 w-full bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-lg py-1 z-[60] animate-fadeIn text-[11px] sm:text-xs overflow-y-auto max-h-40 scrollbar-thin">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedFolder('');
                              setIsInnerFolderOpen(false);
                            }}
                            className={`w-full text-left px-3 py-2 hover:bg-[var(--surface-2)] flex items-center gap-1.5 font-semibold text-[var(--text-primary)] ${selectedFolder === '' ? 'bg-[var(--surface-2)] text-[var(--accent)]' : ''}`}
                          >
                            📁 Semua Folder
                          </button>
                          {folders.map(f => {
                            let displayName = f.name;
                            let color = '';
                            let emoji = '📁';
                            if (f.name && f.name.startsWith('{')) {
                              try {
                                const parsed = JSON.parse(f.name);
                                displayName = parsed.name;
                                color = parsed.color || '';
                                emoji = parsed.emoji || '📁';
                              } catch (err) {}
                            }
                            return (
                              <button
                                key={f.id}
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedFolder(f.id);
                                  setIsInnerFolderOpen(false);
                                }}
                                className={`w-full text-left px-3 py-2 hover:bg-[var(--surface-2)] flex items-center gap-1.5 font-semibold truncate ${
                                  selectedFolder === f.id ? 'bg-[var(--surface-2)] text-[var(--accent)]' : 'text-[var(--text-primary)]'
                                }`}
                                style={color ? { color: color } : {}}
                              >
                                <span>{emoji}</span>
                                <span>{displayName}</span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Date Section */}
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Tanggal</label>
                    <DatePicker 
                      value={filterDate}
                      onChange={(date) => {
                        setFilterDate(date);
                        if (q) router.push(pathname);
                      }}
                      onClear={() => {
                        setFilterDate('');
                        if (q) router.push(pathname);
                      }}
                    />
                  </div>

                  {/* Sort Section */}
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Urutan</label>
                    <div className="grid grid-cols-3 gap-1">
                      <button
                        type="button"
                        onClick={() => handleSortChange('newest')}
                        className={`py-1.5 px-1 rounded-lg text-center font-bold transition-all text-[9px] sm:text-[10px] ${
                          sortBy === 'newest'
                            ? 'bg-[var(--accent)] text-[var(--accent-fg)]'
                            : 'bg-[var(--surface-2)] text-[var(--text-primary)] hover:bg-[var(--border)]'
                        }`}
                      >
                        Terbaru
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSortChange('oldest')}
                        className={`py-1.5 px-1 rounded-lg text-center font-bold transition-all text-[9px] sm:text-[10px] ${
                          sortBy === 'oldest'
                            ? 'bg-[var(--accent)] text-[var(--accent-fg)]'
                            : 'bg-[var(--surface-2)] text-[var(--text-primary)] hover:bg-[var(--border)]'
                        }`}
                      >
                        Terlama
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSortChange('last-viewed')}
                        className={`py-1.5 px-1 rounded-lg text-center font-bold transition-all text-[9px] sm:text-[10px] ${
                          sortBy === 'last-viewed'
                            ? 'bg-[var(--accent)] text-[var(--accent-fg)]'
                            : 'bg-[var(--surface-2)] text-[var(--text-primary)] hover:bg-[var(--border)]'
                        }`}
                      >
                        Dilihat
                      </button>
                    </div>
                  </div>

                  {/* Reset Filters Option if active */}
                  {(selectedFolder || filterDate || sortBy !== 'newest') && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedFolder('');
                        setFilterDate('');
                        setSortBy('newest');
                        setIsFolderDropdownOpen(false);
                      }}
                      className="w-full pt-1 text-center text-[10px] text-red-500 font-bold hover:underline"
                    >
                      Reset Semua Filter
                    </button>
                  )}

                </div>
              )}
            </div>

          </div>
        </div>
      )}

      {(!sortedNotes || sortedNotes.length === 0) ? (
        <div className="flex flex-col items-center justify-center py-24 text-center border-2 border-dashed border-[var(--border)] rounded-2xl animate-fadeIn mt-4">
          <svg className="text-[var(--text-muted)] mb-4" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
          <p className="text-[var(--text-secondary)] font-medium mb-1">{q ? 'Tidak ada catatan ditemukan' : 'Belum ada catatan'}</p>
          <p className="text-sm text-[var(--text-muted)]">{q ? 'Coba cari kata kunci lain' : 'Mulai dengan mengunggah catatan pertama Anda'}</p>
          {!q && (
            <Link href={`/dashboard/upload${selectedFolder ? `?folder=${selectedFolder}` : ''}`} className="mt-4 bg-[var(--accent)] text-[var(--accent-fg)] px-5 py-2.5 rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity">
              Unggah Catatan
            </Link>
          )}
        </div>
      ) : (
        /* Grid: 2 columns on mobile, 3 on larger screens */
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5 sm:gap-4">
        {sortedNotes.map((note) => {
          const thumbnail = note.note_media?.find((m) => m.order_index === 0)?.media_url;
          const isSelected = selectedIds.includes(note.id);
          
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
              onClick={(e) => handleCardClick(e, note.id)}
              className={`group relative bg-[var(--surface)] border rounded-xl sm:rounded-2xl overflow-hidden hover:border-[var(--text-muted)] hover:shadow-md transition-all flex flex-col min-w-0 ${
                isSelected ? 'border-[var(--text-secondary)] ring-2 ring-[var(--accent)]/15' : 'border-[var(--border)]'
              }`}
            >
              {isSelectMode && (
                <div className="absolute top-2.5 right-2.5 z-20">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    readOnly
                    className="w-4 h-4 rounded border-[var(--border)] bg-[var(--surface)] text-[var(--accent)] focus:ring-[var(--accent)] cursor-pointer"
                  />
                </div>
              )}
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
          itemType="note"
          initialVisibility="private"
          initialAllowedEmails={[]}
        />
      )}
    </div>
  );
}
