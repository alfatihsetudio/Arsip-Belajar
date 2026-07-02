'use client';

import React, { useEffect, useRef, useState, Children } from 'react';
import { createPortal } from 'react-dom';

interface NoteLayoutWrapperProps {
  sortedMedia: Array<{ id: string; media_url: string; order_index: number }>;
  children: React.ReactNode;
  headerActions?: React.ReactNode;
  showMediaPanel?: boolean;
}

export default function NoteLayoutWrapper({
  sortedMedia,
  children,
  headerActions,
  showMediaPanel = true,
}: NoteLayoutWrapperProps) {
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const rootRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  const childrenArray = Children.toArray(children);
  const textEditor = childrenArray[0];
  const aiFeatures = childrenArray.slice(1);

  const closeLightbox = () => {
    setLightboxImage(null);
    setZoom(1);
    setPanOffset({ x: 0, y: 0 });
    setIsDragging(false);
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeLightbox();
    };

    if (lightboxImage) window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lightboxImage]);

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

  useEffect(() => {
    const handleHashClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      const anchor = target.closest('a');
      if (!anchor) return;

      const href = anchor.getAttribute('href');
      if (!href || !href.startsWith('#')) return;

      const element = document.getElementById(href.substring(1));
      if (!element) return;

      event.preventDefault();
      event.stopPropagation();

      const viewportHeight = window.innerHeight;
      const rect = element.getBoundingClientRect();
      element.scrollIntoView({
        behavior: 'smooth',
        block: rect.height < viewportHeight * 0.75 ? 'center' : 'start',
      });

      void element.offsetWidth;
      element.classList.add('glow-highlight');
      setTimeout(() => element.classList.remove('glow-highlight'), 1200);
    };

    window.addEventListener('click', handleHashClick, true);
    return () => window.removeEventListener('click', handleHashClick, true);
  }, []);

  useEffect(() => {
    const scrollToTop = () => {
      let element = rootRef.current?.parentElement;
      while (element && element !== document.body) {
        const styles = window.getComputedStyle(element);
        const isScrollable = /(auto|scroll)/.test(styles.overflowY) || /(auto|scroll)/.test(styles.overflow);
        if (isScrollable) {
          element.scrollTop = 0;
          element.scrollLeft = 0;
        }
        element = element.parentElement;
      }
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    };

    const frameId = requestAnimationFrame(scrollToTop);
    return () => cancelAnimationFrame(frameId);
  }, []);

  const handlePointerDown = (event: React.PointerEvent<HTMLImageElement>) => {
    event.preventDefault();
    if (zoom <= 1) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    setIsDragging(true);
    setDragStart({ x: event.clientX - panOffset.x, y: event.clientY - panOffset.y });
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLImageElement>) => {
    if (!isDragging) return;
    setPanOffset({ x: event.clientX - dragStart.x, y: event.clientY - dragStart.y });
  };

  const handlePointerUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (event: React.WheelEvent) => {
    event.preventDefault();
    const delta = event.deltaY * -0.003;
    setZoom((previousZoom) => {
      const nextZoom = Math.min(Math.max(1, previousZoom + delta), 6);
      if (nextZoom === 1) setPanOffset({ x: 0, y: 0 });
      return nextZoom;
    });
  };

  const handleBackdropClick = (event: React.MouseEvent) => {
    if (event.target === event.currentTarget) closeLightbox();
  };

  const portalContainer = typeof document !== 'undefined' ? document.body : null;
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
            onMouseEnter={(event) => (event.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.3)')}
            onMouseLeave={(event) => (event.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.15)')}
            title="Tutup"
          >
            ×
          </button>

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
    <div ref={rootRef} className="flex flex-col flex-1 min-h-0">
      <div className="flex items-center justify-between mb-2">
        <div />
        {headerActions && <div className="flex items-center">{headerActions}</div>}
      </div>

      <div className="flex-1 flex flex-col gap-2 md:gap-4 min-h-0">
        {showMediaPanel && sortedMedia.length > 0 && (
          <div className="w-full flex flex-row overflow-x-auto snap-x snap-mandatory gap-2 md:gap-3 pb-2 md:pb-3.5 scrollbar-thin">
            {sortedMedia.map((media, index) => (
              <div
                key={media.id}
                onClick={() => setLightboxImage(media.media_url)}
                className="relative rounded-xl overflow-hidden border border-[var(--border)] bg-[var(--surface-2)] w-[85vw] sm:w-[360px] flex-shrink-0 snap-center cursor-zoom-in hover:opacity-95 transition-opacity"
              >
                <span className="absolute top-2 left-2 bg-black/60 text-white text-xs font-bold px-1.5 py-0.5 rounded-md z-10">
                  #{index + 1}
                </span>
                <img
                  src={media.media_url}
                  alt={`Page ${index + 1}`}
                  className="w-full h-48 sm:h-64 object-cover"
                />
              </div>
            ))}
          </div>
        )}

        <div className="w-full flex-1 flex flex-col md:flex-row gap-3.5 md:gap-5">
          <div className="w-full md:w-3/5 flex flex-col min-h-0">
            {textEditor}
          </div>

          <div className="w-full md:w-2/5 flex flex-col gap-4 min-h-0">
            {aiFeatures}
          </div>
        </div>
      </div>

      {lightboxModal}

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
