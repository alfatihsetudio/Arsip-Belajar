'use client';

import { useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface ImageFile {
  id: string;
  file: File;
  preview: string;
}

export default function UploadPage() {
  const [images, setImages] = useState<ImageFile[]>([]);
  const [title, setTitle] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const addImages = useCallback((files: FileList | File[]) => {
    const newImages = Array.from(files).map(file => ({
      id: `${file.name}-${Date.now()}-${Math.random()}`,
      file,
      preview: URL.createObjectURL(file),
    }));
    setImages(prev => [...prev, ...newImages]);
  }, []);

  const removeImage = (id: string) => {
    setImages(prev => {
      const img = prev.find(i => i.id === id);
      if (img) URL.revokeObjectURL(img.preview);
      return prev.filter(i => i.id !== id);
    });
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files.length > 0) addImages(e.dataTransfer.files);
  };

  const handleSubmit = async () => {
    if (images.length === 0) return setError('Please add at least one image.');
    if (!title.trim()) return setError('Please enter a title for your note.');

    setIsProcessing(true);
    setError(null);
    setProgress('Uploading images...');

    const formData = new FormData();
    formData.append('title', title.trim());
    images.forEach((img, i) => {
      formData.append('images', img.file);
      formData.append(`order_${i}`, String(i));
    });

    try {
      setProgress('Processing with AI...');
      const res = await fetch('/api/transcribe', { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to process note');
      router.push(`/dashboard/note/${data.noteId}`);
    } catch (err: any) {
      setError(err.message);
      setIsProcessing(false);
      setProgress('');
    }
  };

  return (
    <div className="max-w-2xl mx-auto animate-fadeIn">
      {/* Back */}
      <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] mb-6 transition-colors">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
        Back
      </Link>

      <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-6">Upload New Note</h1>

      {/* Title */}
      <div className="mb-5">
        <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">Note Title</label>
        <input
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="e.g. Algebra – Chapter 3"
          className="w-full px-4 py-3 bg-[var(--surface)] border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:border-[var(--accent)] transition-colors"
        />
      </div>

      {/* Image Upload Area */}
      <div className="mb-5">
        <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">
          Images <span className="text-[var(--text-muted)] font-normal">(upload in order, from first to last)</span>
        </label>
        
        <div
          onDrop={handleDrop}
          onDragOver={e => e.preventDefault()}
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-[var(--border)] rounded-2xl p-8 text-center cursor-pointer hover:border-[var(--text-muted)] hover:bg-[var(--surface-2)] transition-colors"
        >
          <svg className="mx-auto text-[var(--text-muted)] mb-3" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
          <p className="text-sm font-medium text-[var(--text-secondary)]">Tap to select or drag images here</p>
          <p className="text-xs text-[var(--text-muted)] mt-1">JPG, PNG, WEBP — Multiple files supported</p>
        </div>
        <input type="file" accept="image/*" capture="environment" multiple ref={fileInputRef} onChange={e => e.target.files && addImages(e.target.files)} className="hidden" />
      </div>

      {/* Image Previews */}
      {images.length > 0 && (
        <div className="mb-5 grid grid-cols-3 sm:grid-cols-4 gap-3">
          {images.map((img, i) => (
            <div key={img.id} className="relative aspect-[3/4] rounded-xl overflow-hidden bg-[var(--surface-2)] border border-[var(--border)] group">
              <img src={img.preview} alt={`Image ${i + 1}`} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors" />
              <span className="absolute top-1.5 left-1.5 bg-black/60 text-white text-xs font-bold px-1.5 py-0.5 rounded-md">#{i + 1}</span>
              <button
                onClick={(e) => { e.stopPropagation(); removeImage(img.id); }}
                className="absolute top-1.5 right-1.5 bg-red-500 text-white w-5 h-5 rounded-full text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >✕</button>
            </div>
          ))}
          <div
            onClick={() => fileInputRef.current?.click()}
            className="aspect-[3/4] rounded-xl border-2 border-dashed border-[var(--border)] flex flex-col items-center justify-center cursor-pointer hover:border-[var(--text-muted)] hover:bg-[var(--surface-2)] transition-colors"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--text-muted)]"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            <span className="text-xs text-[var(--text-muted)] mt-1">Add more</span>
          </div>
        </div>
      )}

      {/* Premium Audio Button (Locked) */}
      <div className="mb-6 p-4 bg-[var(--surface-2)] border border-[var(--border)] rounded-2xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="22"/></svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-[var(--text-primary)]">Upload Audio Recording</p>
              <p className="text-xs text-[var(--text-muted)]">Transcribe lectures and recordings automatically</p>
            </div>
          </div>
          <span className="text-xs font-bold bg-amber-100 text-amber-700 px-2.5 py-1 rounded-full flex-shrink-0">PREMIUM</span>
        </div>
        <button disabled className="mt-3 w-full py-2.5 rounded-xl border border-dashed border-amber-300 text-sm font-medium text-amber-600 bg-amber-50 cursor-not-allowed opacity-70 flex items-center justify-center gap-2">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
          Upgrade to Unlock Audio Upload
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl">
          {error}
        </div>
      )}

      {/* Submit */}
      <button
        onClick={handleSubmit}
        disabled={isProcessing || images.length === 0}
        className="w-full py-3.5 bg-[var(--accent)] text-[var(--accent-fg)] rounded-xl font-semibold text-sm hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {isProcessing ? (
          <>
            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            {progress}
          </>
        ) : (
          <>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
            Extract Text with AI
          </>
        )}
      </button>
    </div>
  );
}
