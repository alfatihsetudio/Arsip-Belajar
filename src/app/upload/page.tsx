'use client';
import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      setPreview(URL.createObjectURL(selectedFile));
      setError(null);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setIsUploading(true);
    setError(null);

    const formData = new FormData();
    formData.append('image', file);

    try {
      const response = await fetch('/api/transcribe', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to process image');
      }

      router.push(`/note/${data.noteId}`);
    } catch (err: any) {
      setError(err.message || 'An error occurred during upload.');
      setIsUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-foreground/10 bg-background/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center">
          <Link href="/dashboard" className="flex items-center gap-2 text-sm font-medium text-foreground/70 hover:text-foreground transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
            Cancel
          </Link>
        </div>
      </header>

      <main className="flex-1 max-w-2xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex flex-col justify-center items-center">
        <h1 className="text-3xl font-bold mb-8 text-center text-foreground">Upload Note</h1>
        
        <div className="w-full bg-foreground/5 border border-foreground/10 rounded-3xl p-6 sm:p-10 shadow-sm">
          {!preview ? (
            <div 
              className="border-2 border-dashed border-foreground/20 rounded-2xl p-12 flex flex-col items-center justify-center cursor-pointer hover:border-foreground/40 hover:bg-foreground/10 transition-colors text-center"
              onClick={() => fileInputRef.current?.click()}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-foreground/40 mb-4"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/></svg>
              <p className="text-lg font-medium text-foreground">Tap to select an image</p>
              <p className="text-sm text-foreground/60 mt-2">or take a photo with your camera</p>
            </div>
          ) : (
            <div className="flex flex-col gap-6">
              <div className="relative rounded-2xl overflow-hidden border border-foreground/10 bg-black/5 aspect-[3/4] sm:aspect-auto sm:max-h-[50vh] flex items-center justify-center">
                <img src={preview} alt="Preview" className="w-full h-full object-contain" />
              </div>
              <div className="flex gap-4">
                <button 
                  onClick={() => { setFile(null); setPreview(null); }}
                  disabled={isUploading}
                  className="flex-1 py-3 px-4 rounded-xl border border-foreground/20 font-medium hover:bg-foreground/5 transition-colors disabled:opacity-50"
                >
                  Retake
                </button>
                <button 
                  onClick={handleUpload}
                  disabled={isUploading}
                  className="flex-[2] py-3 px-4 rounded-xl bg-foreground text-background font-medium hover:bg-foreground/90 transition-colors flex items-center justify-center gap-2 disabled:opacity-80"
                >
                  {isUploading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-background border-t-transparent rounded-full animate-spin"></div>
                      Processing...
                    </>
                  ) : (
                    'Extract Text'
                  )}
                </button>
              </div>
            </div>
          )}

          <input 
            type="file" 
            accept="image/*" 
            capture="environment" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            className="hidden" 
          />

          {error && (
            <div className="mt-6 p-4 bg-red-500/10 border border-red-500/20 text-red-600 rounded-xl text-sm text-center">
              {error}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
