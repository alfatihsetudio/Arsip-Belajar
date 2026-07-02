export function showAlert(message: string): Promise<void> {
  return new Promise((resolve) => {
    if (typeof document === 'undefined') {
      resolve();
      return;
    }

    const backdrop = document.createElement('div');
    backdrop.className = 'fixed inset-0 bg-black/60 backdrop-blur-sm z-[99999] flex items-center justify-center p-4 animate-fadeIn';
    
    const modal = document.createElement('div');
    modal.className = 'bg-[var(--surface)] border border-[var(--border)] w-full max-w-sm rounded-2xl p-5 shadow-2xl space-y-4 text-left';
    
    modal.innerHTML = `
      <div class="flex items-center gap-2 pb-2 border-b border-[var(--border)]">
        <div class="w-6 h-6 rounded-lg bg-amber-100 flex items-center justify-center text-xs">🔔</div>
        <h3 class="font-bold text-sm text-[var(--text-primary)]">Notifikasi</h3>
      </div>
      <p class="text-xs text-[var(--text-secondary)] leading-relaxed whitespace-pre-wrap">${message}</p>
      <div class="flex justify-end pt-2">
        <button class="px-4 py-2 bg-[var(--accent)] text-[var(--accent-fg)] rounded-xl text-xs font-semibold hover:opacity-90 transition-all cursor-pointer shadow-sm">
          OK
        </button>
      </div>
    `;
    
    backdrop.appendChild(modal);
    document.body.appendChild(backdrop);
    
    const btn = modal.querySelector('button');
    btn?.focus();
    btn?.addEventListener('click', () => {
      document.body.removeChild(backdrop);
      resolve();
    });
  });
}

export function showConfirm(message: string): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof document === 'undefined') {
      resolve(false);
      return;
    }

    const backdrop = document.createElement('div');
    backdrop.className = 'fixed inset-0 bg-black/60 backdrop-blur-sm z-[99999] flex items-center justify-center p-4 animate-fadeIn';
    
    const modal = document.createElement('div');
    modal.className = 'bg-[var(--surface)] border border-[var(--border)] w-full max-w-sm rounded-2xl p-5 shadow-2xl space-y-4 text-left';
    
    modal.innerHTML = `
      <div class="flex items-center gap-2 pb-2 border-b border-[var(--border)]">
        <div class="w-6 h-6 rounded-lg bg-amber-100 flex items-center justify-center text-xs">❓</div>
        <h3 class="font-bold text-sm text-[var(--text-primary)]">Konfirmasi</h3>
      </div>
      <p class="text-xs text-[var(--text-secondary)] leading-relaxed whitespace-pre-wrap">${message}</p>
      <div class="flex gap-2.5 pt-2">
        <button id="btn-cancel" class="flex-1 py-2 border border-[var(--border)] rounded-xl text-xs font-semibold hover:bg-[var(--surface-2)] transition-colors cursor-pointer text-[var(--text-secondary)]">
          Batal
        </button>
        <button id="btn-confirm" class="flex-1 py-2 bg-[var(--accent)] text-[var(--accent-fg)] rounded-xl text-xs font-semibold hover:opacity-90 transition-opacity cursor-pointer shadow-sm">
          Setuju
        </button>
      </div>
    `;
    
    backdrop.appendChild(modal);
    document.body.appendChild(backdrop);
    
    const btnCancel = modal.querySelector('#btn-cancel') as HTMLButtonElement;
    const btnConfirm = modal.querySelector('#btn-confirm') as HTMLButtonElement;
    
    btnConfirm?.focus();
    
    btnCancel?.addEventListener('click', () => {
      document.body.removeChild(backdrop);
      resolve(false);
    });
    
    btnConfirm?.addEventListener('click', () => {
      document.body.removeChild(backdrop);
      resolve(true);
    });
  });
}
