'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import Link from 'next/link';
import DatePicker from '@/components/ui/DatePicker';
import { parseFolderInfo } from '@/lib/site';

interface SharedItemsListProps {
  initialNotes: any[];
  initialFolders: any[];
  ownerMap: Record<string, { email: string; name: string; avatar: string }>;
}

export default function SharedItemsList({
  initialNotes,
  initialFolders,
  ownerMap
}: SharedItemsListProps) {
  const [sortBy, setSortBy] = useState<'newest' | 'oldest'>('newest');
  const [filterType, setFilterType] = useState<'all' | 'folder' | 'note'>('all');
  const [filterDate, setFilterDate] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSortOpen, setIsSortOpen] = useState(false);
  const sortDropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside — but NOT when clicking inside DatePicker portal calendar
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      // If click is inside the portal calendar, don't close
      if (target.closest('.datepicker-portal-content')) return;
      if (sortDropdownRef.current && !sortDropdownRef.current.contains(target)) {
        setIsSortOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Format dates helper
  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const day = d.getDate();
    const month = d.toLocaleDateString('id-ID', { month: 'short' });
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const mins = String(d.getMinutes()).padStart(2, '0');
    return `${hours}:${mins}, ${day} ${month} ${year}`;
  };

  // Filter & Sort folder items
  const filteredFolders = useMemo(() => {
    if (filterType === 'note') return [];

    let result = (initialFolders || [])
      .filter((f: any) => f.folders)
      .map((f: any) => ({
        created_at: f.created_at,
        id: f.folders.id,
        name: f.folders.name,
        user_id: f.folders.user_id
      }));

    // Filter by search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(item => {
        const nameStr = item.name?.startsWith('{') ? (() => { try { return JSON.parse(item.name).name; } catch { return item.name; } })() : item.name;
        return nameStr?.toLowerCase().includes(q);
      });
    }

    // Filter by Date Shared
    if (filterDate) {
      result = result.filter(item => {
        const d = new Date(item.created_at);
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}` === filterDate;
      });
    }

    // Sort
    result.sort((a, b) => {
      const timeA = new Date(a.created_at).getTime();
      const timeB = new Date(b.created_at).getTime();
      return sortBy === 'newest' ? timeB - timeA : timeA - timeB;
    });

    return result;
  }, [initialFolders, filterType, filterDate, sortBy, searchQuery]);

  // Filter & Sort note items
  const filteredNotes = useMemo(() => {
    if (filterType === 'folder') return [];

    let result = (initialNotes || [])
      .filter((h: any) => h.notes)
      .map((h: any) => ({
        created_at: h.created_at,
        id: h.notes.id,
        title: h.notes.title,
        transcribed_text: h.notes.transcribed_text,
        user_id: h.notes.user_id,
        note_media: h.notes.note_media
      }));

    // Filter by search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(item =>
        item.title?.toLowerCase().includes(q) ||
        item.transcribed_text?.toLowerCase().includes(q)
      );
    }

    // Filter by Date Shared
    if (filterDate) {
      result = result.filter(item => {
        const d = new Date(item.created_at);
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}` === filterDate;
      });
    }

    // Sort
    result.sort((a, b) => {
      const timeA = new Date(a.created_at).getTime();
      const timeB = new Date(b.created_at).getTime();
      return sortBy === 'newest' ? timeB - timeA : timeA - timeB;
    });

    return result;
  }, [initialNotes, filterType, filterDate, sortBy, searchQuery]);

  const hasAnyMatch = filteredFolders.length > 0 || filteredNotes.length > 0;

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Filter Trigger Button + Dropdown Panel */}
      <div className="flex items-center gap-2">
        {/* Search Input */}
        <div className="flex-1 relative">
          <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari folder atau catatan..."
            className="w-full pl-8 pr-3 py-1.5 bg-[var(--surface-2)] border border-[var(--border)] rounded-xl text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)] transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          )}
        </div>

        {/* Three-dots button */}
        <div className="relative flex-shrink-0 ml-auto" ref={sortDropdownRef}>
          <button
            onClick={() => setIsSortOpen(!isSortOpen)}
            className={`p-2 rounded-xl border transition-all cursor-pointer ${
              filterType !== 'all' || filterDate || sortBy !== 'newest'
                ? 'border-[var(--accent)] text-[var(--accent)] bg-[var(--accent)]/10'
                : 'border-[var(--border)] text-[var(--text-secondary)] bg-[var(--surface-2)] hover:bg-[var(--surface)]'
            }`}
            title="Filter & Urutan"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/>
            </svg>
          </button>

          {isSortOpen && (
            <div className="absolute right-0 mt-2 w-56 bg-[var(--surface)] border border-[var(--border)] rounded-2xl shadow-xl z-50 animate-fadeIn overflow-hidden">
              {/* Panel header */}
              <div className="px-4 py-3 border-b border-[var(--border)] flex items-center justify-between">
                <span className="text-xs font-bold text-[var(--text-primary)]">Filter & Urutan</span>
                {(filterType !== 'all' || filterDate || sortBy !== 'newest') && (
                  <button
                    onClick={() => {
                      setFilterType('all');
                      setFilterDate('');
                      setSortBy('newest');
                    }}
                    className="text-[10px] font-bold text-red-500 hover:underline cursor-pointer"
                  >
                    Reset
                  </button>
                )}
              </div>

              {/* Type */}
              <div className="px-4 py-3 space-y-1.5 border-b border-[var(--border)]">
                <p className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Jenis</p>
                <div className="flex bg-[var(--surface-2)] p-0.5 rounded-lg border border-[var(--border)]">
                  {(['all', 'folder', 'note'] as const).map((type) => (
                    <button
                      key={type}
                      onClick={() => setFilterType(type)}
                      className={`flex-1 py-1 rounded-md text-[10px] font-bold transition-all cursor-pointer ${
                        filterType === type
                          ? 'bg-[var(--bg)] text-[var(--text-primary)] shadow-sm'
                          : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                      }`}
                    >
                      {type === 'all' ? 'Semua' : type === 'folder' ? 'Folder' : 'Catatan'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Sort */}
              <div className="px-4 py-3 space-y-1.5 border-b border-[var(--border)]">
                <p className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Urutan</p>
                <div className="flex flex-col gap-0.5">
                  {([['newest', 'Terbaru → Terlama'], ['oldest', 'Terlama → Terbaru']] as const).map(([val, label]) => (
                    <button
                      key={val}
                      onClick={() => setSortBy(val)}
                      className={`w-full text-left px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer ${
                        sortBy === val
                          ? 'bg-[var(--surface-2)] text-[var(--text-primary)]'
                          : 'text-[var(--text-secondary)] hover:bg-[var(--surface-2)]'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Date */}
              <div className="px-4 py-3">
                <p className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1.5">Tanggal Dibagikan</p>
                <DatePicker
                  value={filterDate}
                  placeholder="Pilih tanggal"
                  onChange={(date) => setFilterDate(date)}
                  onClear={() => setFilterDate('')}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main Items View */}
      {hasAnyMatch ? (
        <div className="space-y-8 sm:space-y-10">
          {/* Folders Section */}
          {filteredFolders.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-bold text-[var(--text-secondary)] uppercase tracking-wider flex items-center gap-1.5">
                <span>📁</span> Folder ({filteredFolders.length})
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {filteredFolders.map((item) => {
                  const owner = ownerMap[item.user_id];
                  const ownerName = owner?.name || `${item.user_id?.slice(0, 8)}…`;
                  const ownerAvatar = owner?.avatar || '';
                  const { displayName, color, emoji } = parseFolderInfo(item.name);

                  return (
                    <Link
                      key={`folder-${item.id}`}
                      href={`/folder/${item.id}`}
                      className="bg-[var(--surface)] border border-[var(--border)] p-2.5 sm:p-3 rounded-xl hover:border-[var(--text-muted)] hover:shadow-sm transition-all flex flex-col gap-2.5 group min-w-0 w-full"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-8 h-8 sm:w-9 sm:h-9 bg-[var(--surface-2)] rounded-lg flex items-center justify-center flex-shrink-0" style={color ? { backgroundColor: `${color}15`, color: color } : {}}>
                          <span className="text-sm sm:text-base">{emoji}</span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="font-semibold text-xs sm:text-sm text-[var(--text-primary)] truncate leading-tight pr-0.5">{displayName}</h3>
                          <p className="text-[9px] text-[var(--text-muted)] mt-0.5">Folder</p>
                        </div>
                      </div>

                      {/* Owner info */}
                      <div className="border-t border-[var(--border)] pt-1.5 mt-auto flex items-center justify-between gap-1.5">
                        <div className="flex items-center gap-1 min-w-0">
                          {ownerAvatar ? (
                            <img src={ownerAvatar} alt="" className="w-3.5 h-3.5 rounded-full flex-shrink-0" />
                          ) : (
                            <div className="w-3.5 h-3.5 rounded-full bg-[var(--accent)]/20 text-[var(--accent)] flex items-center justify-center text-[7px] font-bold flex-shrink-0">
                              {ownerName[0]?.toUpperCase() || '?'}
                            </div>
                          )}
                          <span className="text-[9px] text-[var(--text-secondary)] truncate leading-tight">{ownerName}</span>
                        </div>
                        <span className="text-[8px] text-[var(--text-muted)] flex-shrink-0">{formatDate(item.created_at).split(',')[1]?.trim() || ''}</span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}

          {/* Notes Section */}
          {filteredNotes.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-bold text-[var(--text-secondary)] uppercase tracking-wider flex items-center gap-1.5">
                <span>📝</span> Catatan ({filteredNotes.length})
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {filteredNotes.map((item) => {
                  const owner = ownerMap[item.user_id];
                  const ownerName = owner?.name || `${item.user_id?.slice(0, 8)}…`;
                  const ownerAvatar = owner?.avatar || '';

                  const thumbnail = item.note_media
                    ?.sort((a: any, b: any) => a.order_index - b.order_index)
                    ?.[0]?.media_url;

                  const previewText = item.transcribed_text
                    ? item.transcribed_text.replace(/#{1,6} /g, '').slice(0, 100)
                    : null;

                  return (
                    <Link
                      key={`note-${item.id}`}
                      href={`/note/${item.id}`}
                      className="group relative bg-[var(--surface)] border border-[var(--border)] rounded-xl sm:rounded-2xl overflow-hidden hover:border-[var(--text-muted)] hover:shadow-md transition-all flex flex-col min-w-0"
                    >
                      {/* Thumbnail */}
                      {thumbnail ? (
                        <div className="h-20 sm:h-28 bg-[var(--surface-2)] overflow-hidden">
                          <img
                            src={thumbnail}
                            alt=""
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                        </div>
                      ) : (
                        <div className="h-16 sm:h-20 bg-gradient-to-br from-[var(--accent)]/10 to-[var(--surface-2)] flex items-center justify-center">
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--accent)]/40">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                            <polyline points="14 2 14 8 20 8"/>
                            <line x1="16" y1="13" x2="8" y2="13"/>
                            <line x1="16" y1="17" x2="8" y2="17"/>
                          </svg>
                        </div>
                      )}

                      {/* Card body */}
                      <div className="p-2 sm:p-3 flex-1 flex flex-col gap-1.5 min-w-0">
                        <h3 className="font-semibold text-xs text-[var(--text-primary)] truncate leading-tight">
                          {item.title || 'Tanpa Judul'}
                        </h3>

                        {previewText && (
                          <p className="text-[10px] text-[var(--text-secondary)] line-clamp-2 leading-relaxed flex-1">
                            {previewText}
                          </p>
                        )}

                        {/* Footer */}
                        <div className="mt-auto border-t border-[var(--border)] pt-1.5 flex flex-col gap-1">
                          <div className="flex items-center gap-1 min-w-0">
                            {ownerAvatar ? (
                              <img src={ownerAvatar} alt="" className="w-3.5 h-3.5 rounded-full flex-shrink-0" />
                            ) : (
                              <div className="w-3.5 h-3.5 rounded-full bg-[var(--accent)]/20 text-[var(--accent)] flex items-center justify-center text-[7px] font-bold flex-shrink-0">
                                {ownerName[0]?.toUpperCase() || '?'}
                              </div>
                            )}
                            <span className="text-[9px] text-[var(--text-secondary)] truncate leading-tight">{ownerName}</span>
                          </div>

                          <div className="flex items-center justify-between gap-1 text-[8px] text-[var(--text-muted)]">
                            <span className="bg-[var(--surface-2)] px-1 rounded font-medium">
                              Catatan
                            </span>
                            <span>
                              {formatDate(item.created_at).split(',')[1]?.trim() || ''}
                            </span>
                          </div>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="py-20 text-center border-2 border-dashed border-[var(--border)] rounded-2xl">
          <div className="w-14 h-14 rounded-full bg-[var(--surface-2)] flex items-center justify-center mx-auto mb-3 text-xl">🔍</div>
          <p className="text-[var(--text-primary)] font-bold text-sm">Tidak ada hasil cocok</p>
          <p className="text-xs text-[var(--text-muted)] mt-1">Cobalah ubah atau bersihkan filter pencarian Anda.</p>
        </div>
      )}
    </div>
  );
}
