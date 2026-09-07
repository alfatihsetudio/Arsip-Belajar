'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';

interface WebsiteQrModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function WebsiteQrModal({ isOpen, onClose }: WebsiteQrModalProps) {
  const [copied, setCopied] = useState(false);
  const [mounted, setMounted] = useState(false);
  const targetUrl = 'https://arsipbelajar.vercel.app';

  // Standar generator QR code SVG/PNG yang tajam dan responsif
  const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(
    targetUrl
  )}&margin=10`;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !mounted) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(targetUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy', err);
    }
  };

  const handleDownload = async () => {
    try {
      const response = await fetch(qrApiUrl);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = 'barcode-arsip-belajar.png';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
    } catch (err) {
      window.open(qrApiUrl, '_blank');
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div
        className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-slideUp text-left"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Modal */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)] bg-[var(--surface-2)]/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[var(--accent)] text-[var(--accent-fg)] flex items-center justify-center flex-shrink-0">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <rect width="5" height="5" x="3" y="3" rx="1" />
                <rect width="5" height="5" x="16" y="3" rx="1" />
                <rect width="5" height="5" x="3" y="16" rx="1" />
                <path d="M21 16h-3a2 2 0 0 0-2 2v3" />
                <path d="M21 21v.01" />
                <path d="M12 7v3a2 2 0 0 1-2 2H7" />
                <path d="M3 12h.01" />
                <path d="M12 3h.01" />
                <path d="M12 16v.01" />
                <path d="M16 12h1" />
                <path d="M21 12v.01" />
                <path d="M12 21v-1" />
              </svg>
            </div>
            <div>
              <h3 className="font-bold text-sm text-[var(--text-primary)]">Barcode Website</h3>
              <p className="text-[11px] text-[var(--text-muted)]">Scan untuk membuka Arsip Belajar</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-2)] rounded-lg transition-colors cursor-pointer"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Isi Modal */}
        <div className="p-5 flex flex-col items-center text-center space-y-4">
          {/* Kotak Barcode / QR */}
          <div className="p-4 bg-white rounded-2xl border border-gray-200 shadow-sm flex flex-col items-center justify-center relative group">
            <img
              src={qrApiUrl}
              alt="Barcode Website Arsip Belajar"
              width={200}
              height={200}
              className="w-48 h-48 sm:w-52 sm:h-52 object-contain"
            />
            {/* Logo dan Teks di bawah QR */}
            <div className="mt-2 flex items-center gap-1.5 text-[11px] font-semibold text-gray-700">
              <div className="w-4 h-4 rounded relative overflow-hidden flex-shrink-0">
                <Image src="/logo.jpg" alt="Logo" fill sizes="16px" className="object-cover" />
              </div>
              <span>arsipbelajar.vercel.app</span>
            </div>
          </div>

          <p className="text-xs text-[var(--text-secondary)] max-w-xs leading-relaxed">
            Arahkan kamera smartphone ke barcode di atas untuk langsung membuka website tanpa mengetik link secara manual.
          </p>

          {/* URL Box & Tombol Copy */}
          <div className="w-full flex items-center gap-2 p-1.5 pl-3 bg-[var(--surface-2)] border border-[var(--border)] rounded-xl">
            <span className="text-xs font-mono text-[var(--text-primary)] truncate flex-1 text-left">
              {targetUrl}
            </span>
            <button
              type="button"
              onClick={handleCopy}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 flex-shrink-0 cursor-pointer ${
                copied
                  ? 'bg-emerald-600 text-white'
                  : 'bg-[var(--surface)] text-[var(--text-primary)] border border-[var(--border)] hover:bg-[var(--border)]'
              }`}
            >
              {copied ? (
                <>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  Tersalin!
                </>
              ) : (
                <>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
                    <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
                  </svg>
                  Salin Link
                </>
              )}
            </button>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-2.5 w-full pt-1">
            <button
              type="button"
              onClick={handleDownload}
              className="w-full py-2 px-3 border border-[var(--border)] hover:bg-[var(--surface-2)] text-[var(--text-primary)] text-xs font-semibold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              Unduh Gambar
            </button>

            <a
              href={targetUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-2 px-3 bg-[var(--accent)] text-[var(--accent-fg)] hover:opacity-90 text-xs font-semibold rounded-xl transition-all flex items-center justify-center gap-2"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                <polyline points="15 3 21 3 21 9" />
                <line x1="10" y1="14" x2="21" y2="3" />
              </svg>
              Buka Web
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
