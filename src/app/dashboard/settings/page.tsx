import { createClient } from '@/lib/supabase/server';

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <div className="max-w-xl mx-auto animate-fadeIn">
      <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-6">Settings</h1>

      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl divide-y divide-[var(--border)]">
        <div className="p-5">
          <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-3">Profile</p>
          <div className="flex items-center gap-4">
            {user?.user_metadata?.avatar_url ? (
              <img src={user.user_metadata.avatar_url} alt="Avatar" className="w-12 h-12 rounded-full" />
            ) : (
              <div className="w-12 h-12 rounded-full bg-[var(--surface-2)] flex items-center justify-center text-lg font-bold text-[var(--text-secondary)]">
                {(user?.email || 'U')[0].toUpperCase()}
              </div>
            )}
            <div>
              <p className="font-semibold text-[var(--text-primary)]">{user?.user_metadata?.full_name || 'User'}</p>
              <p className="text-sm text-[var(--text-muted)]">{user?.email}</p>
            </div>
          </div>
        </div>

        <div className="p-5">
          <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-3">Account</p>
          <div className="space-y-3 text-sm text-[var(--text-secondary)]">
            <div className="flex items-center justify-between">
              <span>Member since</span>
              <span className="font-medium text-[var(--text-primary)]">
                {user?.created_at ? new Date(user.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'long' }) : '—'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span>Auth provider</span>
              <span className="font-medium text-[var(--text-primary)] capitalize">Google</span>
            </div>
          </div>
        </div>

        <div className="p-5">
          <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-3">App</p>
          <div className="space-y-2 text-sm text-[var(--text-secondary)]">
            <div className="flex items-center justify-between">
              <span>Version</span>
              <span className="font-mono text-xs bg-[var(--surface-2)] px-2 py-0.5 rounded">2.0.0-beta</span>
            </div>
            <div className="flex items-center justify-between">
              <span>AI Engine</span>
              <span className="font-mono text-xs bg-[var(--surface-2)] px-2 py-0.5 rounded">gemini-flash-lite</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
