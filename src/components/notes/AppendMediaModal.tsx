'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';

export default function AppendMediaModal({
  noteId,
  onClose,
}: {
  noteId: string;
  onClose: () => void;
}) {
  const [images, setImages] = useState<{ id: string; file: File; preview: string }[]>([]);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [mergeStrategy, setMergeStrategy] = useState<'gabung' | 'pisah' | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState('');

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const addImages = (files: FileList | File[]) => {
    const newImages = Array.from(files).map(file => ({
      id: `${file.name}-${Date.now()}-${Math.random()}`,
      file,
      preview: URL.createObjectURL(file),
    }));
    setImages(prev => [...prev, ...newImages]);
  };

  const removeImage = (id: string) => {
    setImages(prev => {
      const img = prev.find(i => i.id === id);
      if (img) URL.revokeObjectURL(img.preview);
      return prev.filter(i => i.id !== id);
    });
  };

  const handleSubmit = async () => {
    if (images.length === 0 && !audioFile) return setError('Please add at least one image or audio file.');
    if (!mergeStrategy) return setError('Silakan pilih metode Integrasi dengan Catatan Lama (Gabung atau Pisah) terlebih dahulu.');

    setIsProcessing(true);
    setError(null);
    setProgress('Uploading files...');

    try {
      const formData = new FormData();
      formData.append('existing_note_id', noteId);
      formData.append('merge_strategy', mergeStrategy!);
      
      if (images.length > 0) {
        images.forEach((img, i) => {
          formData.append('images', img.file);
          formData.append(`order_${i}`, String(i));
        });
      }

      if (audioFile) {
        formData.append('audio', audioFile);
      }

      setProgress('Processing with AI (Merging with existing note)...');
      const res = await fetch('/api/transcribe', { method: 'POST', body: formData });
      
      let data;
      const contentType = res.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        data = await res.json();
      } else {
        const text = await res.text();
        throw new Error(text || 'Failed to append media (Server error)');
      }

      if (!res.ok) throw new Error(data.error || 'Failed to append media');
      
      onClose();
      router.refresh();
    } catch (err: any) {
      setError(err.message);
      setIsProcessing(false);
      setProgress('');
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-[var(--surface)] w-full max-w-lg rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[var(--border)] shrink-0">
          <h2 className="text-lg font-bold text-[var(--text-primary)]">Tambah Media ke Catatan</h2>
          <button 
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-[var(--surface-2)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
          </button>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto flex-1 custom-scrollbar">
          
          {/* Images Section */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-[var(--text-primary)] mb-2">Foto / Papan Tulis</label>
            <input type="file" accept="image/*" capture="environment" ref={cameraInputRef} onChange={(e) => { if (e.target.files) addImages(e.target.files); e.target.value = ''; }} className="hidden" />
            <input type="file" accept="image/*" multiple ref={galleryInputRef} onChange={(e) => { if (e.target.files) addImages(e.target.files); e.target.value = ''; }} className="hidden" />
            
            {images.length === 0 ? (
              <div className="flex gap-3">
                <button onClick={() => cameraInputRef.current?.click()} className="flex-1 py-3 px-4 border border-[var(--border)] border-dashed rounded-xl bg-[var(--surface-2)] hover:bg-[var(--surface-3)] text-[13px] font-medium transition-colors flex flex-col items-center gap-1.5">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/></svg>
                  Kamera
                </button>
                <button onClick={() => galleryInputRef.current?.click()} className="flex-1 py-3 px-4 border border-[var(--border)] border-dashed rounded-xl bg-[var(--surface-2)] hover:bg-[var(--surface-3)] text-[13px] font-medium transition-colors flex flex-col items-center gap-1.5">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
                  Galeri
                </button>
              </div>
            ) : (
              <div className="flex gap-2 overflow-x-auto pb-2 snap-x">
                {images.map((img) => (
                  <div key={img.id} className="relative w-24 h-24 shrink-0 rounded-lg overflow-hidden border border-[var(--border)] snap-center">
                    <img src={img.preview} alt="preview" className="w-full h-full object-cover" />
                    <button onClick={() => removeImage(img.id)} className="absolute top-1 right-1 bg-red-500 text-white rounded-md p-1 shadow-sm"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg></button>
                  </div>
                ))}
                <button onClick={() => galleryInputRef.current?.click()} className="w-24 h-24 shrink-0 rounded-lg border border-[var(--border)] border-dashed flex items-center justify-center text-[var(--text-muted)] hover:bg-[var(--surface-2)] snap-center">
                   <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
                </button>
              </div>
            )}
          </div>

          {/* Audio Section */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-[var(--text-primary)] mb-2">Audio / Suara</label>
            <input type="file" accept="audio/*" ref={audioInputRef} onChange={(e) => { if (e.target.files && e.target.files[0]) setAudioFile(e.target.files[0]); e.target.value = ''; }} className="hidden" />
            
            {!audioFile ? (
              <button onClick={() => audioInputRef.current?.click()} className="w-full py-3 px-4 border border-[var(--border)] border-dashed rounded-xl bg-[var(--surface-2)] hover:bg-[var(--surface-3)] text-[13px] font-medium transition-colors flex items-center justify-center gap-2">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="22"/></svg>
                Pilih File Audio
              </button>
            ) : (
              <div className="w-full p-3 border border-amber-200 bg-amber-50 rounded-xl flex items-center justify-between">
                <span className="text-sm font-medium text-amber-900 truncate pr-4">{audioFile.name}</span>
                <button onClick={() => setAudioFile(null)} className="p-1.5 bg-red-100 text-red-600 rounded-md shrink-0"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg></button>
              </div>
            )}
          </div>

          {/* Merge Strategy UI */}
          {(images.length > 0 || audioFile) && (
            <div className="mb-4 p-3.5 border border-[var(--border)] bg-[var(--surface-2)] rounded-xl">
              <label className="block text-xs font-bold text-[var(--text-primary)] mb-2 uppercase tracking-wide">
                Integrasi dengan Catatan Lama
              </label>
              <p className="text-[11px] text-[var(--text-secondary)] mb-3 leading-relaxed">
                Bagaimana Anda ingin menggabungkan media baru ini ke dalam teks catatan yang sudah ada?
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setMergeStrategy('gabung')}
                  className={`flex-1 py-2 px-3 rounded-lg border text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
                    mergeStrategy === 'gabung' 
                      ? 'border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-fg)] shadow-md' 
                      : 'border-[var(--border)] bg-[var(--surface)] text-[var(--text-secondary)] hover:border-[var(--text-muted)]'
                  }`}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="18" cy="18" r="3"/><circle cx="6" cy="6" r="3"/><path d="M13 6h3a2 2 0 0 1 2 2v7"/><line x1="6" y1="9" x2="6" y2="21"/></svg>
                  Gabung (Update)
                </button>
                <button
                  onClick={() => setMergeStrategy('pisah')}
                  className={`flex-1 py-2 px-3 rounded-lg border text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
                    mergeStrategy === 'pisah' 
                      ? 'border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-fg)] shadow-md' 
                      : 'border-[var(--border)] bg-[var(--surface)] text-[var(--text-secondary)] hover:border-[var(--text-muted)]'
                  }`}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>
                  Pisah (Append)
                </button>
              </div>
            </div>
          )}

          {error && <div className="p-3 mb-2 bg-red-50 text-red-600 text-xs rounded-lg border border-red-200">{error}</div>}
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-[var(--border)] bg-[var(--surface)] rounded-b-2xl shrink-0">
          <button
            onClick={handleSubmit}
            disabled={isProcessing || (images.length === 0 && !audioFile)}
            className="w-full py-3 bg-[var(--accent)] text-[var(--accent-fg)] rounded-xl font-bold text-[13px] hover:opacity-90 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
          >
            {isProcessing ? (
              <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> {progress}</>
            ) : (
              <><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg> Mulai Analisis AI</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
