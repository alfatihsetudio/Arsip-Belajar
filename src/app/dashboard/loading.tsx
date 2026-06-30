export default function DashboardLoading() {
  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="h-8 w-36 bg-[var(--surface-2)] rounded-xl" />
        <div className="h-9 w-28 bg-[var(--surface-2)] rounded-xl" />
      </div>
      <div className="h-11 bg-[var(--surface-2)] rounded-xl" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1,2,3,4,5,6].map(i => (
          <div key={i} className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl overflow-hidden">
            <div className="h-36 bg-[var(--surface-2)]" />
            <div className="p-4 space-y-2">
              <div className="h-5 bg-[var(--surface-2)] rounded w-3/4" />
              <div className="h-4 bg-[var(--surface-2)] rounded" />
              <div className="h-4 bg-[var(--surface-2)] rounded w-4/5" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
