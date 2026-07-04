'use client';

import { useState, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';

// ─── Types ───────────────────────────────────────────────────────────────────

interface SettingsClientProps {
  user: {
    id: string;
    email: string;
    full_name: string;
    avatar_url: string;
    created_at: string;
    provider: string;
    education_level?: string;
  };
  stats: {
    noteCount: number;
    folderCount: number;
    storageMB: number;
  };
}

// ─── Reusable Sub-components ─────────────────────────────────────────────────

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl overflow-hidden">
      <div className="px-5 py-3.5 border-b border-[var(--border)]">
        <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">{title}</p>
      </div>
      <div className="p-5 space-y-4">{children}</div>
    </div>
  );
}

function SettingsRow({ label, sub, children }: { label: string; sub?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-[var(--text-primary)]">{label}</p>
        {sub && <p className="text-[11px] text-[var(--text-muted)] mt-0.5">{sub}</p>}
      </div>
      <div className="flex-shrink-0">{children}</div>
    </div>
  );
}

function StyledSelect({ value, onChange, options, disabled }: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string; disabled?: boolean }[];
  disabled?: boolean;
}) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      disabled={disabled}
      className="bg-[var(--surface-2)] border border-[var(--border)] text-[var(--text-primary)] text-xs font-semibold rounded-xl px-3 py-1.5 focus:outline-none focus:border-[var(--accent)] transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {options.map(o => (
        <option key={o.value} value={o.value} disabled={o.disabled}>{o.label}</option>
      ))}
    </select>
  );
}

// ─── Delete Confirmation Modal ────────────────────────────────────────────────

