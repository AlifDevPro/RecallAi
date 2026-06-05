export function MockGeneratingSkeleton() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-16 animate-pulse text-center">
      <div className="size-14 rounded-2xl bg-primary/20 mx-auto mb-4" />
      <div className="h-6 w-48 bg-surface-raised rounded mx-auto mb-2" />
      <div className="h-4 w-64 bg-surface-raised rounded mx-auto" />
    </div>
  );
}

export function ExamSkeleton() {
  return (
    <div className="min-h-screen bg-background animate-pulse">
      <div className="h-14 border-b border-border/40 bg-surface-dim/60 px-6 flex items-center justify-between">
        <div className="h-4 w-32 bg-surface-raised rounded" />
        <div className="h-8 w-24 bg-surface-raised rounded-lg" />
      </div>
      <div className="max-w-2xl mx-auto p-8 space-y-4">
        <div className="h-4 w-40 bg-surface-raised rounded" />
        <div className="h-8 w-full bg-surface-raised rounded" />
        <div className="h-48 bg-surface rounded-2xl border border-border/20" />
      </div>
    </div>
  );
}

export function MockHubSkeleton() {
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-10 py-8 space-y-10 animate-pulse">
      <div className="h-10 w-96 bg-surface-raised rounded" />
      <div className="grid md:grid-cols-2 gap-4">
        <div className="h-48 bg-surface rounded-2xl" />
        <div className="h-48 bg-surface rounded-2xl" />
      </div>
      <div className="h-32 bg-surface rounded-2xl" />
    </div>
  );
}

export function MockHistorySkeleton() {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6 animate-pulse">
      <div className="h-8 w-48 bg-surface-raised rounded" />
      <div className="grid sm:grid-cols-3 gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-20 bg-surface rounded-xl" />
        ))}
      </div>
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="h-16 bg-surface rounded-xl" />
      ))}
    </div>
  );
}

export function ResultSkeleton() {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-8 animate-pulse">
      <div className="h-48 bg-surface rounded-2xl" />
      <div className="grid lg:grid-cols-2 gap-4">
        <div className="h-40 bg-surface rounded-2xl" />
        <div className="h-40 bg-surface rounded-2xl" />
      </div>
    </div>
  );
}
