'use client';

import React, { useState, useRef, useEffect, Children } from 'react';
import { createPortal } from 'react-dom';

interface NoteLayoutWrapperProps {
  sortedMedia: Array<{ id: string; media_url: string; order_index: number }>;
  children: React.ReactNode;
  headerActions?: React.ReactNode;
}

export default function NoteLayoutWrapper({ sortedMedia, children, headerActions }: NoteLayoutWrapperProps) {
  const [isMinimized, setIsMinimized] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [portalContainer, setPortalContainer] = useState<HTMLElement | null>(null);

  const childrenArray = Children.toArray(children);
  const textEditor = childrenArray[0];
  const aiFeatures = childrenArray.slice(1);

  // Zoom & Pan states
  const [zoom, setZoom] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const imageRef = useRef<HTMLImageElement>(null);

  // Setup portal container on mount (client-side only)
  useEffect(() => {
    setPortalContainer(document.body);
  }, []);

  // Keyboard escape listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeLightbox();
      }
    };
    if (lightboxImage) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [lightboxImage]);

  // Toggle body class to hide layout overlays + prevent scroll
  useEffect(() => {
    if (lightboxImage) {
      document.body.classList.add('lightbox-active');
      document.body.style.overflow = 'hidden';
    } else {
      document.body.classList.remove('lightbox-active');
      document.body.style.overflow = '';
    }
    return () => {
      document.body.classList.remove('lightbox-active');
      document.body.style.overflow = '';
    };
  }, [lightboxImage]);

  // Visual feedback glow animation on shortcut anchor click
  useEffect(() => {
    const handleHashClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const anchor = target.closest('a');
      if (!anchor) return;
      
      const href = anchor.getAttribute('href');
      if (href && href.startsWith('#')) {
        const id = href.substring(1);
        const element = document.getElementById(id);
        if (element) {
          e.preventDefault();
          e.stopPropagation();
          
          const viewportHeight = window.innerHeight;
          const rect = element.getBoundingClientRect();
          
          if (rect.height < viewportHeight * 0.75) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          } else {
            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
          
          void element.offsetWidth;
          element.classList.add('glow-highlight');
          setTimeout(() => {
            element.classList.remove('glow-highlight');
          }, 1200);
        }
      }
    };

    window.addEventListener('click', handleHashClick, true);
    return () => {
      window.removeEventListener('click', handleHashClick, true);
    };
  }, []);

  const closeLightbox = () => {
    setLightboxImage(null);
    setZoom(1);
    setPanOffset({ x: 0, y: 0 });
    setIsDragging(false);
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLImageElement>) => {
    e.preventDefault();
    if (zoom <= 1) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    setIsDragging(true);
    setDragStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLImageElement>) => {
    if (!isDragging) return;
    setPanOffset({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handlePointerUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY * -0.003;
    setZoom(prev => {
      const nextZoom = Math.min(Math.max(1, prev + delta), 6);
      if (nextZoom === 1) {
        setPanOffset({ x: 0, y: 0 });
      }
      return nextZoom;
    });
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      closeLightbox();
    }
  };

  // Lightbox rendered via Portal — renders directly on document.body
  // This completely escapes any parent transform/overflow that breaks position:fixed
  const lightboxModal = lightboxImage && portalContainer
    ? createPortal(
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 99999,
            backgroundColor: 'rgba(0, 0, 0, 0.85)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            animation: 'lightboxFadeIn 0.2s ease forwards',
          }}
          onClick={handleBackdropClick}
          onWheel={handleWheel}
        >
          {/* Close Button - small, top right */}
          <button
            onClick={closeLightbox}
            style={{
              position: 'absolute',
              top: '16px',
              right: '16px',
              zIndex: 100000,
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              backgroundColor: 'rgba(255, 255, 255, 0.15)',
              color: 'white',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '14px',
              fontWeight: 'bold',
              cursor: 'pointer',
              transition: 'background-color 0.2s',
            }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.3)')}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.15)')}
            title="Tutup"
          >
            ✕
          </button>

          {/* Image - uses inline styles to guarantee sizing */}
          <img
            ref={imageRef}
            src={lightboxImage}
            alt="Fullscreen Preview"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            draggable={false}
            style={{
              maxWidth: 'calc(100vw - 32px)',
              maxHeight: 'calc(100vh - 32px)',
              objectFit: 'contain',
              userSelect: 'none',
              touchAction: 'none',
              cursor: zoom > 1 ? 'grab' : 'default',
              transition: 'transform 75ms',
              transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoom})`,
            }}
          />
        </div>,
        portalContainer
      )
    : null;

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Minimize / Maximize Photo Option Button & Actions */}
      <div className="flex items-center justify-between mb-2">
        <button
          onClick={() => setIsMinimized(!isMinimized)}
          className="px-2.5 py-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-2)] border border-[var(--border)] border-dashed rounded-lg text-[10px] sm:text-xs font-semibold transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer"
        >
          {isMinimized ? (
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
        
        {headerActions && (
          <div className="flex items-center">
            {headerActions}
          </div>
        )}
      </div>

      {/* Vertical Stacking Layout: Photos strictly above the text canvas */}
      <div className="flex-1 flex flex-col gap-2 md:gap-4 min-h-0">
        {/* Top: Photos Panel */}
        {!isMinimized && sortedMedia.length > 0 && (
          <div className="w-full flex flex-row overflow-x-auto snap-x snap-mandatory gap-2 md:gap-3 pb-2 md:pb-3.5 scrollbar-thin">
            {sortedMedia.map((media, i) => (
              <div
                key={media.id}
                onClick={() => setLightboxImage(media.media_url)}
                className="relative rounded-xl overflow-hidden border border-[var(--border)] bg-[var(--surface-2)] w-[85vw] sm:w-[360px] flex-shrink-0 snap-center cursor-zoom-in hover:opacity-95 transition-opacity"
              >
                <span className="absolute top-2 left-2 bg-black/60 text-white text-xs font-bold px-1.5 py-0.5 rounded-md z-10">
                  #{i + 1}
                </span>
                <img
                  src={media.media_url}
                  alt={`Page ${i + 1}`}
                  className="w-full h-48 sm:h-64 object-cover"
                />
              </div>
            ))}
          </div>
        )}

        {/* Bottom: Split Columns on Desktop, Vertically Stacked on Mobile */}
        <div className="w-full flex-1 flex flex-col md:flex-row gap-3.5 md:gap-5">
          {/* Left Column: Extracted Text Editor */}
          <div className="w-full md:w-3/5 flex flex-col min-h-0">
            {textEditor}
          </div>

          {/* Right Column: All AI features */}
          <div className="w-full md:w-2/5 flex flex-col gap-4 min-h-0">
            {aiFeatures}
          </div>
        </div>
      </div>

      {/* Lightbox rendered via Portal — outside the component tree */}
      {lightboxModal}

      {/* Glow highlight & smooth scroll styles */}
      <style>{`
        html, body, * {
          scroll-behavior: smooth !important;
        }
        #flashcards, #mindmap, #chat, #exam-card {
          scroll-margin-top: 100px !important;
        }
        body.lightbox-active .glass-effect,
        body.lightbox-active .fixed.z-40 {
          opacity: 0 !important;
          pointer-events: none !important;
          transition: opacity 0.15s ease;
        }
        @keyframes glowHighlight {
          0% {
            box-shadow: 0 0 0 3px #38bdf8, 0 0 20px rgba(56, 189, 248, 0.6);
          }
          40% {
            box-shadow: 0 0 0 3px #38bdf8, 0 0 20px rgba(56, 189, 248, 0.6);
          }
          100% {
            box-shadow: 0 0 0 0px transparent, 0 0 0 rgba(56, 189, 248, 0);
          }
        }
        .glow-highlight {
          animation: glowHighlight 1.2s cubic-bezier(0.4, 0, 0.2, 1);
          transition: all 0.3s ease;
          border-radius: 16px !important;
        }
        @keyframes lightboxFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </div>
  );
}
