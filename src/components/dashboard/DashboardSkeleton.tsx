import { Sidebar } from "@/components/layout/Sidebar";
import { MobileNav } from "@/components/layout/MobileNav";

function Pulse({ className }: { className?: string }) {
  return <div className={`animate-pulse bg-surface-raised rounded ${className ?? ""}`} />;
}

export function ReviewSectionSkeleton() {
  return (
    <section className="bg-surface rounded-2xl border border-border/20 p-6 lg:p-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Pulse className="size-10 rounded-xl" />
          <div className="space-y-2">
            <Pulse className="h-5 w-36" />
            <Pulse className="h-4 w-24" />
          </div>
        </div>
        <Pulse className="h-10 w-32 rounded-xl" />
      </div>
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Pulse key={i} className="h-16 w-full rounded-xl" />
        ))}
      </div>
    </section>
  );
}

export function TopicsGridSkeleton() {
  return (
    <section className="bg-surface rounded-2xl border border-border/20 p-6 lg:p-8">
      <div className="flex items-center justify-between mb-6">
        <Pulse className="h-5 w-32" />
        <Pulse className="h-4 w-20" />
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Pulse key={i} className="h-28 rounded-xl" />
        ))}
      </div>
    </section>
  );
}

export function ForecastSkeleton() {
  return (
    <section className="bg-surface rounded-2xl border border-border/20 p-6 lg:p-8">
      <Pulse className="h-5 w-40 mb-6" />
      <div className="flex items-end gap-3 h-32">
        {Array.from({ length: 7 }).map((_, i) => (
          <Pulse key={i} className="flex-1 h-full rounded-lg" />
        ))}
      </div>
    </section>
  );
}

export function StreakSkeleton() {
  return (
    <section className="bg-surface rounded-2xl border border-border/20 p-6">
      <div className="flex items-center gap-3 mb-4">
        <Pulse className="size-8 rounded-lg" />
        <div className="space-y-2">
          <Pulse className="h-7 w-20" />
          <Pulse className="h-3 w-24" />
        </div>
      </div>
      <Pulse className="h-24 w-full rounded-lg" />
    </section>
  );
}

export function MasterySkeleton() {
  return (
    <section className="bg-surface rounded-2xl border border-border/20 p-6">
      <div className="flex items-center justify-center mb-4">
        <Pulse className="size-36 rounded-full" />
      </div>
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Pulse key={i} className="h-4 w-full" />
        ))}
      </div>
    </section>
  );
}

export function InsightSkeleton() {
  return (
    <section className="bg-surface rounded-2xl border border-border/20 p-6">
      <Pulse className="h-4 w-24 mb-4" />
      <div className="space-y-2">
        <Pulse className="h-3 w-full" />
        <Pulse className="h-3 w-5/6" />
        <Pulse className="h-3 w-4/6" />
      </div>
    </section>
  );
}

export function DashboardSkeletonContent() {
  return (
    <div className="max-w-6xl mx-auto px-6 py-8 lg:py-12 animate-pulse">
      <div className="h-4 w-32 bg-surface-raised rounded mb-3" />
      <div className="h-10 w-64 bg-surface-raised rounded mb-4" />
      <div className="h-4 w-96 bg-surface-raised rounded mb-10" />
      <div className="grid lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 h-64 bg-surface rounded-2xl" />
        <div className="lg:col-span-4 h-48 bg-surface rounded-2xl" />
      </div>
    </div>
  );
}

export function DashboardLoadingShell() {
  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <MobileNav />
      <main className="lg:pl-64 pt-14 lg:pt-0 min-h-screen">
        <DashboardSkeletonContent />
      </main>
    </div>
  );
}
