'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Flashcard } from '@/lib/utils/flashcardHelper';

interface FlashcardsSectionProps {
  noteId: string;
  initialFlashcards: Flashcard[];
  isGuest?: boolean;
}

export default function FlashcardsSection({ noteId, initialFlashcards, isGuest = false }: FlashcardsSectionProps) {
  const [flashcards, setFlashcards] = useState<Flashcard[]>(initialFlashcards);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleGenerate = async () => {
    if (isGuest) {
      window.location.href = '/';
      return;
    }
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch(`/api/note/${noteId}/flashcards`, {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal menghasilkan flashcard');
      
      setFlashcards(data.flashcards);
      setCurrentIndex(0);
      setIsFlipped(false);
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setGenerating(false);
    }
  };

  const handleNext = () => {
    if (isGuest) {
      window.location.href = '/';
      return;
    }
    if (currentIndex < flashcards.length - 1) {
      setIsFlipped(false);
      setTimeout(() => {
        setCurrentIndex(prev => prev + 1);
      }, 150);
    }
  };

  const handlePrev = () => {
    if (isGuest) {
      window.location.href = '/';
      return;
    }
    if (currentIndex > 0) {
      setIsFlipped(false);
      setTimeout(() => {
        setCurrentIndex(prev => prev - 1);
      }, 150);
    }
  };

  const handleCardClick = () => {
    if (isGuest) {
      window.location.href = '/';
      return;
    }
    setIsFlipped(!isFlipped);
  };

  return (
    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-5 shadow-sm space-y-4 flex flex-col items-center text-center">
      <div className="w-full flex items-center justify-between border-b border-[var(--border)] pb-3">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-amber-100 flex items-center justify-center text-amber-700">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="9" y1="3" x2="9" y2="21"/></svg>
          </div>
          <h2 className="text-xs sm:text-sm font-bold text-[var(--text-secondary)] uppercase tracking-wide">
            AI Flashcards
          </h2>
        </div>
        {flashcards.length > 0 && (
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="text-[10px] sm:text-xs font-semibold bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-200 px-2 py-1 rounded-lg transition-colors flex items-center gap-1 disabled:opacity-50"
          >
            {generating ? 'Regenerating...' : 'Regenerate'}
          </button>
        )}
      </div>

      {flashcards.length === 0 ? (
        <div className="py-10 max-w-sm mx-auto space-y-4">
          <svg className="mx-auto text-[var(--text-muted)]" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="9" y1="3" x2="9" y2="21"/></svg>
          <div>
            <h3 className="font-semibold text-xs sm:text-sm text-[var(--text-primary)]">Belum ada Flashcards</h3>
            <p className="text-[11px] text-[var(--text-muted)] mt-1 leading-relaxed">
              Hasilkan flashcard tanya-jawab otomatis dari catatan Anda untuk mempermudah mengingat materi.
            </p>
          </div>
          {error && <p className="text-[10px] text-red-500 bg-red-50 px-2.5 py-1.5 rounded-lg border border-red-200">{error}</p>}
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="px-4 py-2 bg-[var(--accent)] text-[var(--accent-fg)] rounded-xl text-xs font-semibold hover:opacity-90 transition-opacity flex items-center justify-center gap-1.5 mx-auto disabled:opacity-50 cursor-pointer"
          >
            {generating ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Generating...</span>
              </>
            ) : (
              <>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
                <span>Generate Flashcards</span>
              </>
            )}
          </button>
        </div>
      ) : (
        <div className="w-full max-w-sm flex flex-col items-center gap-5 py-2">
          {/* Card Container (3D Flip Deck) */}
          <div 
            className="w-full aspect-[1.6/1] cursor-pointer"
            onClick={handleCardClick}
            style={{ perspective: '1000px' }}
          >
            <div 
              className="relative w-full h-full duration-500 ease-out transition-transform"
              style={{ 
                transformStyle: 'preserve-3d',
                transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)'
              }}
            >
              {/* Card Front (Question) */}
              <div 
                className="absolute inset-0 bg-white border border-[var(--border)] rounded-2xl p-5 shadow-sm flex flex-col items-center justify-center backface-hidden"
                style={{ backfaceVisibility: 'hidden' }}
              >
                <span className="absolute top-2.5 left-3.5 text-[9px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full uppercase tracking-wider">Pertanyaan</span>
                <p className="text-xs sm:text-sm font-semibold text-gray-800 leading-relaxed max-w-[90%]">{flashcards[currentIndex].q}</p>
                <span className="absolute bottom-2.5 text-[9px] text-gray-400 font-medium">Ketuk untuk melihat jawaban</span>
              </div>

              {/* Card Back (Answer) */}
              <div 
                className="absolute inset-0 bg-blue-50/30 border border-blue-100 rounded-2xl p-5 shadow-sm flex flex-col items-center justify-center backface-hidden"
                style={{ 
                  backfaceVisibility: 'hidden',
                  transform: 'rotateY(180deg)'
                }}
              >
                <span className="absolute top-2.5 left-3.5 text-[9px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full uppercase tracking-wider">Jawaban</span>
                <p className="text-xs sm:text-sm font-medium text-blue-900 leading-relaxed max-w-[90%]">{flashcards[currentIndex].a}</p>
                <span className="absolute bottom-2.5 text-[9px] text-blue-400 font-medium">Ketuk untuk membalik kembali</span>
              </div>
            </div>
          </div>

          {/* Navigation Controls */}
          <div className="flex items-center justify-between w-full px-2">
            <button
              onClick={handlePrev}
              disabled={currentIndex === 0}
              className="w-8 h-8 rounded-full border border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-2)] flex items-center justify-center text-[var(--text-secondary)] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
            </button>
            <span className="text-[11px] font-bold text-[var(--text-secondary)]">
              {currentIndex + 1} dari {flashcards.length}
            </span>
            <button
              onClick={handleNext}
              disabled={currentIndex === flashcards.length - 1}
              className="w-8 h-8 rounded-full border border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-2)] flex items-center justify-center text-[var(--text-secondary)] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