function DeleteAccountModal({ onClose, onConfirm }: { onClose: () => void; onConfirm: () => void }) {
  const [confirmText, setConfirmText] = useState('');
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={onClose} />
      <div className="relative bg-[var(--surface)] border border-red-500/30 w-full max-w-sm rounded-2xl p-6 shadow-2xl animate-fadeIn z-50 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center flex-shrink-0">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
          </div>
          <div>
            <h3 className="font-bold text-sm text-[var(--text-primary)]">Hapus Akun?</h3>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">Tindakan ini tidak dapat dibatalkan.</p>
          </div>
        </div>
        <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
          Semua catatan, folder, dan data Anda akan dihapus permanen. Ketik{' '}
          <span className="font-bold text-red-400">HAPUS</span> untuk melanjutkan.
        </p>
        <input
          value={confirmText}
          onChange={e => setConfirmText(e.target.value)}
          placeholder="Ketik HAPUS untuk konfirmasi"
          className="w-full px-3 py-2 bg-[var(--surface-2)] border border-[var(--border)] rounded-xl text-xs text-[var(--text-primary)] focus:outline-none focus:border-red-500 transition-all"
        />
        <div className="flex gap-2 pt-1">
          <button onClick={onClose} className="flex-1 py-2 border border-[var(--border)] rounded-xl text-xs font-semibold text-[var(--text-secondary)] hover:bg-[var(--surface-2)] transition-colors cursor-pointer">
            Batal
          </button>
          <button
            onClick={onConfirm}
            disabled={confirmText !== 'HAPUS'}
            className="flex-1 py-2 bg-red-500 text-white rounded-xl text-xs font-semibold hover:bg-red-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            Hapus Akun
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── About Owner Modal ────────────────────────────────────────────────────────

function AboutOwnerModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={onClose} />
      <div className="relative bg-[var(--surface)] border border-[var(--border)] w-full max-w-sm rounded-2xl p-6 shadow-2xl animate-fadeIn z-50 space-y-5">
        {/* Close button */}
        <button onClick={onClose} className="absolute top-4 right-4 text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer transition-colors">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>

        {/* Avatar + name */}
        <div className="flex flex-col items-center text-center gap-3">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[var(--accent)] to-purple-500 flex items-center justify-center text-white text-3xl font-extrabold shadow-lg select-none">
            A
          </div>
          <div>
            <h3 className="text-base font-extrabold text-[var(--text-primary)]">Alfatih</h3>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">Pembuat Arsip Belajar</p>
          </div>
        </div>

        {/* Bio */}
        <p className="text-xs text-[var(--text-secondary)] leading-relaxed text-center">
          Mahasiswa yang gemar memadukan teknologi AI dengan alat produktivitas. Arsip Belajar
          awalnya dikembangkan dari pengalaman pribadi untuk menyusun dan merangkum materi
          perkuliahan, dan kini diwujudkan untuk membantu pelajar serta mahasiswa lain mengelola
          catatan dengan lebih rapi, cerdas, dan efisien.
        </p>

        {/* Facts */}
        <div className="space-y-2">
          {[
            { icon: '🎓', label: 'STATUS', value: 'Mahasiswa / Telkom University' },
            { icon: '🛠️', label: 'STACK', value: 'Next.js, Supabase, Gemini AI' },
            { icon: '📍', label: 'LOKASI', value: 'Bandung, Indonesia' },
            { icon: '📸', label: 'INSTAGRAM', value: '@rg_alfatih' },
          ].map(item => (
            <div key={item.label} className="flex items-center gap-3 px-3 py-2.5 bg-[var(--surface-2)] rounded-xl border border-[var(--border)]">
              <span className="text-base flex-shrink-0">{item.icon}</span>
              <div className="min-w-0">
                <p className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-widest">{item.label}</p>
                <p className="text-xs font-semibold text-[var(--text-primary)] mt-0.5">{item.value}</p>
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={onClose}
          className="w-full py-2 border border-[var(--border)] rounded-xl text-xs font-bold text-[var(--text-secondary)] hover:bg-[var(--surface-2)] transition-colors cursor-pointer"
        >
          Tutup
        </button>
      </div>
    </div>
  );
}

// ─── Storage Bar ──────────────────────────────────────────────────────────────

function StorageBar({ usedMB, limitMB }: { usedMB: number; limitMB: number }) {
  const pct = Math.min((usedMB / limitMB) * 100, 100);
  const color = pct > 85 ? '#ef4444' : pct > 60 ? '#f59e0b' : 'var(--accent)';
  const display = usedMB < 1 ? `${(usedMB * 1024).toFixed(0)} KB` : `${usedMB.toFixed(1)} MB`;
  const limit = limitMB >= 1024 ? `${limitMB / 1024} GB` : `${limitMB} MB`;
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-[11px] text-[var(--text-muted)]">
        <span>{display} digunakan</span>
        <span>{limit} total</span>
      </div>
      <div className="h-2 bg-[var(--surface-2)] rounded-full overflow-hidden border border-[var(--border)]">
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
      <p className="text-[10px] text-[var(--text-muted)]">{pct.toFixed(1)}% terpakai</p>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function SettingsClient({ user, stats }: SettingsClientProps) {
  const supabase = createClient();

  // Profile state — seed from server-fetched user data
  const [displayName, setDisplayName] = useState(user.full_name || '');
  const [eduLevel, setEduLevel] = useState(user.education_level || '');
  const [avatarPreview, setAvatarPreview] = useState(user.avatar_url || '');
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);
  const [profileError, setProfileError] = useState('');
  const avatarInputRef = useRef<HTMLInputElement>(null);

  // AI Preferences
  const [aiEngine, setAiEngine] = useState('gemini-flash-lite');
  const [aiLang, setAiLang] = useState('auto');
  const [aiSaved, setAiSaved] = useState(false);
  const isFreePlan = true;

  // Modals & actions
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showAboutModal, setShowAboutModal] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportDone, setExportDone] = useState(false);

  // Active tab
  const [activeTab, setActiveTab] = useState<'profile' | 'account' | 'app' | 'billing'>('profile');

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      if (ev.target?.result) setAvatarPreview(ev.target.result as string);
    };
    reader.readAsDataURL(file);
    // TODO: supabase.storage.from('avatars').upload(`${user.id}.${ext}`, file)
    // then call supabase.auth.updateUser({ data: { avatar_url: publicUrl } })
  };

  const handleUpdateProfile = async () => {
    setProfileSaving(true);
    setProfileError('');
    const { error } = await supabase.auth.updateUser({
      data: {
        full_name: displayName.trim(),
        education_level: eduLevel,
      },
    });
    setProfileSaving(false);
    if (error) {
      setProfileError(error.message);
    } else {
      setProfileSaved(true);
      setTimeout(() => setProfileSaved(false), 2500);
    }
  };

  const handleExportData = async () => {
    setExporting(true);
    setExportDone(false);
    try {
      const res = await fetch('/api/export');
      if (!res.ok) throw new Error('Gagal mengambil data ekspor.');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `arsip-belajar-export-${Date.now()}.html`;
      a.click();
      URL.revokeObjectURL(url);
      setExportDone(true);
      setTimeout(() => setExportDone(false), 3000);
    } catch (err: any) {
      alert(err.message || 'Terjadi kesalahan saat ekspor.');
    } finally {
      setExporting(false);
    }
  };

  const handleDeleteAccount = async () => {
    // TODO: call your API route that deletes user data, then sign out
    // e.g. await fetch('/api/account/delete', { method: 'DELETE' })
    console.log('[TODO] Delete account:', user.id);
    setShowDeleteModal(false);
    alert('Fitur hapus akun perlu disambungkan ke API backend Anda.');
  };

  const handleSaveAIPrefs = async () => {
    // TODO: store aiEngine & aiLang in user metadata or a preferences table
    await supabase.auth.updateUser({ data: { ai_engine: aiEngine, ai_language: aiLang } });
    setAiSaved(true);
    setTimeout(() => setAiSaved(false), 2000);
  };

  // ── Tabs ──────────────────────────────────────────────────────────────────

  const tabs: { key: typeof activeTab; label: string; icon: React.ReactNode }[] = [
    { key: 'profile', label: 'Profil', icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg> },
    { key: 'account', label: 'Akun', icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg> },
    { key: 'app', label: 'AI & App', icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/><path d="M4.93 4.93a10 10 0 0 0 0 14.14"/></svg> },
    { key: 'billing', label: 'Langganan', icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg> },
  ];

  return (
    <div className="max-w-2xl mx-auto animate-fadeIn pb-24 space-y-5">
      {/* Page header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-[var(--text-primary)]">Pengaturan</h1>
        <p className="text-[11px] sm:text-sm text-[var(--text-muted)] mt-0.5">Kelola profil, preferensi, dan langganan Anda.</p>
      </div>

      {/* Tab bar */}
      <div className="flex bg-[var(--surface-2)] p-1 rounded-2xl border border-[var(--border)] gap-1 overflow-x-auto">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl text-[11px] sm:text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
              activeTab === tab.key
                ? 'bg-[var(--bg)] text-[var(--text-primary)] shadow-sm'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── PROFILE ─────────────────────────────────────────────────────────── */}
      {activeTab === 'profile' && (
        <SectionCard title="Profil Saya">
          {/* Avatar */}
          <div className="flex items-center gap-4">
            <div className="relative flex-shrink-0">
              {avatarPreview ? (
                <img src={avatarPreview} alt="Avatar" className="w-16 h-16 rounded-2xl object-cover border-2 border-[var(--border)]" />
              ) : (
                <div className="w-16 h-16 rounded-2xl bg-[var(--surface-2)] border-2 border-[var(--border)] flex items-center justify-center text-2xl font-bold text-[var(--text-secondary)]">
                  {(user.full_name || user.email || 'U')[0].toUpperCase()}
                </div>
              )}
              <button
                onClick={() => avatarInputRef.current?.click()}
                className="absolute -bottom-1.5 -right-1.5 w-6 h-6 bg-[var(--accent)] text-[var(--accent-fg)] rounded-full flex items-center justify-center shadow-md hover:opacity-90 transition-opacity cursor-pointer"
                title="Ganti foto"
              >
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              </button>
              <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
            </div>
            <div className="min-w-0">
              <p className="font-bold text-sm text-[var(--text-primary)] truncate">{user.full_name || 'Pengguna'}</p>
              <p className="text-[11px] text-[var(--text-muted)] truncate">{user.email}</p>
              <button onClick={() => avatarInputRef.current?.click()} className="text-[10px] text-[var(--accent)] hover:underline mt-1 cursor-pointer font-semibold">
                Ubah foto profil
              </button>
            </div>
          </div>

          {/* Display Name */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Nama Tampilan</label>
            <input
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              placeholder="Nama Anda"
              className="w-full px-3 py-2 bg-[var(--surface-2)] border border-[var(--border)] rounded-xl text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)] transition-all"
            />
          </div>

          {/* Email (read-only) */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Email</label>
            <div className="w-full px-3 py-2 bg-[var(--surface-2)] border border-[var(--border)] rounded-xl text-sm text-[var(--text-muted)] flex items-center justify-between gap-2">
              <span className="truncate">{user.email}</span>
              <span className="text-[9px] bg-[var(--surface)] border border-[var(--border)] px-2 py-0.5 rounded-md font-semibold flex-shrink-0">Google</span>
            </div>
          </div>

          {/* Education Level */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Jenjang Pendidikan</label>
            <select
              value={eduLevel}
              onChange={e => setEduLevel(e.target.value)}
              className="w-full px-3 py-2 bg-[var(--surface-2)] border border-[var(--border)] rounded-xl text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)] transition-all cursor-pointer"
            >
              <option value="">— Pilih jenjang —</option>
              <option value="SMP">SMP / MTs</option>
              <option value="SMA">SMA / MA</option>
              <option value="SMK">SMK</option>
              <option value="Kuliah">Kuliah / Mahasiswa</option>
              <option value="Umum">Umum / Profesional</option>
            </select>
          </div>

          {/* Error message */}
          {profileError && (
            <p className="text-xs text-red-500 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">{profileError}</p>
          )}

          {/* Save button */}
          <button
            onClick={handleUpdateProfile}
            disabled={profileSaving || !displayName.trim()}
            className="w-full py-2.5 bg-[var(--accent)] text-[var(--accent-fg)] rounded-xl text-sm font-bold hover:opacity-90 transition-all disabled:opacity-60 cursor-pointer flex items-center justify-center gap-2"
          >
            {profileSaving ? (
              <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Menyimpan...</>
            ) : profileSaved ? (
              <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>Tersimpan!</>
            ) : 'Simpan Profil'}
          </button>
        </SectionCard>
      )}

      {/* ── ACCOUNT ─────────────────────────────────────────────────────────── */}
      {activeTab === 'account' && (
        <div className="space-y-4">
          <SectionCard title="Informasi Akun">
            <SettingsRow label="Member sejak">
              <span className="text-xs font-semibold text-[var(--text-primary)]">
                {user.created_at ? new Date(user.created_at).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' }) : '—'}
              </span>
            </SettingsRow>
            <SettingsRow label="Provider autentikasi">
              <span className="text-xs bg-[var(--surface-2)] border border-[var(--border)] px-2.5 py-1 rounded-xl font-semibold capitalize">
                {user.provider || 'Google'}
              </span>
            </SettingsRow>
            <SettingsRow label="Total catatan" sub="Catatan yang tersimpan di akun Anda">
              <span className="text-xs font-bold text-[var(--accent)]">{stats.noteCount}</span>
            </SettingsRow>
            <SettingsRow label="Total folder">
              <span className="text-xs font-bold text-[var(--accent)]">{stats.folderCount}</span>
            </SettingsRow>
          </SectionCard>

          <SectionCard title="Data & Privasi">
            <div className="space-y-1">
              <SettingsRow label="Ekspor Data" sub="Unduh semua catatan sebagai file HTML — buka langsung di browser.">
                <button
                  onClick={handleExportData}
                  disabled={exporting}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--surface-2)] border border-[var(--border)] rounded-xl text-xs font-bold text-[var(--text-primary)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition-all disabled:opacity-60 cursor-pointer"
                >
                  {exporting ? (
                    <><span className="w-3 h-3 border-2 border-[var(--text-muted)]/30 border-t-[var(--accent)] rounded-full animate-spin" />Memproses...</>
                  ) : exportDone ? (
                    <><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>Selesai!</>
                  ) : (
                    <><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>Ekspor (.html)</>
                  )}
                </button>
              </SettingsRow>
              <p className="text-[10px] text-[var(--text-muted)] pl-0 pt-0.5">
                File HTML bisa dibuka langsung di Chrome / Safari / Firefox tanpa aplikasi tambahan.
              </p>
            </div>
          </SectionCard>

          {/* Danger zone */}
          <div className="bg-red-500/5 border border-red-500/20 rounded-2xl overflow-hidden">
            <div className="px-5 py-3.5 border-b border-red-500/10">
              <p className="text-[10px] font-bold text-red-400 uppercase tracking-widest">Zona Berbahaya</p>
            </div>
            <div className="p-5">
              <SettingsRow label="Hapus Akun" sub="Menghapus semua data Anda secara permanen. Tidak dapat dibatalkan.">
                <button
                  onClick={() => setShowDeleteModal(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 border border-red-500/30 rounded-xl text-xs font-bold text-red-500 hover:bg-red-500 hover:text-white transition-all cursor-pointer"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                  Hapus Akun
                </button>
              </SettingsRow>
            </div>
          </div>
        </div>
      )}

      {/* ── APP & AI ────────────────────────────────────────────────────────── */}
      {activeTab === 'app' && (
        <div className="space-y-4">
          <SectionCard title="Penggunaan Penyimpanan">
            <StorageBar usedMB={stats.storageMB} limitMB={1024} />
            <p className="text-[11px] text-[var(--text-muted)]">Dihitung dari ukuran gambar catatan yang Anda unggah.</p>
          </SectionCard>

          <SectionCard title="Preferensi AI">
            <SettingsRow
              label="AI Engine"
              sub={isFreePlan ? 'Upgrade ke Premium untuk Gemini Pro' : 'Model AI yang digunakan untuk semua fitur'}
            >
              <StyledSelect
                value={aiEngine}
                onChange={setAiEngine}
                options={[
                  { value: 'gemini-flash-lite', label: 'Gemini Flash Lite' },
                  { value: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash' },
                  { value: 'gemini-pro', label: `Gemini Pro${isFreePlan ? ' 🔒' : ''}`, disabled: isFreePlan },
                ]}
              />
            </SettingsRow>

            {isFreePlan && (
              <div className="flex items-center gap-2 px-3 py-2 bg-amber-500/10 border border-amber-500/20 rounded-xl text-[11px] text-amber-600">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                <span><strong>Gemini Pro</strong> tersedia di paket Premium.</span>
              </div>
            )}

            <SettingsRow label="Bahasa Respons AI" sub="Bahasa yang digunakan AI saat membalas">
              <StyledSelect
                value={aiLang}
                onChange={setAiLang}
                options={[
                  { value: 'auto', label: 'Auto (Deteksi)' },
                  { value: 'id', label: 'Bahasa Indonesia' },
                  { value: 'en', label: 'English' },
                ]}
              />
            </SettingsRow>

            <button
              onClick={handleSaveAIPrefs}
              className="w-full py-2 bg-[var(--surface-2)] border border-[var(--border)] rounded-xl text-xs font-bold text-[var(--text-primary)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition-all cursor-pointer flex items-center justify-center gap-1.5"
            >
              {aiSaved ? (
                <><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>Preferensi Disimpan!</>
              ) : 'Simpan Preferensi AI'}
            </button>
          </SectionCard>

          <SectionCard title="Informasi Aplikasi">
            <SettingsRow label="Versi Aplikasi">
              <span className="font-mono text-xs bg-[var(--surface-2)] border border-[var(--border)] px-2.5 py-1 rounded-xl">v0.0.3</span>
            </SettingsRow>
            <div className="pt-1">
              <button
                onClick={() => setShowAboutModal(true)}
                className="w-full flex items-center justify-between px-3 py-2.5 bg-[var(--surface-2)] border border-[var(--border)] rounded-xl hover:border-[var(--accent)] transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[var(--accent)] to-purple-500 flex items-center justify-center flex-shrink-0">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="white" stroke="none"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/></svg>
                  </div>
                  <div className="text-left">
                    <p className="text-xs font-bold text-[var(--text-primary)]">Tentang Pembuat</p>
                  </div>
                </div>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--text-muted)] group-hover:text-[var(--accent)] transition-colors"><path d="m9 18 6-6-6-6"/></svg>
              </button>
            </div>
          </SectionCard>
        </div>
      )}

      {/* ── BILLING ─────────────────────────────────────────────────────────── */}
      {activeTab === 'billing' && (
        <div className="space-y-4">
          <div className="bg-gradient-to-br from-[var(--surface)] to-[var(--surface-2)] border border-[var(--border)] rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest mb-1">Paket Saat Ini</p>
                <p className="text-2xl font-extrabold text-[var(--text-primary)]">Gratis</p>
                <p className="text-xs text-[var(--text-muted)] mt-0.5">Paket dasar dengan fitur terbatas.</p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-[var(--surface-2)] border border-[var(--border)] flex items-center justify-center">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--text-muted)]">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                </svg>
              </div>
            </div>
            <ul className="space-y-2 text-xs text-[var(--text-secondary)]">
              {[
                { ok: true, label: 'Hingga 50 catatan' },
                { ok: true, label: 'Ringkasan & Flashcard AI' },
                { ok: true, label: '1 GB penyimpanan gambar' },
                { ok: false, label: 'Gemini Pro (model terbaik)' },
                { ok: false, label: 'Ujian & analisis mendalam' },
                { ok: false, label: 'Prioritas dukungan' },
              ].map((item, i) => (
                <li key={i} className={`flex items-center gap-2 ${!item.ok ? 'opacity-40' : ''}`}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={item.ok ? 'var(--accent)' : 'currentColor'} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    {item.ok ? <polyline points="20 6 9 17 4 12"/> : <><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>}
                  </svg>
                  {item.label}
                </li>
              ))}
            </ul>
          </div>

          <div className="relative bg-gradient-to-br from-amber-500/10 via-[var(--surface)] to-purple-500/10 border border-amber-500/30 rounded-2xl p-5 overflow-hidden space-y-4">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-amber-500/10 to-transparent rounded-bl-full pointer-events-none" />
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center flex-shrink-0 shadow-md">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="white" stroke="none"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
              </div>
              <div>
                <p className="font-extrabold text-sm text-[var(--text-primary)]">Upgrade ke Premium</p>
                <p className="text-[11px] text-[var(--text-muted)] mt-0.5">Akses penuh semua fitur AI tanpa batas.</p>
              </div>
            </div>
            <button
              onClick={() => { window.location.href = '/dashboard/subscription'; }}
              className="w-full py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white rounded-xl text-sm font-extrabold transition-all shadow-md hover:shadow-lg cursor-pointer flex items-center justify-center gap-2"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
              Mulai Premium Sekarang
            </button>
          </div>
        </div>
      )}

      {/* Modals */}
      {showDeleteModal && (
        <DeleteAccountModal onClose={() => setShowDeleteModal(false)} onConfirm={handleDeleteAccount} />
      )}
      {showAboutModal && (
        <AboutOwnerModal onClose={() => setShowAboutModal(false)} />
      )}
    </div>
  );
}
