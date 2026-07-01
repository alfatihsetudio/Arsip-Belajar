'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import { parseNoteContent, serializeNoteContent } from '@/lib/utils/flashcardHelper';

interface NoteContentEditorProps {
  noteId: string;
  initialText: string;
}

export default function NoteContentEditor({ noteId, initialText }: NoteContentEditorProps) {
  const { textContent, flashcards } = parseNoteContent(initialText);
  const [text, setText] = useState(textContent);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(textContent);
  const [savedFlashcards, setSavedFlashcards] = useState(flashcards);
  const [isSaving, setIsSaving] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
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
      const serialized = serializeNoteContent(editText, savedFlashcards);
      const { error } = await supabase
        .from('notes')
        .update({ transcribed_text: serialized })
        .eq('id', noteId);

      if (error) throw error;
      
      setText(editText);
      setIsEditing(false);
      router.refresh();
    } catch (err: any) {
      alert('Gagal menyimpan perubahan: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleRegenerate = async () => {
    if (!confirm('Apakah Anda yakin ingin menghasilkan ulang catatan ini? Perubahan teks manual Anda saat ini akan ditimpa.')) {
      return;
    }
    
    setIsRegenerating(true);
    try {
      const res = await fetch(`/api/note/${noteId}/regenerate`, {
        method: 'POST',
      });
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error || 'Gagal menghasilkan ulang');
      
      const { textContent: parsedText, flashcards: parsedFlashcards } = parseNoteContent(data.text);
      setText(parsedText);
      setEditText(parsedText);
      setSavedFlashcards(parsedFlashcards);
      router.refresh();
      alert('Catatan berhasil di-generate ulang dengan urutan prioritas edukasi!');
    } catch (err: any) {
      alert('Gagal melakukan regenerasi: ' + err.message);
    } finally {
      setIsRegenerating(false);
    }
  };

  return (
    <div className="flex-1 bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-5 flex flex-col min-h-[50vh] md:min-h-0">
      {/* Panel Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mb-4 border-b border-[var(--border)] pb-3">
        <h2 className="text-[11px] sm:text-sm font-bold text-[var(--text-secondary)] uppercase tracking-wide">
          Extracted Text
        </h2>
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          {/* Quick Exam */}
          <Link
            href={`/dashboard/exam?noteId=${noteId}`}
            className="text-[10px] sm:text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 px-2 py-1 sm:px-3 sm:py-1.5 rounded-lg hover:bg-amber-100 transition-colors flex items-center gap-1"
          >
            <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
            Quick Exam
          </Link>

          {/* Regenerate Button */}
          <button
            onClick={handleRegenerate}
            disabled={isRegenerating || isEditing}
            className="text-[10px] sm:text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 px-2 py-1 sm:px-3 sm:py-1.5 rounded-lg hover:bg-blue-100 transition-colors flex items-center gap-1 disabled:opacity-50"
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
              disabled={isRegenerating}
              className="text-[10px] sm:text-xs font-semibold bg-gray-50 text-gray-700 border border-gray-200 px-2 py-1 sm:px-3 sm:py-1.5 rounded-lg hover:bg-gray-100 transition-colors flex items-center gap-1 disabled:opacity-50"
            >
              <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              Edit Manual
            </button>
          ) : (
            <div className="flex items-center gap-1.5">
              <button
                onClick={handleSaveEdit}
                disabled={isSaving}
                className="text-[10px] sm:text-xs font-semibold bg-green-600 text-white px-2 py-1 sm:px-3 sm:py-1.5 rounded-lg hover:bg-green-700 transition-colors flex items-center gap-1 disabled:opacity-50"
              >
                {isSaving ? 'Menyimpan...' : 'Simpan'}
              </button>
              <button
                onClick={handleCancelEdit}
                disabled={isSaving}
                className="text-[10px] sm:text-xs font-semibold bg-gray-100 text-gray-600 px-2 py-1 sm:px-3 sm:py-1.5 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Batal
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Editor / Plain Text Viewer area */}
      <div className="flex-1 flex flex-col min-h-0">
        {isEditing ? (
          <textarea
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            disabled={isSaving}
            className="w-full flex-1 p-3 bg-[var(--surface-2)] border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:border-[var(--accent)] resize-none text-[var(--text-primary)] leading-relaxed font-sans"
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
