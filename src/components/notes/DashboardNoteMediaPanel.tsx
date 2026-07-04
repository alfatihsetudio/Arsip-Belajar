'use client';

import { useState } from 'react';
import AppendMediaModal from './AppendMediaModal';

type MediaItem = { id: string; media_url: string; order_index: number; media_type?: string };

interface DashboardNoteMediaPanelProps {
  noteId?: string;
  media: MediaItem[];
  actions?: React.ReactNode;
}

export default function DashboardNoteMediaPanel({ noteId, media, actions }: DashboardNoteMediaPanelProps) {
  const [isHidden, setIsHidden] = useState(false);
  const [isAppendModalOpen, setIsAppendModalOpen] = useState(false);

  if (media.length === 0) {
    if (!actions) return null;
    return (
      <>
        <div className="mb-4 flex items-center justify-between">
          {noteId && (
            <button
              onClick={() => setIsAppendModalOpen(true)}
              className="px-2.5 py-1 text-[var(--accent)] hover:text-white hover:bg-[var(--accent)] border border-[var(--accent)] rounded-lg text-[10px] sm:text-xs font-semibold transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer"
            >
              <span>➕</span>
              <span>Tambah Media</span>
            </button>
          )}
          <div className="flex items-center gap-1 shrink-0 ml-auto">
            {actions}
          </div>
        </div>
        {isAppendModalOpen && noteId && (
          <AppendMediaModal noteId={noteId} onClose={() => setIsAppendModalOpen(false)} />
        )}
      </>
    );
  }

  return (
    <div className="mb-4">
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsHidden((current) => !current)}
            className="px-2.5 py-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-2)] border border-[var(--border)] border-dashed rounded-lg text-[10px] sm:text-xs font-semibold transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer"
          >
            {isHidden ? (
              <>
                <span>👁️</span>
                <span>Tampilkan Media</span>
              </>
            ) : (
              <>
                <span>🙈</span>
                <span>Sembunyikan Media</span>
              </>
            )}
          </button>

          {noteId && (
            <button
              onClick={() => setIsAppendModalOpen(true)}
              className="px-2.5 py-1 text-[var(--accent)] hover:text-white hover:bg-[var(--accent)] border border-[var(--accent)] rounded-lg text-[10px] sm:text-xs font-semibold transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer"
            >
              <span>➕</span>
              <span>Tambah Media</span>
            </button>
          )}
        </div>

        {actions && (
          <div className="flex items-center gap-1 shrink-0">
            {actions}
          </div>
        )}
      </div>

      {isAppendModalOpen && noteId && (
        <AppendMediaModal noteId={noteId} onClose={() => setIsAppendModalOpen(false)} />
      )}

      {!isHidden && (
        <div className="flex flex-row overflow-x-auto snap-x snap-mandatory gap-2 md:gap-3 pb-2 md:pb-3.5 scrollbar-thin">
          {media.map((item, index) => {
            const isAudio = item.media_type === 'audio';
            return (
              <div
                key={item.id}
                className={`relative rounded-xl overflow-hidden border border-[var(--border)] bg-[var(--surface-2)] w-[85vw] sm:w-[360px] flex-shrink-0 snap-center ${isAudio ? 'flex items-center justify-center p-4' : 'cursor-zoom-in hover:opacity-95 transition-opacity'}`}
              >
                <span className="absolute top-2 left-2 bg-black/60 text-white text-xs font-bold px-1.5 py-0.5 rounded-md z-10">
                  #{index + 1}
                </span>
                {isAudio ? (
                  <div className="w-full h-48 sm:h-64 flex flex-col items-center justify-center bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 rounded-lg p-6 relative overflow-hidden">
                    <div className="absolute top-0 right-0 -mt-10 -mr-10 w-40 h-40 bg-white/10 rounded-full blur-2xl pointer-events-none"></div>
                    <div className="absolute bottom-0 left-0 -mb-10 -ml-10 w-32 h-32 bg-black/10 rounded-full blur-xl pointer-events-none"></div>
                    
                    <div className="w-16 h-16 bg-white/20 backdrop-blur-md shadow-xl text-white rounded-full flex items-center justify-center mb-6 z-10 border border-white/30 animate-pulse">
                      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="22"/></svg>
                    </div>
                    
                    <div className="w-full z-10 bg-white/95 backdrop-blur-md p-1.5 rounded-full shadow-2xl border border-white/50">
                      <audio controls src={item.media_url} className="w-full h-10 outline-none [&::-webkit-media-controls-panel]:bg-transparent" />
                    </div>
                  </div>
                ) : (
                  <img
                    src={item.media_url}
                    alt={`Page ${index + 1}`}
                    className="w-full h-48 sm:h-64 object-cover"
                  />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
