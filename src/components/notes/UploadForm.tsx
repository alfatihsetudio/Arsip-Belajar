'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Folder {
  id: string;
  name: string;
}

interface ImageFile {
  id: string;
  file: File;
  preview: string;
}

interface UploadFormProps {
  folders: Folder[];
  initialFolderId: string;
}

export default function UploadForm({ folders, initialFolderId }: UploadFormProps) {
  const [images, setImages] = useState<ImageFile[]>([]);
  const [title, setTitle] = useState('');
  const [folderId, setFolderId] = useState(initialFolderId);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState('');
  const [isAutoTitle, setIsAutoTitle] = useState(false);
  const [isFolderDropdownOpen, setIsFolderDropdownOpen] = useState(false);
  const folderDropdownRef = useRef<HTMLDivElement>(null);

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // Close folder dropdown on click outside
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (folderDropdownRef.current && !folderDropdownRef.current.contains(e.target as Node)) {
        setIsFolderDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const getSelectedFolderName = () => {
    if (!folderId) return 'Tanpa Folder (Root)';
    const folder = folders.find(f => f.id === folderId);
    if (!folder) return 'Tanpa Folder (Root)';
    if (folder.name.startsWith('{')) {
      try {
        return JSON.parse(folder.name).name || folder.name;
      } catch {
        return folder.name;
      }
    }
    return folder.name;
  };

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

  const compressImage = (file: File): Promise<File> => {
    return new Promise((resolve) => {
      if (!file.type.startsWith('image/')) {
        resolve(file);
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 1600;
          const MAX_HEIGHT = 1600;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height = Math.round((height * MAX_WIDTH) / width);
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width = Math.round((width * MAX_HEIGHT) / height);
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(file);
            return;
          }

          ctx.drawImage(img, 0, 0, width, height);

          canvas.toBlob(
            (blob) => {
              if (!blob) {
                resolve(file);
                return;
              }
              const compressedFile = new File([blob], file.name.replace(/\.[^/.]+$/, "") + ".jpg", {
                type: 'image/jpeg',
                lastModified: Date.now(),
              });
              resolve(compressedFile);
            },
            'image/jpeg',
            0.85
          );
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    });
  };

  const handleSubmit = async () => {
    if (images.length === 0) return setError('Please add at least one image.');
    if (!isAutoTitle && !title.trim()) return setError('Please enter a title for your note.');

    setIsProcessing(true);
    setError(null);
    setProgress('Compressing images...');

    try {
      const compressedFiles = await Promise.all(
        images.map(img => compressImage(img.file))
      );

      setProgress('Uploading images...');
      const formData = new FormData();
      formData.append('title', title.trim());
      if (folderId) formData.append('folder_id', folderId);
      
      compressedFiles.forEach((file, i) => {
        formData.append('images', file);
        formData.append(`order_${i}`, String(i));
      });

      setProgress('Processing with AI...');
      const res = await fetch('/api/transcribe', { method: 'POST', body: formData });
      
      let data;
      const contentType = res.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        data = await res.json();
      } else {
        const text = await res.text();
        throw new Error(text || 'Failed to process note (Server error)');
      }

      if (!res.ok) throw new Error(data.error || 'Failed to process note');
      
      router.push(`/dashboard/note/${data.noteId}`);
      router.refresh();
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
        <div className="flex justify-between items-end mb-1.5">
          <label className="block text-sm font-medium text-[var(--text-primary)]">Note Title</label>
          <button
            type="button"
            onClick={() => {
              setIsAutoTitle(!isAutoTitle);
              if (isAutoTitle) setTitle('');
            }}
            className="text-[11px] font-medium flex items-center gap-1.5 px-2 py-1 rounded-lg transition-colors border border-[var(--border)] hover:bg-[var(--surface-2)] text-indigo-400"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>
            {isAutoTitle ? 'Ketik Manual' : 'Buat Otomatis'}
          </button>
        </div>
        
        {isAutoTitle ? (
          <div className="w-full px-4 py-3 bg-indigo-500/5 border border-indigo-500/20 rounded-xl text-sm text-indigo-400 flex items-center gap-2 cursor-not-allowed">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>
            <span className="font-medium">AI akan membuatkan judul secara otomatis</span>
          </div>
        ) : (
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="e.g. Algebra – Chapter 3"
            className="w-full px-4 py-3 bg-[var(--surface)] border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:border-[var(--accent)] transition-colors"
          />
        )}
      </div>

      {/* Folder Selection */}
      <div className="mb-5" ref={folderDropdownRef}>
        <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">Folder</label>
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsFolderDropdownOpen(!isFolderDropdownOpen)}
            className="w-full px-4 py-3 bg-[var(--surface)] border border-[var(--border)] rounded-xl text-sm text-[var(--text-primary)] hover:border-[var(--text-secondary)] transition-colors flex items-center justify-between cursor-pointer"
          >
            <span>{getSelectedFolderName()}</span>
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={`text-[var(--text-secondary)] transition-transform duration-200 ${isFolderDropdownOpen ? 'rotate-180' : ''}`}
            >
              <path d="m6 9 6 6 6-6" />
            </svg>
          </button>

          {isFolderDropdownOpen && (
            <div className="absolute left-0 right-0 mt-1.5 bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-xl z-50 py-1.5 max-h-60 overflow-y-auto animate-fadeIn">
              <button
                type="button"
                onClick={() => {
                  setFolderId('');
                  setIsFolderDropdownOpen(false);
                }}
                className={`w-full text-left px-4 py-2 text-sm font-semibold transition-colors cursor-pointer hover:bg-[var(--surface-2)] ${
                  !folderId ? 'text-[var(--accent)] bg-[var(--accent)]/5' : 'text-[var(--text-primary)]'
                }`}
              >
                Tanpa Folder (Root)
              </button>
              {folders.map(f => {
                const folderName = f.name.startsWith('{') ? (() => { try { return JSON.parse(f.name).name || f.name; } catch { return f.name; } })() : f.name;
                return (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => {
                      setFolderId(f.id);
                      setIsFolderDropdownOpen(false);
                    }}
                    className={`w-full text-left px-4 py-2 text-sm font-semibold transition-colors cursor-pointer hover:bg-[var(--surface-2)] ${
                      folderId === f.id ? 'text-[var(--accent)] bg-[var(--accent)]/5' : 'text-[var(--text-primary)]'
                    }`}
                  >
                    {folderName}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Image Upload Area */}
      <div className="mb-5">
        <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">
          Images <span className="text-[var(--text-muted)] font-normal">(upload in order, from first to last)</span>
        </label>
        <input type="file" accept="image/*" capture="environment" ref={cameraInputRef} onChange={e => e.target.files && addImages(e.target.files)} className="hidden" />
        <input type="file" accept="image/*" multiple ref={galleryInputRef} onChange={e => e.target.files && addImages(e.target.files)} className="hidden" />

        {images.length === 0 ? (
          <div className="grid grid-cols-2 gap-3 w-full">
            <div
              onClick={() => cameraInputRef.current?.click()}
              className="border-2 border-[var(--border)] bg-[var(--surface)] rounded-2xl p-6 flex flex-col items-center justify-center cursor-pointer hover:border-[var(--accent)] hover:bg-[var(--accent)]/5 transition-colors shadow-sm"
            >
              <div className="w-12 h-12 bg-[var(--accent)]/10 text-[var(--accent)] rounded-full flex items-center justify-center mb-3">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/></svg>
              </div>
              <span className="text-sm font-semibold text-[var(--text-primary)]">Buka Kamera</span>
              <span className="text-[10px] text-[var(--text-muted)] mt-1 text-center">Foto langsung</span>
            </div>
            
            <div
              onClick={() => galleryInputRef.current?.click()}
              className="border-2 border-[var(--border)] bg-[var(--surface)] rounded-2xl p-6 flex flex-col items-center justify-center cursor-pointer hover:border-[var(--accent)] hover:bg-[var(--accent)]/5 transition-colors shadow-sm"
            >
              <div className="w-12 h-12 bg-[var(--accent)]/10 text-[var(--accent)] rounded-full flex items-center justify-center mb-3">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
              </div>
              <span className="text-sm font-semibold text-[var(--text-primary)]">Pilih Galeri</span>
              <span className="text-[10px] text-[var(--text-muted)] mt-1 text-center">Upload file (Bisa banyak)</span>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-6 mb-6 w-full">
            {images.map((img, i) => (
              <div key={img.id} className="relative w-full rounded-2xl overflow-hidden shadow-md bg-[var(--surface-2)] group">
                <img src={img.preview} alt={`Preview ${i + 1}`} className="w-full h-auto block" />
                <span className="absolute top-3 left-3 bg-black/60 text-white text-xs font-bold px-2 py-1 rounded-md backdrop-blur-sm z-10">#{i + 1}</span>
                <button
                  onClick={() => removeImage(img.id)}
                  className="absolute top-3 right-3 bg-red-500/90 hover:bg-red-600 text-white p-2 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity shadow-md z-10 backdrop-blur-sm"
                  title="Hapus gambar"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </div>
            ))}
            
            {/* Add more button */}
            <div className="grid grid-cols-2 gap-3 w-full">
              <div
                onClick={() => cameraInputRef.current?.click()}
                className="border-2 border-dashed border-[var(--border)] rounded-2xl p-4 flex flex-col items-center justify-center cursor-pointer hover:border-[var(--text-muted)] hover:bg-[var(--surface-2)] transition-colors"
              >
                <svg className="text-[var(--text-muted)] mb-1" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/></svg>
                <span className="text-[11px] text-[var(--text-secondary)] font-medium">Tambah Kamera</span>
              </div>
              <div
                onClick={() => galleryInputRef.current?.click()}
                className="border-2 border-dashed border-[var(--border)] rounded-2xl p-4 flex flex-col items-center justify-center cursor-pointer hover:border-[var(--text-muted)] hover:bg-[var(--surface-2)] transition-colors"
              >
                <svg className="text-[var(--text-muted)] mb-1" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
                <span className="text-[11px] text-[var(--text-secondary)] font-medium">Tambah Galeri</span>
              </div>
            </div>
          </div>
        )}
      </div>

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
