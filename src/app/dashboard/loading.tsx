export default function DashboardLoading() {
  return (
    <div>
      <div className="h-10 w-48 bg-foreground/10 rounded-xl animate-pulse mb-8"></div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="border border-foreground/10 rounded-2xl overflow-hidden bg-background flex flex-col h-64 shadow-sm animate-pulse">
            <div className="h-32 bg-foreground/10 border-b border-foreground/5"></div>
            <div className="p-4 flex-1 flex flex-col gap-3">
              <div className="h-4 w-24 bg-foreground/10 rounded"></div>
              <div className="h-4 w-full bg-foreground/10 rounded"></div>
              <div className="h-4 w-5/6 bg-foreground/10 rounded"></div>
              <div className="h-4 w-4/6 bg-foreground/10 rounded"></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
