'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import { parseNoteContent, serializeNoteContent } from '@/lib/utils/flashcardHelper';
import { showAlert, showConfirm } from '@/lib/utils/customDialog';

interface NoteContentEditorProps {
  noteId: string;
  initialText: string;
}

export default function NoteContentEditor({ noteId, initialText }: NoteContentEditorProps) {
  const { textContent, flashcards, summary: initialSummary } = parseNoteContent(initialText);
  const [text, setText] = useState(textContent);
  const [summary, setSummary] = useState(initialSummary);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(textContent);
  const [savedFlashcards, setSavedFlashcards] = useState(flashcards);
  const [isSaving, setIsSaving] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleStartEdit = () => {
    setEditText(text);
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
  };

  const handleSaveEdit = async () => {
    setIsSaving(true);
    try {
      const serialized = serializeNoteContent(editText, savedFlashcards, null, summary);
      const { error } = await supabase
        .from('notes')
        .update({ transcribed_text: serialized })
        .eq('id', noteId);

      if (error) throw error;
      
      setText(editText);
      setIsEditing(false);
      router.refresh();
    } catch (err: any) {
      await showAlert('Gagal menyimpan perubahan: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleRegenerate = async () => {
    const confirmRegen = await showConfirm('Apakah Anda yakin ingin menghasilkan ulang catatan ini? Perubahan teks manual Anda saat ini akan ditimpa.');
    if (!confirmRegen) return;
    
    setIsRegenerating(true);
    try {
      const res = await fetch(`/api/note/${noteId}/regenerate`, {
        method: 'POST',
      });
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error || 'Gagal menghasilkan ulang');
      
      const { textContent: parsedText, flashcards: parsedFlashcards, summary: parsedSummary } = parseNoteContent(data.text);
      setText(parsedText);
      setEditText(parsedText);
      setSavedFlashcards(parsedFlashcards);
      setSummary(parsedSummary);
      router.refresh();
      await showAlert('Catatan berhasil di-generate ulang dengan urutan prioritas edukasi!');
    } catch (err: any) {
      await showAlert('Gagal melakukan regenerasi: ' + err.message);
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleSummarize = async () => {
    setIsSummarizing(true);
    try {
      const res = await fetch(`/api/note/${noteId}/summarize`, {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal meringkas');
      
      setSummary(data.summary);
      router.refresh();
    } catch (err: any) {
      await showAlert('Gagal meringkas catatan: ' + err.message);
    } finally {
      setIsSummarizing(false);
    }
  };

  const handleDeleteSummary = async () => {
    const confirmDelete = await showConfirm('Apakah Anda yakin ingin menghapus ringkasan ini?');
    if (!confirmDelete) return;
    
    try {
      const serialized = serializeNoteContent(text, savedFlashcards, null, null);
      const { error } = await supabase
        .from('notes')
        .update({ transcribed_text: serialized })
        .eq('id', noteId);

      if (error) throw error;
      
      setSummary(null);
      router.refresh();
    } catch (err: any) {
      await showAlert('Gagal menghapus ringkasan: ' + err.message);
    }
  };

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const adjustHeight = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      // Save scroll positions to be safe
      const scrollContainers: { el: HTMLElement; top: number; left: number }[] = [];
      let parent = textarea.parentElement;
      while (parent) {
        if (parent.scrollHeight > parent.clientHeight || parent.scrollWidth > parent.clientWidth) {
          scrollContainers.push({
            el: parent,
            top: parent.scrollTop,
            left: parent.scrollLeft
          });
        }
        parent = parent.parentElement;
      }
      const scrollX = window.scrollX;
      const scrollY = window.scrollY;

      // Create a temporary hidden mirror element to calculate height without collapsing the textarea
      const mirror = document.createElement('div');
      const styles = window.getComputedStyle(textarea);
      
      mirror.style.position = 'absolute';
      mirror.style.visibility = 'hidden';
      mirror.style.whiteSpace = 'pre-wrap';
      mirror.style.wordBreak = 'break-word';
      mirror.style.width = `${textarea.clientWidth}px`;
      mirror.style.fontFamily = styles.fontFamily;
      mirror.style.fontSize = styles.fontSize;
      mirror.style.lineHeight = styles.lineHeight;
      mirror.style.padding = styles.padding;
      mirror.style.border = styles.border;
      mirror.style.boxSizing = styles.boxSizing;
      
      // Textareas treat trailing newlines specially, so append a space to ensure matching height
      mirror.textContent = textarea.value + ' ';
      
      document.body.appendChild(mirror);
      const computedHeight = mirror.clientHeight;
      document.body.removeChild(mirror);

      // Directly update the height to prevent collapse layout shift
      textarea.style.height = `${Math.max(computedHeight, 100)}px`;

      // Restore all ancestor scroll positions
      scrollContainers.forEach(c => {
        c.el.scrollTop = c.top;
        c.el.scrollLeft = c.left;
      });
      window.scrollTo(scrollX, scrollY);
    }
  };

  // Adjust height on edit start and when content changes
  useEffect(() => {
    if (isEditing) {
      // Delay slightly to ensure DOM has rendered
      const timer = setTimeout(adjustHeight, 50);
      return () => clearTimeout(timer);
    }
  }, [isEditing, editText]);

  return (
    <div className="flex-1 bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-5 flex flex-col min-h-[50vh] md:min-h-0">
      {/* Panel Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mb-4 border-b border-[var(--border)] pb-3">
        <h2 className="text-[11px] sm:text-sm font-bold text-[var(--text-secondary)] uppercase tracking-wide">
          Extracted Text
        </h2>
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          {/* Ringkaskan Button */}
          <button
            onClick={handleSummarize}
            disabled={isSummarizing || isEditing || isRegenerating}
            className="text-[10px] sm:text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 px-2 py-1 sm:px-3 sm:py-1.5 rounded-lg hover:bg-amber-100 transition-colors flex items-center gap-1 disabled:opacity-50 cursor-pointer"
            title="Ringkas catatan dengan AI"
          >
            {isSummarizing ? (
              <>
                <span className="w-2.5 h-2.5 sm:w-3 sm:h-3 border-2 border-amber-700 border-t-transparent rounded-full animate-spin" />
                Meringkas...
              </>
            ) : (
              <>
                <span>{summary ? '🔄' : '✨'}</span>
                {summary ? 'Regen Ringkasan' : 'Ringkaskan'}
              </>
            )}
          </button>

          {/* Regenerate Button */}
          <button
            onClick={handleRegenerate}
            disabled={isRegenerating || isEditing || isSummarizing}
            className="text-[10px] sm:text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 px-2 py-1 sm:px-3 sm:py-1.5 rounded-lg hover:bg-blue-100 transition-colors flex items-center gap-1 disabled:opacity-50 cursor-pointer"
            title="Generate ulang dengan AI"
          >
            {isRegenerating ? (
              <>
                <span className="w-2.5 h-2.5 sm:w-3 sm:h-3 border-2 border-blue-700 border-t-transparent rounded-full animate-spin" />
                Mengekstrak...
              </>
            ) : (
              <>
                <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/></svg>
                AI Regenerate
              </>
            )}
          </button>

          {/* Edit/Save buttons */}
          {!isEditing ? (
            <button
              onClick={handleStartEdit}
              disabled={isRegenerating || isSummarizing}
              className="text-[10px] sm:text-xs font-semibold bg-gray-50 text-gray-700 border border-gray-200 px-2 py-1 sm:px-3 sm:py-1.5 rounded-lg hover:bg-gray-100 transition-colors flex items-center gap-1 disabled:opacity-50 cursor-pointer"
            >
              <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              Edit Manual
            </button>
          ) : (
            <div className="flex items-center gap-1.5">
              <button
                onClick={handleSaveEdit}
                disabled={isSaving}
                className="text-[10px] sm:text-xs font-semibold bg-green-600 text-white px-2 py-1 sm:px-3 sm:py-1.5 rounded-lg hover:bg-green-700 transition-colors flex items-center gap-1 disabled:opacity-50 cursor-pointer"
              >
                {isSaving ? 'Menyimpan...' : 'Simpan'}
              </button>
              <button
                onClick={handleCancelEdit}
                disabled={isSaving}
                className="text-[10px] sm:text-xs font-semibold bg-gray-100 text-gray-600 px-2 py-1 sm:px-3 sm:py-1.5 rounded-lg hover:bg-gray-200 transition-colors cursor-pointer"
              >
                Batal
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Editor / Plain Text Viewer area */}
      <div className="flex-1 flex flex-col min-h-0">
        {/* AI Summary Card (If summary exists and not editing) */}
        {summary && !isEditing && (
          <div className="mb-3.5 bg-[var(--surface-2)]/40 border border-[var(--border)] rounded-xl p-3.5 text-left relative overflow-hidden animate-fadeIn flex-shrink-0">
            {/* Decorative highlight */}
            <div className="absolute top-0 left-0 w-1 h-full bg-amber-400 dark:bg-amber-500" />
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-1.5">
                <span className="text-xs">💡</span>
                <h3 className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wide">Ringkasan AI</h3>
              </div>
              <button
                onClick={handleDeleteSummary}
                className="text-[9px] font-bold text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 bg-red-50 dark:bg-red-950/20 hover:bg-red-100 dark:hover:bg-red-900/30 border border-red-200/50 dark:border-red-900/40 px-2 py-0.5 rounded-md transition-all active:scale-95 flex items-center gap-1 cursor-pointer z-10"
                title="Hapus ringkasan"
              >
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                Hapus
              </button>
            </div>
            <div className="text-xs sm:text-sm text-[var(--text-primary)] leading-relaxed whitespace-pre-wrap font-sans">
              {summary}
            </div>
          </div>
        )}

        {isEditing ? (
          <textarea
            ref={textareaRef}
            value={editText}
            onChange={(e) => {
              setEditText(e.target.value);
              adjustHeight();
            }}
            disabled={isSaving}
            className="w-full bg-transparent border-0 resize-none text-sm md:text-base text-[var(--text-primary)] leading-relaxed font-sans focus:outline-none focus:ring-0 p-0 overflow-hidden"
            placeholder="Edit catatan di sini..."
          />
        ) : (
          <div className="flex-1 overflow-y-auto whitespace-pre-wrap text-sm md:text-base text-[var(--text-primary)] leading-relaxed font-sans pr-1">
            {text ? (
              text
            ) : (
              <p className="text-[var(--text-muted)] italic">Belum ada teks yang dihasilkan. Silakan klik AI Regenerate.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
