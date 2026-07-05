'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

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

  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<BlobPart[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

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

  const compressImage = (file: File): Promise<File> => {
    return new Promise((resolve) => {
      if (!file.type.startsWith('image/')) return resolve(file);

      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 800; // Extreme compression for low-end
          const MAX_HEIGHT = 800;
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
          if (!ctx) return resolve(file);

          ctx.drawImage(img, 0, 0, width, height);
          canvas.toBlob(
            (blob) => {
              if (!blob) return resolve(file);
              resolve(new File([blob], file.name.replace(/\.[^/.]+$/, "") + ".jpg", { type: 'image/jpeg' }));
            },
            'image/jpeg',
            0.65 // Lower quality for massive storage savings
          );
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    });
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      let options = { mimeType: 'audio/webm;codecs=opus', audioBitsPerSecond: 16000 };
      if (!MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
        options = { mimeType: 'audio/mp4', audioBitsPerSecond: 16000 };
      }
      
      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: mediaRecorder.mimeType });
        const ext = mediaRecorder.mimeType.includes('mp4') ? 'mp4' : 'webm';
        const file = new File([audioBlob], `Recording-${Date.now()}.${ext}`, { type: mediaRecorder.mimeType });
        setAudioFile(file);
        setIsRecording(false);
        if (timerRef.current) clearInterval(timerRef.current);
        setRecordingTime(0);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start(1000);
      setIsRecording(true);
      setRecordingTime(0);
      timerRef.current = setInterval(() => setRecordingTime(prev => prev + 1), 1000);
    } catch (err) {
      setError('Akses mikrofon ditolak atau tidak didukung di perangkat ini.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const handleSubmit = async () => {
    if (images.length === 0 && !audioFile) return setError('Please add at least one image or audio file.');
    if (!mergeStrategy) return setError('Silakan pilih metode Integrasi dengan Catatan Lama (Gabung atau Pisah) terlebih dahulu.');

    const AUDIO_LIMIT = 25 * 1024 * 1024; // 25 MB
    if (audioFile && audioFile.size > AUDIO_LIMIT) {
      return setError(`Ukuran file audio terlalu besar (${(audioFile.size / 1024 / 1024).toFixed(1)} MB). Maksimal 25 MB untuk menjaga performa.`);
    }

    setIsProcessing(true);
    setError(null);
    setProgress('Compressing media...');

    try {
      const compressedFiles = await Promise.all(images.map(img => compressImage(img.file)));

      setProgress('Checking quota & uploading direct...');
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Anda harus login terlebih dahulu.');

      const { data: profile } = await supabase.from('profiles').select('storage_used, subscription_tier').eq('id', user.id).single();
      const quota = profile?.subscription_tier === 'free' ? 100 * 1024 * 1024 : profile?.subscription_tier === 'premium_1' ? 1024 * 1024 * 1024 : 3 * 1024 * 1024 * 1024;
      const totalUploadSize = compressedFiles.reduce((acc, f) => acc + f.size, 0) + (audioFile ? audioFile.size : 0);
      
      if ((profile?.storage_used || 0) + totalUploadSize > quota) {
         throw new Error('Penyimpanan penuh! Silakan hapus catatan lama atau upgrade ke Premium.');
      }

      // Direct Upload
      const imagePaths = [];
      for (let i = 0; i < compressedFiles.length; i++) {
        const file = compressedFiles[i];
        const ext = file.name.split('.').pop() || 'jpg';
        const fileName = `${user.id}/${Date.now()}-${i}.${ext}`;
        const { error: uploadError } = await supabase.storage.from('media').upload(fileName, file, { contentType: file.type });
        if (uploadError) throw new Error('Gagal mengupload gambar: ' + uploadError.message);
        imagePaths.push(fileName);
      }

      let audioPath = null;
      if (audioFile) {
        setProgress('Uploading audio...');
        const ext = audioFile.name.split('.').pop() || 'mp3';
        const fileName = `${user.id}/${Date.now()}-audio.${ext}`;
        const { error: uploadError } = await supabase.storage.from('media').upload(fileName, audioFile, { contentType: audioFile.type });
        if (uploadError) throw new Error('Gagal mengupload audio: ' + uploadError.message);
        audioPath = fileName;
      }

      setProgress('Processing with AI (Merging with existing note)...');
      
      const formData = new FormData();
      formData.append('existing_note_id', noteId);
      formData.append('merge_strategy', mergeStrategy!);
      if (imagePaths.length > 0) formData.append('image_paths', JSON.stringify(imagePaths));
      if (audioPath) formData.append('audio_path', audioPath);

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
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-[var(--surface-2)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
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
            <p className="text-[10px] text-[var(--text-muted)] mb-3 bg-red-500/10 border border-red-500/20 text-red-500 p-2 rounded-lg">
              <span className="font-bold">Info Pengguna Gratis:</span> Audio akan dihapus otomatis setelah AI selesai. (Maks 25 MB)
            </p>
            <input type="file" accept="audio/*" ref={audioInputRef} onChange={(e) => { if (e.target.files && e.target.files[0]) setAudioFile(e.target.files[0]); e.target.value = ''; }} className="hidden" />
            
            {!audioFile ? (
              <div className="flex gap-3">
                 <button onClick={() => audioInputRef.current?.click()} className="flex-1 py-3 px-4 border border-[var(--border)] border-dashed rounded-xl bg-[var(--surface-2)] hover:bg-[var(--surface-3)] text-[13px] font-medium transition-colors flex flex-col items-center gap-1.5">
                   <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                   Upload File
                 </button>
                 {isRecording ? (
                   <button onClick={stopRecording} className="flex-1 py-3 px-4 border border-red-500 rounded-xl bg-red-50 text-[13px] font-bold text-red-600 transition-colors flex flex-col items-center gap-1.5 shadow-sm">
                     <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="animate-pulse"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/></svg>
                     Berhenti ({formatTime(recordingTime)})
                   </button>
                 ) : (
                   <button onClick={startRecording} className="flex-1 py-3 px-4 border border-[var(--border)] border-dashed rounded-xl bg-[var(--surface-2)] hover:border-red-400 hover:bg-red-50 text-[13px] font-medium transition-colors flex flex-col items-center gap-1.5">
                     <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-red-500"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3" fill="currentColor"/></svg>
                     Rekam
                   </button>
                 )}
              </div>
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
              <div className="flex gap-2">
                <button onClick={() => setMergeStrategy('gabung')} className={`flex-1 py-2 px-3 rounded-lg border text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${mergeStrategy === 'gabung' ? 'border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-fg)] shadow-md' : 'border-[var(--border)] bg-[var(--surface)] text-[var(--text-secondary)]'}`}>
                  Gabung (Update)
                </button>
                <button onClick={() => setMergeStrategy('pisah')} className={`flex-1 py-2 px-3 rounded-lg border text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${mergeStrategy === 'pisah' ? 'border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-fg)] shadow-md' : 'border-[var(--border)] bg-[var(--surface)] text-[var(--text-secondary)]'}`}>
                  Pisah (Append)
                </button>
              </div>
            </div>
          )}

          {error && <div className="p-3 mb-2 bg-red-50 text-red-600 text-xs rounded-lg border border-red-200">{error}</div>}
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-[var(--border)] bg-[var(--surface)] rounded-b-2xl shrink-0">
          <button onClick={handleSubmit} disabled={isProcessing || (images.length === 0 && !audioFile)} className="w-full py-3 bg-[var(--accent)] text-[var(--accent-fg)] rounded-xl font-bold text-[13px] hover:opacity-90 disabled:opacity-50 transition-all flex items-center justify-center gap-2">
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
