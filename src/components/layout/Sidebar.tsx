'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';
import ThemeSwitcher from './ThemeSwitcher';

const NAV_ITEMS = [
  {
    group: 'Library',
    items: [
      { href: '/dashboard', icon: HomeIcon, label: 'All Notes' },
      { href: '/dashboard/folders', icon: FolderIcon, label: 'Folders' },
      { href: '/dashboard/tags', icon: TagIcon, label: 'Tags' },
    ],
  },
  {
    group: 'Learn',
    items: [
      { href: '/dashboard/ai', icon: ChatIcon, label: 'Tanya AI' },
      { href: '/dashboard/exams', icon: ExamIcon, label: 'Exams' },
    ],
  },
  {
    group: 'Account',
    items: [
      { href: '/dashboard/subscription', icon: StarIcon, label: 'Upgrade to Premium' },
      { href: '/dashboard/settings', icon: SettingsIcon, label: 'Settings' },
    ],
  },
];

function NavLink({ href, icon: Icon, label, onClick }: { href: string; icon: React.FC; label: string; onClick?: () => void }) {
  const pathname = usePathname();
  const isActive = pathname === href;
  return (
    <Link
      href={href}
      onClick={onClick}
      className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
        isActive
          ? 'bg-[var(--accent)] text-[var(--accent-fg)]'
          : 'text-[var(--text-secondary)] hover:bg-[var(--surface-2)] hover:text-[var(--text-primary)]'
      }`}
    >
      <Icon />
      {label}
    </Link>
  );
}

const COLOR_OPTIONS = [
  { name: 'Default', value: '' },
  { name: 'Red', value: '#ef4444' },
  { name: 'Blue', value: '#3b82f6' },
  { name: 'Green', value: '#10b981' },
  { name: 'Purple', value: '#8b5cf6' },
  { name: 'Orange', value: '#f97316' },
  { name: 'Pink', value: '#ec4899' },
  { name: 'Yellow', value: '#eab308' },
];

const EMOJI_OPTIONS = ['📁', '🇬🇧', '📐', '🧬', '⚖️', '📜', '🎨', '💻', '💡', '📅', '🧠', '📚'];

export default function Sidebar({ user }: { user: User }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const router = useRouter();
  const supabase = createClient();
  const pathname = usePathname();

  // Create Folder Modal States
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState('');
  const [emoji, setEmoji] = useState('📁');
  const [saving, setSaving] = useState(false);

  // Close mobile drawer on route change
  useEffect(() => { setMobileOpen(false); }, [pathname]);

  // Event listener for opening the modal from other components/buttons
  useEffect(() => {
    const handleOpenModal = () => {
      setShowModal(true);
    };
    window.addEventListener('open-create-folder-modal', handleOpenModal);
    return () => {
      window.removeEventListener('open-create-folder-modal', handleOpenModal);
    };
  }, []);

  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setSaving(true);

    const { data: authData } = await supabase.auth.getUser();
    if (!authData.user) {
      setSaving(false);
      return;
    }

    const { error } = await supabase.from('folders').insert({
      name: JSON.stringify({ name: name.trim(), description: description.trim(), color, emoji }),
      user_id: authData.user.id
    });

    if (!error) {
      setName('');
      setDescription('');
      setColor('');
      setEmoji('📁');
      setShowModal(false);
      router.refresh();
    } else {
      alert('Gagal membuat folder');
    }
    setSaving(false);
  };

  // Create Note Modal States
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [noteTitle, setNoteTitle] = useState('');
  const [noteFolderId, setNoteFolderId] = useState('');
  const [noteImages, setNoteImages] = useState<any[]>([]);
  const [noteProcessing, setNoteProcessing] = useState(false);
  const [noteError, setNoteError] = useState<string | null>(null);
  const [noteProgress, setNoteProgress] = useState('');
  const [folders, setFolders] = useState<any[]>([]);
  const noteFileInputRef = useRef<HTMLInputElement>(null);

  // Fetch folders for note modal selection
  useEffect(() => {
    if (showNoteModal) {
      supabase
        .from('folders')
        .select('id, name')
        .order('name')
        .then(({ data }) => {
          if (data) setFolders(data);
        });
    }
  }, [showNoteModal]);

  // Listen for open-create-note-modal custom event
  useEffect(() => {
    const handleOpenNoteModal = () => {
      setShowNoteModal(true);
    };
    window.addEventListener('open-create-note-modal', handleOpenNoteModal);
    return () => {
      window.removeEventListener('open-create-note-modal', handleOpenNoteModal);
    };
  }, []);

  const handleAddImages = (files: FileList | File[]) => {
    const newImages = Array.from(files).map(file => ({
      id: `${file.name}-${Date.now()}-${Math.random()}`,
      file,
      preview: URL.createObjectURL(file),
    }));
    setNoteImages(prev => [...prev, ...newImages]);
  };

  const handleRemoveImage = (id: string) => {
    setNoteImages(prev => {
      const img = prev.find(i => i.id === id);
      if (img) URL.revokeObjectURL(img.preview);
      return prev.filter(i => i.id !== id);
    });
  };

  const handleCreateNoteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (noteImages.length === 0) return setNoteError('Harap tambahkan minimal satu gambar catatan.');
    if (!noteTitle.trim()) return setNoteError('Harap masukkan judul catatan.');

    setNoteProcessing(true);
    setNoteError(null);
    setNoteProgress('Mengunggah gambar...');

    const formData = new FormData();
    formData.append('title', noteTitle.trim());
    if (noteFolderId) formData.append('folder_id', noteFolderId);
    
    noteImages.forEach((img, i) => {
      formData.append('images', img.file);
      formData.append(`order_${i}`, String(i));
    });

    try {
      setNoteProgress('Memproses teks dengan AI...');
      const res = await fetch('/api/transcribe', { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal memproses catatan');
      
      setNoteTitle('');
      setNoteFolderId('');
      setNoteImages([]);
      setShowNoteModal(false);
      
      router.push(`/dashboard/note/${data.noteId}`);
      router.refresh();
    } catch (err: any) {
      setNoteError(err.message);
    } finally {
      setNoteProcessing(false);
      setNoteProgress('');
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
    router.refresh();
  };

  const SidebarContent = () => (
    <div className="h-full flex flex-col">
      {/* Logo */}
      <div className="px-4 py-3.5 border-b border-[var(--border)]">
        <Link href="/dashboard" className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg overflow-hidden bg-white flex-shrink-0 relative">
            <Image src="/logo.jpg" alt="Arsip Belajar" fill sizes="28px" className="object-cover" />
          </div>
          <span className="font-bold text-[var(--text-primary)] text-sm sm:text-base">Arsip Belajar</span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
        {NAV_ITEMS.map(({ group, items }) => (
          <div key={group}>
            <p className="px-3 py-0.5 text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">{group}</p>
            <div className="mt-0.5 space-y-0.5">
              {items.map((item) => (
                <NavLink key={item.href} {...item} onClick={() => setMobileOpen(false)} />
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* User Profile Footer */}
      <div className="px-3 py-2.5 border-t border-[var(--border)]">
        <div className="flex items-center gap-2.5">
          {user.user_metadata?.avatar_url ? (
            <img src={user.user_metadata.avatar_url} alt="Avatar" className="w-8 h-8 rounded-full flex-shrink-0" />
          ) : (
            <div className="w-8 h-8 rounded-full bg-[var(--surface-2)] flex items-center justify-center text-sm font-bold text-[var(--text-secondary)] flex-shrink-0">
              {(user.email || 'U')[0].toUpperCase()}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-xs sm:text-sm font-medium text-[var(--text-primary)] truncate">{user.user_metadata?.full_name || user.email}</p>
            <p className="text-[10px] sm:text-xs text-[var(--text-muted)] truncate">{user.email}</p>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <ThemeSwitcher />
            <button onClick={handleLogout} title="Logout" className="p-1.5 text-[var(--text-muted)] hover:text-[var(--danger)] transition-colors rounded-lg hover:bg-[var(--surface-2)]">
              <LogoutIcon />
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-[var(--sidebar-width)] flex-shrink-0 border-r border-[var(--border)] bg-[var(--surface)] h-full">
        <SidebarContent />
      </aside>

      {/* Mobile: Topbar with hamburger on the left */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-3 h-14 bg-[var(--surface)] border-b border-[var(--border)]">
        <div className="flex items-center gap-1.5">
          {/* Hamburger button on the left */}
          <button onClick={() => setMobileOpen(true)} className="p-1.5 rounded-lg hover:bg-[var(--surface-2)] text-[var(--text-secondary)]">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
          </button>
          
          {/* Logo next to it */}
          <Link href="/dashboard" className="flex items-center gap-1.5">
            <div className="w-6 h-6 rounded-md overflow-hidden bg-white relative">
              <Image src="/logo.jpg" alt="Arsip Belajar" fill sizes="24px" className="object-cover" />
            </div>
            <span className="font-bold text-xs">Arsip Belajar</span>
          </Link>
        </div>
        <div className="flex-shrink-0 flex items-center gap-1">
          <ThemeSwitcher />
        </div>
      </div>

      {/* Mobile Drawer Overlay */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <div className="relative w-56 max-w-[70vw] bg-[var(--surface)] h-full shadow-2xl animate-fadeIn">
            <SidebarContent />
          </div>
        </div>
      )}

      {/* Floating mobile footer (iOS Glassmorphism style - Sleek Micro Dock) */}
      {!pathname.startsWith('/dashboard/ai') && (
        <div className="md:hidden fixed bottom-4 left-1/2 -translate-x-1/2 z-40 glass-effect w-[90vw] max-w-[240px] rounded-2xl py-1.5 px-2 flex items-center justify-between shadow-xl">
          {/* Exam Tab */}
          <Link 
            href="/dashboard/exams" 
            className="flex flex-col items-center justify-center gap-0.5 py-1 px-2 rounded-xl text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-black/5 active:bg-black/10 active:scale-95 flex-1 text-center transition-all duration-150"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 11l3 3L22 4" />
              <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
            </svg>
            <span className="text-[9px] font-semibold">Ujian</span>
          </Link>
  
          {/* Add Tab (Flat Center Button) */}
          <Link 
            href="#"
            onClick={(e) => {
              e.preventDefault();
              if (pathname === '/dashboard/folders') {
                window.dispatchEvent(new CustomEvent('open-create-folder-modal'));
              } else {
                window.dispatchEvent(new CustomEvent('open-create-note-modal'));
              }
            }}
            className="flex flex-col items-center justify-center gap-0.5 active:scale-95 flex-1 text-center transition-all duration-150"
          >
            <div className="w-8 h-8 bg-[var(--accent)] text-[var(--accent-fg)] rounded-full flex items-center justify-center shadow-md hover:opacity-90 transition-all">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </div>
            <span className="text-[9px] font-bold text-[var(--text-primary)]">Tambah</span>
          </Link>
  
          {/* AI Tab */}
          <Link 
            href="/dashboard/ai" 
            className="flex flex-col items-center justify-center gap-0.5 py-1 px-2 rounded-xl text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-black/5 active:bg-black/10 active:scale-95 flex-1 text-center transition-all duration-150"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            <span className="text-[9px] font-semibold">AI</span>
          </Link>
        </div>
      )}

      {/* Create Folder Modal (Liquid Glass Style Card with Solid Theme Background) */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-md transition-opacity" onClick={() => setShowModal(false)} />
          <div className="relative bg-[var(--surface)] border border-[var(--border)] w-full max-w-sm rounded-2xl p-5 shadow-2xl animate-fadeIn space-y-4 z-50 my-auto">
            <div className="flex items-center justify-between pb-1 border-b border-[var(--border)]">
              <h3 className="font-bold text-sm text-[var(--text-primary)]">Buat Folder Baru</h3>
              <button onClick={() => setShowModal(false)} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] p-1 transition-colors">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>

            <form onSubmit={handleCreateFolder} className="space-y-4 text-left">
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold text-[var(--text-secondary)]">Nama Folder</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Contoh: Bahasa Inggris"
                  required
                  disabled={saving}
                  className="w-full px-3 py-2 bg-[var(--surface-2)] border border-[var(--border)] rounded-xl text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)] transition-all"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold text-[var(--text-secondary)]">Deskripsi <span className="text-[var(--text-muted)] font-normal">(Opsional)</span></label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Contoh: Kumpulan materi tata bahasa"
                  disabled={saving}
                  rows={2}
                  className="w-full px-3 py-2 bg-[var(--surface-2)] border border-[var(--border)] rounded-xl text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)] transition-all resize-none"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold text-[var(--text-secondary)]">Ikon Emoji Folder</label>
                <div className="grid grid-cols-6 gap-2 pt-0.5">
                  {EMOJI_OPTIONS.map((em) => (
                    <button
                      key={em}
                      type="button"
                      disabled={saving}
                      onClick={() => setEmoji(em)}
                      className={`h-8 text-base rounded-xl transition-all flex items-center justify-center cursor-pointer hover:bg-[var(--surface-2)] active:scale-95 border ${
                        emoji === em 
                          ? 'bg-amber-50 border-amber-400 scale-105 shadow-sm' 
                          : 'border-[var(--border)] bg-transparent'
                      }`}
                    >
                      {em}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold text-[var(--text-secondary)]">Warna Folder <span className="text-[var(--text-muted)] font-normal">(Opsional)</span></label>
                <div className="flex flex-wrap gap-2.5 pt-1">
                  {COLOR_OPTIONS.map((c) => (
                    <button
                      key={c.name}
                      type="button"
                      disabled={saving}
                      onClick={() => setColor(c.value)}
                      className={`w-7 h-7 rounded-full border-2 transition-all flex items-center justify-center cursor-pointer ${
                        color === c.value 
                          ? 'border-[var(--accent)] scale-110 shadow-md' 
                          : 'border-transparent hover:scale-105'
                      }`}
                      style={{ 
                        backgroundColor: c.value || 'var(--surface-2)', 
                        borderStyle: c.value ? 'solid' : 'dashed', 
                        borderColor: c.value ? (color === c.value ? 'var(--accent)' : 'rgba(0,0,0,0.15)') : 'var(--border)' 
                      }}
                      title={c.name}
                    >
                      {color === c.value && (
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={c.value ? 'white' : 'currentColor'} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-2.5 pt-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  disabled={saving}
                  className="flex-1 py-2 border border-[var(--border)] rounded-xl text-xs font-semibold hover:bg-[var(--surface-2)] transition-colors cursor-pointer text-[var(--text-secondary)]"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-2 bg-[var(--accent)] text-[var(--accent-fg)] rounded-xl text-xs font-semibold hover:opacity-90 transition-opacity cursor-pointer"
                >
                  {saving ? 'Membuat...' : 'Buat Folder'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Note Modal (Liquid Glass Style Card with Solid Theme Background) */}
      {showNoteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-md transition-opacity" onClick={() => setShowNoteModal(false)} />
          <div className="relative bg-[var(--surface)] border border-[var(--border)] w-full max-w-sm rounded-2xl p-5 shadow-2xl animate-fadeIn flex flex-col max-h-[85vh] z-50 my-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-2 border-b border-[var(--border)] flex-shrink-0">
              <h3 className="font-bold text-sm text-[var(--text-primary)]">Unggah Catatan Baru</h3>
              <button onClick={() => setShowNoteModal(false)} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] p-1 transition-colors">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>

            {/* Scrollable Form Body */}
            <form onSubmit={handleCreateNoteSubmit} className="flex-1 overflow-y-auto py-3 space-y-4 pr-1 text-left scrollbar-thin">
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-bold text-[var(--text-secondary)]">Judul Catatan</label>
                <input
                  value={noteTitle}
                  onChange={(e) => setNoteTitle(e.target.value)}
                  placeholder="Contoh: Aljabar - Bab 3"
                  required
                  disabled={noteProcessing}
                  className="w-full px-3 py-2 bg-[var(--surface-2)] border border-[var(--border)] rounded-xl text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)] transition-all"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-bold text-[var(--text-secondary)]">Folder</label>
                <select
                  value={noteFolderId}
                  onChange={(e) => setNoteFolderId(e.target.value)}
                  disabled={noteProcessing}
                  className="w-full px-3 py-2 bg-[var(--surface-2)] border border-[var(--border)] rounded-xl text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)] transition-all cursor-pointer"
                >
                  <option value="">Tanpa Folder (Root)</option>
                  {folders.map((f) => {
                    let displayName = f.name;
                    if (f.name && f.name.startsWith('{')) {
                      try { displayName = JSON.parse(f.name).name; } catch(e) {}
                    }
                    return (
                      <option key={f.id} value={f.id}>{displayName}</option>
                    );
                  })}
                </select>
              </div>

              {noteImages.length === 0 && (
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-bold text-[var(--text-secondary)]">
                    Gambar Catatan <span className="text-[var(--text-muted)] font-normal">(Unggah berurutan)</span>
                  </label>
                  
                  <div
                    onClick={() => !noteProcessing && noteFileInputRef.current?.click()}
                    className="border border-dashed border-[var(--border)] rounded-xl p-4 text-center cursor-pointer hover:border-[var(--text-muted)] hover:bg-[var(--surface-2)] transition-all"
                  >
                    <svg className="mx-auto text-[var(--text-muted)] mb-1.5" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                    <p className="text-[10px] font-medium text-[var(--text-secondary)]">Ketuk untuk memilih foto catatan</p>
                    <p className="text-[9px] text-[var(--text-muted)] mt-0.5">Mendukung banyak gambar sekaligus</p>
                  </div>
                </div>
              )}

              {/* Hidden file input (placed outside conditional wrapper to prevent unmounting/destruction) */}
              <input
                type="file"
                accept="image/*"
                multiple
                ref={noteFileInputRef}
                onChange={(e) => {
                  if (e.target.files) {
                    handleAddImages(e.target.files);
                  }
                  e.target.value = ''; // Reset value to allow selecting same images again
                }}
                className="hidden"
                disabled={noteProcessing}
              />

              {/* Image Previews Grid */}
              {noteImages.length > 0 && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-bold text-[var(--text-secondary)]">
                    Gambar Catatan <span className="text-[var(--text-muted)] font-normal">(Unggah berurutan)</span>
                  </label>
                  <div className="grid grid-cols-3 gap-2 pt-0.5">
                    {noteImages.map((img, i) => (
                      <div key={img.id} className="relative aspect-[3/4] rounded-xl overflow-hidden border border-[var(--border)] group bg-[var(--surface-2)]">
                        <img src={img.preview} alt="" className="w-full h-full object-cover" />
                        <span className="absolute top-1 left-1 bg-black/60 text-white text-[9px] font-bold px-1 py-0.25 rounded">#{i + 1}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveImage(img.id)}
                          className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-lg opacity-90 hover:opacity-100 transition-opacity shadow"
                        >
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                        </button>
                      </div>
                    ))}
                    <div
                      onClick={() => !noteProcessing && noteFileInputRef.current?.click()}
                      className="aspect-[3/4] border border-dashed border-[var(--border)] rounded-xl flex flex-col items-center justify-center cursor-pointer hover:bg-[var(--surface-2)] transition-all"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--text-muted)]"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                      <span className="text-[9px] text-[var(--text-muted)] mt-0.5">Tambah</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Premium Audio Section (Locked) */}
              <div className="p-3 bg-[var(--surface-2)] border border-[var(--border)] rounded-xl text-left flex flex-col gap-2">
                <div className="flex items-center justify-between gap-2.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-7 h-7 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="22"/></svg>
                    </div>
                    <div className="min-w-0">
                      <p className="text-[11px] font-bold text-[var(--text-primary)] leading-tight">Unggah Rekaman Suara</p>
                      <p className="text-[9px] text-[var(--text-muted)] truncate max-w-[150px]">Transkripsi rekaman otomatis</p>
                    </div>
                  </div>
                  <span className="text-[8px] font-bold bg-amber-150 text-amber-700 px-1.5 py-0.5 rounded-full flex-shrink-0">PREMIUM</span>
                </div>
                <button disabled className="w-full py-1.5 rounded-xl border border-dashed border-amber-300 text-[9px] font-bold text-amber-600 bg-amber-50/50 cursor-not-allowed opacity-70 flex items-center justify-center gap-1">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                  Upgrade untuk Buka Audio
                </button>
              </div>

              {noteError && (
                <div className="px-3 py-2 bg-red-50 border border-red-200 text-red-700 text-[10px] rounded-xl">
                  {noteError}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-2 pt-2 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => setShowNoteModal(false)}
                  disabled={noteProcessing}
                  className="flex-1 py-2 border border-[var(--border)] rounded-xl text-xs font-semibold hover:bg-[var(--surface-2)] transition-colors cursor-pointer text-[var(--text-secondary)]"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={noteProcessing || noteImages.length === 0}
                  className="flex-1 py-2 bg-[var(--accent)] text-[var(--accent-fg)] rounded-xl text-xs font-semibold hover:opacity-90 transition-opacity cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  {noteProcessing ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Proses...</span>
                    </>
                  ) : (
                    <>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
                      <span>Ekstrak Teks</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

// Icon components
function HomeIcon() { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>; }
function FolderIcon() { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>; }
function TagIcon() { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>; }
function ExamIcon() { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>; }
function StarIcon() { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>; }
function SettingsIcon() { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>; }
function LogoutIcon() { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>; }
function ChatIcon() { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>; }
