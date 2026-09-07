'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  FileArchive,
  Check,
  Minus,
  ChevronRight,
  ChevronDown,
  Search,
  Folder as FolderIcon,
  FileText,
  FileSpreadsheet,
  Sparkles,
  Image as ImageIcon,
} from 'lucide-react';

export interface ExportNoteItem {
  id: string;
  title: string;
  created_at: string;
  folder_id?: string | null;
}

export interface ExportFolderItem {
  id: string;
  name: string;
}

export interface ExportDataModalProps {
  isOpen: boolean;
  onClose: () => void;
  availableNotes: ExportNoteItem[];
  availableFolders: ExportFolderItem[];
}

export default function ExportDataModal({
  isOpen,
  onClose,
  availableNotes = [],
  availableFolders = [],
}: ExportDataModalProps) {
  const [mounted, setMounted] = useState(false);
  
  // Format always ZIP for this specific requirement to keep it simple, but we can leave the state if needed.
  // The user specifically asked for zip with photos and text.
  const [exportFormat] = useState<'zip'>('zip');
  const [exportScope, setExportScope] = useState<'all' | 'custom'>('all');

  // Primary Content Options
  const [includeNotes, setIncludeNotes] = useState(true);
  const [includeImages, setIncludeImages] = useState(true);
  
  // Secondary Content Options
  const [includeSummary, setIncludeSummary] = useState(false);
  const [includeFlashcards, setIncludeFlashcards] = useState(false);

  // Custom Selection States
  const [selectedNoteIds, setSelectedNoteIds] = useState<Set<string>>(new Set());
  const [selectedFolderIds, setSelectedFolderIds] = useState<Set<string>>(new Set());
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const getFolderName = (rawName: string) => {
    if (!rawName) return 'Tanpa Nama';
    if (rawName.startsWith('{')) {
      try {
        const parsed = JSON.parse(rawName);
        return parsed.name || rawName;
      } catch {
        return rawName;
      }
    }
    return rawName;
  };

  const { folderMap, rootNotes } = useMemo(() => {
    const fMap: Record<string, ExportNoteItem[]> = {};
    const unorganized: ExportNoteItem[] = [];

    availableFolders.forEach(f => {
      fMap[f.id] = [];
    });

    availableNotes.forEach(note => {
      if (note.folder_id && fMap[note.folder_id]) {
        fMap[note.folder_id].push(note);
      } else {
        unorganized.push(note);
      }
    });

    return { folderMap: fMap, rootNotes: unorganized };
  }, [availableFolders, availableNotes]);

  const filteredData = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) {
      return { folders: availableFolders, folderNotes: folderMap, rootNotes };
    }

    const matchedFolders: ExportFolderItem[] = [];
    const matchedFolderNotes: Record<string, ExportNoteItem[]> = {};

    availableFolders.forEach(f => {
      const fName = getFolderName(f.name).toLowerCase();
      const notesInFolder = folderMap[f.id] || [];
      const matchedChildNotes = notesInFolder.filter(n =>
        (n.title || 'Catatan Tanpa Judul').toLowerCase().includes(query)
      );

      if (fName.includes(query)) {
        matchedFolders.push(f);
        matchedFolderNotes[f.id] = notesInFolder;
      } else if (matchedChildNotes.length > 0) {
        matchedFolders.push(f);
        matchedFolderNotes[f.id] = matchedChildNotes;
      }
    });

    const matchedRoot = rootNotes.filter(n =>
      (n.title || 'Catatan Tanpa Judul').toLowerCase().includes(query)
    );

    return { folders: matchedFolders, folderNotes: matchedFolderNotes, rootNotes: matchedRoot };
  }, [availableFolders, folderMap, rootNotes, searchQuery]);

  // Auto expand on search
  useEffect(() => {
    if (searchQuery.trim()) {
      const allMatchedIds = new Set(filteredData.folders.map(f => f.id));
      if (filteredData.rootNotes.length > 0) allMatchedIds.add('__root__');
      setExpandedFolders(allMatchedIds);
    }
  }, [searchQuery, filteredData]);

  const totalNotesCount = availableNotes.length;
  const currentSelectedNotesCount = exportScope === 'all' ? totalNotesCount : selectedNoteIds.size;

  const getFolderSelectionState = (folderId: string) => {
    const notesInFolder = folderMap[folderId] || [];
    if (notesInFolder.length === 0) {
      return selectedFolderIds.has(folderId) ? 'checked' : 'unchecked';
    }
    const selectedChildCount = notesInFolder.filter(n => selectedNoteIds.has(n.id)).length;
    if (selectedChildCount === notesInFolder.length) return 'checked';
    if (selectedChildCount > 0 || selectedFolderIds.has(folderId)) return 'indeterminate';
    return 'unchecked';
  };

  const toggleFolder = (folderId: string) => {
    const currentState = getFolderSelectionState(folderId);
    const notesInFolder = folderMap[folderId] || [];
    const nextNoteIds = new Set(selectedNoteIds);
    const nextFolderIds = new Set(selectedFolderIds);

    if (currentState === 'checked') {
      nextFolderIds.delete(folderId);
      notesInFolder.forEach(n => nextNoteIds.delete(n.id));
    } else {
      nextFolderIds.add(folderId);
      notesInFolder.forEach(n => nextNoteIds.add(n.id));
    }

    setSelectedNoteIds(nextNoteIds);
    setSelectedFolderIds(nextFolderIds);
  };

  const toggleNote = (noteId: string, parentFolderId?: string | null) => {
    const nextNoteIds = new Set(selectedNoteIds);
    const nextFolderIds = new Set(selectedFolderIds);

    if (nextNoteIds.has(noteId)) {
      nextNoteIds.delete(noteId);
    } else {
      nextNoteIds.add(noteId);
    }

    if (parentFolderId && folderMap[parentFolderId]) {
      const childNotes = folderMap[parentFolderId];
      const allSelected = childNotes.length > 0 && childNotes.every(n => nextNoteIds.has(n.id));
      if (allSelected) {
        nextFolderIds.add(parentFolderId);
      } else {
        nextFolderIds.delete(parentFolderId);
      }
    }

    setSelectedNoteIds(nextNoteIds);
    setSelectedFolderIds(nextFolderIds);
  };

  const toggleExpand = (folderId: string) => {
    setExpandedFolders(prev => {
      const next = new Set(prev);
      if (next.has(folderId)) next.delete(folderId);
      else next.add(folderId);
      return next;
    });
  };

  const handleExecuteExport = async () => {
    setIsExporting(true);
    try {
      const payload = {
        exportFormat,
        exportAll: exportScope === 'all',
        includeNotes,
        includeFolders: true, // Always include folder structure in ZIP
        includeSummary,
        includeFlashcards,
        includeImages,
        selectedNoteIds: exportScope === 'custom' ? Array.from(selectedNoteIds) : availableNotes.map(n => n.id),
        selectedFolderIds: exportScope === 'custom' ? Array.from(selectedFolderIds) : availableFolders.map(f => f.id),
      };

      const res = await fetch('/api/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Gagal mengekspor data');
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `arsip-belajar-export-${Date.now()}.${exportFormat}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      onClose();
    } catch (err: any) {
      alert(err.message || 'Terjadi kesalahan saat mengekspor data.');
    } finally {
      setIsExporting(false);
    }
  };

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-4 animate-fadeIn"
    >
      <div onClick={onClose} className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity" />

      <div
        onClick={e => e.stopPropagation()}
        className="relative w-full max-w-2xl bg-[var(--surface)] border border-[var(--border)] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] text-[var(--text-primary)] font-sans z-10"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)] bg-[var(--surface-2)] flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[var(--accent)] text-[var(--accent-fg)] flex items-center justify-center flex-shrink-0 shadow-sm">
              <FileArchive className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-base text-[var(--text-primary)]">Ekspor Arsip Belajar</h2>
              <p className="text-xs text-[var(--text-muted)] mt-0.5 font-medium">
                Unduh file catatan dan foto ke format ZIP
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-2)] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-sm bg-[var(--bg)]">
          
          {/* Section 1: Pengaturan Konten Utama */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
              1. Konten Utama
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className={`flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer ${
                includeImages ? 'border-[var(--accent)] bg-[var(--surface)]' : 'border-[var(--border)] bg-[var(--surface-2)] opacity-80'
              }`}>
                <input type="checkbox" checked={includeImages} onChange={e => setIncludeImages(e.target.checked)} className="mt-1 w-4 h-4 rounded text-[var(--accent)] focus:ring-[var(--accent)]" />
                <div>
                  <div className="font-semibold text-sm flex items-center gap-2">
                    <ImageIcon className="w-4 h-4" /> Foto Asli
                  </div>
                  <p className="text-[11px] text-[var(--text-secondary)] mt-1">Sertakan foto papan tulis/catatan asli yang diunggah (.jpg)</p>
                </div>
              </label>

              <label className={`flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer ${
                includeNotes ? 'border-[var(--accent)] bg-[var(--surface)]' : 'border-[var(--border)] bg-[var(--surface-2)] opacity-80'
              }`}>
                <input type="checkbox" checked={includeNotes} onChange={e => setIncludeNotes(e.target.checked)} className="mt-1 w-4 h-4 rounded text-[var(--accent)] focus:ring-[var(--accent)]" />
                <div>
                  <div className="font-semibold text-sm flex items-center gap-2">
                    <FileText className="w-4 h-4" /> Teks Ekstraksi
                  </div>
                  <p className="text-[11px] text-[var(--text-secondary)] mt-1">Sertakan teks hasil ketikan ulang atau ekstrak (.txt)</p>
                </div>
              </label>
            </div>
          </div>

          {/* Section 2: Fitur Sampingan */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
              2. Fitur Sampingan (Opsional)
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className={`flex items-center gap-3 p-2.5 rounded-lg border transition-all cursor-pointer ${
                includeSummary ? 'border-[var(--accent)] bg-[var(--surface)]' : 'border-[var(--border)] bg-[var(--surface-2)]'
              }`}>
                <input type="checkbox" checked={includeSummary} onChange={e => setIncludeSummary(e.target.checked)} className="w-4 h-4 rounded text-[var(--accent)] focus:ring-[var(--accent)]" />
                <Sparkles className="w-4 h-4 text-[var(--text-muted)]" />
                <span className="text-sm font-medium">Ringkasan AI</span>
              </label>

              <label className={`flex items-center gap-3 p-2.5 rounded-lg border transition-all cursor-pointer ${
                includeFlashcards ? 'border-[var(--accent)] bg-[var(--surface)]' : 'border-[var(--border)] bg-[var(--surface-2)]'
              }`}>
                <input type="checkbox" checked={includeFlashcards} onChange={e => setIncludeFlashcards(e.target.checked)} className="w-4 h-4 rounded text-[var(--accent)] focus:ring-[var(--accent)]" />
                <FileSpreadsheet className="w-4 h-4 text-[var(--text-muted)]" />
                <span className="text-sm font-medium">Flashcards AI</span>
              </label>
            </div>
          </div>

          {/* Section 3: Cakupan Data */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
              3. Cakupan Data
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setExportScope('all')}
                className={`py-2 px-3 rounded-xl border text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  exportScope === 'all'
                    ? 'border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-fg)] shadow-sm'
                    : 'border-[var(--border)] bg-[var(--surface-2)] text-[var(--text-secondary)] hover:border-[var(--text-muted)]'
                }`}
              >
                Semua Data ({totalNotesCount})
              </button>
              <button
                type="button"
                onClick={() => setExportScope('custom')}
                className={`py-2 px-3 rounded-xl border text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  exportScope === 'custom'
                    ? 'border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-fg)] shadow-sm'
                    : 'border-[var(--border)] bg-[var(--surface-2)] text-[var(--text-secondary)] hover:border-[var(--text-muted)]'
                }`}
              >
                Pilih Hierarki
              </button>
            </div>
          </div>

          {/* Hierarchical Tree (Only Custom Mode) */}
          {exportScope === 'custom' && (
            <div className="border border-[var(--border)] rounded-xl bg-[var(--surface)] overflow-hidden shadow-sm flex flex-col max-h-[300px]">
              <div className="p-2 border-b border-[var(--border)] bg-[var(--surface-2)] flex items-center gap-2">
                <Search className="w-4 h-4 text-[var(--text-muted)] ml-2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Cari folder atau catatan..."
                  className="flex-1 bg-transparent text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none py-1"
                />
              </div>

              <div className="overflow-y-auto p-2 space-y-1">
                {filteredData.folders.length === 0 && filteredData.rootNotes.length === 0 && (
                  <p className="text-center py-6 text-[var(--text-muted)] text-sm">Tidak ditemukan.</p>
                )}

                {filteredData.folders.map(folder => {
                  const state = getFolderSelectionState(folder.id);
                  const isExpanded = expandedFolders.has(folder.id);
                  const notes = filteredData.folderNotes[folder.id] || [];

                  return (
                    <div key={folder.id} className="flex flex-col">
                      <div className="flex items-center gap-2 p-1.5 hover:bg-[var(--surface-2)] rounded-lg transition-colors group">
                        <button
                          type="button"
                          onClick={() => toggleExpand(folder.id)}
                          className="w-5 h-5 flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                        >
                          {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                        </button>
                        
                        <button
                          type="button"
                          onClick={() => toggleFolder(folder.id)}
                          className={`w-4 h-4 rounded border flex items-center justify-center transition-colors cursor-pointer flex-shrink-0 ${
                            state === 'checked' ? 'bg-[var(--accent)] border-[var(--accent)] text-[var(--accent-fg)]' :
                            state === 'indeterminate' ? 'bg-[var(--accent)] border-[var(--accent)] text-[var(--accent-fg)]' :
                            'border-[var(--border)] bg-transparent hover:border-[var(--text-muted)]'
                          }`}
                        >
                          {state === 'checked' && <Check className="w-3 h-3 stroke-[3]" />}
                          {state === 'indeterminate' && <Minus className="w-3 h-3 stroke-[3]" />}
                        </button>

                        <div className="flex items-center gap-2 min-w-0 flex-1 cursor-pointer" onClick={() => toggleExpand(folder.id)}>
                          <FolderIcon className="w-4 h-4 text-[var(--text-muted)] flex-shrink-0" />
                          <span className="text-sm font-medium truncate">{getFolderName(folder.name)}</span>
                          <span className="text-[10px] bg-[var(--surface-2)] text-[var(--text-muted)] px-1.5 py-0.5 rounded ml-auto">
                            {notes.length} item
                          </span>
                        </div>
                      </div>

                      {isExpanded && notes.length > 0 && (
                        <div className="flex flex-col pl-7 pr-2 py-1 space-y-1 relative before:absolute before:left-[17px] before:top-0 before:bottom-2 before:w-px before:bg-[var(--border)]">
                          {notes.map(note => {
                            const isSelected = selectedNoteIds.has(note.id);
                            return (
                              <label
                                key={note.id}
                                className={`flex items-center gap-3 p-1.5 rounded-lg cursor-pointer transition-colors ${
                                  isSelected ? 'bg-[var(--surface-2)]' : 'hover:bg-[var(--surface-2)]'
                                }`}
                              >
                                <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors flex-shrink-0 ${
                                  isSelected ? 'bg-[var(--accent)] border-[var(--accent)] text-[var(--accent-fg)]' : 'border-[var(--border)] bg-transparent'
                                }`}>
                                  {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                                </div>
                                <div className="flex items-center gap-2 min-w-0 flex-1 opacity-90">
                                  <FileText className="w-3.5 h-3.5 text-[var(--text-muted)] flex-shrink-0" />
                                  <span className="text-xs font-medium truncate">{note.title || 'Tanpa Judul'}</span>
                                </div>
                                <input
                                  type="checkbox"
                                  className="hidden"
                                  checked={isSelected}
                                  onChange={() => toggleNote(note.id, folder.id)}
                                />
                              </label>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Root Notes */}
                {filteredData.rootNotes.length > 0 && (
                  <div className="pt-2 mt-2 border-t border-[var(--border)]">
                    <div className="text-[10px] font-bold text-[var(--text-muted)] uppercase px-2 mb-1">Di luar folder</div>
                    {filteredData.rootNotes.map(note => {
                      const isSelected = selectedNoteIds.has(note.id);
                      return (
                        <label
                          key={note.id}
                          className={`flex items-center gap-3 p-1.5 rounded-lg cursor-pointer transition-colors ${
                            isSelected ? 'bg-[var(--surface-2)]' : 'hover:bg-[var(--surface-2)]'
                          }`}
                        >
                          <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors flex-shrink-0 ${
                            isSelected ? 'bg-[var(--accent)] border-[var(--accent)] text-[var(--accent-fg)]' : 'border-[var(--border)] bg-transparent'
                          }`}>
                            {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                          </div>
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <FileText className="w-3.5 h-3.5 text-[var(--text-muted)] flex-shrink-0" />
                            <span className="text-xs font-medium truncate">{note.title || 'Tanpa Judul'}</span>
                          </div>
                          <input
                            type="checkbox"
                            className="hidden"
                            checked={isSelected}
                            onChange={() => toggleNote(note.id, null)}
                          />
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[var(--border)] bg-[var(--surface-2)] flex justify-end gap-3 flex-shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-semibold text-[var(--text-primary)] hover:bg-[var(--border)] rounded-xl transition-colors cursor-pointer"
          >
            Batal
          </button>
          <button
            onClick={handleExecuteExport}
            disabled={
              isExporting ||
              (!includeNotes && !includeImages && !includeSummary && !includeFlashcards) ||
              (exportScope === 'custom' && selectedNoteIds.size === 0 && selectedFolderIds.size === 0)
            }
            className="px-5 py-2 text-sm font-semibold bg-[var(--accent)] text-[var(--accent-fg)] rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 shadow-sm flex items-center justify-center min-w-[120px] cursor-pointer"
          >
            {isExporting ? (
              <span className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Memproses...
              </span>
            ) : (
              `Unduh Ekspor (${currentSelectedNotesCount})`
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
