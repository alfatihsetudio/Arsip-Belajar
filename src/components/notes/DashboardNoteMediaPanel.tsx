'use client';

import { useState } from 'react';

type MediaItem = { id: string; media_url: string; order_index: number };

interface DashboardNoteMediaPanelProps {
  media: MediaItem[];
  actions?: React.ReactNode;
}

export default function DashboardNoteMediaPanel({ media, actions }: DashboardNoteMediaPanelProps) {
  const [isHidden, setIsHidden] = useState(false);

  if (media.length === 0) return null;

  return (
    <div className="mb-4">
      <div className="flex items-center justify-between gap-2 mb-2">
        <button
          onClick={() => setIsHidden((current) => !current)}
          className="px-2.5 py-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-2)] border border-[var(--border)] border-dashed rounded-lg text-[10px] sm:text-xs font-semibold transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer"
        >
          {isHidden ? (
            <>
              <span>👁️</span>
              <span>Tampilkan Foto</span>
            </>
          ) : (
            <>
              <span>🙈</span>
              <span>Sembunyikan Foto</span>
            </>
          )}
        </button>

        {actions && (
          <div className="flex items-center gap-1 shrink-0">
            {actions}
          </div>
        )}
      </div>

      {!isHidden && (
        <div className="flex flex-row overflow-x-auto snap-x snap-mandatory gap-2 md:gap-3 pb-2 md:pb-3.5 scrollbar-thin">
          {media.map((item, index) => (
            <div
              key={item.id}
              className="relative rounded-xl overflow-hidden border border-[var(--border)] bg-[var(--surface-2)] w-[85vw] sm:w-[360px] flex-shrink-0 snap-center cursor-zoom-in hover:opacity-95 transition-opacity"
            >
              <span className="absolute top-2 left-2 bg-black/60 text-white text-xs font-bold px-1.5 py-0.5 rounded-md z-10">
                #{index + 1}
              </span>
              <img
                src={item.media_url}
                alt={`Page ${index + 1}`}
                className="w-full h-48 sm:h-64 object-cover"
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
