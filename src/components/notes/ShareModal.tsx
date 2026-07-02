'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  noteId: string;
  initialVisibility: 'private' | 'restricted' | 'public';
  initialAllowedEmails: string[];
}

export default function ShareModal({
  isOpen,
  onClose,
  noteId,
  initialVisibility,
  initialAllowedEmails,
}: ShareModalProps) {
  const [visibility, setVisibility] = useState(initialVisibility || 'private');
  const [emails, setEmails] = useState<string[]>(initialAllowedEmails || []);
  const [emailInput, setEmailInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  const supabase = createClient();

  if (!isOpen) return null;

  const handleAddEmail = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = emailInput.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) return;
    if (!emails.includes(cleanEmail)) {
      setEmails([...emails, cleanEmail]);
    }
    setEmailInput('');
  };

  const handleRemoveEmail = (emailToRemove: string) => {
    setEmails(emails.filter(e => e !== emailToRemove));
  };

  const handleSave = async () => {
    setIsSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      alert('Anda harus login');
      setIsSaving(false);
      return;
    }

    const { error } = await supabase
      .from('notes')
      .update({
        visibility: visibility,
        allowed_emails: emails,
      })
      .eq('id', noteId)
      .eq('user_id', user.id);

    setIsSaving(false);

    if (error) {
      console.error(error);
      alert('Gagal menyimpan pengaturan berbagi.');
    } else {
      onClose();
    }
  };

  const handleCopyLink = () => {
    const publicUrl = `${window.location.origin}/note/${noteId}`;
    navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fadeIn">
      <div 
        className="bg-[var(--bg)] border border-[var(--border)] rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-slideUp"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-5 border-b border-[var(--border)] flex justify-between items-center bg-[var(--surface)]">
          <h2 className="text-lg font-bold text-[var(--text-primary)]">Bagikan Catatan</h2>
          <button onClick={onClose} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors p-1">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Visibility Selection */}
          <div className="space-y-3">
            <label className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">Akses Umum</label>
            <div className="space-y-2">
              {/* Private Option */}
              <label className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${visibility === 'private' ? 'bg-[var(--accent)]/10 border-[var(--accent)]' : 'border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-2)]'}`}>
                <input 
                  type="radio" 
                  name="visibility" 
                  value="private" 
                  checked={visibility === 'private'} 
                  onChange={() => setVisibility('private')}
                  className="mt-1"
                />
                <div>
                  <div className="font-bold text-sm text-[var(--text-primary)] flex items-center gap-1.5">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                    Privat
                  </div>
                  <p className="text-xs text-[var(--text-muted)] mt-0.5">Hanya Anda yang dapat melihat catatan ini.</p>
                </div>
              </label>

              {/* Restricted Option */}
              <label className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${visibility === 'restricted' ? 'bg-[var(--accent)]/10 border-[var(--accent)]' : 'border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-2)]'}`}>
                <input 
                  type="radio" 
                  name="visibility" 
                  value="restricted" 
                  checked={visibility === 'restricted'} 
                  onChange={() => setVisibility('restricted')}
                  className="mt-1"
                />
                <div className="w-full">
                  <div className="font-bold text-sm text-[var(--text-primary)] flex items-center gap-1.5">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                    Terbatas
                  </div>
                  <p className="text-xs text-[var(--text-muted)] mt-0.5">Hanya orang yang ditambahkan yang dapat melihat tautan ini.</p>
                </div>
              </label>

              {/* Public Option */}
              <label className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${visibility === 'public' ? 'bg-[var(--accent)]/10 border-[var(--accent)]' : 'border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-2)]'}`}>
                <input 
                  type="radio" 
                  name="visibility" 
                  value="public" 
                  checked={visibility === 'public'} 
                  onChange={() => setVisibility('public')}
                  className="mt-1"
                />
                <div>
                  <div className="font-bold text-sm text-[var(--text-primary)] flex items-center gap-1.5">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
                    Siapa Saja yang Memiliki Tautan
                  </div>
                  <p className="text-xs text-[var(--text-muted)] mt-0.5">Semua orang di internet dengan tautan ini dapat melihat.</p>
                </div>
              </label>
            </div>
          </div>

          {/* Email Management for Restricted */}
          {visibility === 'restricted' && (
            <div className="space-y-3 pt-3 border-t border-[var(--border)] animate-fadeIn">
              <label className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">Bagikan Kepada (Email)</label>
              
              <form onSubmit={handleAddEmail} className="flex gap-2">
                <input 
                  type="email" 
                  value={emailInput}
                  onChange={e => setEmailInput(e.target.value)}
                  placeholder="Tambahkan email teman..."
                  className="flex-1 bg-[var(--surface-2)] border border-[var(--border)] text-sm px-3 py-2 rounded-xl focus:outline-none focus:border-[var(--accent)] transition-colors"
                />
                <button 
                  type="submit" 
                  disabled={!emailInput.trim()}
                  className="bg-[var(--surface-2)] border border-[var(--border)] px-4 py-2 rounded-xl text-sm font-semibold hover:bg-[var(--surface)] transition-colors disabled:opacity-50"
                >
                  Tambah
                </button>
              </form>

              {emails.length > 0 && (
                <div className="space-y-2 mt-3 max-h-32 overflow-y-auto pr-1 custom-scrollbar">
                  {emails.map(email => (
                    <div key={email} className="flex items-center justify-between p-2.5 bg-[var(--surface-2)] border border-[var(--border)] rounded-xl text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-[var(--accent)]/10 text-[var(--accent)] flex items-center justify-center text-[10px] font-bold uppercase">
                          {email.charAt(0)}
                        </div>
                        <span className="font-medium text-[var(--text-primary)]">{email}</span>
                      </div>
                      <button 
                        onClick={() => handleRemoveEmail(email)}
                        className="text-[var(--text-muted)] hover:text-red-500 transition-colors p-1"
                        title="Hapus Akses"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-[var(--surface)] border-t border-[var(--border)] flex items-center justify-between">
          <button 
            onClick={handleCopyLink}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold border transition-colors ${copied ? 'bg-green-50 border-green-200 text-green-700' : 'bg-[var(--surface-2)] border-[var(--border)] text-[var(--text-primary)] hover:bg-[var(--surface)]'}`}
          >
            {copied ? (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                Disalin
              </>
            ) : (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
                Salin Tautan
              </>
            )}
          </button>

          <button 
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-bold bg-[var(--accent)] text-[var(--accent-fg)] hover:opacity-90 transition-opacity disabled:opacity-50 shadow-sm"
          >
            {isSaving ? 'Menyimpan...' : 'Selesai'}
          </button>
        </div>
      </div>
    </div>
  );
}
